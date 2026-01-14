// --- logic.js v5.3 (Vehicles, Garage Fix, Counters Fix) ---
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

// НОВЫЙ ТРАНСПОРТ (Цены приближены к рынку PL)
const VEHICLES = [
    // Велосипеды
    { id: 'ebike250', name: 'E-Bike 250W', type: 'bike', power: 250, speed: 10, price: 3500, icon: '🚲' },
    { id: 'ebike500', name: 'E-Bike 500W', type: 'bike', power: 500, speed: 15, price: 6500, icon: '🚴' },
    { id: 'ebike750', name: 'E-Bike 750W', type: 'bike', power: 750, speed: 20, price: 9000, icon: '🚵' },
    { id: 'ebike1000', name: 'Monster 1000W', type: 'bike', power: 1000, speed: 25, price: 12000, icon: '🏍️' },
    { id: 'ebike1500', name: 'Beast 1500W', type: 'bike', power: 1500, speed: 30, price: 18000, icon: '🚀' },
    // Мотоциклы
    { id: 'moto50', name: 'Scooter 50cc', type: 'moto', power: 2000, speed: 35, price: 7000, icon: '🛵' },
    { id: 'moto125', name: 'Street 125cc', type: 'moto', power: 5000, speed: 45, price: 14000, icon: '🏍️' },
    { id: 'moto600', name: 'Sport 600cc', type: 'moto', power: 15000, speed: 60, price: 35000, icon: '🏎️' }
];

const GARAGE_COLORS = [
    { id: 'blue', name: 'Classic Blue', hex: '#3b82f6', price: 0 },
    { id: 'red', name: 'Street Red', hex: '#ef4444', price: 200 },
    { id: 'green', name: 'Toxic Green', hex: '#22c55e', price: 500 },
    { id: 'gold', name: 'Royal Gold', hex: '#fbbf24', price: 2000 },
    { id: 'purple', name: 'Cyber Purple', hex: '#a855f7', price: 1000 },
    { id: 'orange', name: 'Sunset Orange', hex: '#f97316', price: 300 }
];

const GARAGE_PARTS = [
    { id: 'engine', name: 'Двигатель', icon: '🔧', basePrice: 150, bonusDesc: '+Энергия (Max)', stat: 'maxEn' },
    { id: 'suspension', name: 'Подвеска', icon: '🔩', basePrice: 100, bonusDesc: 'Меньше штрафы', stat: 'resilience' },
    { id: 'nitro', name: 'Чип-Тюнинг', icon: '💾', basePrice: 500, bonusDesc: '+Доход %', stat: 'earnMult' }
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
    bag: null, phone: null, helmet: null, raincoat: null, powerbank: null,
    
    // НОВАЯ СИСТЕМА ТРАНСПОРТА
    myVehicles: [], // Купленные ID
    currentVehicleId: null, // На чем едем
    garage: { color: 'blue', upgrades: { engine: 0, suspension: 0, nitro: 0 }, unlockedColors: ['blue'] },

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

function getPrice(base) {
    if (base === 0) return 0;
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

function getActiveVehicle() {
    if (G.bikeRentTime > 0) return { name: "Арендный Байк", speed: 12, power: 0 };
    if (G.currentVehicleId) {
        return VEHICLES.find(v => v.id === G.currentVehicleId) || { name: "Ноги", speed: 5, power: 0 };
    }
    return { name: "Ноги", speed: 5, power: 0 };
}

function doWork() {
    G.totalClicks++; 
    checkDailyQuests('clicks', 1);

    // ПОЧИНКА
    if (isBroken) {
        repairProgress++;
        G.en = Math.max(0, G.en - 5); 
        tg.HapticFeedback.impactOccurred('heavy');
        if (repairProgress >= 50) {
            isBroken = false; repairProgress = 0;
            log("🔧 Транспорт починен!", "var(--success)");
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
    
    // ПРИЕМ ЗАКАЗА
    if (order.visible && !order.active) {
        G.en = Math.max(0, G.en - 25); 
        updateUI(); tg.HapticFeedback.notificationOccurred('error'); return; 
    }
    
    // ПИТЬЕ ВОДЫ
    let baseMaxEn = 2000;
    if (G.garage && G.garage.upgrades) baseMaxEn += (G.garage.upgrades.engine * 300); // Тюнинг двигателя увеличивает бак
    G.maxEn = baseMaxEn;

    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
        let drink = Math.min(G.waterStock, 50); 
        G.en = Math.min(G.maxEn, G.en + (drink * eff)); 
        G.waterStock -= drink; 
    }
    if (G.en < 1) return;
    
    clicksSinceBonus++;
    if (clicksSinceBonus > (300 + Math.random() * 100)) { showBonus(); clicksSinceBonus = 0; }

    // ИЗНОС ОБУВИ
    if (G.shoes.dur > 0 && !G.currentVehicleId) { // Обувь портится только если пешком
        G.shoes.dur -= 0.05; 
        if(G.shoes.dur < 0) G.shoes.dur = 0; 
    }

    // ИЗНОС ЭКИПИРОВКИ
    UPGRADES.forEach(up => {
        if (G[up.id] && G[up.id].dur > 0) {
            let wear = 0.02; 
            if (up.id === 'helmet' && order.isRiskyRoute) wear = 0.5; 
            G[up.id].dur -= wear;
            if (G[up.id].dur <= 0) {
                G[up.id].dur = 0;
                if (Math.random() < 0.05) log("⚠️ " + up.name + " сломан!", "var(--danger)");
            }
        }
    });

    // --- ВЫПОЛНЕНИЕ ЗАКАЗА ---
    if(order.active) { 
        consumeResources(true); 
        
        let veh = getActiveVehicle();
        let speed = veh.speed * 0.2; // Базовая конвертация в клики
        
        // Тюнинг влияет на скорость
        if (G.garage.upgrades.engine > 0) speed *= (1 + G.garage.upgrades.engine * 0.05);

        if (order.isRiskyRoute) speed *= 1.5; 
        if (G.shoes.dur <= 0 && !G.currentVehicleId) speed *= 0.5; 

        order.steps += speed;
        
        // Шанс поломки для техники
        if ((G.currentVehicleId || G.bikeRentTime > 0) && Math.random() < 0.002) { 
            triggerBreakdown(); return; 
        } 
        
        if(order.steps >= order.target) finishOrder(true); 
        updateUI(); save(); return; 
    }
    
    // ГЕНЕРАЦИЯ НОВОГО ЗАКАЗА
    if(!order.visible && Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); 
    
    consumeResources(false);
    
    // --- РАСЧЕТ ДОХОДА ЗА КЛИК ---
    let rankBonus = 0;
    if (G.totalOrders >= 50) rankBonus = 0.05;
    if (G.totalOrders >= 150) rankBonus = 0.10;
    if (G.totalOrders >= 400) rankBonus = 0.20;

    let bagBonus = 1;
    if (G.bag && G.bag.dur > 0) bagBonus = 1.15;
    else if (G.starter_bag && G.starter_bag.dur > 0) bagBonus = 1.02;

    let distMult = DISTRICTS[G.district] ? DISTRICTS[G.district].mult : 1;
    
    // Тюнинг Нитро дает +% к доходу
    let nitroBonus = 1 + (G.garage.upgrades.nitro * 0.02);

    let gain = 0.10 * Math.max(0.1, G.lvl) * distMult * (1 + rankBonus) * bagBonus * nitroBonus;
    
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

    let veh = getActiveVehicle();
    let cost = 10; // Пешком

    if (veh.id) {
        // Чем мощнее, тем больше ест (но быстрее доставляет)
        cost = 5 + (veh.power / 100); 
    }
    
    if (G.bikeRentTime > 0) cost = 8; // Аренда фиксирована

    let rainMod = (weather === "Дождь" && !G.raincoat) ? 1.2 : 1;
    cost *= rainMod; 
    if (isOrder) cost *= 1.2; 
    if (G.district === 3) cost *= 0.9; 
    
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

// --- GARAGE & VEHICLE LOGIC ---

function openGarage() {
    document.getElementById('garage-modal').style.display = 'flex';
    renderGarage();
}

function closeGarage() {
    document.getElementById('garage-modal').style.display = 'none';
}

function renderGarage() {
    // 1. Current Vehicle Info
    let veh = getActiveVehicle();
    document.getElementById('garage-vehicle-name').innerText = veh.name;
    document.getElementById('garage-veh-speed').innerText = "Скорость: " + veh.speed + " km/h";
    document.getElementById('garage-veh-power').innerText = "Мощность: " + veh.power + "W";

    // 2. Colors
    const colorList = document.getElementById('garage-colors-list');
    colorList.innerHTML = GARAGE_COLORS.map(c => {
        let isUnlocked = G.garage.unlockedColors.includes(c.id);
        let isActive = G.garage.color === c.id;
        let p = getPrice(c.price);
        
        let label = isActive ? "ВЫБРАНО" : (isUnlocked ? "ВЫБРАТЬ" : p + " PLN");
        let clickFn = isUnlocked ? `setNeon('${c.id}')` : `buyColor('${c.id}', ${p})`;
        
        return `
        <div class="color-item" onclick="${clickFn}" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
            <div style="width:40px; height:40px; border-radius:50%; background:${c.hex}; border: 2px solid ${isActive ? '#fff' : 'transparent'}; box-shadow:0 0 10px ${c.hex}; margin-bottom:5px;"></div>
            <span style="font-size:9px; color:${isActive ? '#fff' : '#777'};">${label}</span>
        </div>`;
    }).join('');

    // Preview
    let currentColorObj = GARAGE_COLORS.find(c => c.id === G.garage.color) || GARAGE_COLORS[0];
    const prev = document.getElementById('garage-sphere-preview');
    prev.style.background = `radial-gradient(circle at 35% 35%, ${currentColorObj.hex}, #000)`;
    prev.style.boxShadow = `0 0 30px ${currentColorObj.hex}`;

    // 3. Upgrades
    const partsList = document.getElementById('garage-parts-list');
    partsList.innerHTML = GARAGE_PARTS.map(part => {
        let lvl = G.garage.upgrades[part.id] || 0;
        let nextPrice = Math.floor(getPrice(part.basePrice) * Math.pow(1.4, lvl));
        
        return `
        <div class="card" style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="text-align:left;">
                <div style="font-weight:bold;">${part.icon} ${part.name} <span style="color:var(--accent-gold)">LVL ${lvl}</span></div>
                <div style="font-size:10px; color:#aaa;">${part.bonusDesc}</div>
            </div>
            <button class="btn-action" style="width:auto; font-size:10px; padding:6px 12px;" onclick="buyGarageUpgrade('${part.id}', ${nextPrice})">UPGRADE<br>${nextPrice} PLN</button>
        </div>`;
    }).join('');
}

function buyColor(id, price) {
    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        G.garage.unlockedColors.push(id);
        addHistory('🎨 ЦВЕТ', price, 'minus');
        setNeon(id); 
    } else log("Не хватает денег!", "var(--danger)");
}

function setNeon(id) {
    G.garage.color = id;
    renderGarage();
    updateUI(); 
    save();
}

function buyGarageUpgrade(type, price) {
    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        G.garage.upgrades[type]++;
        addHistory('🔧 ТЮНИНГ', price, 'minus');
        tg.HapticFeedback.notificationOccurred('success');
        save();
        renderGarage();
        updateUI();
    } else log("Не хватает денег!", "var(--danger)");
}

function buyVehicle(id) {
    let veh = VEHICLES.find(v => v.id === id);
    let price = getPrice(veh.price);
    
    if (G.myVehicles.includes(id)) {
        G.currentVehicleId = id;
        log("Вы пересели на " + veh.name, "var(--success)");
        updateUI(); save();
        return;
    }

    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        G.myVehicles.push(id);
        G.currentVehicleId = id;
        addHistory('🚘 АВТО', price, 'minus');
        log("Куплен " + veh.name + "!", "var(--gold)");
        updateUI(); save();
    } else {
        log("Не хватает денег (" + price + ")", "var(--danger)");
    }
}

function renderVehiclesShop() {
    const list = document.getElementById('shop-vehicles-list');
    if(!list) return;
    list.innerHTML = VEHICLES.map(v => {
        let price = getPrice(v.price);
        let owned = G.myVehicles.includes(v.id);
        let active = G.currentVehicleId === v.id;
        
        let btnText = active ? "АКТИВНО" : (owned ? "ВЫБРАТЬ" : `КУПИТЬ ${price} PLN`);
        let btnClass = active ? "btn-secondary" : (owned ? "btn-action" : "btn-price");
        
        return `
        <div class="card" style="display:flex; align-items:center; gap:10px; padding:10px; border:${active ? '1px solid var(--success)' : '1px solid var(--glass-border)'}">
            <div style="font-size:30px;">${v.icon}</div>
            <div style="flex:1; text-align:left;">
                <b>${v.name}</b>
                <div style="font-size:10px; color:#aaa;">Speed: ${v.speed} | Power: ${v.power}W</div>
            </div>
            <button class="${btnClass}" style="width:auto; padding:8px 12px;" onclick="buyVehicle('${v.id}')">${btnText}</button>
        </div>`;
    }).join('');
}

function applySphereColor() {
    const s = document.getElementById('work-sphere');
    if (!s || !G.garage) return;
    let cObj = GARAGE_COLORS.find(c => c.id === G.garage.color) || GARAGE_COLORS[0];
    s.style.background = `radial-gradient(circle at 35% 35%, ${cObj.hex}, #000)`;
    s.style.boxShadow = `0 0 30px ${cObj.hex}, inset 0 0 20px rgba(0,0,0,0.5)`;
    s.style.borderColor = cObj.hex;
}

// --- STANDARD ACTIONS ---

function buyWater() { 
    let p = getPrice(1.50);
    if(G.money >= p) { G.money = parseFloat((G.money-p).toFixed(2)); G.waterStock += 1500; addHistory('🧴 ВОДА', p, 'minus'); save(); updateUI(); } 
}
function buyDrink(type, baseP) { 
    let p = getPrice(baseP);
    if(G.money >= p) { G.money = parseFloat((G.money-p).toFixed(2)); addHistory(type.toUpperCase(), p, 'minus'); if(type==='coffee') G.en+=300; else G.buffTime+=120; save(); updateUI(); } 
}
function rentBike() { 
    let p = getPrice(30);
    if(G.money >= p) { G.money = parseFloat((G.money-p).toFixed(2)); addHistory('🚲 АРЕНДА', p, 'minus'); G.bikeRentTime+=600; save(); updateUI(); } 
}
function repairBikeInstant() {
    let p = getPrice(15);
    if(G.money >= p) { G.money = parseFloat((G.money-p).toFixed(2)); isBroken=false; repairProgress=0; addHistory('🔧 РЕМОНТ', p, 'minus'); save(); updateUI(); }
}
function activateAutopilot() { 
    closeRouteModal();
    let p = getPrice(45);
    if(G.money >= p && G.lvl >= 0.15) { 
        G.money = parseFloat((G.money-p).toFixed(2)); G.lvl-=0.15; 
        G.autoTime += (G.powerbank && G.powerbank.dur>0) ? 900 : 600; 
        addHistory('АВТОПИЛОТ', p, 'minus'); acceptOrder(); save(); updateUI(); 
    } else log("Мало денег/рейтинга!", "var(--danger)");
}
function buyShoes(id) {
    let m = SHOES_MODELS.find(s=>s.id===id); let p = getPrice(m.basePrice);
    if(G.money>=p) { G.money-=p; G.shoes={name:m.name, maxDur:m.durability, dur:m.durability, bonus:m.bonus}; addHistory('👟 ОБУВЬ', p, 'minus'); save(); updateUI(); }
}
function buyInvest(type) { 
    let c = UPGRADES.find(u=>u.id===type); let p = getPrice(c.basePrice);
    if(!G[type] && G.money>=p) { G.money-=p; G.type={active:true, dur:c.maxDur||100}; addHistory('ИНВЕСТ', p, 'minus'); save(); updateUI(); }
}
function repairItem(type) {
    let c = UPGRADES.find(u=>u.id===type); let base = c.repairPrice;
    if(G.garage.upgrades.suspension) base *= (1 - G.garage.upgrades.suspension*0.05);
    let p = getPrice(Math.max(1, base));
    if(G.money>=p) { G.money-=p; G[type].dur = c.maxDur; addHistory('🛠️ РЕМОНТ', p, 'minus'); save(); updateUI(); }
}
function sellInvest(type) {
    let c = UPGRADES.find(u=>u.id===type); let p = Math.floor(getPrice(c.basePrice)*0.4);
    if(G[type]) { G.money+=p; G[type]=null; addHistory('💸 ЛОМБАРД', p, 'plus'); save(); updateUI(); }
}
function moveDistrict(id) { 
    let d = DISTRICTS[id]; let p = getPrice(d.basePrice);
    if(G.money>=p && G.lvl>=d.minLvl) { G.money-=p; G.district=id; addHistory('🏙️ ПЕРЕЕЗД', p, 'minus'); save(); updateUI(); }
}

function updateShopPrices() {
    // Безопасное обновление цен
    const el = (id, val) => { let e = document.getElementById(id); if(e) e.innerText = val + " PLN"; };
    el('btn-water', getPrice(1.50));
    el('btn-coffee', getPrice(5.00));
    el('btn-energy', getPrice(12.00));
}

function openRouteModal() { document.getElementById('route-modal').style.display = 'flex'; }
function closeRouteModal() { document.getElementById('route-modal').style.display = 'none'; }
function acceptOrder() { order.active = true; updateUI(); }
function closeProShop() { document.getElementById('pro-shop-modal').style.display = 'none'; }
function openProShop() { document.getElementById('pro-shop-modal').style.display = 'flex'; }

function checkStarterPack() { 
    if (G.isNewPlayer === undefined) G.isNewPlayer = (G.totalOrders === 0);
    if (G.isNewPlayer) document.getElementById('starter-modal').style.display = 'flex'; 
}
function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50; G.waterStock += 500; G.bikeRentTime += 900; G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    G.starter_bag = { active: true, dur: 50 }; G.starter_phone = { active: true, dur: 50 };
    if(!G.garage) G.garage = { color: 'blue', upgrades: { engine: 0, suspension: 0, nitro: 0 }, unlockedColors: ['blue'] };
    if(!G.myVehicles) G.myVehicles = [];
    addHistory('🎁 STARTER', 50, 'plus'); save(); updateUI();
}

// --- CORE FUNCTIONS ---

function collectBottles() { 
    if (isSearching) { spamCounter++; if(spamCounter>10) { G.money=Math.max(0,G.money-100); spamCounter=0; updateUI(); } return; }
    isSearching = true; spamCounter = 0;
    const btn = document.querySelector("button[onclick='collectBottles()']");
    if(btn) { btn.innerText = "⏳..."; btn.style.opacity = "0.6"; }
    setTimeout(() => {
        G.money += 0.05; G.totalEarned += 0.05; G.totalBottles++; G.lvl += 0.002;
        save(); updateUI(); 
        isSearching = false; if(btn) { btn.innerText = "♻️ СБОР БУТЫЛОК (+0.05)"; btn.style.opacity = "1"; }
    }, 1200); 
}

function finishOrder(win) { 
    if(!order.active) return;
    order.active = false; 
    if(win) { 
        G.money += order.reward; G.totalEarned += order.reward; 
        addHistory('📦 ЗАКАЗ', order.reward.toFixed(2));
        G.totalOrders++; G.lvl += 0.015;
        // Шанс чаевых
        if(Math.random()<0.4) {
            let tip = 5 + Math.random()*15;
            if(G.district===4) tip *= 2;
            G.money += tip; addHistory('💰 ЧАЕВЫЕ', tip.toFixed(2));
        }
    } 
    order.visible = false; updateUI(); save(); 
}

function checkMilestones() { /* ... */ }
function claimDaily(id) { /* ... */ }
function checkDailyQuests(t, a) { /* ... */ }
function usePromo() { /* ... */ }
function exchangeLvl(l, m) { if(G.lvl>=l) { G.lvl-=l; G.money+=m; save(); updateUI(); } }

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    updateUI(); 
}

function updateUI() {
    const moneyEl = document.getElementById('money-val');
    if(!moneyEl) return;
    
    // Counters Fix
    moneyEl.innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(3);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    // District
    let dName = DISTRICTS[G.district] ? DISTRICTS[G.district].name : "???";
    document.getElementById('district-ui').innerText = "📍 " + dName;

    // Statuses
    document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
    document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
    
    // Auto timer
    if(G.autoTime>0) document.getElementById('auto-status-ui').innerText = "🤖 " + Math.floor(G.autoTime/60) + "м";

    // Shop Update
    if(curView === 'shop') {
        updateShopPrices();
        renderVehiclesShop();
    }

    applySphereColor();
    
    // Broken Sphere
    if (isBroken) {
        sphere.classList.add('broken'); document.getElementById('sphere-text').innerText = "ЧИНИТЬ";
        document.getElementById('repair-express-btn').style.display = 'block';
    } else {
        sphere.classList.remove('broken'); document.getElementById('sphere-text').innerText = "РАБОТАТЬ";
        document.getElementById('repair-express-btn').style.display = 'none';
        
        let rate = 0.10 * (1 + G.lvl*0.1);
        if (G.currentVehicleId) rate *= 1.2;
        if(order.visible && !order.active) rate = "ПРИМИ ЗАКАЗ";
        else rate = rate.toFixed(2) + " PLN";
        
        document.getElementById('click-rate-ui').innerText = rate;
    }
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { try { G = {...G, ...JSON.parse(d)}; } catch(e){} }
    if(isNaN(G.money)) G.money = 10;
    if(!G.myVehicles) G.myVehicles = [];
    if(!G.garage) G.garage = { color: 'blue', upgrades: { engine: 0, suspension: 0, nitro: 0 }, unlockedColors: ['blue'] };
    updateUI();
}

// MAIN LOOP
setInterval(() => {
    if (G.money > 0) { G.tax--; if(G.tax<=0) { G.tax=300; save(); } G.rent--; if(G.rent<=0) { G.rent=300; save(); } }
    
    if (G.autoTime > 0) {
        G.autoTime--;
        // AUTO-DELIVERY FIX
        if (order.active && !isBroken && G.en > 10) {
            for(let i=0; i<5; i++) { // Скорость робота
                if(!order.active) break;
                consumeResources(true);
                order.steps += 5; // Робот эффективен
                if(order.steps >= order.target) { finishOrder(true); break; }
            }
        }
    }
    
    if (G.bikeRentTime > 0) G.bikeRentTime--;
    if (order.visible && !order.active) { order.offerTimer--; if(order.offerTimer<=0) { order.visible=false; updateUI(); } }
    
    updateUI();
}, 1000);

window.onload = load;

