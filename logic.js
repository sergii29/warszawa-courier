// --- logic.js ---
// VERSION: 16.2 (FULL RESTORE: GEAR, SHOP, AUTO-MODE)
// Ключ сохранения WARSZAWA_FOREVER.
// Восстановлено: Описания бонусов, работа Экипировки (Инвест), Автопилот и Магазин.

const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// === CSS АНИМАЦИИ ===
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
    @keyframes shakeScreen { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-3px, 0px) rotate(1deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
    .floating-text { position: absolute; font-weight: 900; font-size: 16px; pointer-events: none; z-index: 9999; text-shadow: 0 2px 4px rgba(0,0,0,0.8); animation: floatUp 1s ease-out forwards; }
    .shake-mode { animation: shakeScreen 0.5s; }
`;
document.head.appendChild(styleSheet);

// === НАСТРОЙКИ ЭКОНОМИКИ ===
const DEFAULT_SETTINGS = {
    prices: {
        water: 1.50, coffee: 5.00, energy: 12.00,
        repair_express: 15.00, auto_route: 45.00, bike_rent: 30.00,
        veturilo_start: 0.00, veturilo_min: 0.50,
        bolt_start: 2.00, bolt_min: 2.50,
        bag: 350, phone: 1200, scooter: 500, helmet: 250, raincoat: 180, powerbank: 400, abibas: 50, jorban: 250
    },
    economy: {
        tax_rate: 0.15, tax_threshold: 200, inflation_rate: 0.40, business_tax: 0.19, 
        welfare_amount: 30, welfare_cooldown: 600, lvl_exchange_rate: 10, lvl_exchange_rate_big: 300, 
        tax_timer_sec: 300, rent_timer_sec: 300, bank_rate: 0.05, bottle_price: 0.05, click_base: 0.10
    },
    jobs: { base_pay: 3.80, km_pay: 2.20, tips_chance: 0.40, tips_max: 15 },
    gameplay: {
        criminal_chance: 0.12, police_chance: 0.02, police_chance_criminal: 0.35,
        accident_chance_risky: 0.30, accident_chance_safe: 0.002,
        bottle_find_chance: 0.40, fine_amount: 50, fine_amount_pro: 150,
        lvl_fine_police: 1.2, lvl_fine_missed: 0.05, lvl_fine_spam: 0.1, click_spam_limit: 15
    },
    toggles: { enable_bank: true, enable_shop: true, enable_auto: true, enable_work: true, service_veturilo: true, service_bolt: true }
};

let SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

// === МЕТАДАННЫЕ ПРЕДМЕТОВ (ЭКИПИРОВКА) ===
const UPGRADES_META = [
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: 'Увеличивает выплаты за заказы на 15%.', priceKey: 'bag', bonus: '+15% PLN', maxDur: 100, repairPriceKey: 70 }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы появляются на 40% чаще.', priceKey: 'phone', bonus: 'Заказы x1.4', maxDur: 100, repairPriceKey: 250 }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Снижает расход энергии при кликах на 30%.', priceKey: 'scooter', bonus: '⚡ -30%', maxDur: 100, repairPriceKey: 100 },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Снижает риск аварии на опасных маршрутах в 2 раза.', priceKey: 'helmet', bonus: '🛡️ Безопасность', maxDur: 50, repairPriceKey: 50 },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Убирает штраф к энергии во время дождя.', priceKey: 'raincoat', bonus: '☔ Защита', maxDur: 80, repairPriceKey: 40 },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Увеличивает время работы автопилота на 50%.', priceKey: 'powerbank', bonus: '🤖 +50% времени', maxDur: 100, repairPriceKey: 80 }
];

const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0, housePrice: 250000, czynszBase: 25 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150, housePrice: 850000, czynszBase: 80 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500, housePrice: 3500000, czynszBase: 250 } 
];

// === СОСТОЯНИЕ ИГРЫ ===
let G = { 
    money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 300, 
    waterStock: 0, totalOrders: 0, totalClicks: 0, totalBottles: 0, totalEarned: 0, 
    autoTime: 0, district: 0, bikeRentTime: 0, transportMode: 'none', housing: { id: -1 }, 
    buffTime: 0, blindTime: 0, history: [], usedPromos: [], isNewPlayer: true, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
    bag: null, phone: null, scooter: null, helmet: null, raincoat: null, powerbank: null,
    deposit: null, bankHistory: [], dailyQuests: [], lastDailyUpdate: 0, business: {}
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false, repairProgress = 0, lastClickTime = 0;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function log(msg, color = "#eee") { console.log(`%c ${msg}`, `color: ${color}`); }

function getDynamicPrice(baseKey) {
    let base = (typeof baseKey === 'string') ? (SETTINGS.prices[baseKey] || 0) : baseKey;
    let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * SETTINGS.economy.inflation_rate;
    return parseFloat((base * multiplier).toFixed(2));
}

// === ИНИЦИАЛИЗАЦИЯ И ОБНОВЛЕНИЕ UI ===
function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(4) + (G.housing.id !== -1 ? " 🏠" : "");
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('district-ui').innerText = "📍 " + DISTRICTS[G.district].name;

    // Обновление состояния обуви
    let shoeBar = document.getElementById('shoe-bar');
    if(shoeBar) {
        shoeBar.style.width = (G.shoes.dur/G.shoes.maxDur*100) + "%";
        document.getElementById('shoe-name').innerText = G.shoes.name;
    }

    // Обновление цен в Магазине
    const shopPrices = ['water', 'coffee', 'energy', 'abibas', 'jorban'];
    shopPrices.forEach(id => {
        let el = document.getElementById('btn-buy-' + id);
        if(el) el.innerText = getDynamicPrice(id).toFixed(2) + " PLN";
    });

    // Рендер Инвентаря (Экипировка)
    renderInventory();
    // Рендер Карьеры
    renderCareer();
    // Заказы
    renderOrderBar();
}

function renderInventory() {
    const list = document.getElementById('my-items-list');
    if (!list) return;
    let html = "";
    UPGRADES_META.forEach(up => {
        if(G[up.id]) {
            let item = G[up.id];
            let pct = Math.floor((item.dur / up.maxDur) * 100);
            html += `
                <div class="shop-item">
                    <div class="shop-icon">${up.icon}</div>
                    <div class="shop-title">${up.name}</div>
                    <div class="shop-desc">${up.desc}</div>
                    <div class="inv-dur-track"><div class="inv-dur-fill" style="width:${pct}%"></div></div>
                    <div class="inv-action-row">
                        <button class="inv-btn-repair" onclick="repairItem('${up.id}')">🛠️ Чинить</button>
                        <button class="inv-btn-sell" onclick="sellItem('${up.id}')">💸 Продать</button>
                    </div>
                </div>`;
        }
    });
    list.innerHTML = html || "<div style='color:#666; width:100%; text-align:center;'>Инвентарь пуст</div>";
}

function renderCareer() {
    let rank = RANKS[0];
    if (G.totalOrders >= 400) rank = RANKS[3];
    else if (G.totalOrders >= 150) rank = RANKS[2];
    else if (G.totalOrders >= 50) rank = RANKS[1];

    document.getElementById('rank-name').innerText = rank.name;
    document.getElementById('rank-bonus').innerText = "Бонус ранга: +" + (rank.bonus * 100) + "% (к доходу)";
    document.getElementById('stat-orders').innerText = G.totalOrders || 0;
    document.getElementById('stat-earned').innerText = (G.totalEarned || 0).toFixed(2) + " PLN";
}

function renderOrderBar() {
    const bar = document.getElementById('quest-bar');
    if(order.visible && curView === 'main') {
        bar.style.display = 'block';
        document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        document.getElementById('quest-timer-ui').innerText = order.active ? "В пути" : "0:" + order.offerTimer;
        document.getElementById('quest-progress-bar').style.width = (order.steps/order.target*100) + "%";
        document.getElementById('quest-active-ui').style.display = order.active ? 'block' : 'none';
        document.getElementById('quest-actions-choice').style.display = order.active ? 'none' : 'flex';
    } else bar.style.display = 'none';
}

// === ЛОГИКА МАГАЗИНА И ИНВЕНТАРЯ ===
function buyGear(id) {
    let meta = UPGRADES_META.find(m => m.id === id);
    let price = getDynamicPrice(meta.priceKey);
    if (G.money >= price && !G[id]) {
        G.money -= price;
        G[id] = { dur: meta.maxDur };
        save(); updateUI();
        log("Приобретено: " + meta.name, "var(--success)");
    }
}

function repairItem(id) {
    let meta = UPGRADES_META.find(m => m.id === id);
    let cost = getDynamicPrice(meta.repairPriceKey);
    if (G.money >= cost) {
        G.money -= cost; G[id].dur = meta.maxDur;
        save(); updateUI();
    }
}

function sellItem(id) {
    let meta = UPGRADES_META.find(m => m.id === id);
    let refund = getDynamicPrice(meta.priceKey) * 0.5;
    G.money += refund; G[id] = null;
    save(); updateUI();
}

function buyDrink(type) {
    let price = getDynamicPrice(type === 'coffee' ? 'coffee' : 'energy');
    if (type === 'coffee' && G.en >= G.maxEn) {
        tg.HapticFeedback.notificationOccurred('warning');
        return;
    }
    if (G.money >= price) {
        G.money -= price;
        if(type === 'coffee') G.en = Math.min(G.maxEn, G.en + 300);
        else G.buffTime += 120;
        save(); updateUI();
    }
}

// === РАБОТА И ЗАКАЗЫ ===
function doWork() {
    if (isBroken) {
        repairProgress++; G.en -= 5;
        if(repairProgress >= 50) { isBroken = false; repairProgress = 0; }
        save(); updateUI(); return;
    }

    // Авто-питье
    if (G.waterStock > 0 && G.en < (G.maxEn - 20)) {
        let amount = Math.min(G.waterStock, 50);
        G.en += amount; G.waterStock -= amount;
    }

    if (order.active) {
        let speed = (G.bikeRentTime > 0 ? 2 : 1);
        if(G.scooter && G.scooter.dur > 0) speed *= 1.3;
        order.steps += speed;
        if(order.steps >= order.target) finishOrder(true);
    } else if (!order.visible && Math.random() < 0.1) generateOrder();

    let gain = 0.1 * DISTRICTS[G.district].mult;
    if(G.bag && G.bag.dur > 0) gain *= 1.15;
    G.money += gain; G.lvl += 0.0001;
    save(); updateUI();
}

function generateOrder() {
    order.visible = true; order.offerTimer = 15; order.active = false;
    order.reward = (5 + Math.random()*10) * DISTRICTS[G.district].mult;
    if(G.bag && G.bag.dur > 0) order.reward *= 1.15;
    order.target = 150; order.steps = 0; order.time = 60;
}

function finishOrder(win) {
    if(win) {
        G.money += order.reward; G.totalOrders++; G.totalEarned += order.reward;
        if(G.shoes.dur > 0) G.shoes.dur -= 1;
    }
    order.visible = false; order.active = false;
    save(); updateUI();
}

// === ГЛОБАЛЬНЫЕ ЦИКЛЫ ===
setInterval(() => {
    // Налоги и Аренда
    if(G.tax > 0) G.tax--; else { G.tax = 300; if(G.money > 200) G.money *= 0.85; }
    if(G.rent > 0) G.rent--; else { G.rent = 300; G.money -= (G.housing.id === -1 ? 15 : 5); }

    // Таймеры
    if(G.buffTime > 0) G.buffTime--;
    if(G.autoTime > 0) G.autoTime--;
    if(G.bikeRentTime > 0) G.bikeRentTime--;

    // Заказы
    if(order.visible && !order.active) {
        order.offerTimer--;
        if(order.offerTimer <= 0) order.visible = false;
    }

    updateUI();
}, 1000);

// === НАВИГАЦИЯ ===
function switchTab(tab, el) {
    curView = tab;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + tab).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    updateUI();
}

// Скрытые функции для кнопок в HTML
function acceptOrder() { order.active = true; updateUI(); }
function openRouteModal() { document.getElementById('route-modal').style.display = 'flex'; }
function closeRouteModal() { document.getElementById('route-modal').style.display = 'none'; }
function buyWater() { let p = getDynamicPrice('water'); if(G.money >= p){ G.money -= p; G.waterStock += 1500; save(); updateUI(); } }

window.onload = () => {
    let saved = localStorage.getItem(SAVE_KEY);
    if(saved) G = {...G, ...JSON.parse(saved)};
    // Восстанавливаем список экипировки в магазине при открытии
    const shopList = document.getElementById('shop-upgrades-list');
    if(shopList) {
        shopList.innerHTML = UPGRADES_META.map(m => `
            <div class="card" style="margin-bottom:8px;">
                <b>${m.icon} ${m.name}</b><br>
                <small>${m.desc}</small><br>
                <button class="btn-action" style="margin-top:5px;" onclick="buyGear('${m.id}')">Купить</button>
            </div>
        `).join('');
    }
    updateUI();
};
