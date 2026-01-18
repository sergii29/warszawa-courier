// --- logic.js ---
// VERSION: 16.1 (FIX: COFFEE WASTE PROTECT)
// Ключ сохранения WARSZAWA_FOREVER.
// Исправлено: Кофе нельзя купить при полной полоске энергии.

const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// === CSS АНИМАЦИИ ===
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
    @keyframes shakeScreen { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
    .floating-text { position: absolute; font-weight: 900; font-size: 16px; pointer-events: none; z-index: 9999; text-shadow: 0 2px 4px rgba(0,0,0,0.8); animation: floatUp 1s ease-out forwards; }
    .shake-mode { animation: shakeScreen 0.5s; }
`;
document.head.appendChild(styleSheet);

// === НАСТРОЙКИ ===
const DEFAULT_SETTINGS = {
    prices: {
        water: 1.50, coffee: 5.00, energy: 12.00,
        repair_express: 15.00, auto_route: 45.00, bike_rent: 30.00,
        veturilo_start: 0.00, veturilo_min: 0.50,
        bolt_start: 2.00, bolt_min: 2.50,
        bag: 350, phone: 1200, scooter: 500, helmet: 250, raincoat: 180, powerbank: 400, abibas: 50, jorban: 250
    },
    economy: {
        tax_rate: 0.15, tax_threshold: 200, inflation_rate: 0.40, 
        business_tax: 0.19, 
        welfare_amount: 30, welfare_cooldown: 600,
        lvl_exchange_rate: 10, lvl_exchange_rate_big: 300, 
        tax_timer_sec: 300, rent_timer_sec: 300,
        bank_rate: 0.05, bottle_price: 0.05, click_base: 0.10
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

const BUSINESS_META = [
    { id: 'vending', name: 'Vending Machine', icon: '🍫', basePrice: 5000, minLvl: 5.0, type: 'maintenance', dealCost: 50, desc: "Простой доход. Требует пинка." },
    { id: 'vege', name: 'Warzywniak', icon: '🥦', basePrice: 20000, minLvl: 10.0, type: 'lottery', dealCost: 300, desc: "Овощи. Риск гнилой партии." },
    { id: 'kebab', name: 'Kebab u Aliego', icon: '🥙', basePrice: 75000, minLvl: 20.0, type: 'strategy', dealCost: 0, desc: "Выбор ингредиентов. Опасайся Sanepid." },
    { id: 'zabka', name: 'Żabka Franchise', icon: '🐸', basePrice: 300000, minLvl: 30.0, type: 'high_stakes', dealCost: 5000, desc: "Выполнение корп. плана. Крупные ставки." }
];

const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

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
    business: {}, lastActive: Date.now()
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0; let lastClickTime = 0; let clicksSinceBonus = 0; let bonusActive = false;
let isSearching = false; let spamCounter = 0; let isBusinessBusy = false;

const UPGRADES_META = [
    { id: 'starter_bag', name: 'Старый Рюкзак', icon: '🎒', desc: 'Лучше, чем в руках.', priceKey: null, bonus: '+2% PLN', maxDur: 40, repairPriceKey: null, hidden: true },
    { id: 'starter_phone', name: 'Древний Телефон', icon: '📱', desc: 'Звонит и ладно.', priceKey: null, bonus: 'Связь', maxDur: 40, repairPriceKey: null, hidden: true },
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', priceKey: 'bag', bonus: '+15% PLN', maxDur: 100, repairPriceKey: 70 }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', priceKey: 'phone', bonus: 'Заказы x1.4', maxDur: 100, repairPriceKey: 250 }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', priceKey: 'scooter', bonus: '⚡ -30%', maxDur: 100, repairPriceKey: 100 },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', priceKey: 'helmet', bonus: '🛡️ Безопасность', maxDur: 50, repairPriceKey: 50 },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', priceKey: 'raincoat', bonus: '☔ Сухость', maxDur: 80, repairPriceKey: 40 },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', priceKey: 'powerbank', bonus: '🤖 +50% времени', maxDur: 100, repairPriceKey: 80 }
];

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0, housePrice: 250000, czynszBase: 25 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150, housePrice: 850000, czynszBase: 80 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500, housePrice: 3500000, czynszBase: 250 } 
];

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function getDynamicPrice(baseValue) {
    if (baseValue === 0) return 0;
    let price = (typeof baseValue === 'string') ? (SETTINGS.prices[baseValue] || 0) : baseValue;
    let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * SETTINGS.economy.inflation_rate;
    return parseFloat((price * multiplier).toFixed(2));
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
    const rect = element.getBoundingClientRect();
    const el = document.createElement('div');
    el.innerText = text; el.style.color = color; el.className = 'floating-text';
    el.style.left = (rect.left + rect.width / 2 - 20) + 'px'; el.style.top = (rect.top - 20) + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}

function triggerShake() {
    document.body.classList.add('shake-mode');
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(200);
    setTimeout(() => document.body.classList.remove('shake-mode'), 500);
}

// === БИЗНЕС ЛОГИКА ===
function renderBusiness() {
    const list = document.getElementById('business-list');
    if(!list) return;
    let html = `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; margin-bottom:15px; border-left: 3px solid var(--danger); font-size:11px; color:#aaa; line-height:1.4;">🏛️ <b>МУНИЦИПАЛЬНЫЙ ЗАКОН:</b><br>Прибыль от ведения бизнеса облагается налогом <b>${(SETTINGS.economy.business_tax*100).toFixed(0)}%</b>. Налог списывается автоматически.</div>`;
    let hasHouse = G.housing && G.housing.id !== -1;
    BUSINESS_META.forEach(biz => {
        if (!G.business[biz.id]) G.business[biz.id] = null; 
        let userBiz = G.business[biz.id]; let isOwned = !!userBiz;
        if (!isOwned) {
            let reason = !hasHouse ? "🔒 НУЖНА КВАРТИРА" : (G.lvl < biz.minLvl ? `🔒 НУЖЕН LVL ${biz.minLvl}` : `КУПИТЬ ${getBusinessPrice(biz.basePrice).toLocaleString()} PLN`);
            let canBuy = hasHouse && G.lvl >= biz.minLvl;
            html += `<div class="biz-card biz-locked"><div class="biz-header"><div style="display:flex; align-items:center;"><div class="biz-icon">${biz.icon}</div><div><div class="biz-title">${biz.name}</div><div style="font-size:10px; color:#aaa;">${biz.desc}</div></div></div></div><button class="btn-action" style="width:100%; margin-top:10px; ${canBuy ? "background:var(--accent-gold); color:black;" : "background:#334155; opacity:0.6;"}" ${canBuy ? `onclick="buyBusiness('${biz.id}')"` : ""}>${reason}</button></div>`;
        } else {
            let lastRes = userBiz.lastResult || { msg: "Ждет действий...", color: "#aaa" };
            let controls = "";
            if (biz.type === 'maintenance') controls = `<button class="btn-action" style="background:var(--accent-blue);" onclick="runVendingDeal('${biz.id}', this)">🔧 ОБСЛУЖИТЬ (-${getDynamicPrice(biz.dealCost).toFixed(0)} PLN)</button>`;
            else if (biz.type === 'lottery') controls = `<button class="btn-action" style="background:var(--success); color:black;" onclick="runVegeGamble('${biz.id}', this)">🎲 КУПИТЬ ПАРТИЮ (-${getDynamicPrice(biz.dealCost).toFixed(0)})</button>`;
            else if (biz.type === 'strategy') controls = `<div style="display:flex; gap:5px;"><button class="btn-action" style="flex:1; font-size:10px; background:#475569;" onclick="runKebabStrategy('${biz.id}', 'safe', this)">ЛЕГАЛЬНО</button><button class="btn-action" style="flex:1; font-size:10px; background:var(--accent-gold); color:black;" onclick="runKebabStrategy('${biz.id}', 'normal', this)">MIX</button><button class="btn-action" style="flex:1; font-size:10px; background:var(--danger);" onclick="runKebabStrategy('${biz.id}', 'risky', this)">ОПАСНО</button></div>`;
            else if (biz.type === 'high_stakes') controls = `<button class="btn-action" style="background:linear-gradient(45deg, #16a34a, #15803d);" onclick="runZabkaContract('${biz.id}', this)">📝 ПОДПИСАТЬ ПЛАН (-${getDynamicPrice(biz.dealCost).toFixed(0)} PLN)</button>`;
            html += `<div class="biz-card"><div class="biz-header"><div style="display:flex; align-items:center;"><div class="biz-icon">${biz.icon}</div><div><div class="biz-title">${biz.name} <span class="biz-level">Владелец</span></div></div></div></div><div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; text-align:center; font-size:11px; color:${lastRes.color}; margin:10px 0;">${lastRes.msg}</div><div class="biz-actions">${controls}</div></div>`;
        }
    });
    list.innerHTML = html;
}

function buyBusiness(id) {
    let biz = BUSINESS_META.find(b => b.id === id);
    let price = getBusinessPrice(biz.basePrice);
    if (G.money >= price) {
        G.money -= price; G.business[id] = { lastResult: { msg: "Куплено!", color: "var(--success)" } };
        save(); updateUI();
    }
}

function runBusinessAction(id, cost, btnEl, callback) {
    if (isBusinessBusy || G.money < cost || G.en < 25) { 
        if(G.en < 25) log("⚡ Нужна вода!", "var(--danger)"); triggerShake(); return; 
    }
    isBusinessBusy = true; G.money -= cost; G.en -= 25; save(); updateUI();
    let old = btnEl.innerText; btnEl.innerText = "⏳..."; 
    setTimeout(() => { isBusinessBusy = false; btnEl.innerText = old; callback(); }, 1500);
}

function applyBusinessResult(id, revenue, cost, text, color, btnEl) {
    let gross = revenue - cost; let tax = gross > 0 ? gross * SETTINGS.economy.business_tax : 0;
    revenue -= tax; G.money += revenue; if(revenue-cost > 0) G.totalEarned += (revenue-cost);
    G.business[id].lastResult = { msg: `${text} (${(revenue-cost).toFixed(0)} PLN)`, color: color };
    triggerFloatingText(`${(revenue-cost).toFixed(0)} PLN`, color, btnEl);
    save(); updateUI();
}

function runVendingDeal(id, btnEl) {
    let biz = BUSINESS_META.find(b => b.id === id); let cost = getDynamicPrice(biz.dealCost);
    runBusinessAction(id, cost, btnEl, () => {
        let r = Math.random(); let profit = r < 0.2 ? 0 : (r < 0.7 ? cost * 1.5 : cost * 3.0);
        applyBusinessResult(id, profit, cost, profit > 0 ? "✅ Доход" : "⚠️ Поломка", profit > 0 ? "var(--success)" : "var(--danger)", btnEl);
    });
}

function runVegeGamble(id, btnEl) {
    let biz = BUSINESS_META.find(b => b.id === id); let cost = getDynamicPrice(biz.dealCost);
    runBusinessAction(id, cost, btnEl, () => {
        let r = Math.random(); let profit = r < 0.35 ? cost * 0.2 : (r < 0.85 ? cost * 1.6 : cost * 4.0);
        applyBusinessResult(id, profit, cost, r < 0.35 ? "🤢 Гнилье" : "🥦 Продано", profit > cost ? "var(--success)" : "var(--danger)", btnEl);
    });
}

function runKebabStrategy(id, mode, btnEl) {
    let cost = getDynamicPrice(800) * (mode === 'safe' ? 1.5 : (mode === 'risky' ? 0.3 : 1));
    runBusinessAction(id, cost, btnEl, () => {
        let r = Math.random(); let profit = 0;
        if(mode === 'safe') profit = cost * 1.3;
        else if(mode === 'normal') profit = r < 0.2 ? cost * 0.5 : cost * 2.5;
        else profit = r < 0.5 ? 0 : cost * 8.0;
        applyBusinessResult(id, profit, cost, profit > 0 ? "🥙 Касса" : "👮 Облава", profit > 0 ? "var(--success)" : "var(--danger)", btnEl);
    });
}

function runZabkaContract(id, btnEl) {
    let biz = BUSINESS_META.find(b => b.id === id); let cost = getDynamicPrice(biz.dealCost);
    runBusinessAction(id, cost, btnEl, () => {
        let r = Math.random(); let profit = r < (0.4 + G.lvl*0.01) ? cost * 2.5 : cost * 0.5;
        applyBusinessResult(id, profit, cost, profit > cost ? "📈 План ОК" : "📉 Штраф", profit > cost ? "var(--accent-gold)" : "var(--danger)", btnEl);
    });
}

// === СТАНДАРТНАЯ ЛОГИКА ===
async function usePromo() {
    const input = document.getElementById('promo-input'); const code = input.value.toUpperCase();
    if (G.usedPromos.includes(code)) return;
    try {
        const res = await fetch('promos.json'); const data = await res.json();
        if (data[code]) {
            G.money += data[code].reward; G.usedPromos.push(code); input.value = "";
            save(); updateUI();
        }
    } catch (e) {}
}

const sphere = document.getElementById('work-sphere');
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); });
    sphere.addEventListener('mousedown', () => { if (!('ontouchstart' in window)) doWork(); });
}

function showBonus() {
    const overlay = document.getElementById('bonus-overlay'); const btn = document.getElementById('bonus-btn');
    btn.style.left = (Math.random()*(window.innerWidth-150))+'px'; btn.style.top = (Math.random()*(window.innerHeight-100))+'px';
    overlay.style.display = 'flex'; bonusActive = true;
}

function claimBonus() {
    document.getElementById('bonus-overlay').style.display = 'none'; bonusActive = false;
    G.money += 50; G.totalEarned += 50; addHistory('🎁 БОНУС', 50, 'plus');
    save(); updateUI();
}

function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50; G.waterStock += 500; G.bikeRentTime += 900; G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    G.starter_bag = { active: true, dur: 50 }; G.starter_phone = { active: true, dur: 50 };
    save(); updateUI();
}

function generateDailyQuests() {
    if (!G.dailyQuests || G.dailyQuests.length === 0 || (Date.now() - G.lastDailyUpdate > 86400000)) {
        G.dailyQuests = [
            { id: 1, type: 'clicks', text: "Клики", target: 500, current: 0, reward: 50, claimed: false },
            { id: 2, type: 'orders', text: "Заказы", target: 5, current: 0, reward: 100, claimed: false }
        ];
        G.lastDailyUpdate = Date.now(); save();
    }
}

function checkDailyQuests(type, amount) {
    G.dailyQuests?.forEach(q => { if(q.type === type && !q.claimed) q.current = Math.min(q.target, q.current + amount); });
}

function claimDaily(id) {
    let q = G.dailyQuests.find(x => x.id === id);
    if(q && !q.claimed && q.current >= q.target) { q.claimed = true; G.money += q.reward; save(); updateUI(); }
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }

function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) try { G = {...G, ...JSON.parse(d)}; } catch(e) {}
    if(G.isNewPlayer) document.getElementById('starter-modal').style.display = 'flex';
    generateDailyQuests(); updateUI(); 
}

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(4) + (G.housing.id !== -1 ? " 🏠" : "");
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('district-ui').innerText = "📍 " + DISTRICTS[G.district].name;
    
    // Обновление цен в магазине
    document.getElementById('btn-buy-water').innerText = getDynamicPrice('water').toFixed(2) + " PLN";
    document.getElementById('btn-buy-coffee').innerText = getDynamicPrice('coffee').toFixed(2) + " PLN";
    document.getElementById('btn-buy-energy').innerText = getDynamicPrice('energy').toFixed(2) + " PLN";

    // Обувь
    let shoeBar = document.getElementById('shoe-bar');
    if(shoeBar) shoeBar.style.width = (G.shoes.dur/G.shoes.maxDur*100) + "%";
    
    // Квесты бара
    const qBar = document.getElementById('quest-bar');
    if(order.visible && curView === 'main') {
        qBar.style.display = 'block';
        document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        document.getElementById('quest-timer-ui').innerText = order.active ? Math.floor(order.time/60)+":"+(order.time%60) : "0:"+order.offerTimer;
        document.getElementById('quest-progress-bar').style.width = (order.steps/order.target*100) + "%";
    } else qBar.style.display = 'none';

    if(curView === 'business') renderBusiness();
    renderBankFull();
}

function doWork() {
    if (isBroken || bonusActive) return;
    G.totalClicks++; checkDailyQuests('clicks', 1);
    
    // Авто-питье
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let drink = Math.min(G.waterStock, 50); G.en = Math.min(G.maxEn, G.en + drink); G.waterStock -= drink; 
    }
    
    if (order.active) {
        order.steps += (G.bikeRentTime > 0 ? 2 : 1);
        if(order.steps >= order.target) finishOrder(true);
    } else if(!order.visible && Math.random() < 0.2) generateOrder();

    let gain = 0.1 * DISTRICTS[G.district].mult; G.money += gain; G.lvl += 0.0001;
    save(); updateUI();
}

function generateOrder() {
    order.visible = true; order.offerTimer = 15; order.active = false;
    order.reward = (5 + Math.random()*10) * DISTRICTS[G.district].mult;
    order.target = 200; order.steps = 0; order.time = 60;
}

function acceptOrder() { order.active = true; closeRouteModal(); updateUI(); }
function openRouteModal() { document.getElementById('route-modal').style.display = 'flex'; }
function closeRouteModal() { document.getElementById('route-modal').style.display = 'none'; }

function buyDrink(type, basePriceVal) { 
    let priceKey = type === 'coffee' ? 'coffee' : 'energy';
    let price = getDynamicPrice(priceKey); 
    
    // ПРОВЕРКА: Если покупаем кофе, проверяем, не полная ли энергия
    if (type === 'coffee' && G.en >= G.maxEn) {
        log("⚡ Вы полны сил! Кофе не влезет.", "var(--accent-blue)");
        tg.HapticFeedback.notificationOccurred('warning');
        return;
    }

    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory(type.toUpperCase(), price, 'minus'); 
        
        if(type === 'coffee') {
            G.en = Math.min(G.maxEn, G.en + 300); 
            log("☕ Эспрессо выпит! +300 Энергии", "var(--success)");
        } else { 
            G.buffTime += 120; 
            log("🔋 Энергетик активен! Расход энергии стоп на 2 мин.", "var(--purple)");
        } 
        save(); updateUI(); 
    } else { 
        log("Нужно " + price + " PLN", "var(--danger)"); 
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function buyWater() { 
    let p = getDynamicPrice('water');
    if(G.money >= p) { G.money -= p; G.waterStock += 1500; save(); updateUI(); }
}

function finishOrder(win) {
    if(win) { G.money += order.reward; G.totalOrders++; checkDailyQuests('orders', 1); }
    order.visible = false; order.active = false; save(); updateUI();
}

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v)?.classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    el?.classList.add('active'); updateUI(); 
}

function renderBankFull() {
    const actUI = document.getElementById('bank-active-ui');
    const selUI = document.getElementById('bank-select-ui');
    if(!actUI || !selUI) return;
    if(G.deposit) { actUI.style.display = 'block'; selUI.style.display = 'none'; }
    else { actUI.style.display = 'none'; selUI.style.display = 'block'; }
}

setInterval(() => {
    if(G.tax > 0) G.tax--; else { G.tax = 300; if(G.money > 200) G.money *= 0.85; }
    if(G.rent > 0) G.rent--; else { G.rent = 300; G.money -= 20; }
    if(G.buffTime > 0) G.buffTime--;
    if(G.autoTime > 0) G.autoTime--;
    if(order.visible && !order.active) { order.offerTimer--; if(order.offerTimer<=0) order.visible = false; }
    if(order.active) { order.time--; if(order.time<=0) finishOrder(false); }
    updateUI();
}, 1000);

window.onload = load;
