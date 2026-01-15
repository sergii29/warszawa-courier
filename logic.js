// --- logic.js ---
const tg = window.Telegram.WebApp; tg.expand(); tg.ready();
const SAVE_KEY = "WARSZAWA_FOREVER";

const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

let G = { 
    money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 300, 
    waterStock: 0, totalOrders: 0, totalClicks: 0, totalBottles: 0, totalEarned: 0, 
    autoTime: 0, district: 0, bikeRentTime: 0, transportMode: 'none', 
    housing: { id: -1 }, buffTime: 0, blindTime: 0, history: [], usedPromos: [], 
    isNewPlayer: true, lastWelfare: 0, lastAdminUpdate: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
    dailyQuests: [], lastDailyUpdate: 0, activeMilestones: [], lastActive: Date.now()
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0, lastClickTime = 0, clicksSinceBonus = 0, bonusActive = false, isSearching = false, spamCounter = 0;

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0, housePrice: 250000, czynszBase: 25 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150, housePrice: 850000, czynszBase: 80 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500, housePrice: 3500000, czynszBase: 250 } 
];

const UPGRADES = [
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', price: 350, bonus: '+15% PLN', maxDur: 100, repairPrice: 70 }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', price: 1200, bonus: 'Заказы x1.4', maxDur: 100, repairPrice: 250 }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', price: 500, bonus: '⚡ -30%', maxDur: 100, repairPrice: 100 },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', price: 250, bonus: '🛡️ Безопасность', maxDur: 50, repairPrice: 50 },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', price: 180, bonus: '☔ Сухость', maxDur: 80, repairPrice: 40 },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', price: 400, bonus: '🤖 +50% времени', maxDur: 100, repairPrice: 80 }
];

function getDynamicPrice(p) { return p === 0 ? 0 : parseFloat((p * (1 + (Math.max(1, G.lvl) - 1) * 0.4)).toFixed(2)); }
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); if(window.db) { const tgId = tg.initDataUnsafe.user?.id || "test"; window.db.ref('users/' + tgId).set({...G, lastActive: Date.now()}); } }
function load() { let d = localStorage.getItem(SAVE_KEY); if(d) G = {...G, ...JSON.parse(d)}; updateUI(); listenToCloud(); }

function updateUI() {
    if(!document.getElementById('money-val')) return;
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(4) + (G.housing.id !== -1 ? " 🏠" : "");
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);

    let currentRank = RANKS.find(r => G.totalOrders < r.max) || RANKS[RANKS.length-1];
    const rIcon = document.getElementById('rank-icon');
    if(rIcon) {
        rIcon.innerText = currentRank.icon;
        document.getElementById('rank-name').innerText = currentRank.name;
        
        let desc = "";
        if(currentRank.name === "Новичок") desc = "Ты только в начале пути. Платят мало, но Варшава верит в тебя.";
        else if(currentRank.name === "Бывалый") desc = "Знаешь все дворы. +5% к доходу за знание местности.";
        else if(currentRank.name === "Профи") desc = "Твой рюкзак никогда не пустеет. +10% к выплатам.";
        else desc = "Легенда улиц. Тебя боятся даже трамваи. +20% к доходу!";
        
        document.getElementById('rank-bonus').innerHTML = `<small style="display:block;margin-bottom:5px;opacity:0.8">${desc}</small> Бонус: +${currentRank.bonus*100}%`;
    }
}

function consumeResources(isOrder) {
    let w = isOrder ? 10 : 3; if(G.buffTime > 0) w *= 0.8;
    G.waterStock = Math.max(0, G.waterStock - w);
    if(G.buffTime > 0) return;
    let c = (G.scooter ? 7 : 10) * (isOrder ? 1.5 : 1);
    G.en = Math.max(0, G.en - c);
}

function doWork() {
    if(isBroken || bonusActive || G.en < 1) return;
    consumeResources(order.active);
    if(order.active) {
        order.steps += (G.bikeRentTime > 0 ? 2 : 1);
        if(order.steps >= order.target) finishOrder(true);
    } else {
        let gain = 0.1 * G.lvl * DISTRICTS[G.district].mult;
        G.money += gain; G.lvl += 0.00025;
        if(Math.random() < 0.2) generateOrder();
    }
    updateUI(); save();
}

function finishOrder(w) { order.active = false; order.visible = false; if(w) { G.money += order.reward; G.totalOrders++; G.lvl += 0.015; } updateUI(); save(); }
function generateOrder() { order.visible = true; order.offerTimer = 15; order.reward = 5 + Math.random()*15; order.target = 100; updateUI(); }
function acceptOrder() { order.active = true; updateUI(); }

setInterval(() => {
    if(G.autoTime > 0) {
        G.autoTime--;
        if(order.active && !isBroken) {
            for(let i=0; i<10; i++) { 
                consumeResources(true); // ВОДА И ЭНЕРГИЯ ТУТ
                order.steps += 2;
                if(order.steps >= order.target) { finishOrder(true); break; }
            }
        }
    }
    if(G.bikeRentTime > 0) G.bikeRentTime--;
    if(G.buffTime > 0) G.buffTime--;
    G.tax--; if(G.tax <= 0) { G.tax = 300; if(G.money > 200) G.money *= 0.95; }
    G.rent--; if(G.rent <= 0) { G.rent = 300; let cost = G.housing.id === G.district ? DISTRICTS[G.district].czynszBase : G.money * 0.1; G.money -= cost; }
    updateUI();
}, 1000);

function listenToCloud() {
    if(!window.db) return;
    const tgId = tg.initDataUnsafe.user?.id || "test";
    window.db.ref('users/' + tgId).on('value', s => {
        const d = s.val(); if(!d) return;
        if(d.lastAdminUpdate > (G.lastAdminUpdate || 0)) { G = {...G, ...d}; updateUI(); }
    });
}

window.onload = load;
document.getElementById('work-sphere')?.addEventListener('click', doWork);
