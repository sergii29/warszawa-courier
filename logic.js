// --- logic.js ---
const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

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
    starter_bag: null, starter_phone: null, bag: null, phone: null,
    scooter: null, helmet: null, raincoat: null, powerbank: null,
    dailyQuests: [], lastDailyUpdate: 0,
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ],
    lastActive: Date.now()
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
    { id: 'starter_bag', name: 'Старый Рюкзак', icon: '🎒', desc: 'Лучше, чем в руках.', price: 0, bonus: '+2% PLN', maxDur: 40, repairPrice: 5, hidden: true },
    { id: 'starter_phone', name: 'Древний Телефон', icon: '📱', desc: 'Звонит и ладно.', price: 0, bonus: 'Связь', maxDur: 40, repairPrice: 5, hidden: true },
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', price: 350, bonus: '+15% PLN', maxDur: 100, repairPrice: 70 }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', price: 1200, bonus: 'Заказы x1.4', maxDur: 100, repairPrice: 250 }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', price: 500, bonus: '⚡ -30%', maxDur: 100, repairPrice: 100 },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', price: 250, bonus: '🛡️ Безопасность', maxDur: 50, repairPrice: 50 },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', price: 180, bonus: '☔ Сухость', maxDur: 80, repairPrice: 40 },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', price: 400, bonus: '🤖 +50% времени', maxDur: 100, repairPrice: 80 }
];

function getDynamicPrice(basePrice) {
    if (basePrice === 0) return 0;
    let inflationFactor = 0.40;
    let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * inflationFactor;
    return parseFloat((basePrice * multiplier).toFixed(2));
}

function addHistory(msg, val, type = 'plus') {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    if (!G.history) G.history = [];
    G.history.unshift({ time, msg, val, type });
    if (G.history.length > 20) G.history.pop();
}

async function usePromo() {
    const inputField = document.getElementById('promo-input');
    const code = inputField.value.trim().toUpperCase();
    if (G.usedPromos?.includes(code)) { log("Уже использовано!", "var(--danger)"); return; }
    try {
        const response = await fetch('promos.json?nocache=' + Date.now());
        const promoData = await response.json();
        if (promoData[code]) {
            G.money += promoData[code].reward; G.totalEarned += promoData[code].reward;
            G.usedPromos.push(code); addHistory('🎁 ПРОМО', promoData[code].reward, 'plus');
            log("🎁 " + promoData[code].msg, "var(--gold)"); updateUI(); save();
        } else log("Неверный код!", "var(--danger)");
    } catch (e) { log("Ошибка связи!", "var(--danger)"); }
}

const sphere = document.getElementById('work-sphere');
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); }, {passive: false});
    sphere.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) doWork(); });
}

function log(msg, color = "#eee") { 
    const logEl = document.getElementById('game-log'); if(!logEl) return;
    const entry = document.createElement('div'); entry.style.color = color; 
    entry.innerText = "[" + new Date().toLocaleTimeString().split(' ')[0] + "] " + msg; 
    logEl.appendChild(entry); if (logEl.childNodes.length > 5) logEl.removeChild(logEl.firstChild); 
}

function claimBonus() {
    document.getElementById('bonus-overlay').style.display = 'none';
    bonusActive = false; G.money += 50; G.totalEarned += 50;
    addHistory('🎁 БОНУС', 50, 'plus'); log("Вы забрали бонус +50 PLN", "var(--success)");
    save(); updateUI();
}

function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50; G.waterStock += 500; G.bikeRentTime += 900; G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    G.starter_bag = { active: true, dur: 50 }; G.starter_phone = { active: true, dur: 50 };
    save(); updateUI();
}

function save() { 
    localStorage.setItem(SAVE_KEY, JSON.stringify(G)); 
    const tgId = window.Telegram.WebApp.initDataUnsafe.user?.id || "test_user";
    if(window.db) window.db.ref('users/' + tgId).set({...G, lastActive: Date.now()});
}

function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) try { G = {...G, ...JSON.parse(d)}; } catch(e) {}
    if (!G.bag && !G.starter_bag) G.starter_bag = { active: true, dur: 50 };
    if (!G.phone && !G.starter_phone) G.starter_phone = { active: true, dur: 50 };
    updateUI(); listenToCloud();
}

function updateUI() {
    const moneyEl = document.getElementById('money-val'); if(!moneyEl) return;
    const isBlind = G.blindTime > 0;
    moneyEl.innerText = isBlind ? "🔒 ??.??" : G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6) + (G.housing.id !== -1 ? " 🏠" : "");
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    // КАРЬЕРА С ОПИСАНИЯМИ
    let currentRank = RANKS.find(r => G.totalOrders < r.max) || RANKS[3];
    const rIcon = document.getElementById('rank-icon');
    if(rIcon) {
        rIcon.innerText = currentRank.icon;
        document.getElementById('rank-name').innerText = currentRank.name;
        
        let desc = "";
        if(currentRank.name === "Новичок") desc = "Базовые выплаты. Варшава верит в тебя!";
        else if(currentRank.name === "Бывалый") desc = "+5% к доходу. Ты знаешь все сократы города.";
        else if(currentRank.name === "Профи") desc = "+10% к доходу. Клиенты ставят только 5 звезд.";
        else desc = "+20% к доходу. Ты — абсолютный король дорог!";
        
        document.getElementById('rank-bonus').innerHTML = `<small style="display:block;margin-bottom:4px;opacity:0.7">${desc}</small>Бонус ранга: +${(currentRank.bonus * 100)}%`;
        
        let next = RANKS[RANKS.indexOf(currentRank)+1];
        if(next) {
            let prevMax = RANKS[RANKS.indexOf(currentRank)-1]?.max || 0;
            document.getElementById('rank-progress').style.width = ((G.totalOrders - prevMax)/(currentRank.max - prevMax)*100) + "%";
            document.getElementById('rank-next').innerText = `До ${next.name}: ${currentRank.max - G.totalOrders} заказов`;
        } else {
            document.getElementById('rank-progress').style.width = "100%";
            document.getElementById('rank-next').innerText = "Максимальный ранг!";
        }
    }

    // Рендер районов
    const distContainer = document.getElementById('districts-list-container');
    if(distContainer) {
        let html = "";
        DISTRICTS.forEach((d, i) => {
            let isCurrent = G.district === i;
            let isOwner = G.housing.id === i;
            html += `<div class="card" style="border: ${isOwner ? '1px solid var(--gold)' : 'none'}">
                <b>${d.name}</b><br>
                <small>${isOwner ? 'Квартплата: ' + getDynamicPrice(d.czynszBase) : 'Аренда: ' + (d.rentPct*100) + '%'}</small><br>
                ${isCurrent ? '<button class="btn-action btn-secondary" disabled>ВЫ ЗДЕСЬ</button>' : `<button class="btn-action" onclick="moveDistrict(${i})">ПЕРЕЕХАТЬ</button>`}
                ${isOwner ? '<button class="btn-action" style="background:var(--gold);color:black;">🏠 ВЛАДЕЛЕЦ</button>' : `<button class="btn-action" style="margin-top:5px;" onclick="buyHouse(${i})">КУПИТЬ (${d.housePrice/1000}k)</button>`}
            </div>`;
        });
        distContainer.innerHTML = html;
    }
    
    // Кнопка автопилота
    const priceAuto = document.getElementById('price-auto');
    if(priceAuto) priceAuto.innerText = getDynamicPrice(45).toFixed(2) + " PLN";

    document.getElementById('stat-orders').innerText = G.totalOrders;
    document.getElementById('stat-earned').innerText = G.totalEarned.toFixed(2) + " PLN";
}

function consumeResources(isOrder) {
    let wCost = isOrder ? 10 : 3;
    G.waterStock = Math.max(0, G.waterStock - wCost);
    if (G.buffTime > 0) return; // Энергетик останавливает расход энергии
    let eCost = (G.scooter ? 7 : 10) * (isOrder ? 1.5 : 1) * (weather === "Дождь" && !G.raincoat ? 1.2 : 1);
    G.en = Math.max(0, G.en - eCost);
}

function doWork() {
    if(isBroken || bonusActive || G.en < 1) return;
    G.totalClicks++;
    if(order.active) {
        consumeResources(true);
        order.steps += (G.bikeRentTime > 0 ? 2 : 1) * (G.transportMode === 'bolt' ? 1.3 : 1);
        if(order.steps >= order.target) finishOrder(true);
    } else {
        consumeResources(false);
        let rankBonus = RANKS.find(r => G.totalOrders < r.max)?.bonus || 0.2;
        let gain = 0.10 * G.lvl * DISTRICTS[G.district].mult * (1 + rankBonus) * (G.bag ? 1.15 : 1);
        G.money += gain; G.totalEarned += gain; G.lvl += 0.00025;
        if(!order.visible && Math.random() < 0.2) generateOrder();
    }
    updateUI(); save();
}

function generateOrder() {
    order.visible = true; order.offerTimer = 15; order.reward = 10 + Math.random()*20;
    order.target = 150; order.steps = 0; order.time = 60; updateUI();
}

function acceptOrder() { order.active = true; document.getElementById('route-modal').style.display = 'none'; updateUI(); }

function buyHouse(id) {
    let p = DISTRICTS[id].housePrice;
    if(G.money >= p && confirm("Купить квартиру?")) {
        G.money -= p; G.housing.id = id; addHistory('🏠 КВАРТИРА', p, 'minus');
        save(); updateUI();
    }
}

function moveDistrict(id) {
    if(G.money >= DISTRICTS[id].price && G.lvl >= DISTRICTS[id].minLvl) {
        G.money -= DISTRICTS[id].price; G.district = id; updateUI(); save();
    }
}

setInterval(() => {
    if(G.autoTime > 0) {
        G.autoTime--;
        if(order.active && !isBroken) {
            for(let i=0; i<10; i++) {
                if(!order.active || isBroken) break;
                consumeResources(true); // РАСХОД В АВТО-РЕЖИМЕ
                order.steps += 2;
                if(order.steps >= order.target) { finishOrder(true); break; }
            }
        }
    }
    if(G.transportMode === 'veturilo') G.money -= (0.5/60);
    if(G.transportMode === 'bolt') G.money -= (2.5/60);
    if(G.bikeRentTime > 0) G.bikeRentTime--;
    if(G.buffTime > 0) G.buffTime--;
    if(G.blindTime > 0) G.blindTime--;

    G.tax--; if(G.tax <= 0) { G.tax = 300; if(G.money > 200) G.money *= 0.85; save(); }
    G.rent--; if(G.rent <= 0) { 
        G.rent = 300; 
        let cost = G.housing.id === G.district ? getDynamicPrice(DISTRICTS[G.district].czynszBase) : G.money * DISTRICTS[G.district].rentPct;
        G.money -= cost; save(); 
    }
    updateUI();
}, 1000);

function finishOrder(win) {
    order.active = false; order.visible = false;
    if(win) { G.money += order.reward; G.totalOrders++; G.lvl += 0.02; }
    updateUI(); save();
}

function listenToCloud() {
    const tgId = window.Telegram.WebApp.initDataUnsafe.user?.id || "test_user";
    if(window.db) window.db.ref('users/' + tgId).on('value', s => {
        const d = s.val(); if(!d) return;
        if(d.lastAdminUpdate > (G.lastAdminUpdate || 0)) { G = {...G, ...d}; updateUI(); }
    });
}

window.onload = load;
