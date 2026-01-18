// --- logic.js ---
// VERSION: 25.0 (RESTORATION + GOD MODE)
// Ключ сохранения: WARSZAWA_FOREVER
// Восстановлена вся логика: Сфера, Заказы, Сложный бизнес (склад/сотрудники), Банк.
// Интегрированы настройки из Админки.

const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// === CSS ANIMATION ===
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
    @keyframes shakeScreen { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
    .floating-text { position: absolute; font-weight: 900; font-size: 16px; pointer-events: none; z-index: 9999; text-shadow: 0 2px 4px rgba(0,0,0,0.8); animation: floatUp 1s ease-out forwards; }
    .shake-mode { animation: shakeScreen 0.5s; }
`;
document.head.appendChild(styleSheet);

// === НАСТРОЙКИ ПО УМОЛЧАНИЮ (ЗАЩИТА ОТ СБОЕВ) ===
const DEFAULT_SETTINGS = {
    prices: {
        water: 1.50, coffee: 5.00, energy: 12.00,
        repair_express: 15.00, auto_route: 45.00, bike_rent: 30.00,
        veturilo_start: 0.00, veturilo_min: 0.50,
        bolt_start: 2.00, bolt_min: 2.50,
        bag: 350, phone: 1200, scooter: 500, helmet: 250, raincoat: 180, powerbank: 400, abibas: 50, jorban: 250,
        buy_lvl_small: 75, buy_lvl_big: 350
    },
    repair_costs: { bag: 70, phone: 250, scooter: 100 },
    economy: {
        tax_rate: 0.15, tax_threshold: 200, inflation_rate: 0.40, 
        business_tax: 0.19, 
        welfare_amount: 30, welfare_cooldown: 600,
        lvl_exchange_rate: 10, lvl_exchange_rate_big: 300, 
        tax_timer_sec: 300, rent_timer_sec: 300,
        bank_rate: 0.05, bottle_price: 0.05, click_base: 0.10
    },
    bank_config: { break_penalty: 0.30, mult_15: 3, mult_30: 8 },
    jobs: { base_pay: 3.80, km_pay: 2.20, tips_chance: 0.40, tips_max: 15 },
    gameplay: {
        criminal_chance: 0.12, police_chance: 0.02, police_chance_criminal: 0.35,
        accident_chance_risky: 0.30, accident_chance_safe: 0.002,
        bottle_find_chance: 0.40, fine_amount: 50, fine_amount_pro: 150,
        lvl_fine_police: 1.2, lvl_fine_missed: 0.05, lvl_fine_spam: 0.1, click_spam_limit: 15
    },
    business_config: { water_cost: 25, shoe_wear: 0.02 },
    toggles: { enable_bank: true, enable_shop: true, enable_auto: true, enable_work: true, service_veturilo: true, service_bolt: true },
    
    // МАССИВЫ (Чтобы админ мог их менять, но дефолт был тут)
    districts: [
        { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, housePrice: 250000, czynszBase: 25, price: 0 },       
        { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, housePrice: 850000, czynszBase: 80, price: 150 }, 
        { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, housePrice: 3500000, czynszBase: 250, price: 500 } 
    ],
    business_meta: [
        { id: 'vending', name: 'Vending Machine', icon: '🍫', basePrice: 5000, minLvl: 5.0, desc: "Автомат со снеками. Требует загрузки товара.", stockPrice: 2, sellPrice: 5, empPrice: 150 },
        { id: 'vege', name: 'Warzywniak', icon: '🥦', basePrice: 20000, minLvl: 10.0, desc: "Овощная лавка. Товар портится, но маржа выше.", stockPrice: 5, sellPrice: 12, empPrice: 300 },
        { id: 'kebab', name: 'Kebab u Aliego', icon: '🥙', basePrice: 75000, minLvl: 20.0, desc: "Точка с кебабом. Нужен продавец.", stockPrice: 10, sellPrice: 25, empPrice: 500 },
        { id: 'zabka', name: 'Żabka Franchise', icon: '🐸', basePrice: 300000, minLvl: 30.0, desc: "Франшиза. Высокий оборот.", stockPrice: 50, sellPrice: 120, empPrice: 1500 }
    ]
};

// Инициализация настроек
let SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
let DISTRICTS = SETTINGS.districts;
let BUSINESS_META = SETTINGS.business_meta;

// --- STATE ---
let G = { 
    money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 300, 
    waterStock: 0, totalOrders: 0, totalClicks: 0, totalBottles: 0, totalEarned: 0, 
    autoTime: 0, district: 0, bikeRentTime: 0, transportMode: 'none', housing: { id: -1 }, 
    buffTime: 0, blindTime: 0, history: [], usedPromos: [], isNewPlayer: true, 
    lastWelfare: 0, lastAdminUpdate: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
    starter_bag: null, starter_phone: null,
    bag: null, phone: null, scooter: null, helmet: null, raincoat: null, powerbank: null,
    deposit: null, bankHistory: [], dailyQuests: [], lastDailyUpdate: 0,
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ],
    business: {}, // { id: { stock: 0, cash: 0, empTime: 0, level: 1 } }
    lastActive: Date.now()
};

const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

const UPGRADES_META = [
    { id: 'starter_bag', name: 'Старый Рюкзак', icon: '🎒', desc: 'Лучше, чем в руках.', priceKey: null, bonus: '+2% PLN', maxDur: 40, repairKey: null, hidden: true },
    { id: 'starter_phone', name: 'Древний Телефон', icon: '📱', desc: 'Звонит и ладно.', priceKey: null, bonus: 'Связь', maxDur: 40, repairKey: null, hidden: true },
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', priceKey: 'bag', bonus: '+15% PLN', maxDur: 100, repairKey: 'bag' }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', priceKey: 'phone', bonus: 'Заказы x1.4', maxDur: 100, repairKey: 'phone' }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', priceKey: 'scooter', bonus: '⚡ -30%', maxDur: 100, repairKey: 'scooter' },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', priceKey: 'helmet', bonus: '🛡️ Безопасность', maxDur: 50, repairKey: 'helmet' },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', priceKey: 'raincoat', bonus: '☔ Сухость', maxDur: 80, repairKey: 'raincoat' },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', priceKey: 'powerbank', bonus: '🤖 +50% времени', maxDur: 100, repairKey: 'powerbank' }
];

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0; let lastClickTime = 0; let clicksSinceBonus = 0; let bonusActive = false;
let isSearching = false; let spamCounter = 0;
let currentBizId = null; // Для модалки бизнеса

// --- SAFE GETTERS (ЧТОБЫ НЕ ВЫЛЕТАЛО) ---
function getDynamicPrice(baseValue) {
    if (baseValue === 0) return 0;
    let price = 0;
    if (typeof baseValue === 'string') {
        if (SETTINGS.prices && SETTINGS.prices[baseValue] !== undefined) price = SETTINGS.prices[baseValue];
        else price = 0;
    } else { price = baseValue; }
    
    let infl = (SETTINGS.economy && SETTINGS.economy.inflation_rate) || 0.4;
    let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * infl;
    return parseFloat((price * multiplier).toFixed(2));
}

function getRepairCost(key) {
    if(!key) return 0;
    if(SETTINGS.repair_costs && SETTINGS.repair_costs[key]) return getDynamicPrice(SETTINGS.repair_costs[key]);
    return getDynamicPrice(10);
}

function getBusinessPrice(basePrice) {
    let mult = 1 + (Math.max(1.0, G.lvl) * 0.2);
    return parseFloat((basePrice * mult).toFixed(2));
}

function addHistory(msg, val, type = 'plus') {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    if (!G.history) G.history = [];
    G.history.unshift({ time, msg, val, type });
    if (G.history.length > 20) G.history.pop();
}

function log(msg, color = "#eee") { console.log(`%c ${msg}`, `color: ${color}`); }

function triggerFloatingText(text, color, element) {
    if(!element) return;
    const rect = element.getBoundingClientRect();
    const el = document.createElement('div');
    el.innerText = text;
    el.style.color = color;
    el.className = 'floating-text';
    el.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    el.style.top = (rect.top - 20) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function triggerShake() {
    document.body.classList.add('shake-mode');
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(200);
    setTimeout(() => document.body.classList.remove('shake-mode'), 500);
}

// === БИЗНЕС ЛОГИКА (ВОССТАНОВЛЕНА) ===
function renderBusiness() {
    const list = document.getElementById('business-list');
    if(!list) return;

    // Обновляем общий баланс империи
    let totalCash = 0;
    let totalVal = 0;
    Object.values(G.business).forEach(b => {
        totalCash += b.cash || 0;
        // Простая оценка стоимости
        totalVal += 1000; 
    });
    const cashEl = document.getElementById('biz-total-cash');
    const valEl = document.getElementById('biz-total-value');
    if(cashEl) cashEl.innerText = totalCash.toFixed(2) + " PLN";
    if(valEl) valEl.innerText = totalVal.toFixed(0) + " PLN";

    let html = "";
    let hasHouse = G.housing && G.housing.id !== -1;

    BUSINESS_META.forEach(biz => {
        if (!G.business[biz.id]) G.business[biz.id] = null; 
        let userBiz = G.business[biz.id];
        let isOwned = !!userBiz;
        let currentPrice = getBusinessPrice(biz.basePrice);
        let hasLvl = G.lvl >= biz.minLvl;

        if (!isOwned) {
            let reason = "";
            if (!hasHouse) reason = "🔒 НУЖНА КВАРТИРА";
            else if (!hasLvl) reason = `🔒 НУЖЕН LVL ${biz.minLvl}`;
            else reason = `КУПИТЬ ${currentPrice.toLocaleString()} PLN`;

            let canBuy = hasHouse && hasLvl;
            let btnStyle = canBuy ? "background:var(--accent-gold); color:black;" : "background:#334155; color:#94a3b8; border:1px solid #475569;";
            let btnAction = canBuy ? `onclick="buyBusiness('${biz.id}')"` : "";

            html += `<div class="biz-card biz-locked">
                <div class="biz-header"><div style="display:flex; align-items:center;"><div class="biz-icon">${biz.icon}</div><div><div class="biz-title">${biz.name}</div><div style="font-size:10px; color:#aaa;">${biz.desc}</div></div></div></div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;"><button class="btn-action" style="width:100%; padding:10px; ${btnStyle}" ${btnAction}>${reason}</button></div>
            </div>`;
        } else {
            // Владелец
            let stock = userBiz.stock || 0;
            let cash = userBiz.cash || 0;
            let isEmp = (userBiz.empTime > 0);
            
            html += `<div class="biz-card" onclick="openBusinessModal('${biz.id}')">
                <div class="biz-header">
                    <div style="display:flex; align-items:center;">
                        <div class="biz-icon">${biz.icon}</div>
                        <div>
                            <div class="biz-title">${biz.name} <span class="biz-level">LVL ${userBiz.level||1}</span></div>
                            <div style="font-size:10px; color:var(--text-secondary);">${isEmp ? '🤖 Сотрудник работает' : '⚠️ Требует внимания'}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px; color:var(--success); font-weight:bold;">${cash.toFixed(2)} PLN</div>
                        <div style="font-size:10px; color:#aaa;">📦 ${stock} шт.</div>
                    </div>
                </div>
                <div class="biz-stat-row">
                    <span>Склад</span>
                    <span>${stock > 0 ? 'Есть товар' : 'Пусто'}</span>
                </div>
                <div class="biz-track"><div class="biz-fill-stock" style="width:${Math.min(100, stock)}%"></div></div>
                
                <div style="text-align:center; font-size:9px; color:#555; margin-top:5px;">Нажмите для управления</div>
            </div>`;
        }
    });
    if (list.innerHTML !== html) list.innerHTML = html;
}

function buyBusiness(id) {
    if (G.housing.id === -1) { log("⛔ Сначала купите квартиру!", "var(--danger)"); return; }
    let biz = BUSINESS_META.find(b => b.id === id);
    if (G.lvl < biz.minLvl) { log(`⛔ Нужен уровень ${biz.minLvl}!`, "var(--danger)"); return; }
    let price = getBusinessPrice(biz.basePrice);
    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        // Init business object
        G.business[id] = { stock: 10, cash: 0, empTime: 0, level: 1 };
        addHistory('🏗️ БИЗНЕС', price, 'minus');
        tg.HapticFeedback.notificationOccurred('success');
        save(); updateUI();
    } else { log(`Не хватает денег! Нужно ${price} PLN`, "var(--danger)"); tg.HapticFeedback.notificationOccurred('error'); }
}

// --- УПРАВЛЕНИЕ БИЗНЕСОМ (МОДАЛКА) ---
function openBusinessModal(id) {
    currentBizId = id;
    const biz = BUSINESS_META.find(b => b.id === id);
    const uBiz = G.business[id];
    
    document.getElementById('bm-title').innerText = biz.name;
    document.getElementById('bm-desc').innerText = biz.desc;
    
    updateBusinessModalUI();
    document.getElementById('business-modal').style.display = 'flex';
}

function closeBusinessModal() {
    document.getElementById('business-modal').style.display = 'none';
    currentBizId = null;
}

function updateBusinessModalUI() {
    if (!currentBizId) return;
    const uBiz = G.business[currentBizId];
    const meta = BUSINESS_META.find(b => b.id === currentBizId);
    
    document.getElementById('bm-stock').innerText = uBiz.stock;
    document.getElementById('bm-cash').innerText = uBiz.cash.toFixed(2);
    
    const hireBtn = document.getElementById('btn-hire-emp');
    const timerUI = document.getElementById('emp-timer-ui');
    
    if (uBiz.empTime > 0) {
        hireBtn.style.display = 'none';
        timerUI.style.display = 'block';
        let min = Math.floor(uBiz.empTime / 60);
        let sec = uBiz.empTime % 60;
        timerUI.innerText = `🤖 Сотрудник: ${min}:${sec<10?'0':''}${sec}`;
    } else {
        hireBtn.style.display = 'flex';
        timerUI.style.display = 'none';
        document.getElementById('hire-price').innerText = meta.empPrice + " PLN";
    }
    
    // Лимиты вывода
    document.getElementById('bm-withdraw-limit').innerText = "Налог: " + (SETTINGS.economy.business_tax * 100).toFixed(0) + "%";
}

function manualSell() {
    if(!currentBizId) return;
    const uBiz = G.business[currentBizId];
    const meta = BUSINESS_META.find(b => b.id === currentBizId);
    
    if (uBiz.stock > 0) {
        if (G.en >= 5) {
            G.en -= 5; // Тратим энергию игрока
            uBiz.stock--;
            let profit = meta.sellPrice;
            // Налог сразу при продаже внутри бизнеса (упрощение)
            let tax = profit * SETTINGS.economy.business_tax;
            uBiz.cash += (profit - tax);
            
            updateBusinessModalUI();
            updateUI(); // Обновить энергию
            tg.HapticFeedback.impactOccurred('light');
        } else {
            log("Нужна энергия (вода)!", "var(--danger)");
        }
    } else {
        log("Склад пуст! Закупите товар.", "var(--danger)");
        triggerShake();
    }
}

function restockFromModal() {
    if(!currentBizId) return;
    const uBiz = G.business[currentBizId];
    const meta = BUSINESS_META.find(b => b.id === currentBizId);
    
    let cost = meta.stockPrice * 10;
    if (G.money >= cost) {
        G.money -= cost;
        uBiz.stock += 10;
        addHistory('📦 ЗАКУПКА', cost, 'minus');
        updateBusinessModalUI();
        updateUI();
        save();
    } else {
        log("Не хватает денег (" + cost + " PLN)", "var(--danger)");
    }
}

function hireEmployee() {
    if(!currentBizId) return;
    const uBiz = G.business[currentBizId];
    const meta = BUSINESS_META.find(b => b.id === currentBizId);
    
    let cost = meta.empPrice;
    if (G.money >= cost) {
        G.money -= cost;
        uBiz.empTime = 600; // 10 минут
        addHistory('🤖 СОТРУДНИК', cost, 'minus');
        updateBusinessModalUI();
        updateUI();
        save();
    } else {
        log("Не хватает денег (" + cost + " PLN)", "var(--danger)");
    }
}

function withdrawFromModal() {
    if(!currentBizId) return;
    const uBiz = G.business[currentBizId];
    
    if (uBiz.cash > 0) {
        let amount = uBiz.cash;
        uBiz.cash = 0;
        G.money += amount;
        G.totalEarned += amount;
        addHistory('💰 ВЫВОД', amount.toFixed(2), 'plus');
        updateBusinessModalUI();
        updateUI();
        save();
        closeBusinessModal();
        log("Средства выведены на счет!", "var(--success)");
    } else {
        log("Касса пуста.", "var(--danger)");
    }
}

// === СТАНДАРТНАЯ ЛОГИКА ===
async function usePromo() {
    const inputField = document.getElementById('promo-input');
    const code = inputField.value.trim().toUpperCase();
    if (!G.usedPromos) G.usedPromos = [];
    if (G.usedPromos.includes(code)) { log("Уже использовано!", "var(--danger)"); return; }
    try {
        const response = await fetch('promos.json?nocache=' + Date.now());
        const promoData = await response.json();
        if (promoData[code]) {
            let reward = promoData[code].reward;
            G.money = parseFloat((G.money + reward).toFixed(2));
            G.totalEarned += reward;
            G.usedPromos.push(code);
            addHistory('🎁 ПРОМО', reward, 'plus');
            log("🎁 " + promoData[code].msg + " +" + reward + " PLN", "var(--gold)");
            inputField.value = ""; save(); updateUI();
        } else { log("Неверный код!", "var(--danger)"); }
    } catch (e) { log("Ошибка связи с базой!", "var(--danger)"); }
}

const sphere = document.getElementById('work-sphere');
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); }, {passive: false});
    sphere.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) doWork(); });
}

function showBonus() {
    const btn = document.getElementById('bonus-btn');
    if(!btn) return;
    btn.style.left = (Math.random()*(window.innerWidth-150)) + 'px';
    btn.style.top = (Math.random()*(window.innerHeight-100)) + 'px';
    document.getElementById('bonus-overlay').style.display = 'flex';
    bonusActive = true; tg.HapticFeedback.notificationOccurred('warning');
}
function claimBonus() {
    document.getElementById('bonus-overlay').style.display = 'none';
    bonusActive = false; clicksSinceBonus = 0;
    G.money = parseFloat((G.money + 50).toFixed(2));
    addHistory('🎁 БОНУС', 50, 'plus');
    tg.HapticFeedback.notificationOccurred('success'); save(); updateUI();
}
function checkStarterPack() {
    if (G.isNewPlayer === undefined) G.isNewPlayer = (G.totalOrders === 0);
    if (G.isNewPlayer) document.getElementById('starter-modal').style.display = 'flex';
}
function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50; G.waterStock += 500; G.transportMode = 'none'; 
    G.bikeRentTime += 900; G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    G.starter_bag = { active: true, dur: 50 }; G.starter_phone = { active: true, dur: 50 };
    addHistory('🎁 STARTER KIT', 50, 'plus'); save(); updateUI();
}
function generateDailyQuests() {
    if (!G.dailyQuests || G.dailyQuests.length === 0 || (Date.now() - G.lastDailyUpdate > 86400000)) {
        G.dailyQuests = [
            { id: 1, type: 'clicks', text: "Сделай клики", target: 300+Math.floor(Math.random()*500), current: 0, reward: 30, claimed: false },
            { id: 2, type: 'orders', text: "Выполни заказы", target: 3+Math.floor(Math.random()*5), current: 0, reward: 45, claimed: false },
            { id: 3, type: 'earn', text: "Заработай PLN", target: 100+Math.floor(Math.random()*200), current: 0, reward: 50, claimed: false }
        ];
        G.lastDailyUpdate = Date.now(); save(); updateUI();
    }
}
function checkDailyQuests(type, amount) {
    if (!G.dailyQuests) return;
    let updated = false;
    G.dailyQuests.forEach(q => { if (q.type === type && !q.claimed && q.current < q.target) { q.current += amount; if (q.current > q.target) q.current = q.target; updated = true; } });
    if (updated) { save(); updateUI(); }
}
function claimDaily(id) {
    const q = G.dailyQuests.find(x => x.id === id);
    if (q && !q.claimed && q.current >= q.target) {
        q.claimed = true; G.money += q.reward; addHistory('📅 ЗАДАНИЕ', q.reward, 'plus'); save(); updateUI();
    }
}

function saveToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";
    let firstName = (tg && tg.user) ? tg.user.first_name : "Browser Player";
    let userName = (tg && tg.user && tg.user.username) ? "@" + tg.user.username : "No Username";
    let dataToSave = { ...G, name: firstName, user: userName, lastActive: Date.now() };
    if(window.db) window.db.ref('users/' + userId).set(dataToSave);
}

function listenToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";

    if(window.db) {
        window.db.ref('game_settings').on('value', (snapshot) => {
            const serverSettings = snapshot.val();
            if (serverSettings) {
                // Merge safely
                SETTINGS.prices = { ...DEFAULT_SETTINGS.prices, ...(serverSettings.prices || {}) };
                SETTINGS.repair_costs = { ...DEFAULT_SETTINGS.repair_costs, ...(serverSettings.repair_costs || {}) };
                SETTINGS.economy = { ...DEFAULT_SETTINGS.economy, ...(serverSettings.economy || {}) };
                SETTINGS.jobs = { ...DEFAULT_SETTINGS.jobs, ...(serverSettings.jobs || {}) };
                SETTINGS.gameplay = { ...DEFAULT_SETTINGS.gameplay, ...(serverSettings.gameplay || {}) };
                SETTINGS.toggles = { ...DEFAULT_SETTINGS.toggles, ...(serverSettings.toggles || {}) };
                SETTINGS.bank_config = { ...DEFAULT_SETTINGS.bank_config, ...(serverSettings.bank_config || {}) };
                SETTINGS.business_config = { ...DEFAULT_SETTINGS.business_config, ...(serverSettings.business_config || {}) };
                
                if (serverSettings.districts) DISTRICTS = serverSettings.districts;
                if (serverSettings.business_meta) BUSINESS_META = serverSettings.business_meta;

                updateUI();
            }
        });

        window.db.ref('users/' + userId).on('value', (snapshot) => {
            const remote = snapshot.val();
            if (!remote) return;
            if (remote.isBanned) { document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:black;color:red;font-size:20px;">ACCESS DENIED</div>'; return; }
            
            if (remote.lastAdminUpdate && remote.lastAdminUpdate > (G.lastAdminUpdate || 0)) {
                let wasNew = G.isNewPlayer;
                G = { ...G, ...remote };
                
                if(!G.dailyQuests) G.dailyQuests = [];
                if(!G.business) G.business = {};
                if(!G.activeMilestones && !G.isNewPlayer) G.activeMilestones = [{ id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }];

                localStorage.setItem(SAVE_KEY, JSON.stringify(G));
                if (G.isNewPlayer && !wasNew) { location.reload(); return; }
                updateUI();
            }
        });
    }
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); saveToCloud(); }
function validateInventory() { UPGRADES_META.forEach(up => { if(G[up.id] && G[up.id].dur > up.maxDur) G[up.id].dur = up.maxDur; }); }
function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { try { let loaded = JSON.parse(d); G = {...G, ...loaded}; } catch(e) { console.error(e); } } 
    
    if(!G.business) G.business = {};
    if(isNaN(G.money)) G.money = 10;
    if(isNaN(G.lvl)) G.lvl = 1.0;
    if(!G.transportMode) G.transportMode = 'none';
    if(!G.housing) G.housing = { id: -1 }; 
    if(!G.shoes) G.shoes = { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 }; 
    ['bag', 'phone', 'scooter', 'helmet', 'raincoat', 'powerbank'].forEach(item => { if (G[item] === true) G[item] = { active: true, dur: 100 }; });
    if (!G.bag && !G.starter_bag) G.starter_bag = { active: true, dur: 50 };
    if (!G.phone && !G.starter_phone) G.starter_phone = { active: true, dur: 50 };

    validateInventory(); checkStarterPack(); generateDailyQuests(); listenToCloud(); updateUI(); 
}

// === UI HELPERS ===
window.switchTab = function(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    const target = document.getElementById('view-'+v);
    if(target) target.classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    
    if(v === 'business') renderBusiness();
    updateUI(); 
}

function updateUI() {
    try {
        const moneyEl = document.getElementById('money-val');
        if(!moneyEl) return; 
        const isBlind = G.blindTime > 0; 
        moneyEl.innerText = isBlind ? "🔒 ????" : G.money.toFixed(2) + " PLN";
        moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
        
        document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6) + ((G.housing && G.housing.id !== -1) ? " 🏠" : "");
        document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
        document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
        document.getElementById('water-val').innerText = Math.floor(G.waterStock);
        
        let distName = (DISTRICTS[G.district] && DISTRICTS[G.district].name) ? DISTRICTS[G.district].name : "Unknown";
        document.getElementById('district-ui').innerText = "📍 " + distName;
        
        document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️ Дождь" : "☀️ Ясно");
        
        const autoStatus = document.getElementById('auto-status-ui');
        if(autoStatus) {
            autoStatus.style.display = G.autoTime > 0 ? 'block' : 'none';
            if(G.autoTime > 0) autoStatus.innerText = "🤖 " + Math.floor(G.autoTime/60) + ":" + ((G.autoTime%60<10?'0':'')+G.autoTime%60);
        }

        const bikeStatus = document.getElementById('bike-status-ui');
        if(bikeStatus) {
            let rentShow = false; let text = "";
            if (G.transportMode === 'veturilo') { rentShow = true; text = "🚲 VETURILO"; } 
            else if (G.transportMode === 'bolt') { rentShow = true; text = "🛴 BOLT"; } 
            else if (G.bikeRentTime > 0) { rentShow = true; text = "🚲 " + Math.floor(G.bikeRentTime/60) + ":" + ((G.bikeRentTime%60<10?'0':'')+G.bikeRentTime%60); }
            bikeStatus.style.display = rentShow ? 'block' : 'none';
            bikeStatus.innerText = text;
        }

        const buffUI = document.getElementById('buff-status-ui'); 
        if(buffUI) {
            buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
            if(G.buffTime > 0) buffUI.innerText = "⚡ " + Math.floor(G.buffTime/60) + ":" + ((G.buffTime%60<10?'0':'')+G.buffTime%60);
        }
        
        const hiddenPrice = isBlind ? "???" : null;
        const setBtnText = (id, priceStr) => { const btn = document.getElementById(id); if(btn) btn.innerText = (hiddenPrice || priceStr) + " PLN"; };

        setBtnText('btn-buy-water', getDynamicPrice('water').toFixed(2));
        setBtnText('btn-buy-coffee', getDynamicPrice('coffee').toFixed(2));
        setBtnText('btn-buy-energy', getDynamicPrice('energy').toFixed(2));
        setBtnText('btn-buy-abibas', getDynamicPrice('abibas').toFixed(2));
        setBtnText('btn-buy-jorban', getDynamicPrice('jorban').toFixed(2));

        const btnVeturilo = document.getElementById('btn-veturilo');
        if(btnVeturilo) {
            if(G.transportMode === 'veturilo') { btnVeturilo.innerText = "СТОП"; btnVeturilo.style.background = "#faa"; } 
            else { btnVeturilo.disabled = !SETTINGS.toggles.service_veturilo; btnVeturilo.innerText = (hiddenPrice || getDynamicPrice('veturilo_min').toFixed(2)) + " PLN/мин"; }
        }
        const btnBolt = document.getElementById('btn-bolt');
        if(btnBolt) {
            if(G.transportMode === 'bolt') { btnBolt.innerText = "СТОП"; btnBolt.style.background = "#faa"; } 
            else { btnBolt.disabled = !SETTINGS.toggles.service_bolt; btnBolt.innerText = (hiddenPrice || getDynamicPrice('bolt_min').toFixed(2)) + " PLN/мин"; }
        }

        const rentBikeBtn = document.getElementById('buy-bike-rent');
        if(rentBikeBtn) {
            if(G.bikeRentTime > 0) { rentBikeBtn.innerText = "ОТМЕНА"; rentBikeBtn.style.background = "#ef4444"; rentBikeBtn.onclick = cancelBikeRent; }
            else { rentBikeBtn.innerText = "АРЕНДОВАТЬ (" + (hiddenPrice || getDynamicPrice('bike_rent').toFixed(2)) + " PLN)"; rentBikeBtn.style.background = ""; rentBikeBtn.onclick = rentBike; }
        }

        const autoLabel = document.getElementById('price-auto');
        if(autoLabel) autoLabel.innerText = "(" + (hiddenPrice || getDynamicPrice('auto_route').toFixed(2)) + " PLN)";
        
        const repairBtn = document.getElementById('btn-repair-express');
        if(repairBtn) repairBtn.innerText = "🔧 ЭКСПРЕСС РЕМОНТ (" + (hiddenPrice || getDynamicPrice('repair_express').toFixed(2)) + " PLN)";

        let shoeBar = document.getElementById('shoe-bar');
        if(shoeBar) {
            const sPct = (G.shoes.dur / G.shoes.maxDur) * 100;
            shoeBar.style.width = Math.min(100, Math.max(0, sPct)) + "%";
            shoeBar.style.background = sPct < 20 ? "var(--danger)" : "var(--purple)";
            document.getElementById('shoe-name').innerHTML = G.shoes.dur <= 0 ? "<span style='color:red'>СЛОМАНО!</span>" : G.shoes.name;
        }

        // Rank Logic
        let currentRank = RANKS[0]; let nextRank = null;
        if (G.totalOrders < RANKS[0].max) { currentRank = RANKS[0]; nextRank = RANKS[1]; }
        else if (G.totalOrders < RANKS[1].max) { currentRank = RANKS[1]; nextRank = RANKS[2]; }
        else if (G.totalOrders < RANKS[2].max) { currentRank = RANKS[2]; nextRank = RANKS[3]; }
        else { currentRank = RANKS[3]; nextRank = null; }
        
        const rIcon = document.getElementById('rank-icon');
        if(rIcon) {
            rIcon.innerText = currentRank.icon;
            document.getElementById('rank-name').innerText = currentRank.name;
            document.getElementById('rank-bonus').innerText = "Бонус ранга: +" + (currentRank.bonus * 100) + "%";
            if (nextRank) {
                let prevMax = (currentRank.name === "Бывалый") ? RANKS[0].max : 0;
                document.getElementById('rank-progress').style.width = Math.max(0, Math.min(100, ((G.totalOrders - prevMax) / (currentRank.max - prevMax)) * 100)) + "%";
                document.getElementById('rank-next').innerText = "До ранга " + nextRank.name + ": " + (currentRank.max - G.totalOrders);
            }
        }

        // Daily Quests
        let questsHTML = "";
        if(G.dailyQuests) {
            G.dailyQuests.forEach(q => {
                let btn = q.claimed ? "✅" : (q.current >= q.target ? `<button class='btn-action' style='width:auto; padding:4px;' onclick='claimDaily(${q.id})'>ЗАБРАТЬ ${q.reward}</button>` : `<small>${Math.floor(q.current)}/${q.target}</small>`);
                questsHTML += `<div class='daily-quest-item'><div class='daily-quest-info'><b>${q.text}</b><br><div style='height:4px; background:#333; margin-top:4px;'><div style='height:100%; background:var(--accent-blue); width:${(q.current/q.target)*100}%'></div></div></div><div style='margin-left:10px;'>${btn}</div></div>`;
            });
            const qList = document.getElementById('daily-quests-list');
            if(qList) qList.innerHTML = questsHTML;
        }

        document.getElementById('stat-orders').innerText = G.totalOrders;
        document.getElementById('stat-clicks').innerText = G.totalClicks;
        document.getElementById('stat-bottles').innerText = G.totalBottles;
        document.getElementById('stat-earned').innerText = G.totalEarned.toFixed(2);

        // Click Rate
        if (!isBroken) {
            let rankBonus = (G.totalOrders >= 50 ? 0.05 : 0) + (G.totalOrders >= 150 ? 0.05 : 0) + (G.totalOrders >= 400 ? 0.10 : 0);
            let baseC = (SETTINGS.economy && SETTINGS.economy.click_base) || 0.10;
            let mult = (DISTRICTS[G.district] && DISTRICTS[G.district].mult) || 1;
            let rate = (baseC * Math.max(0.1, G.lvl) * mult * (1 + rankBonus)).toFixed(2);
            if(order.visible && !order.active) rate = "0.00 (ПРИМИ ЗАКАЗ!)"; 
            if (!SETTINGS.toggles.enable_work) rate = "ВЫХОДНОЙ";
            document.getElementById('click-rate-ui').innerText = isBlind ? "?.??" : rate + (rate !== "ВЫХОДНОЙ" ? " PLN" : "");
        } else {
            document.getElementById('click-rate-ui').innerText = repairProgress + " / 50";
        }

        // Items
        let invHTML = "";
        const itemsList = document.getElementById('my-items-list');
        if(itemsList) {
            UPGRADES_META.forEach(up => {
                if(G[up.id]) {
                    const item = G[up.id];
                    const isBroken = item.dur <= 0;
                    let conf = UPGRADES_META.find(u => u.id === up.id);
                    let repairCost = getRepairCost(conf.repairKey);
                    invHTML += `<div class="shop-item ${isBroken ? 'item-broken' : ''}"><div class="shop-icon">${up.icon}</div><div class="shop-title">${up.name}</div><div class="shop-desc">${isBroken ? 'СЛОМАНО' : up.bonus}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${item.dur}%"></div></div><div class="inv-action-row"><button class="inv-btn-repair" onclick="repairItem('${up.id}', ${repairCost}, true)">🛠️ ${hiddenPrice || repairCost.toFixed(2)}</button><button class="inv-btn-sell" onclick="sellInvest('${up.id}')">💸</button></div></div>`;
                }
            });
            itemsList.innerHTML = invHTML;
        }

        // Districts
        let distHTML = "";
        const distCont = document.getElementById('districts-list-container');
        if(distCont) {
            DISTRICTS.forEach((d, i) => {
                let isCurrent = G.district === i;
                let isOwner = G.housing && G.housing.id === i;
                let actionBtn = isCurrent ? `<button class="btn-action btn-secondary" style="opacity:0.7;">ТУТ</button>` : `<button class="btn-action" onclick="moveDistrict(${i})">ЕХАТЬ ${d.price}</button>`;
                if(isOwner) actionBtn = `<button class="btn-action" style="background:var(--gold); color:black;">ВЛАДЕЛЕЦ</button>`;
                else if(d.housePrice) actionBtn += `<button class="btn-action" style="margin-top:5px; border:1px solid var(--accent-gold); background:transparent; color:var(--accent-gold);" onclick="buyHouse(${i})">КУПИТЬ ${(d.housePrice/1000).toFixed(0)}k</button>`;
                distHTML += `<div class="card"><b>${d.name}</b><small>Аренда: ${(d.rentPct*100).toFixed(0)}% | x${d.mult}</small>${actionBtn}</div>`;
            });
            distCont.innerHTML = distHTML;
        }

        renderBank(); renderBankFull(); renderMilestones();
        if(currentBizId) updateBusinessModalUI();

        if (curView === 'main' && order.visible) document.getElementById('quest-bar').style.display = 'block';
        else document.getElementById('quest-bar').style.display = 'none';

        const lvlS = document.getElementById('btn-lvl-small');
        if(lvlS) lvlS.innerText = `КУПИТЬ -0.05 LVL\n⮕ ${SETTINGS.economy.lvl_exchange_rate} PLN`;
        
        const lvlB = document.getElementById('btn-lvl-big');
        if(lvlB) lvlB.innerText = `КУПИТЬ -1.00 LVL\n⮕ ${SETTINGS.economy.lvl_exchange_rate_big} PLN`;

        const btnB = document.querySelector("button[onclick='collectBottles()']");
        if(btnB) btnB.innerText = `♻️ СБОР БУТЫЛОК (+${SETTINGS.economy.bottle_price})`;

        // Timers
        let taxText = G.money > SETTINGS.economy.tax_threshold ? (SETTINGS.economy.tax_rate * 100).toFixed(0) + "%" : "FREE";
        const taxT = document.getElementById('tax-timer');
        if(taxT) taxT.innerText = `Налог (${taxText}): ${Math.floor(G.tax/60)}:${G.tax%60}`;
        
        let rentVal = (G.housing && G.housing.id === G.district) ? getDynamicPrice(DISTRICTS[G.district].czynszBase) : (G.money * DISTRICTS[G.district].rentPct);
        const rentT = document.getElementById('rent-timer');
        if(rentT) rentT.innerText = `Оплата (${rentVal.toFixed(0)}): ${Math.floor(G.rent/60)}:${G.rent%60}`;

    } catch (e) { console.error("UI Error:", e); }
}

function doWork() {
    G.totalClicks++; checkDailyQuests('clicks', 1);
    if (!SETTINGS.toggles.enable_work) { log("⛔ Работа остановлена!", "var(--danger)"); return; }
    if (isBroken) { repairProgress++; G.en = Math.max(0, G.en - 5); if (repairProgress >= 50) { isBroken = false; repairProgress = 0; log("Починил!", "var(--success)"); } updateUI(); save(); return; }
    if (bonusActive) { G.en = Math.max(0, G.en - 50); updateUI(); return; }
    let now = Date.now(); if (now - lastClickTime < 80) return; lastClickTime = now;
    if (order.visible && !order.active) { G.en = Math.max(0, G.en - 25); updateUI(); return; }
    
    // Auto Drink
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); if (G.housing && G.housing.id === G.district) eff *= 1.2;
        let drink = Math.min(G.waterStock, 50); G.en = Math.min(G.maxEn, G.en + (drink * eff)); G.waterStock -= drink; 
    }
    if (G.en < 1) return;
    
    clicksSinceBonus++; if (clicksSinceBonus > 300) { showBonus(); clicksSinceBonus = 0; }
    if (G.shoes.dur > 0) G.shoes.dur -= 0.05;
    
    UPGRADES_META.forEach(up => { 
        if (G[up.id] && G[up.id].dur > 0) {
             let wear = 0.02; if(up.id==='helmet' && order.isRiskyRoute) wear=0.5; if(up.id==='scooter') wear=0.05;
             G[up.id].dur -= wear; 
        } 
    });

    if(order.active) { 
        consumeResources(true); 
        let speed = (G.bikeRentTime > 0 ? 2 : 1) * (order.isRiskyRoute ? 2 : 1); 
        if (G.transportMode === 'bolt') speed *= 1.3; if (G.shoes.dur <= 0) speed *= 0.7;
        order.steps += speed; 
        if (G.bikeRentTime > 0 && Math.random() < SETTINGS.gameplay.accident_chance_safe) triggerBreakdown();
        if(order.steps >= order.target) finishOrder(true); updateUI(); save(); return; 
    }
    
    if(!order.visible && Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder();
    consumeResources(false);
    
    let bagBonus = (G.bag && G.bag.dur>0) ? 1.15 : (G.starter_bag && G.starter_bag.dur>0 ? 1.02 : 1);
    let rankBonus = (G.totalOrders >= 50 ? 0.05 : 0) + (G.totalOrders >= 150 ? 0.05 : 0);
    
    let baseC = (SETTINGS.economy && SETTINGS.economy.click_base) || 0.10;
    let distMult = (DISTRICTS[G.district] && DISTRICTS[G.district].mult) || 1;

    let gain = baseC * Math.max(0.1, G.lvl) * distMult * (1 + rankBonus) * bagBonus;
    G.money += gain; G.totalEarned += gain; checkDailyQuests('earn', gain); G.lvl += 0.00025;
    checkMilestones(); updateUI(); save();
}

function consumeResources(isOrder) {
    let waterCost = isOrder ? 10 : 3; if (G.buffTime > 0) waterCost = isOrder ? 8 : 2; 
    G.waterStock = Math.max(0, G.waterStock - waterCost);
    if (G.buffTime > 0) return; 
    let cost = (G.scooter ? 7 : 10); if (G.bikeRentTime > 0 || G.transportMode === 'veturilo') cost *= 0.5;
    if (weather === "Дождь" && !G.raincoat) cost *= 1.2; if (isOrder) cost *= 1.5; 
    G.en = Math.max(0, G.en - cost); 
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; order.offerTimer = 15; order.isCriminal = Math.random() < SETTINGS.gameplay.criminal_chance; 
    let d = 0.5 + Math.random() * 3.5; 
    let base = SETTINGS.jobs.base_pay; let perKm = SETTINGS.jobs.km_pay;
    
    let distMult = (DISTRICTS[G.district] && DISTRICTS[G.district].mult) || 1;
    let baseRew = (base + d * perKm) * Math.max(0.1, G.lvl) * distMult * (weather === "Дождь" ? 1.5 : 1);
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; } 
    order.reward = baseRew; order.target = Math.floor(d * 160); order.steps = 0; order.time = Math.floor(order.target / 1.5 + 45); 
    updateUI(); 
}

function finishOrder(win) { 
    order.active = false; 
    if(win) { 
        if (order.isRiskyRoute && Math.random() < SETTINGS.gameplay.accident_chance_risky) { 
            log("💥 АВАРИЯ!", "var(--danger)"); isBroken = true; G.money -= 20; order.visible = false; updateUI(); save(); return; 
        }
        let policeChance = order.isCriminal ? SETTINGS.gameplay.police_chance_criminal : SETTINGS.gameplay.police_chance; 
        if(Math.random() < policeChance) { 
            let fine = (G.lvl < 2) ? SETTINGS.gameplay.fine_amount : SETTINGS.gameplay.fine_amount_pro;
            G.lvl -= SETTINGS.gameplay.lvl_fine_police; G.money -= fine; addHistory('👮 ШТРАФ', fine, 'minus');
        } else { 
            G.money += order.reward; G.totalEarned += order.reward; G.lvl += (order.isCriminal ? 0.12 : 0.015); G.totalOrders++; 
            checkDailyQuests('orders', 1); checkDailyQuests('earn', order.reward); 
            if(Math.random() < SETTINGS.jobs.tips_chance) { 
                let tip = 5 + Math.random()*(SETTINGS.jobs.tips_max-5); G.money += tip; addHistory('💰 ЧАЕВЫЕ', tip.toFixed(2), 'plus'); 
            }
        } 
    } 
    order.visible = false; updateUI(); save(); 
}

// ... Остальные функции ...

function makeDeposit() {
    const inp = document.getElementById('bank-inp'); let val = parseFloat(inp.value);
    if (!val || val > G.money || val < 100) return;
    let mult = selectedBankPlan.mult;
    if (selectedBankPlan.days === 15) mult = SETTINGS.bank_config.mult_15;
    if (selectedBankPlan.days === 30) mult = SETTINGS.bank_config.mult_30;
    
    let rate = SETTINGS.economy.bank_rate * mult; 
    G.money -= val; 
    G.deposit = { amount: val, start: Date.now(), end: Date.now() + (selectedBankPlan.days * 86400000), rate: rate, profit: val * rate, penalty: val * SETTINGS.bank_config.break_penalty };
    addBankLog("Вклад", val, "minus"); inp.value = ""; save(); updateUI();
}

function addBankLog(msg, val, type) {
    if(!G.bankHistory) G.bankHistory = [];
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    G.bankHistory.unshift({ msg, val, type, time });
    if(G.bankHistory.length > 10) G.bankHistory.pop();
}

function renderBankFull() {
    const selUI = document.getElementById('bank-select-ui');
    const actUI = document.getElementById('bank-active-ui');
    if (!selUI || !actUI) return; 
    if (G.deposit) {
        selUI.style.display = 'none'; actUI.style.display = 'block';
        document.getElementById('locked-val').innerText = G.deposit.amount.toFixed(2) + " PLN";
        let now = Date.now(); let left = G.deposit.end - now; let totalDur = G.deposit.end - G.deposit.start;
        if (left <= 0) {
            document.getElementById('bank-timer').innerText = "СРОК ИСТЕК! ПРИБЫЛЬ ГОТОВА";
            document.getElementById('bank-timer').style.color = "var(--success)";
            document.getElementById('bank-prog-bar').style.width = "100%";
            document.getElementById('bank-prog-bar').style.background = "var(--success)";
            document.getElementById('btn-bank-claim').style.display = 'block';
            document.getElementById('btn-bank-break').style.display = 'none';
        } else {
            let pct = 100 - (left / totalDur * 100);
            document.getElementById('bank-prog-bar').style.width = pct + "%";
            document.getElementById('bank-prog-bar').style.background = "var(--accent-gold)";
            let days = Math.floor(left / (1000 * 60 * 60 * 24));
            let hours = Math.floor((left % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let mins = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
            document.getElementById('bank-timer').innerText = `БЛОКИРОВКА: ${days}д ${hours}ч ${mins}м`;
            document.getElementById('bank-timer').style.color = "var(--accent-gold)";
            document.getElementById('btn-bank-claim').style.display = 'none';
            document.getElementById('btn-bank-break').style.display = 'block';
        }
    } else {
        selUI.style.display = 'block'; actUI.style.display = 'none';
    }
    const hList = document.getElementById('bank-history-list');
    if(hList && G.bankHistory) {
        hList.innerHTML = G.bankHistory.map(h => {
            let color = h.type === 'plus' ? 'var(--success)' : (h.type === 'fee' ? 'var(--danger)' : '#fff');
            let sign = h.type === 'plus' ? '+' : '-'; if(h.type === 'fee') sign = '-';
            return `<div class="h-row"><span>${h.time} ${h.msg}</span><span style="color:${color}">${sign}${h.val} PLN</span></div>`;
        }).join('');
    }
}

// ... (Остальные стандартные функции типа repairBikeInstant, buyShoes оставлены как в оригинале) ...
function repairBikeInstant() {
    let cost = getDynamicPrice('repair_express'); 
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        isBroken = false; repairProgress = 0;
        addHistory('🔧 РЕМОНТ', cost, 'minus');
        log("Велик починен за деньги!", "var(--success)");
        save(); updateUI();
    } else { log("Нет денег (" + cost + " PLN)!", "var(--danger)"); }
}

function buyShoes(name, basePrice, durability) {
    if (G.shoes.name === name && G.shoes.dur > 0) { log("У вас уже есть эти кроссовки!", "var(--danger)"); tg.HapticFeedback.notificationOccurred('error'); return; }
    let priceKey = name === "Jorban" ? "jorban" : "abibas";
    let price = getDynamicPrice(priceKey); 
    if (G.money >= price) {
        G.money -= price;
        let bonus = (name === "Jorban") ? 0.2 : 0;
        G.shoes = { name: name, maxDur: durability, dur: durability, bonus: bonus };
        addHistory('👟 ' + name.toUpperCase(), price, 'minus');
        log("Куплены " + name + "!", "var(--purple)");
        save(); updateUI();
    } else { log("Не хватает денег (" + price + " PLN)!", "var(--danger)"); }
}

function buyInvest(type, priceKey) { 
    let price = getDynamicPrice(priceKey); 
    if(!G[type] && G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        let maxDur = 100;
        let conf = UPGRADES_META.find(u => u.id === type);
        if(conf && conf.maxDur) maxDur = conf.maxDur;
        G[type] = { active: true, dur: maxDur };
        addHistory('ИНВЕСТ', price, 'minus'); save(); updateUI(); 
    } else if (G.money < price) { log("Нужно " + price + " PLN", "var(--danger)"); }
}

function sellInvest(type) {
    if(G[type]) {
        let conf = UPGRADES_META.find(u => u.id === type);
        let priceKey = conf ? conf.priceKey : null;
        if (!priceKey) return; 
        let p = getDynamicPrice(priceKey) * 0.5;
        G.money = parseFloat((G.money + p).toFixed(2)); G[type] = null; 
        addHistory('💸 ЛОМБАРД', p, 'plus'); log("Вы продали предмет в ломбард", "var(--gold)");
        save(); updateUI();
    }
}

function repairItem(type, valPassed, isDynamic) {
    if (!G[type]) return;
    let conf = UPGRADES_META.find(u => u.id === type);
    let max = conf ? conf.maxDur : 100;
    if (G[type].dur >= max) { log("Предмет полностью цел!", "var(--accent-blue)"); return; }
    let cost = isDynamic ? valPassed : getDynamicPrice(valPassed);
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        G[type].dur = max;
        addHistory('🛠️ РЕМОНТ', cost, 'minus');
        log("Предмет отремонтирован!", "var(--success)");
        save(); updateUI();
    } else { log("Нет денег на ремонт (" + cost + ")", "var(--danger)"); }
}

// LOOP
setInterval(() => {
    if (G.money > 0) {
        if (G.transportMode === 'veturilo') G.money -= getDynamicPrice('veturilo_min') / 60;
        if (G.transportMode === 'bolt') G.money -= getDynamicPrice('bolt_min') / 60;
        if (G.transportMode !== 'none' && G.money <= 0) { G.transportMode = 'none'; log("Нет денег на аренду!", "red"); }

        G.tax--; if(G.tax <= 0) { 
            let cost = (G.money > SETTINGS.economy.tax_threshold) ? (G.money - SETTINGS.economy.tax_threshold) * SETTINGS.economy.tax_rate : 0;
            if(cost>0) { G.money -= cost; addHistory('НАЛОГ', cost.toFixed(2), 'minus'); } 
            G.tax = SETTINGS.economy.tax_timer_sec; save(); 
        }
        G.rent--; if(G.rent <= 0) {
            let distMult = (DISTRICTS[G.district] && DISTRICTS[G.district].rentPct) || 0.05;
            let cost = (G.housing && G.housing.id === G.district) ? getDynamicPrice(DISTRICTS[G.district].czynszBase) : (G.money * distMult);
            G.money -= cost; addHistory('АРЕНДА/ЖКХ', cost.toFixed(2), 'minus'); G.rent = SETTINGS.economy.rent_timer_sec; save();
        }
    }
    
    if(G.business) {
        Object.keys(G.business).forEach(bid => {
            if(G.business[bid] && G.business[bid].empTime > 0) {
                G.business[bid].empTime--;
                // Автопродажа сотрудником
                if(G.business[bid].empTime % 5 === 0 && G.business[bid].stock > 0) {
                    G.business[bid].stock--;
                    let meta = BUSINESS_META.find(b=>b.id===bid);
                    let profit = meta.sellPrice * (1 - SETTINGS.economy.business_tax);
                    G.business[bid].cash += profit;
                }
                if(currentBizId === bid) updateBusinessModalUI();
            }
        });
    }

    updateUI();
}, 1000);

window.onload = load;

