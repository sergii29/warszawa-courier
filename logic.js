// --- logic.js v5.4 (FIXED: Shop, Money, Garage) ---
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

// НОВЫЙ ТРАНСПОРТ
const VEHICLES = [
    { id: 'ebike250', name: 'E-Bike 250W', power: 250, speed: 10, price: 3500, icon: '🚲' },
    { id: 'ebike500', name: 'E-Bike 500W', power: 500, speed: 15, price: 6500, icon: '🚴' },
    { id: 'ebike1000', name: 'Monster 1000W', power: 1000, speed: 25, price: 12000, icon: '🏍️' },
    { id: 'moto50', name: 'Scooter 50cc', power: 2000, speed: 35, price: 7000, icon: '🛵' },
    { id: 'moto125', name: 'Street 125cc', power: 5000, speed: 45, price: 14000, icon: '🏍️' }
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
    { id: 'engine', name: 'Двигатель', icon: '🔧', basePrice: 150, bonusDesc: '+Энергия', stat: 'maxEn' },
    { id: 'suspension', name: 'Подвеска', icon: '🔩', basePrice: 100, bonusDesc: 'Меньше штрафы', stat: 'resilience' },
    { id: 'nitro', name: 'Нитро', icon: '🚀', basePrice: 500, bonusDesc: '+Доход', stat: 'earnMult' }
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
    myVehicles: [], currentVehicleId: null,
    garage: { color: 'blue', upgrades: { engine: 0, suspension: 0, nitro: 0 }, unlockedColors: ['blue'] },
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

function doWork() {
    G.totalClicks++; 
    checkDailyQuests('clicks', 1);

    if (isBroken) {
        repairProgress++;
        G.en = Math.max(0, G.en - 5); 
        tg.HapticFeedback.impactOccurred('heavy');
        if (repairProgress >= 50) {
            isBroken = false; repairProgress = 0;
            log("🔧 Починил!", "var(--success)");
            tg.HapticFeedback.notificationOccurred('success');
        }
        updateUI(); save(); return;
    }

    if (bonusActive) { G.en = Math.max(0, G.en - 50); updateUI(); return; }
    
    let now = Date.now();
    if (now - lastClickTime < 80) return; 
    lastClickTime = now;
    
    if (order.visible && !order.active) { G.en = Math.max(0, G.en - 25); updateUI(); return; }
    
    let baseMax = 2000 + (G.garage.upgrades.engine * 200);
    G.maxEn = baseMax;

    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let drink = Math.min(G.waterStock, 50); 
        G.en = Math.min(G.maxEn, G.en + drink); 
        G.waterStock -= drink; 
    }
    if (G.en < 1) return;
    
    clicksSinceBonus++;
    if (clicksSinceBonus > (300 + Math.random() * 100)) { showBonus(); clicksSinceBonus = 0; }

    if (G.shoes.dur > 0) { G.shoes.dur -= 0.05; if(G.shoes.dur < 0) G.shoes.dur = 0; }

    if(order.active) { 
        consumeResources(true); 
        let speed = 1;
        if (G.currentVehicleId) {
            let v = VEHICLES.find(x => x.id === G.currentVehicleId);
            if(v) speed = v.speed * 0.15;
        } else if (G.bikeRentTime > 0) speed = 2;
        
        if (order.isRiskyRoute) speed *= 1.5; 
        order.steps += speed;
        if (order.steps >= order.target) finishOrder(true); 
        updateUI(); save(); return; 
    }
    
    if(!order.visible && Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); 
    
    consumeResources(false);
    
    let distMult = DISTRICTS[G.district] ? DISTRICTS[G.district].mult : 1;
    let nitro = 1 + (G.garage.upgrades.nitro * 0.01);
    let gain = 0.10 * Math.max(0.1, G.lvl) * distMult * nitro;
    
    G.money = parseFloat((G.money + gain).toFixed(2));
    G.totalEarned += gain; 
    checkDailyQuests('earn', gain); 
    G.lvl += 0.00025; 
    updateUI(); save();
}

function consumeResources(isOrder) {
    let cost = 10;
    if (G.currentVehicleId) cost = 5;
    if (G.bikeRentTime > 0) cost = 5;
    if (isOrder) cost *= 1.2;
    G.en = Math.max(0, G.en - cost); 
}

// --- SHOP (RESTORED OLD LOGIC + NEW) ---

function renderShop() {
    // 1. VEHICLES
    const vList = document.getElementById('shop-vehicles-list');
    if(vList) {
        vList.innerHTML = VEHICLES.map(v => {
            let p = getPrice(v.price);
            let owned = G.myVehicles.includes(v.id);
            let active = G.currentVehicleId === v.id;
            let btnTxt = active ? "АКТИВНО" : (owned ? "ВЫБРАТЬ" : `КУПИТЬ ${p}`);
            return `<div class="card" style="display:flex; align-items:center; gap:10px; padding:10px;">
                <div style="font-size:24px">${v.icon}</div>
                <div style="flex:1"><b>${v.name}</b><br><small>Speed: ${v.speed}</small></div>
                <button class="btn-action" style="width:auto; padding:5px 10px; font-size:10px;" onclick="buyVehicle('${v.id}')">${btnTxt}</button>
            </div>`;
        }).join('');
    }

    // 2. SHOES
    const shoesList = document.getElementById('shop-shoes-list');
    if (shoesList) {
        shoesList.innerHTML = SHOES_MODELS.map(s => {
            let p = getPrice(s.basePrice);
            return `
            <div class="shop-item item-shoes" style="border-color:${s.color}; margin-bottom:8px;">
                <div class="shop-icon">${s.icon}</div>
                <div style="flex:1;">
                    <div class="shop-title" style="color:${s.color}">${s.name}</div>
                    <div class="shop-desc" style="margin-bottom:5px;">${s.desc}</div>
                </div>
                <button class="btn-price" style="width:auto; padding: 10px 15px; background: var(--purple); color:white;" onclick="buyShoes('${s.id}')">${p} PLN</button>
            </div>`;
        }).join('');
    }
    
    // 3. PRICES UPDATE
    const el = (id, val) => { let e = document.getElementById(id); if(e) e.innerText = val + " PLN"; };
    el('btn-water', getPrice(1.50));
    el('btn-coffee', getPrice(5.00));
    el('btn-energy', getPrice(12.00));
}

function buyShoes(id) {
    let model = SHOES_MODELS.find(s => s.id === id);
    if (!model) return;
    let price = getPrice(model.basePrice);
    
    if (G.money >= price) {
        G.money -= price;
        G.shoes = { name: model.name, maxDur: 100, dur: 100, bonus: model.bonus };
        addHistory('👟 ' + model.name, price, 'minus');
        save(); updateUI();
    } else log("Нет денег!", "var(--danger)");
}

function buyVehicle(id) {
    let v = VEHICLES.find(x => x.id === id);
    let p = getPrice(v.price);
    
    if(G.myVehicles.includes(id)) {
        G.currentVehicleId = id;
        save(); updateUI();
        return;
    }
    
    if(G.money >= p) {
        G.money -= p;
        G.myVehicles.push(id);
        G.currentVehicleId = id;
        addHistory('🚘 АВТО', p, 'minus');
        save(); updateUI();
    } else log("Нет денег!", "var(--danger)");
}

// --- GARAGE LOGIC ---

function openGarage() { document.getElementById('garage-modal').style.display = 'flex'; renderGarage(); }
function closeGarage() { document.getElementById('garage-modal').style.display = 'none'; }

function renderGarage() {
    // Colors
    document.getElementById('garage-colors-list').innerHTML = GARAGE_COLORS.map(c => {
        let unlocked = G.garage.unlockedColors.includes(c.id);
        let active = G.garage.color === c.id;
        let p = getPrice(c.price);
        return `<div class="color-item" onclick="${unlocked ? `setNeon('${c.id}')` : `buyColor('${c.id}', ${p})`}" style="display:flex; flex-direction:column; align-items:center;">
            <div style="width:30px; height:30px; background:${c.hex}; border-radius:50%; border:2px solid ${active?'white':'transparent'}"></div>
            <span style="font-size:9px;">${unlocked ? (active ? 'ON' : 'SET') : p}</span>
        </div>`;
    }).join('');
    
    // Preview
    let cObj = GARAGE_COLORS.find(c => c.id === G.garage.color) || GARAGE_COLORS[0];
    document.getElementById('garage-sphere-preview').style.background = cObj.hex;
    document.getElementById('garage-sphere-preview').style.boxShadow = `0 0 20px ${cObj.hex}`;

    // Parts
    document.getElementById('garage-parts-list').innerHTML = GARAGE_PARTS.map(part => {
        let lvl = G.garage.upgrades[part.id] || 0;
        let p = Math.floor(getPrice(part.basePrice) * Math.pow(1.4, lvl));
        return `<div class="card" style="padding:10px; display:flex; justify-content:space-between;">
            <div>${part.icon} ${part.name} <b>LVL ${lvl}</b></div>
            <button class="btn-action" style="width:auto; padding:4px 8px; font-size:10px;" onclick="buyPart('${part.id}', ${p})">${p} PLN</button>
        </div>`;
    }).join('');
}

function buyColor(id, p) {
    if(G.money >= p) { G.money -= p; G.garage.unlockedColors.push(id); setNeon(id); }
}
function setNeon(id) {
    G.garage.color = id; save(); renderGarage(); updateUI();
}
function buyPart(type, p) {
    if(G.money >= p) { G.money -= p; G.garage.upgrades[type]++; save(); renderGarage(); }
}

// --- STANDARD FUNCTIONS (Restored) ---

function buyWater() { let p = getPrice(1.5); if(G.money>=p) { G.money-=p; G.waterStock+=1500; save(); updateUI(); } }
function buyDrink(t, base) { let p = getPrice(base); if(G.money>=p) { G.money-=p; if(t==='coffee') G.en+=300; else G.buffTime+=120; save(); updateUI(); } }
function rentBike() { let p = getPrice(30); if(G.money>=p) { G.money-=p; G.bikeRentTime+=600; save(); updateUI(); } }
function repairBikeInstant() { let p = getPrice(15); if(G.money>=p) { G.money-=p; isBroken=false; repairProgress=0; save(); updateUI(); } }

function activateAutopilot() { 
    let p = getPrice(45);
    if(G.money >= p && G.lvl >= 0.15) { 
        G.money -= p; G.lvl -= 0.15; G.autoTime += 600; closeRouteModal(); acceptOrder(); save(); updateUI(); 
    } 
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; order.offerTimer = 15; 
    order.reward = (3.8 + Math.random()*5) * (1 + G.lvl*0.1);
    updateUI(); 
}
function finishOrder(win) { 
    if(!order.active) return;
    order.active = false; 
    if(win) { G.money += order.reward; G.totalEarned += order.reward; G.totalOrders++; G.lvl += 0.01; } 
    order.visible = false; updateUI(); save(); 
}
function collectBottles() { 
    const btn = document.querySelector("button[onclick='collectBottles()']");
    if(btn) btn.innerText = "⏳..."; 
    setTimeout(() => { G.money+=0.05; G.totalBottles++; save(); updateUI(); if(btn) btn.innerText = "♻️ СБОР БУТЫЛОК (+0.05)"; }, 1000); 
}

function buyInvest(type) { 
    let conf = UPGRADES.find(u => u.id === type);
    let p = getPrice(conf.basePrice);
    if(!G[type] && G.money >= p) { G.money -= p; G[type] = { active: true, dur: 100 }; save(); updateUI(); } 
}
function repairItem(type) {
    let conf = UPGRADES.find(u => u.id === type);
    let p = getPrice(conf.repairPrice);
    if(G.money >= p) { G.money -= p; G[type].dur = 100; save(); updateUI(); }
}
function sellInvest(type) {
    let conf = UPGRADES.find(u => u.id === type);
    if(G[type]) { G.money += (conf.basePrice * 0.4); G[type] = null; save(); updateUI(); }
}

function openRouteModal() { document.getElementById('route-modal').style.display = 'flex'; }
function closeRouteModal() { document.getElementById('route-modal').style.display = 'none'; }
function acceptOrder() { order.active = true; updateUI(); }
function closeProShop() { document.getElementById('pro-shop-modal').style.display = 'none'; }
function openProShop() { document.getElementById('pro-shop-modal').style.display = 'flex'; }
function checkStarterPack() { if(G.isNewPlayer) document.getElementById('starter-modal').style.display = 'flex'; }
function claimStarterPack() { document.getElementById('starter-modal').style.display = 'none'; G.money+=50; G.waterStock+=500; G.isNewPlayer=false; if(!G.garage) G.garage={color:'blue',upgrades:{engine:0,suspension:0,nitro:0},unlockedColors:['blue']}; save(); updateUI(); }
function claimBonus() { document.getElementById('bonus-overlay').style.display = 'none'; G.money+=50; bonusActive=false; clicksSinceBonus=0; save(); updateUI(); }
function showBonus() { document.getElementById('bonus-overlay').style.display = 'flex'; bonusActive=true; }
function exchangeLvl(l, m) { if(G.lvl>=l) { G.lvl-=l; G.money+=m; save(); updateUI(); } }
function checkDailyQuests() {} function checkMilestones() {} function usePromo() {}

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    updateUI(); 
}

function updateUI() {
    if(!document.getElementById('money-val')) return;
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(3);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    let distName = DISTRICTS[G.district] ? DISTRICTS[G.district].name : "???";
    document.getElementById('district-ui').innerText = "📍 " + distName;

    // СФЕРА ЦВЕТ
    let cObj = GARAGE_COLORS.find(c => c.id === G.garage.color) || GARAGE_COLORS[0];
    let s = document.getElementById('work-sphere');
    if(s) {
        s.style.background = `radial-gradient(circle at 35% 35%, ${cObj.hex}, #000)`;
        s.style.boxShadow = `0 0 20px ${cObj.hex}`;
    }

    if(curView === 'shop') {
        renderShop();
        // PRO SHOP LIST
        const shopList = document.getElementById('shop-upgrades-list'); 
        if(shopList) {
            shopList.innerHTML = ''; 
            UPGRADES.forEach(up => { 
                if(!G[up.id] && !up.hidden) { 
                    let p = getPrice(up.basePrice);
                    shopList.innerHTML += `<div class="card" style="margin-bottom:5px"><b>${up.name}</b><br><button class="btn-action" style="margin-top:5px; padding:5px;" onclick="buyInvest('${up.id}')">КУПИТЬ ${p}</button></div>`;
                }
            });
        }
    }

    // INVENTORY
    const myList = document.getElementById('my-items-list');
    if(myList) {
        myList.innerHTML = `<div class="shop-item item-shoes"><div class="shop-title">${G.shoes.name}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${G.shoes.dur}%"></div></div></div>`;
        UPGRADES.forEach(up => {
            if(G[up.id]) {
                let conf = UPGRADES.find(u=>u.id===up.id);
                let pct = (G[up.id].dur / conf.maxDur) * 100;
                myList.innerHTML += `<div class="shop-item"><div class="shop-title">${up.name}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${pct}%"></div></div><button class="inv-btn-repair" onclick="repairItem('${up.id}')">РЕМОНТ</button></div>`;
            }
        });
    }
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { try { G = {...G, ...JSON.parse(d)}; } catch(e){} }
    if(isNaN(G.money)) G.money = 10;
    if(!G.garage) G.garage = { color: 'blue', upgrades: { engine: 0, suspension: 0, nitro: 0 }, unlockedColors: ['blue'] };
    if(!G.myVehicles) G.myVehicles = [];
    if(!G.shoes) G.shoes = { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 };
    
    // Исправление для старых сохранений
    UPGRADES.forEach(u => {
        if (G[u.id] === true) G[u.id] = { active: true, dur: 100 };
    });

    updateUI();
}

setInterval(() => {
    if (G.money > 0) { G.tax--; if(G.tax<=0) { G.tax=300; save(); } G.rent--; if(G.rent<=0) { G.rent=300; save(); } }
    if (G.autoTime > 0) G.autoTime--;
    if (G.bikeRentTime > 0) G.bikeRentTime--;
    if (order.visible && !order.active) { order.offerTimer--; if(order.offerTimer<=0) { order.visible=false; updateUI(); } }
    updateUI();
}, 1000);

window.onload = load;

