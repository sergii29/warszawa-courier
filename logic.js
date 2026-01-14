// --- logic.js v5.1 (Fixed Shop + Dynamic Prices) ---
const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// --- КОНФИГУРАЦИЯ ---
const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

const DISTRICTS = [
    { name: "Praga", desc: "Район контрастов. Дешево и сердито.", minLvl: 0, rentPct: 0.05, mult: 1, basePrice: 0, perk: "Нет бонусов" },       
    { name: "Mokotów", desc: "Спальный район для среднего класса.", minLvl: 2.5, rentPct: 0.10, mult: 1.5, basePrice: 150, perk: "💰 Доход х1.5" }, 
    { name: "Śródmieście", desc: "Центр. Туристы, пробки и деньги.", minLvl: 5.0, rentPct: 0.15, mult: 1.6, basePrice: 500, perk: "🔥 Доход х1.6" },
    { name: "Wola", desc: "Стеклянные небоскребы. Ровный асфальт.", minLvl: 8.0, rentPct: 0.18, mult: 1.8, basePrice: 1200, perk: "⚡ Энергия -10%" },
    { name: "Wilanów", desc: "Королевский район. Элита и мажоры.", minLvl: 15.0, rentPct: 0.25, mult: 2.2, basePrice: 5000, perk: "💎 Чаевые х2" }
];

const SHOES_MODELS = [
    { id: 'Abibas', name: 'Abibas Ultra', desc: 'Классика района.', icon: '🐼', basePrice: 50, durability: 100, bonus: 0, color: 'var(--purple)' },
    { id: 'Jorban', name: 'Jorban Air', desc: 'Премиум стиль.', icon: '🔥', basePrice: 250, durability: 150, bonus: 0.2, color: 'var(--gold)' }
];

const UPGRADES = [
    { id: 'starter_bag', name: 'Старый Рюкзак', icon: '🎒', desc: 'Лучше, чем в руках.', basePrice: 0, bonus: '+2% PLN', maxDur: 40, repairPrice: 5, hidden: true },
    { id: 'starter_phone', name: 'Древний Телефон', icon: '📱', desc: 'Звонит и ладно.', basePrice: 0, bonus: 'Связь', maxDur: 40, repairPrice: 5, hidden: true },
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', basePrice: 350, bonus: '+15% PLN', maxDur: 100, repairPrice: 70 }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', basePrice: 1200, bonus: 'Заказы x1.4', maxDur: 100, repairPrice: 250 }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', basePrice: 500, bonus: '⚡ -30%', maxDur: 100, repairPrice: 100 },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', basePrice: 250, bonus: '🛡️ Безопасность', maxDur: 50, repairPrice: 50 },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', basePrice: 180, bonus: '☔ Сухость', maxDur: 80, repairPrice: 40 },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', basePrice: 400, bonus: '🤖 +50% времени', maxDur: 100, repairPrice: 80 }
];

let G = { 
    money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, 
    tax: 300, rent: 300, waterStock: 0, 
    totalOrders: 0, totalClicks: 0, totalBottles: 0, totalEarned: 0, 
    autoTime: 0, district: 0, bikeRentTime: 0, buffTime: 0, blindTime: 0, 
    history: [], usedPromos: [], isNewPlayer: true, lastWelfare: 0, lastAdminUpdate: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
    starter_bag: null, starter_phone: null,
    bag: null, phone: null, scooter: null, helmet: null, raincoat: null, powerbank: null,
    dailyQuests: [], lastDailyUpdate: 0,
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ],
    lastActive: Date.now()
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false, repairProgress = 0; 
let lastClickTime = 0, clicksSinceBonus = 0, bonusActive = false;
let isSearching = false, spamCounter = 0;

// --- UTILS ---

// ГЛАВНАЯ ФУНКЦИЯ ЭКОНОМИКИ: ЦЕНА ЗАВИСИТ ОТ УРОВНЯ
function getPrice(base) {
    if (base === 0) return 0;
    // Формула: Цена растет на 40% за каждый уровень
    let mult = 1 + (G.lvl * 0.4); 
    return Math.ceil(base * mult);
}

function addHistory(msg, val, type = 'plus') {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    if (!G.history) G.history = [];
    G.history.unshift({ time, msg, val, type });
    if (G.history.length > 20) G.history.pop();
}

function log(msg, color = "#eee") { 
    const logEl = document.getElementById('game-log'); 
    if(!logEl) return;
    const entry = document.createElement('div'); 
    entry.className = "log-entry"; 
    entry.style.color = color; 
    entry.innerText = "[" + new Date().toLocaleTimeString().split(' ')[0] + "] " + msg; 
    logEl.appendChild(entry); 
    if (logEl.childNodes.length > 5) logEl.removeChild(logEl.firstChild); 
}

// --- GAMEPLAY ---

const sphere = document.getElementById('work-sphere');
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); }, {passive: false});
    sphere.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) doWork(); });
}

function doWork() {
    G.totalClicks++; 
    checkDailyQuests('clicks', 1);

    if (isBroken) {
        repairProgress++;
        G.en = Math.max(0, G.en - 5); 
        tg.HapticFeedback.impactOccurred('heavy');
        if (repairProgress >= 50) {
            isBroken = false; repairProgress = 0;
            log("🔧 Вы починили транспорт!", "var(--success)");
            tg.HapticFeedback.notificationOccurred('success');
        }
        updateUI(); save(); return;
    }

    if (bonusActive) {
        G.en = Math.max(0, G.en - 50); 
        tg.HapticFeedback.notificationOccurred('error');
        updateUI(); return; 
    }
    
    let now = Date.now();
    if (now - lastClickTime < 80) return; 
    lastClickTime = now;
    
    if (order.visible && !order.active) {
        G.en = Math.max(0, G.en - 25); 
        updateUI(); tg.HapticFeedback.notificationOccurred('error'); return; 
    }
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
        let drink = Math.min(G.waterStock, 50); 
        G.en = Math.min(G.maxEn, G.en + (drink * eff)); 
        G.waterStock -= drink; 
    }
    if (G.en < 1) return;
    
    clicksSinceBonus++;
    if (clicksSinceBonus > (300 + Math.random() * 100)) { showBonus(); clicksSinceBonus = 0; }

    if (G.shoes.dur > 0) {
        G.shoes.dur -= 0.05; 
        if(G.shoes.dur < 0) G.shoes.dur = 0; 
    }

    UPGRADES.forEach(up => {
        if (G[up.id] && G[up.id].dur > 0) {
            let wear = 0.02; 
            if (up.id === 'helmet' && order.isRiskyRoute) wear = 0.5; 
            if (up.id === 'scooter') wear = 0.05; 
            G[up.id].dur -= wear;
            if (G[up.id].dur <= 0) {
                G[up.id].dur = 0;
                if (Math.random() < 0.05) log("⚠️ " + up.name + " сломан! Зашей его!", "var(--danger)");
            }
        }
    });

    if(order.active) { 
        consumeResources(true); 
        let speed = (G.bikeRentTime > 0 ? 2 : 1);
        if (order.isRiskyRoute) speed *= 2; 
        if (G.shoes.dur <= 0) speed *= 0.7; 
        order.steps += speed;
        if (G.bikeRentTime > 0 && Math.random() < 0.002) { triggerBreakdown(); return; } 
        if(order.steps >= order.target) finishOrder(true); 
        updateUI(); save(); return; 
    }
    
    if(!order.visible && Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); 
    
    consumeResources(false);
    
    let rankBonus = 0;
    if (G.totalOrders >= 50) rankBonus = 0.05;
    if (G.totalOrders >= 150) rankBonus = 0.10;
    if (G.totalOrders >= 400) rankBonus = 0.20;

    let bagBonus = 1;
    if (G.bag && G.bag.dur > 0) bagBonus = 1.15;
    else if (G.starter_bag && G.starter_bag.dur > 0) bagBonus = 1.02;

    let distMult = DISTRICTS[G.district] ? DISTRICTS[G.district].mult : 1;

    let gain = 0.10 * Math.max(0.1, G.lvl) * distMult * (1 + rankBonus) * bagBonus;
    
    G.money = parseFloat((G.money + gain).toFixed(2));
    G.totalEarned += gain; 
    checkDailyQuests('earn', gain); 
    G.lvl += 0.00025; 
    checkMilestones(); 
    updateUI(); save();
}

function consumeResources(isOrder) {
    let waterCost = isOrder ? 10 : 3;
    if (G.buffTime > 0) waterCost = isOrder ? 8 : 2; 
    G.waterStock = Math.max(0, G.waterStock - waterCost);
    if (G.buffTime > 0) return; 

    let cost = (G.scooter ? 7 : 10); 
    if (G.bikeRentTime > 0) cost *= 0.5; 
    let rainMod = (weather === "Дождь" && !G.raincoat) ? 1.2 : 1;
    cost *= rainMod; 
    if (isOrder) cost *= 1.5; 
    if (G.district === 3) cost *= 0.9; // Wola perk
    G.en = Math.max(0, G.en - cost); 
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; order.offerTimer = 15; 
    order.isCriminal = Math.random() < 0.12; 
    
    if (order.isCriminal) tg.HapticFeedback.notificationOccurred('error'); 
    else tg.HapticFeedback.notificationOccurred('success'); 

    let d = 0.5 + Math.random() * 3.5; 
    let bagBonus = (G.bag && G.bag.dur > 0) ? 1.15 : ((G.starter_bag && G.starter_bag.dur > 0) ? 1.02 : 1);
    let distMult = DISTRICTS[G.district] ? DISTRICTS[G.district].mult : 1;

    let baseRew = (3.80 + d * 2.2) * Math.max(0.1, G.lvl) * distMult * bagBonus * (weather === "Дождь" ? 1.5 : 1); 
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; } 
    order.baseReward = baseRew; order.reward = baseRew;
    order.target = Math.floor(d * 160); order.steps = 0; 
    order.time = Math.floor(order.target / 1.5 + 45); 
    order.isRiskyRoute = false; 
    updateUI(); 
}

// --- SHOPS & SERVICES (UPDATED PRICES) ---

function buyWater() { 
    let price = getPrice(1.50);
    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        G.waterStock += 1500; 
        addHistory('🧴 ВОДА', price, 'minus'); 
        save(); updateUI(); 
    } 
}

function buyDrink(type, baseP) { 
    let price = getPrice(baseP);
    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory(type.toUpperCase(), price, 'minus'); 
        if(type === 'coffee') G.en = Math.min(G.maxEn, G.en + 300); 
        else G.buffTime += 120; 
        save(); updateUI(); 
    } 
}

function rentBike() { 
    let price = getPrice(30);
    if (G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory('🚲 ВЕЛИК', price, 'minus'); 
        G.bikeRentTime += 600; 
        save(); updateUI(); 
    } 
}

function repairBikeInstant() {
    let price = getPrice(15);
    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        isBroken = false; repairProgress = 0;
        addHistory('🔧 РЕМОНТ', price, 'minus');
        log("Велик починен!", "var(--success)");
        save(); updateUI();
    } else {
        log("Нет денег (" + price + " PLN)!", "var(--danger)");
    }
}

function activateAutopilot() { 
    closeRouteModal();
    let price = getPrice(45);
    if(G.money >= price && G.lvl >= 0.15) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        G.lvl -= 0.15; 
        let hasPower = (G.powerbank && G.powerbank.dur > 0);
        let timeAdd = hasPower ? 900 : 600; 
        G.autoTime += timeAdd; 
        addHistory('АВТОПИЛОТ', price, 'minus'); 
        acceptOrder(); save(); updateUI(); 
    } else {
        log("Надо " + price + " PLN и LVL!", "var(--danger)");
    }
}

function buyShoes(id) {
    let model = SHOES_MODELS.find(s => s.id === id);
    if (!model) return;
    
    if (G.shoes.name === model.name && G.shoes.dur > 0) {
        log("У вас уже есть эти кроссы!", "var(--danger)"); return;
    }

    let price = getPrice(model.basePrice);
    if (G.money >= price) {
        G.money -= price;
        G.shoes = { name: model.name, maxDur: model.durability, dur: model.durability, bonus: model.bonus };
        addHistory('👟 ' + model.name, price, 'minus');
        log("Куплены " + model.name + "!", "var(--purple)");
        save(); updateUI();
    } else {
        log("Не хватает денег (" + price + ")!", "var(--danger)");
    }
}

function buyInvest(type) { 
    let conf = UPGRADES.find(u => u.id === type);
    if (!conf) return;
    let price = getPrice(conf.basePrice);
    
    if(!G[type] && G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        let maxDur = conf.maxDur || 100;
        G[type] = { active: true, dur: maxDur };
        addHistory('ИНВЕСТ', price, 'minus'); 
        save(); updateUI(); 
    } 
}

function repairItem(type) {
    if (!G[type]) return;
    let conf = UPGRADES.find(u => u.id === type);
    let max = conf ? conf.maxDur : 100;
    if (G[type].dur >= max) { log("Целое!", "var(--accent-blue)"); return; }

    let price = getPrice(conf.repairPrice);
    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        G[type].dur = max;
        addHistory('🛠️ РЕМОНТ', price, 'minus');
        save(); updateUI();
    } else {
        log("Нет денег (" + price + ")", "var(--danger)");
    }
}

function sellInvest(type) {
    if(!G[type]) return;
    let conf = UPGRADES.find(u => u.id === type);
    // Продаем за 40% от ТЕКУЩЕЙ рыночной цены (инфляция помогает и тут)
    let sellPrice = Math.floor(getPrice(conf.basePrice) * 0.4);
    
    G.money = parseFloat((G.money + sellPrice).toFixed(2)); 
    G[type] = null; 
    addHistory('💸 ЛОМБАРД', sellPrice, 'plus'); 
    log("Продано за " + sellPrice + " PLN", "var(--gold)");
    save(); updateUI();
}

function moveDistrict(id) { 
    if (G.district === id) return;
    let d = DISTRICTS[id];
    let price = getPrice(d.basePrice);
    
    if (G.money < price || G.lvl < d.minLvl) {
        log("Надо " + price + " PLN и " + d.minLvl + " LVL", "var(--danger)");
        return;
    }
    G.money = parseFloat((G.money - price).toFixed(2)); 
    addHistory('🏙️ ПЕРЕЕЗД', price, 'minus'); 
    G.district = id; 
    save(); updateUI(); 
}

// --- RENDERING ---

function updateShopPrices() {
    // Эта функция обновляет только цифры на кнопках, не ломая верстку
    const btnWater = document.getElementById('btn-water');
    if(btnWater) btnWater.innerText = getPrice(1.50) + " PLN";

    const btnCoffee = document.getElementById('btn-coffee');
    if(btnCoffee) btnCoffee.innerText = getPrice(5.00) + " PLN";

    const btnEnergy = document.getElementById('btn-energy');
    if(btnEnergy) btnEnergy.innerText = getPrice(12.00) + " PLN";

    const btnAbibas = document.getElementById('btn-abibas');
    if(btnAbibas) btnAbibas.innerText = getPrice(50) + " PLN";

    const btnJorban = document.getElementById('btn-jorban');
    if(btnJorban) btnJorban.innerText = getPrice(250) + " PLN";
}

// ОСТАЛЬНЫЕ ФУНКЦИИ
function openRouteModal() {
    const autoBtn = document.getElementById('btn-auto-route');
    const autoLabel = document.getElementById('lbl-auto-route');
    const autoDesc = document.getElementById('desc-auto-route');
    let cost = getPrice(45); // Динамическая цена

    if (G.autoTime > 0) {
        autoLabel.innerHTML = "<b>🤖 ПОРУЧИТЬ РОБОТУ</b>";
        autoDesc.innerHTML = "<small style='color:var(--success)'>Активно: " + Math.floor(G.autoTime/60) + " мин</small>";
        autoBtn.onclick = function() { closeRouteModal(); acceptOrder(); log("🤖 Робот принял заказ", "var(--accent-gold)"); };
    } else {
        autoLabel.innerHTML = "<b>🤖 КУПИТЬ АВТО (" + cost + " PLN)</b>";
        autoDesc.innerHTML = "<small style='color:var(--accent-gold)'>Робот сделает всё сам</small>";
        autoBtn.onclick = function() { activateAutopilot(); };
    }
    document.getElementById('route-modal').style.display = 'flex';
}
function closeRouteModal() { document.getElementById('route-modal').style.display = 'none'; }
function acceptOrder() { order.active = true; updateUI(); }
function collectBottles() { 
    if (isSearching) {
        spamCounter++;
        if (spamCounter > 15) {
            log("🤖 Руки не мельница!", "var(--danger)"); tg.HapticFeedback.notificationOccurred('error');
            G.money = Math.max(0, G.money - 100); G.lvl -= 0.1; spamCounter = 0; updateUI();
        }
        return; 
    }
    isSearching = true; spamCounter = 0;
    const btn = document.querySelector("button[onclick='collectBottles()']");
    const originalText = btn ? btn.innerText : "♻️ СБОР БУТЫЛОК";
    if(btn) { btn.innerText = "⏳ Роемся..."; btn.style.opacity = "0.6"; }
    setTimeout(() => {
        G.money = parseFloat((G.money + 0.05).toFixed(2)); G.totalEarned += 0.05; checkDailyQuests('earn', 0.05);
        G.totalBottles++; G.lvl += (G.lvl < 1.0 ? 0.02 : 0.002);
        checkMilestones(); save(); updateUI(); 
        isSearching = false; if(btn) { btn.innerText = originalText; btn.style.opacity = "1"; }
    }, 1200); 
}
function showBonus() { document.getElementById('bonus-overlay').style.display = 'flex'; bonusActive = true; tg.HapticFeedback.notificationOccurred('warning'); }
function claimBonus() {
    document.getElementById('bonus-overlay').style.display = 'none'; bonusActive = false; clicksSinceBonus = 0;
    G.money = parseFloat((G.money + 50).toFixed(2)); G.totalEarned += 50;
    addHistory('🎁 БОНУС', 50, 'plus'); log("Вы забрали +50 PLN", "var(--success)"); tg.HapticFeedback.notificationOccurred('success'); save(); updateUI();
}
function checkStarterPack() { 
    if (G.isNewPlayer === undefined) G.isNewPlayer = (G.totalOrders === 0);
    if (G.isNewPlayer) document.getElementById('starter-modal').style.display = 'flex'; 
}
function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50; G.waterStock += 500; G.bikeRentTime += 900; G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    G.starter_bag = { active: true, dur: 50 }; G.starter_phone = { active: true, dur: 50 };
    addHistory('🎁 STARTER', 50, 'plus'); save(); updateUI();
}
function finishOrder(win) { 
    if(!order.active) return;
    order.active = false; 
    if(win) { 
        if (order.isRiskyRoute) {
            let riskRoll = Math.random();
            let hasHelmet = (G.helmet && G.helmet.dur > 0);
            let riskChance = hasHelmet ? 0.15 : 0.30; 
            if (riskRoll < riskChance) { 
                log("💥 АВАРИЯ!", "var(--danger)"); isBroken = true; repairProgress = 0;
                G.money = parseFloat((G.money - 20).toFixed(2)); addHistory('💥 АВАРИЯ', 20, 'minus');
                order.visible = false; updateUI(); save(); return; 
            }
        }
        let policeChance = order.isCriminal ? 0.35 : 0.02; 
        if(Math.random() < policeChance) { 
            let fine = (G.lvl < 2) ? 50 : 150; G.lvl -= 1.2; G.money = parseFloat((G.money - fine).toFixed(2)); 
            addHistory('👮 ШТРАФ', fine, 'minus'); log("🚔 Штраф -" + fine, "var(--danger)"); 
        } else { 
            G.money = parseFloat((G.money + order.reward).toFixed(2)); G.totalEarned += order.reward; 
            addHistory('📦 ЗАКАЗ', order.reward.toFixed(2), 'plus'); G.lvl += (order.isCriminal ? 0.12 : 0.015); G.totalOrders++; 
            checkDailyQuests('orders', 1); checkDailyQuests('earn', order.reward); 
            if(Math.random() < 0.40) { 
                let tip = parseFloat((5 + Math.random()*15).toFixed(2)); 
                if (order.isRiskyRoute) tip *= 2; if (G.district === 4) tip *= 2; 
                if (G.shoes && G.shoes.bonus > 0) tip *= (1 + G.shoes.bonus);
                G.money = parseFloat((G.money + tip).toFixed(2)); G.totalEarned += tip; 
                addHistory('💰 ЧАЕВЫЕ', tip, 'plus'); 
            } 
        } 
    } 
    order.visible = false; updateUI(); save(); 
}
function chooseRoute(type) {
    closeRouteModal();
    if (type === 'safe') {
        order.isRiskyRoute = false;
    } else if (type === 'risky') {
        order.isRiskyRoute = true;
        order.time = Math.floor(order.time * 0.5); 
    }
    acceptOrder();
}
function openProShop() {
    const el = document.getElementById('pro-shop-modal');
    if(el) el.style.display = 'flex';
}
function closeProShop() {
    const el = document.getElementById('pro-shop-modal');
    if(el) el.style.display = 'none';
}
function generateDailyQuests() {
    if (!G.dailyQuests || G.dailyQuests.length === 0 || (Date.now() - G.lastDailyUpdate > 86400000)) {
        G.dailyQuests = [];
        let targetClicks = 300 + Math.floor(Math.random() * 500);
        let rewardClicks = Math.floor(targetClicks / 10);
        G.dailyQuests.push({ id: 1, type: 'clicks', text: "Сделай " + targetClicks + " кликов", target: targetClicks, current: 0, reward: rewardClicks, claimed: false });

        let targetOrders = 3 + Math.floor(Math.random() * 5);
        let rewardOrders = targetOrders * 15;
        G.dailyQuests.push({ id: 2, type: 'orders', text: "Выполни " + targetOrders + " заказов", target: targetOrders, current: 0, reward: rewardOrders, claimed: false });

        let targetEarn = 100 + Math.floor(Math.random() * 200);
        let rewardEarn = Math.floor(targetEarn * 0.2);
        G.dailyQuests.push({ id: 3, type: 'earn', text: "Заработай " + targetEarn + " PLN", target: targetEarn, current: 0, reward: rewardEarn, claimed: false });

        G.lastDailyUpdate = Date.now();
        save();
        updateUI();
    }
}
function checkDailyQuests(type, amount) {
    if (!G.dailyQuests) return;
    let updated = false;
    G.dailyQuests.forEach(q => {
        if (q.type === type && !q.claimed && q.current < q.target) {
            q.current += amount;
            if (q.current > q.target) q.current = q.target;
            updated = true;
        }
    });
    if (updated) { save(); updateUI(); }
}
function claimDaily(id) {
    const q = G.dailyQuests.find(x => x.id === id);
    if (q && !q.claimed && q.current >= q.target) {
        q.claimed = true;
        G.money = parseFloat((G.money + q.reward).toFixed(2));
        G.totalEarned += q.reward;
        addHistory('📅 ЗАДАНИЕ', q.reward, 'plus');
        log("Задание выполнено! +" + q.reward, "var(--gold)");
        save(); updateUI();
    }
}
function checkMilestones() { 
    if(!G.activeMilestones) return;
    G.activeMilestones.forEach((m, i) => { 
        let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; 
        if(cur >= m.goal) { 
            G.money = parseFloat((G.money + m.reward).toFixed(2)); 
            G.totalEarned += m.reward;
            addHistory('🏆 ЦЕЛЬ', m.reward, 'plus'); 
            G.lvl += 0.01; 
            log("🏆 ДОСТИЖЕНИЕ: " + m.name, "var(--gold)"); 
            G.activeMilestones[i] = { id: Date.now()+i, name: m.name, goal: cur + Math.floor(m.goal*0.6), type: m.type, reward: m.reward + 20 }; 
            save(); 
        } 
    }); 
}
function renderMilestones() { 
    if(!G.activeMilestones) return;
    document.getElementById('milestones-list').innerHTML = G.activeMilestones.map(m => { 
        let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; 
        return "<div class='card' style='margin-top:8px;'><b>" + m.name + "</b><br><small style='color:var(--gold);'>Награда: " + m.reward + " PLN</small><div class='career-progress'><div class='career-fill' style='width:" + Math.min(100,(cur/m.goal*100)) + "%'></div></div><small>" + cur + "/" + m.goal + "</small></div>"; 
    }).join(''); 
}
function usePromo() {
    const inputField = document.getElementById('promo-input');
    const code = inputField.value.trim().toUpperCase();
    if (!G.usedPromos) G.usedPromos = [];
    if (G.usedPromos.includes(code)) { log("Уже использовано!", "var(--danger)"); return; }

    // Простая проверка (можно через fetch, но оставим локально для надежности)
    if(code === "WARSZAWA2025") {
        G.money += 2025; G.totalEarned += 2025; G.usedPromos.push(code);
        addHistory('🎁 PROMO', 2025, 'plus'); save(); updateUI();
    } else {
        // Попытка загрузить из файла (как было)
        fetch('promos.json?nocache=' + Date.now()).then(r => r.json()).then(data => {
            if (data[code]) {
                let reward = data[code].reward;
                G.money = parseFloat((G.money + reward).toFixed(2));
                G.totalEarned += reward;
                G.usedPromos.push(code);
                addHistory('🎁 ПРОМО', reward, 'plus');
                log("🎁 " + data[code].msg + " +" + reward, "var(--gold)");
                save(); updateUI();
            } else { log("Неверный код!", "var(--danger)"); }
        }).catch(e => log("Ошибка или неверный код!", "var(--danger)"));
    }
    inputField.value = "";
}
function exchangeLvl(l, m) { 
    if(G.lvl >= l) { 
        if (m > 200 && Math.random() < 0.3) {
            G.blindTime = 600; 
            log("👁️ БАНК СКРЫЛ СЧЕТА НА 10 МИН!", "var(--danger)");
        }
        G.lvl -= l; 
        G.money = parseFloat((G.money + m).toFixed(2)); 
        G.totalEarned += m;
        checkDailyQuests('earn', m);
        addHistory('💎 ОБМЕН', m, 'plus'); 
        save(); updateUI(); 
    } 
}
function getWelfare() {
    let now = Date.now();
    if (G.money >= 0) { log("Только для должников!", "var(--danger)"); return; }
    if (now - G.lastWelfare < 600000) { log("Жди еще...", "var(--danger)"); return; }
    G.money = parseFloat((G.money + 30).toFixed(2));
    G.lastWelfare = now; addHistory('👵 БАБУШКА', 30, 'plus');
    save(); updateUI();
}
function buyLvl(cost, amount) {
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        G.lvl += amount; addHistory('📈 PR-ХОД', cost, 'minus');
        save(); updateUI();
    } else { log("Не хватает денег!", "var(--danger)"); }
}
function renderBank() { 
    const ui = document.getElementById('bank-actions-ui'); 
    if(!ui) return;
    let creditHTML = "";
    if (G.money < 0) {
        creditHTML = "<button class='btn-action' style='background:var(--purple)' onclick='getWelfare()'>📞 ПОЗВОНИТЬ БАБУШКЕ (+30 PLN)</button><small style='color:#aaa; display:block; margin-top:5px; text-align:center;'>Только если баланс меньше нуля.</small>";
    } else if (G.debt <= 0) {
        creditHTML = "<button class='btn-action' onclick=\"G.money=parseFloat((G.money+50).toFixed(2));G.debt=50;addHistory('🏦 КРЕДИТ', 50, 'plus');updateUI();save();\">ВЗЯТЬ КРЕДИТ (50 PLN)</button>";
    } else {
        creditHTML = "<button class='btn-action' style='background:var(--success)' onclick=\"if(G.money>=G.debt){G.money=parseFloat((G.money-G.debt).toFixed(2));addHistory('🏦 ДОЛГ', G.debt, 'minus');G.debt=0;updateUI();save();}\">ВЕРНУТЬ ДОЛГ (" + G.debt + " PLN)</button>";
    }
    let buyLvlHTML = `
        <div style="margin-top:15px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
            <h4 style="margin:0 0 8px 0; font-size:12px; color:var(--accent-blue);">📈 Инвестиции в себя (Купить LVL)</h4>
            <div style="display:flex; gap:8px;">
                 <button class="btn-action btn-secondary" style="flex:1; font-size:10px; padding:8px;" onclick="buyLvl(75, 0.10)">КУПИТЬ +0.1 LVL<br>🔴 75 PLN</button>
                 <button class="btn-action btn-secondary" style="flex:1; font-size:10px; padding:8px;" onclick="buyLvl(350, 0.50)">КУПИТЬ +0.5 LVL<br>🔴 350 PLN</button>
            </div>
        </div>`;
    ui.innerHTML = creditHTML + buyLvlHTML;
}
function saveToCloud() { /* (Упрощено для локальной версии) */ }
function listenToCloud() { /* (Упрощено для локальной версии) */ }
function validateInventory() {
    UPGRADES.forEach(up => {
        if(G[up.id] && G[up.id].dur > up.maxDur) G[up.id].dur = up.maxDur;
    });
}

function updateUI() {
    const moneyEl = document.getElementById('money-val');
    if(!moneyEl) return;
    const isBlind = G.blindTime > 0; 
    if (isBlind) { moneyEl.innerText = "🔒 СКРЫТО"; moneyEl.style.color = "#aaa"; } 
    else { moneyEl.innerText = G.money.toFixed(2) + " PLN"; moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)"; }
    
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(3);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('district-ui').innerText = "📍 " + (DISTRICTS[G.district] ? DISTRICTS[G.district].name : "???");
    
    document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
    document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
    document.getElementById('buff-status-ui').style.display = G.buffTime > 0 ? 'block' : 'none';
    
    let shoeBar = document.getElementById('shoe-bar');
    if(shoeBar) {
        let sPct = (G.shoes.dur / G.shoes.maxDur) * 100;
        shoeBar.style.width = sPct + "%";
        shoeBar.style.background = sPct < 20 ? "var(--danger)" : "var(--purple)";
        document.getElementById('shoe-name').innerText = G.shoes.dur <= 0 ? "⚠️ БОСИКОМ" : G.shoes.name;
    }

    // ОБНОВЛЯЕМ ЦЕНЫ НА КНОПКАХ (ЕСЛИ ОНИ ЕСТЬ)
    updateShopPrices();

    // Обновление цен в Pro Shop (всплывашка)
    const proList = document.getElementById('shop-upgrades-list'); 
    if(proList) {
        proList.innerHTML = ''; 
        UPGRADES.forEach(up => { 
            if(!G[up.id] && !up.hidden) { 
                let p = getPrice(up.basePrice);
                let div = document.createElement('div'); div.className = 'card'; div.style.marginBottom = '8px'; 
                div.innerHTML = "<b>" + up.icon + " " + up.name + "</b><br><small style='color:#aaa;'>" + up.desc + "</small><br><button class='btn-action' style='margin-top:8px;' onclick=\"buyInvest('" + up.id + "')\">КУПИТЬ (" + p + " PLN)</button>"; 
                proList.appendChild(div); 
            }
        });
    }
    
    let rentP = getPrice(30);
    document.getElementById('buy-bike-rent').innerText = G.bikeRentTime > 0 ? "В АРЕНДЕ" : "АРЕНДОВАТЬ ("+rentP+" PLN)";

    let repairP = getPrice(15);
    document.getElementById('repair-express-btn').innerHTML = `<button class="btn-action" style="background:var(--accent-gold); color:black; width:auto; padding:8px 15px;" onclick="repairBikeInstant()">🔧 ЭКСПРЕСС РЕМОНТ (${repairP} PLN)</button><div style="font-size:10px; color:#777; margin-top:5px;">Или кликай по сфере (бесплатно)</div>`;

    if (isBroken) {
        sphere.classList.add('broken'); document.getElementById('sphere-text').innerText = "ЧИНИТЬ";
        document.getElementById('repair-express-btn').style.display = 'block';
        document.getElementById('click-rate-ui').innerText = repairProgress + " / 50";
        document.getElementById('repair-progress').style.height = (repairProgress * 2) + "%";
    } else {
        sphere.classList.remove('broken'); document.getElementById('sphere-text').innerText = "РАБОТАТЬ";
        document.getElementById('repair-express-btn').style.display = 'none';
        document.getElementById('repair-progress').style.height = "0%";
        let distMult = DISTRICTS[G.district] ? DISTRICTS[G.district].mult : 1;
        let rate = (0.10 * Math.max(0.1, G.lvl) * distMult).toFixed(2);
        if(order.visible && !order.active) rate = "ПРИМИ ЗАКАЗ!"; 
        document.getElementById('click-rate-ui').innerText = isBlind ? "?.??" : rate + " PLN";
    }

    renderDistricts();
    
    // Инвентарь
    const myItemsList = document.getElementById('my-items-list');
    if (myItemsList) {
        myItemsList.innerHTML = '';
        const shoeDiv = document.createElement('div');
        shoeDiv.className = 'shop-item item-shoes';
        let shoeStatusText = Math.floor(G.shoes.dur) + "%";
        let isShoesBroken = G.shoes.dur <= 0;
        if (isShoesBroken) { shoeDiv.classList.add('item-broken'); shoeStatusText = "0%"; }
        shoeDiv.innerHTML = `<div class="shop-icon">👟</div><div style="flex:1;"><div class="shop-title">${G.shoes.name}</div><div class="shop-desc" style="margin-bottom:5px;">${isShoesBroken ? '<b style="color:var(--danger)">СЛОМАНО!</b>' : 'Бонус: ' + (G.shoes.bonus*100) + '%'}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${G.shoes.dur}%; background:${isShoesBroken ? 'var(--danger)' : 'var(--success)'}"></div></div></div>`;
        if(isShoesBroken) { shoeDiv.onclick = function() { switchTab('shop', document.querySelectorAll('.tab-item')[2]); }; }
        myItemsList.appendChild(shoeDiv);

        UPGRADES.forEach(up => {
            if(G[up.id]) {
                const item = G[up.id];
                let conf = UPGRADES.find(u => u.id === up.id);
                let repairP = getPrice(conf.repairPrice);
                let sellP = Math.floor(getPrice(conf.basePrice) * 0.4);
                const pct = Math.floor((item.dur / conf.maxDur) * 100);
                const div = document.createElement('div'); div.className = 'shop-item';
                div.innerHTML = `<div class="shop-icon">${up.icon}</div><div class="shop-title">${up.name}</div><div class="shop-desc">${up.bonus}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${pct}%;"></div></div><div class="inv-action-row"><button class="inv-btn-repair" onclick="repairItem('${up.id}')">🛠️ ${repairP}</button><button class="inv-btn-sell" onclick="sellInvest('${up.id}')">💸 ${sellP}</button></div>`;
                myItemsList.appendChild(div);
            }
        });
    }

    const qBar = document.getElementById('quest-bar'); 
    if (order.visible && curView === 'main') { 
        qBar.style.display = 'block'; 
        if (order.active) { 
            document.getElementById('quest-actions-choice').style.display = 'none'; 
            document.getElementById('quest-active-ui').style.display = 'block'; 
            document.getElementById('quest-timer-ui').innerText = Math.floor(order.time/60) + ":" + ((order.time%60<10?'0':'')+order.time%60); 
            document.getElementById('quest-progress-bar').style.width = (order.steps / order.target * 100) + "%"; 
        } else { 
            document.getElementById('quest-actions-choice').style.display = 'flex'; 
            document.getElementById('quest-active-ui').style.display = 'none'; 
            document.getElementById('quest-timer-ui').innerText = "0:" + ((order.offerTimer<10?'0':'')+order.offerTimer); 
            if(isBlind) document.getElementById('quest-pay').innerText = "?.??";
            else document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        } 
    } else { qBar.style.display = 'none'; }
    
    document.getElementById('history-ui').innerHTML = G.history.map(h => "<div class='history-item'><span>" + h.time + " " + h.msg + "</span><b style='color:" + (h.type==='plus'?'var(--success)':'var(--danger)') + "'>" + (h.type==='plus'?'+':'-') + (isBlind ? '?' : h.val) + "</b></div>").join('');
    
    renderBank(); renderMilestones();
    
    const taxTimer = document.getElementById('tax-timer');
    const rentTimer = document.getElementById('rent-timer');
    let currentTaxRate = G.money > 200 ? 15 : 0;
    if(taxTimer) taxTimer.innerText = "Налог (" + (currentTaxRate>0?currentTaxRate+"%":"FREE") + ") через: " + Math.floor(G.tax/60) + ":" + ((G.tax%60<10?'0':'')+G.tax%60);
    let distRent = DISTRICTS[G.district] ? DISTRICTS[G.district].rentPct : 0.05;
    if(rentTimer) rentTimer.innerText = "Аренда (" + (distRent*100).toFixed(0) + "%) через: " + Math.floor(G.rent/60) + ":" + ((G.rent%60<10?'0':'')+G.rent%60);
    
    let currentRank = RANKS[0], nextRank = null;
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
            let prevMax = 0;
            if (currentRank.name === "Бывалый") prevMax = RANKS[0].max;
            if (currentRank.name === "Профи") prevMax = RANKS[1].max;
            let progress = ((G.totalOrders - prevMax) / (currentRank.max - prevMax)) * 100;
            document.getElementById('rank-progress').style.width = Math.max(0, Math.min(100, progress)) + "%";
            document.getElementById('rank-next').innerText = "До ранга " + nextRank.name + ": " + (currentRank.max - G.totalOrders) + " заказов";
        } else {
            document.getElementById('rank-progress').style.width = "100%";
            document.getElementById('rank-next').innerText = "Вы достигли вершины!";
        }
    }
}

function renderDistricts() {
    const container = document.getElementById('districts-list-container');
    if (!container) return;
    container.innerHTML = DISTRICTS.map((d, i) => {
        const isCurrent = G.district === i;
        const isLocked = G.lvl < d.minLvl;
        let p = getPrice(d.basePrice);
        let btnHTML = isCurrent ? `<button class="btn-action btn-secondary" style="cursor:default;">ВЫ ЗДЕСЬ</button>` : 
                      isLocked ? `<button class="btn-action btn-secondary" style="opacity:0.5;">🔒 НУЖЕН LVL ${d.minLvl}</button>` : 
                      `<button class="btn-action" onclick="moveDistrict(${i})">ПЕРЕЕХАТЬ (${p} PLN)</button>`;
        return `<div class="card" style="margin-bottom:10px;"><b>${d.name}</b><br><small>${d.desc}</small><br>${btnHTML}</div>`;
    }).join('');
}

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    updateUI(); 
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { try { G = {...G, ...JSON.parse(d)}; } catch(e){} }
    if(isNaN(G.money)) G.money = 10;
    if(isNaN(G.lvl)) G.lvl = 1.0;
    if(!G.shoes) G.shoes = { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 };
    updateUI();
}

setInterval(() => {
    if (G.money > 0) {
        G.tax--; 
        if(G.tax <= 0) { G.money = parseFloat((G.money - (G.money>200?(G.money-200)*0.15:0)).toFixed(2)); G.tax = 300; save(); }
        G.rent--; 
        if(G.rent <= 0) { let p = DISTRICTS[G.district] ? DISTRICTS[G.district].rentPct : 0.05; G.money = parseFloat((G.money - G.money*p).toFixed(2)); G.rent = 300; save(); }
    }
    if (G.bikeRentTime > 0) G.bikeRentTime--;
    if (G.autoTime > 0) G.autoTime--;
    if (order.visible && !order.active) order.offerTimer--;
    if (order.active) order.time--;
    updateUI();
}, 1000);

window.onload = load;

