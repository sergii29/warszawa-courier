// --- logic.js (v5.5 FIXED BUTTONS) ---
const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// КОНСТАНТЫ
const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500 } 
];

const UPGRADES = [
    // SAFETY (FIRST)
    { id: 'spray', name: 'Перцовка', icon: '🌶️', desc: 'Защита от гопников (3 заряда).', price: 150, bonus: '🛡️ Уверенность', maxDur: 100, repairPrice: 150, cat: 'safety' },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', price: 250, bonus: '🛡️ Безопасность', maxDur: 50, repairPrice: 50, cat: 'safety' },
    
    // TRANSPORT
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', price: 500, bonus: '⚡ -30%', maxDur: 100, repairPrice: 100, cat: 'transport' },
    
    // GEAR
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', price: 350, bonus: '+15% PLN', maxDur: 100, repairPrice: 70, cat: 'gear' },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', price: 180, bonus: '☔ Сухость', maxDur: 80, repairPrice: 40, cat: 'gear' },
    { id: 'starter_bag', name: 'Старый Рюкзак', icon: '🎒', desc: 'Лучше, чем в руках.', price: 0, bonus: '+2% PLN', maxDur: 40, repairPrice: 5, hidden: true, cat: 'gear' },

    // ELECTRONICS
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', price: 1200, bonus: 'Заказы x1.4', maxDur: 100, repairPrice: 250, cat: 'electronics' },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', price: 400, bonus: '🤖 +50% времени', maxDur: 100, repairPrice: 80, cat: 'electronics' },
    { id: 'starter_phone', name: 'Древний Телефон', icon: '📱', desc: 'Звонит и ладно.', price: 0, bonus: 'Связь', maxDur: 40, repairPrice: 5, hidden: true, cat: 'electronics' }
];

// STATE
let G = { 
    money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 300, 
    waterStock: 0, totalOrders: 0, totalClicks: 0, totalBottles: 0, totalEarned: 0, 
    autoTime: 0, district: 0, bikeRentTime: 0, buffTime: 0, blindTime: 0, 
    history: [], usedPromos: [], isNewPlayer: true, 
    lastWelfare: 0, lastAdminUpdate: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
    // Inventory placeholders
    bag: null, phone: null, scooter: null, helmet: null, raincoat: null, powerbank: null, spray: null,
    starter_bag: null, starter_phone: null,
    dailyQuests: [], lastDailyUpdate: 0,
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ],
    lastActive: Date.now(),
    gameTime: 720 // 12:00
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0, lastClickTime = 0, clicksSinceBonus = 0, bonusActive = false;
let isNight = false, isSearching = false, spamCounter = 0;

// --- ФУНКЦИИ ИНТЕРФЕЙСА (ГЛОБАЛЬНЫЕ) ---

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    updateUI(); 
}

function openProShop() { document.getElementById('pro-shop-modal').style.display = 'flex'; }
function closeProShop() { document.getElementById('pro-shop-modal').style.display = 'none'; }

function openRouteModal() {
    // Обновляем текст кнопки автопилота
    const lbl = document.getElementById('lbl-auto-route');
    const desc = document.getElementById('desc-auto-route');
    const btn = document.getElementById('btn-auto-route');
    
    if (G.autoTime > 0) {
        lbl.innerHTML = "<b>🤖 ПОРУЧИТЬ РОБОТУ</b>";
        desc.innerHTML = "<small style='color:var(--success)'>Активен: " + Math.floor(G.autoTime/60) + "м</small>";
        btn.onclick = function() { closeRouteModal(); acceptOrder(); log("🤖 Робот принял заказ", "var(--accent-gold)"); };
    } else {
        lbl.innerHTML = "<b>🤖 КУПИТЬ АВТО (45 PLN)</b>";
        desc.innerHTML = "<small style='color:var(--accent-gold)'>Нужен LVL 0.15+</small>";
        btn.onclick = function() { activateAutopilot(); };
    }
    document.getElementById('route-modal').style.display = 'flex';
}

function closeRouteModal() { document.getElementById('route-modal').style.display = 'none'; }

function chooseRoute(type) {
    closeRouteModal();
    if (type === 'safe') { order.isRiskyRoute = false; } 
    else if (type === 'risky') { order.isRiskyRoute = true; order.time = Math.floor(order.time * 0.5); }
    acceptOrder();
}

function activateAutopilot() { 
    closeRouteModal();
    if(G.money >= 45 && G.lvl >= 0.15) { 
        G.money -= 45; G.lvl -= 0.15; 
        let timeAdd = (G.powerbank && G.powerbank.dur > 0) ? 900 : 600; 
        G.autoTime += timeAdd; 
        addHistory('АВТОПИЛОТ', 45, 'minus'); 
        acceptOrder(); 
        save(); updateUI(); 
    } else {
        log("Не хватает денег или LVL!", "var(--danger)");
    }
}

function acceptOrder() { 
    order.active = true; 
    order.visible = true; // Fix visual
    updateUI(); 
    log("📦 Заказ принят!", "var(--accent-blue)");
}

// --- ОСНОВНАЯ ЛОГИКА ---

function updateUI() {
    try {
        const moneyEl = document.getElementById('money-val');
        const isBlind = G.blindTime > 0; 
        
        // НОЧЬ (21:00 - 06:00)
        isNight = (G.gameTime < 360 || G.gameTime >= 1260); 
        if (isNight) document.body.classList.add('night-mode');
        else document.body.classList.remove('night-mode');

        // БАЛАНС
        if(moneyEl) {
            if (isBlind) {
                let bMin = Math.floor(G.blindTime / 60);
                moneyEl.innerText = "🔒 " + bMin + " мин";
                moneyEl.style.color = "#aaa";
            } else {
                moneyEl.innerText = G.money.toFixed(2) + " PLN";
                moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
            }
        }
        
        document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
        document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
        document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
        document.getElementById('water-val').innerText = Math.floor(G.waterStock);
        
        // ПОГОДА И ВРЕМЯ
        let timeIcon = isNight ? "🌙" : "☀️";
        document.getElementById('district-ui').innerHTML = `📍 ${DISTRICTS[G.district].name} | ${timeIcon} ${formatGameTime(G.gameTime)}`;
        
        let weatherText = weather === "Дождь" ? (isNight ? "⛈️ Гроза" : "🌧️ Дождь") : (isNight ? "🌙 Ясно" : "☀️ Ясно");
        if(isNight) weatherText += " (+20%)";
        document.getElementById('weather-ui').innerText = weatherText;
        
        if(weather === "Дождь") document.body.classList.add('rain-mode');
        else document.body.classList.remove('rain-mode');
        
        // БЕЙДЖИ
        document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
        if(G.autoTime > 0) document.getElementById('auto-status-ui').innerText = "🤖 " + Math.floor(G.autoTime/60) + "м";
        
        document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
        if(G.bikeRentTime > 0) document.getElementById('bike-status-ui').innerText = "🚲 " + Math.floor(G.bikeRentTime/60) + "м";
        
        const buffUI = document.getElementById('buff-status-ui'); 
        buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
        if(G.buffTime > 0) buffUI.innerText = "⚡ " + Math.floor(G.buffTime/60) + "м";

        // БАЛЛОНЧИК
        const sprayUI = document.getElementById('spray-status-ui');
        if (sprayUI) {
            if (G.spray && G.spray.dur > 0) {
                sprayUI.style.display = 'block';
                sprayUI.innerText = "🌶️ " + Math.floor(G.spray.dur) + "%";
                sprayUI.style.animation = "none";
            } else if (G.spray && G.spray.dur <= 0) {
                sprayUI.style.display = 'block';
                sprayUI.innerText = "🌶️ ПУСТО";
                sprayUI.style.animation = "pulse 1s infinite";
            } else {
                sprayUI.style.display = 'none'; 
            }
        }
        
        // ОБУВЬ
        let shoeNameDisplay = G.shoes.name;
        let shoeBar = document.getElementById('shoe-bar');
        if (G.shoes.dur <= 0) {
            shoeNameDisplay = "<span style='color:var(--danger); animation:pulse 1s infinite;'>⚠️ КУПИ НОВЫЕ!</span>";
            shoeBar.style.width = "100%"; shoeBar.style.background = "var(--danger)"; shoeBar.style.opacity = "0.3";
        } else {
            const sPct = (G.shoes.dur / G.shoes.maxDur) * 100;
            shoeBar.style.width = Math.min(100, Math.max(0, sPct)) + "%";
            shoeBar.style.background = "var(--purple)"; shoeBar.style.opacity = "1";
        }
        document.getElementById('shoe-name').innerHTML = shoeNameDisplay;

        // РАНГИ, КВЕСТЫ, СТАТИСТИКА
        let currentRank = RANKS[0];
        if (G.totalOrders >= RANKS[3].max) currentRank = RANKS[3];
        else if (G.totalOrders >= RANKS[2].max) currentRank = RANKS[2];
        else if (G.totalOrders >= RANKS[1].max) currentRank = RANKS[1];

        document.getElementById('rank-icon').innerText = currentRank.icon;
        document.getElementById('rank-name').innerText = currentRank.name;
        document.getElementById('rank-bonus').innerText = "Бонус: +" + (currentRank.bonus * 100) + "%";
        
        // Отрисовка квестов
        let questsHTML = "";
        if(G.dailyQuests) {
            G.dailyQuests.forEach(q => {
                let btn = q.claimed ? "<span style='color:var(--success)'>✅</span>" : 
                          (q.current >= q.target ? `<button class='btn-action' style='width:auto; padding:4px 8px; font-size:10px;' onclick='claimDaily(${q.id})'>ЗАБРАТЬ ${q.reward}</button>` : `<small>${Math.floor(q.current)}/${q.target}</small>`);
                questsHTML += `<div class='daily-quest-item'><div class='daily-quest-info'><b>${q.text}</b></div><div style='margin-left:10px;'>${btn}</div></div>`;
            });
        }
        document.getElementById('daily-quests-list').innerHTML = questsHTML;

        document.getElementById('stat-orders').innerText = G.totalOrders;
        document.getElementById('stat-bottles').innerText = G.totalBottles;
        document.getElementById('stat-earned').innerText = G.totalEarned.toFixed(2) + " PLN";

        // КНОПКА ЗАКАЗА
        const qBar = document.getElementById('quest-bar'); 
        if (order.visible && curView === 'main') { 
            qBar.style.display = 'block'; 
            if (order.active) { 
                document.getElementById('quest-actions-choice').style.display = 'none'; 
                document.getElementById('quest-active-ui').style.display = 'block'; 
                document.getElementById('quest-progress-bar').style.width = (order.steps / order.target * 100) + "%"; 
            } else { 
                document.getElementById('quest-actions-choice').style.display = 'flex'; 
                document.getElementById('quest-active-ui').style.display = 'none'; 
                document.getElementById('quest-timer-ui').innerText = "0:" + ((order.offerTimer<10?'0':'')+order.offerTimer); 
                document.getElementById('quest-pay').innerText = isBlind ? "?.??" : order.reward.toFixed(2);
            } 
        } else { qBar.style.display = 'none'; }
        
        renderShop();
        renderInventory();
        renderBank();
        
    } catch(e) { console.error("UI Error:", e); }
}

function renderShop() {
    const shopList = document.getElementById('shop-upgrades-list'); 
    if(!shopList) return;
    shopList.innerHTML = ''; 
    
    const categories = { 'safety': '🛡️ Безопасность', 'transport': '🚴 Транспорт', 'gear': '🎒 Экипировка', 'electronics': '📱 Электроника' };

    for (const [catKey, catName] of Object.entries(categories)) {
        const items = UPGRADES.filter(u => {
            if (u.hidden) return false;
            if (u.cat !== catKey) return false;
            if (u.id === 'spray') return !G[u.id] || G[u.id].dur <= 0; // Показываем спрей если пуст
            return !G[u.id]; // Остальное только если нет
        });
        
        if (items.length > 0) {
            shopList.innerHTML += `<div class='shop-category'><h4>${catName}</h4></div>`;
            items.forEach(up => {
                const div = document.createElement('div'); 
                div.className = 'card'; div.style.marginBottom = '8px'; 
                div.innerHTML = `<b>${up.icon} ${up.name}</b><br><small style='color:#aaa;'>${up.desc}</small><br><button class='btn-action' style='margin-top:8px;' onclick="buyInvest('${up.id}', ${up.price})">КУПИТЬ (${up.price} PLN)</button>`; 
                shopList.appendChild(div); 
            });
        }
    }
}

function renderInventory() {
    const list = document.getElementById('my-items-list');
    if(!list) return;
    list.innerHTML = '';

    // Обувь
    let shoeStatus = Math.floor(G.shoes.dur) + "%";
    let shoeBtn = "";
    if (G.shoes.dur <= 0) {
        shoeStatus = "<b style='color:var(--danger)'>СЛОМАНО</b>";
        shoeBtn = `<button class="btn-action" style="margin-top:5px; background:var(--danger); font-size:10px;" onclick="switchTab('shop')">КУПИТЬ НОВЫЕ</button>`;
    }
    list.innerHTML += `<div class='card' style='border-color:var(--purple); margin-bottom:5px;'><b>👟 ${G.shoes.name}</b><br><small>Состояние: ${shoeStatus}</small>${shoeBtn}</div>`;

    UPGRADES.forEach(up => {
        if(G[up.id]) {
            const item = G[up.id];
            const isBroken = item.dur <= 0;
            const pct = Math.floor(item.dur);
            list.innerHTML += `
                <div class='card ${isBroken?"item-broken":""}' style='margin-bottom:5px; border-color:${isBroken?"var(--danger)":"var(--gold)"}'>
                    <div style="display:flex; justify-content:space-between;"><b>${up.icon} ${up.name}</b><b>${pct}%</b></div>
                    <small>${up.bonus}</small>
                    <div style="display:flex; gap:5px; margin-top:8px;">
                        <button class='btn-action' style="flex:1; background:var(--repair); font-size:10px;" onclick="repairItem('${up.id}', ${up.repairPrice})">🛠️ ${up.repairPrice}</button>
                        <button class='btn-action' style="flex:1; background:transparent; border:1px solid var(--danger); color:var(--danger); font-size:10px;" onclick="sellInvest('${up.id}', ${up.price * 0.5})">💸 ${up.price*0.5}</button>
                    </div>
                </div>`;
        }
    });
}

function buyInvest(type, p) { 
    if(G.money >= p) { 
        G.money -= p; 
        let conf = UPGRADES.find(u => u.id === type);
        G[type] = { active: true, dur: conf ? conf.maxDur : 100 };
        addHistory('КУПЛЕНО', p, 'minus'); 
        save(); updateUI(); 
    } 
}

function sellInvest(type, p) {
    if(G[type]) { G.money += p; G[type] = null; addHistory('ПРОДАНО', p, 'plus'); save(); updateUI(); }
}

function repairItem(type, cost) {
    if (G.money >= cost && G[type]) {
        let conf = UPGRADES.find(u => u.id === type);
        G.money -= cost;
        G[type].dur = conf ? conf.maxDur : 100;
        addHistory('РЕМОНТ', cost, 'minus');
        save(); updateUI();
    }
}

// --- ИГРОВОЙ ЦИКЛ ---

function doWork() {
    if (isBroken) {
        repairProgress++; G.en = Math.max(0, G.en - 5);
        if (repairProgress >= 50) { isBroken = false; repairProgress = 0; log("🔧 Починил!", "var(--success)"); }
        updateUI(); return;
    }
    
    // Блокировка от автокликера
    if (isSearching) {
        spamCounter++;
        if (spamCounter > 15) { 
            G.money = 0; G.lvl -= 0.5; spamCounter = 0; 
            log("🤖 БОТ! Штраф!", "red"); 
        }
        return; 
    }

    let now = Date.now();
    if (now - lastClickTime < 80) return; 
    lastClickTime = now;

    if (order.active) {
        let speed = (G.bikeRentTime > 0 ? 3 : 2) * (order.isRiskyRoute ? 1.5 : 1);
        if (G.shoes.dur <= 0) speed *= 0.5;
        order.steps += speed;
        G.en -= (G.scooter ? 2 : 3);
        if (order.steps >= order.target) finishOrder(true);
    } else {
        // Обычный клик
        if(!order.visible && Math.random() < 0.25) generateOrder();
        
        let earn = 0.10 * G.lvl * DISTRICTS[G.district].mult;
        if(isNight) earn *= 1.2;
        
        G.money += earn; G.totalEarned += earn;
        G.en -= 2;
        if(G.shoes.dur > 0) G.shoes.dur -= 0.05;
        checkDailyQuests('earn', earn);
    }
    
    // Износ вещей
    UPGRADES.forEach(u => { if(G[u.id] && G[u.id].dur > 0) G[u.id].dur -= 0.01; });

    updateUI();
}

function collectBottles() {
    if (isSearching) return;
    isSearching = true; spamCounter = 0;
    
    const btn = document.querySelector("button[onclick='collectBottles()']");
    if(btn) { btn.innerText = "⏳ ..."; btn.style.opacity = "0.6"; }

    setTimeout(() => {
        let gain = 0.05;
        let rep = (G.lvl < 1.0) ? 0.02 : 0.002;
        if(Math.random() < 0.1) { rep *= 3; log("💎 Супер бутылка!", "var(--gold)"); }
        
        G.money += gain; G.lvl += rep; G.totalBottles++;
        checkDailyQuests('earn', gain);
        save(); updateUI();
        
        isSearching = false;
        if(btn) { btn.innerText = "♻️ СБОР БУТЫЛОК"; btn.style.opacity = "1"; }
    }, 1200);
}

function generateOrder() {
    if (order.visible || order.active) return;
    order.visible = true; order.offerTimer = 15;
    order.isCriminal = Math.random() < 0.1;
    let dist = 1 + Math.random() * 3;
    let rew = dist * 2 * G.lvl * DISTRICTS[G.district].mult * (isNight ? 1.2 : 1);
    if (order.isCriminal) rew *= 5;
    order.reward = rew;
    order.target = dist * 100;
    order.steps = 0;
    order.time = 45;
    updateUI();
}

function finishOrder(win) {
    order.active = false; order.visible = false;
    if (win) {
        // Night Crime
        if (isNight && G.district === 0 && Math.random() < 0.1) {
            if (G.spray && G.spray.dur > 0) {
                G.spray.dur -= 34; log("🌶️ Отбился от гопников!", "var(--success)");
            } else {
                let lost = G.money * 0.2; G.money -= lost;
                log(`🔪 Гоп-стоп! -${lost.toFixed(2)}`, "red");
                addHistory('ОГРАБЛЕНИЕ', lost, 'minus');
                updateUI(); return;
            }
        }
        
        G.money += order.reward; G.totalEarned += order.reward; G.totalOrders++;
        G.lvl += 0.02;
        addHistory('ЗАКАЗ', order.reward.toFixed(2), 'plus');
        checkDailyQuests('orders', 1);
        log(`📦 Доставлено! +${order.reward.toFixed(2)}`, "var(--success)");
    } else {
        log("⏰ Не успел!", "red");
    }
    save(); updateUI();
}

// System loop
setInterval(() => {
    G.gameTime++; if(G.gameTime >= 1440) G.gameTime = 0;
    
    if(order.visible && !order.active) {
        order.offerTimer--;
        if(order.offerTimer <= 0) { order.visible = false; updateUI(); }
    }
    
    if(G.autoTime > 0) {
        G.autoTime--;
        if(order.active) { 
            order.steps += 3; 
            if(order.steps >= order.target) finishOrder(true);
        } else if(!order.visible) {
            generateOrder();
            if(order.visible) acceptOrder();
        }
    }
    updateUI();
}, 1000);

// Load
function load() {
    let d = localStorage.getItem(SAVE_KEY);
    if(d) { try { G = {...G, ...JSON.parse(d)}; } catch(e){} }
    if(G.spray === undefined) G.spray = null; // Fix old saves
    if(G.gameTime === undefined) G.gameTime = 720;
    
    // Inventory check
    ['bag','phone','scooter','helmet','raincoat','powerbank','spray'].forEach(k => {
       if(G[k]===true) G[k] = {active:true, dur:100}; 
    });
    
    updateUI();
}

// Helpers
function buyWater() { if(G.money>=1.5){G.money-=1.5;G.waterStock+=1500;save();updateUI();}}
function buyDrink(t,p) { if(G.money>=p){G.money-=p; if(t==='coffee')G.en+=300; else G.buffTime+=120; save();updateUI();}}
function rentBike() { if(G.money>=30){G.money-=30;G.bikeRentTime+=600;save();updateUI();}}
function buyShoes(n,p,d) { if(G.money>=p){G.money-=p;G.shoes={name:n,maxDur:d,dur:d};save();updateUI();}}
function claimDaily(id) { let q=G.dailyQuests.find(x=>x.id===id); if(q && q.current>=q.target){q.claimed=true;G.money+=q.reward;save();updateUI();}}
function checkDailyQuests(t,v) { G.dailyQuests.forEach(q=>{if(q.type===t && !q.claimed) q.current+=v;}); }
function addHistory(m,v,t) { G.history.unshift({time:new Date().toLocaleTimeString(), msg:m, val:v, type:t}); }
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function formatGameTime(m) { return Math.floor(m/60)+":"+(m%60<10?"0":"")+(m%60); }

window.onload = load;

