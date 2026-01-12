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

// Основные данные
let G = { 
    money: 10, 
    debt: 0, 
    lvl: 1.0, 
    en: 2000, 
    maxEn: 2000, 
    tax: 300, 
    rent: 300, 
    waterStock: 0, 
    totalOrders: 0, 
    totalClicks: 0, 
    totalBottles: 0, 
    totalEarned: 0, 
    autoTime: 0, 
    district: 0, 
    bikeRentTime: 0, 
    buffTime: 0, 
    history: [], 
    usedPromos: [], 
    isNewPlayer: true, 
    lastWelfare: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
    // Предметы
    starter_bag: null,
    starter_phone: null,
    bag: null, 
    phone: null,
    scooter: null,
    helmet: null,
    raincoat: null,
    powerbank: null,
    dailyQuests: [],
    lastDailyUpdate: 0,
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ] 
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0; 
let lastClickTime = 0; 
let clicksSinceBonus = 0;
let bonusActive = false;

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500 } 
];

const UPGRADES = [
    // Стартовые (Слабые)
    { id: 'starter_bag', name: 'Старый Рюкзак', icon: '🎒', desc: 'Лучше, чем в руках.', price: 0, bonus: '+2% PLN', maxDur: 40, repairPrice: 5, hidden: true },
    { id: 'starter_phone', name: 'Древний Телефон', icon: '📱', desc: 'Звонит и ладно.', price: 0, bonus: 'Связь', maxDur: 40, repairPrice: 5, hidden: true },

    // Профессиональные (Магазин)
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', price: 350, bonus: '+15% PLN', maxDur: 100, repairPrice: 70 }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', price: 1200, bonus: 'Заказы x1.4', maxDur: 100, repairPrice: 250 }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', price: 500, bonus: '⚡ -30%', maxDur: 100, repairPrice: 100 },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50%.', price: 250, bonus: '🛡️ Безопасность', maxDur: 50, repairPrice: 50 },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Защита от дождя.', price: 180, bonus: '☔ Сухость', maxDur: 80, repairPrice: 40 },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот дольше.', price: 400, bonus: '🤖 +50% времени', maxDur: 100, repairPrice: 80 }
];

function addHistory(msg, val, type = 'plus') {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    G.history.unshift({ time, msg, val, type });
    if (G.history.length > 20) G.history.pop();
}

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
            let msg = promoData[code].msg;
            G.money = parseFloat((G.money + reward).toFixed(2));
            G.totalEarned += reward;
            G.usedPromos.push(code);
            addHistory('🎁 ПРОМО', reward, 'plus');
            log("🎁 " + msg + " +" + reward + " PLN", "var(--gold)");
            inputField.value = "";
            save(); updateUI();
        } else {
            log("Неверный код!", "var(--danger)");
        }
    } catch (e) {
        log("Ошибка связи с базой!", "var(--danger)");
    }
}

const sphere = document.getElementById('work-sphere');
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); }, {passive: false});
    sphere.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) doWork(); });
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

function showBonus() {
    const overlay = document.getElementById('bonus-overlay');
    const btn = document.getElementById('bonus-btn');
    const x = Math.random() * (window.innerWidth - 150);
    const y = Math.random() * (window.innerHeight - 100);
    btn.style.left = x + 'px';
    btn.style.top = y + 'px';
    overlay.style.display = 'flex';
    bonusActive = true;
    log("🎁 Появился БОНУС! Забери его!", "var(--gold)");
    tg.HapticFeedback.notificationOccurred('warning');
}

function claimBonus() {
    const overlay = document.getElementById('bonus-overlay');
    overlay.style.display = 'none';
    bonusActive = false;
    clicksSinceBonus = 0;
    G.money = parseFloat((G.money + 50).toFixed(2));
    G.totalEarned += 50;
    addHistory('🎁 БОНУС', 50, 'plus');
    log("Вы забрали бонус +50 PLN", "var(--success)");
    tg.HapticFeedback.notificationOccurred('success');
    save(); updateUI();
}

function checkStarterPack() {
    if (G.isNewPlayer === undefined) G.isNewPlayer = (G.totalOrders === 0);
    if (G.isNewPlayer) {
        document.getElementById('starter-modal').style.display = 'flex';
    }
}

function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50;
    G.waterStock += 500;
    G.bikeRentTime += 900; 
    G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    
    G.starter_bag = { active: true, dur: 50 }; 
    G.starter_phone = { active: true, dur: 50 };

    addHistory('🎁 STARTER KIT', 50, 'plus');
    log("Вы получили набор новичка!", "var(--success)");
    save();
    updateUI();
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

function saveToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";
    let firstName = (tg && tg.user) ? tg.user.first_name : "Browser Player";
    let userName = (tg && tg.user && tg.user.username) ? "@" + tg.user.username : "No Username";

    let dataToSave = {
        ...G,
        name: firstName,
        user: userName,
        lastActive: Date.now()
    };

    if(typeof db !== 'undefined') {
        db.ref('users/' + userId).set(dataToSave);
    }
}

function save() { 
    localStorage.setItem(SAVE_KEY, JSON.stringify(G)); 
    if(typeof saveToCloud === 'function') saveToCloud(); 
}

function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { G = {...G, ...JSON.parse(d)}; } 
    G.maxEn = 2000; 
    if(!G.shoes) G.shoes = { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 }; 
    if(isNaN(G.totalEarned)) G.totalEarned = G.money;
    if(isNaN(G.totalOrders)) G.totalOrders = 0;
    if(!G.lastWelfare) G.lastWelfare = 0; 

    ['bag', 'phone', 'scooter', 'helmet', 'raincoat', 'powerbank'].forEach(item => {
        if (G[item] === true) G[item] = { active: true, dur: 100 };
    });

    if (!G.bag && !G.starter_bag) {
        G.starter_bag = { active: true, dur: 50 };
        log("🎒 Вы нашли на чердаке Старый Рюкзак!", "var(--success)");
    }
    if (!G.phone && !G.starter_phone) {
        G.starter_phone = { active: true, dur: 50 };
        log("📱 Вы откопали Древний Телефон!", "var(--success)");
    }

    checkStarterPack();
    generateDailyQuests();
    if(typeof listenToCloud === 'function') listenToCloud();
    updateUI(); 
}

function updateUI() {
    const moneyEl = document.getElementById('money-val');
    if(moneyEl) {
        moneyEl.innerText = G.money.toFixed(2) + " PLN";
        moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
    }
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    document.getElementById('district-ui').innerText = "📍 " + DISTRICTS[G.district].name;
    document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️ Дождь" : "☀️ Ясно");
    
    if(weather === "Дождь") document.body.classList.add('rain-mode');
    else document.body.classList.remove('rain-mode');
    
    document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
    if(G.autoTime > 0) document.getElementById('auto-status-ui').innerText = "🤖 " + Math.floor(G.autoTime/60) + ":" + ((G.autoTime%60<10?'0':'')+G.autoTime%60);
    
    document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
    if(G.bikeRentTime > 0) document.getElementById('bike-status-ui').innerText = "🚲 " + Math.floor(G.bikeRentTime/60) + ":" + ((G.bikeRentTime%60<10?'0':'')+G.bikeRentTime%60);
    
    const buffUI = document.getElementById('buff-status-ui'); 
    buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
    if(G.buffTime > 0) buffUI.innerText = "⚡ " + Math.floor(G.buffTime/60) + ":" + ((G.buffTime%60<10?'0':'')+G.buffTime%60);
    
    document.getElementById('shoe-name').innerText = G.shoes.name;
    const sPct = (G.shoes.dur / G.shoes.maxDur) * 100;
    document.getElementById('shoe-bar').style.width = sPct + "%";
    document.getElementById('shoe-bar').style.background = sPct < 20 ? "var(--danger)" : "var(--purple)";

    let currentRank = RANKS[0];
    let nextRank = null;
    if (G.totalOrders < RANKS[0].max) { currentRank = RANKS[0]; nextRank = RANKS[1]; }
    else if (G.totalOrders < RANKS[1].max) { currentRank = RANKS[1]; nextRank = RANKS[2]; }
    else if (G.totalOrders < RANKS[2].max) { currentRank = RANKS[2]; nextRank = RANKS[3]; }
    else { currentRank = RANKS[3]; nextRank = null; }

    document.getElementById('rank-icon').innerText = currentRank.icon;
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

    let questsHTML = "";
    if(G.dailyQuests) {
        G.dailyQuests.forEach(q => {
            let btn = "";
            let progressPct = (q.current / q.target) * 100;
            if (q.claimed) {
                btn = "<span style='color:var(--success)'>✅</span>";
            } else if (q.current >= q.target) {
                btn = "<button class='btn-action' style='width:auto; padding:4px 8px; font-size:10px; background:var(--gold); color:black;' onclick='claimDaily(" + q.id + ")'>ЗАБРАТЬ " + q.reward + "</button>";
            } else {
                btn = "<small>" + parseFloat(q.current).toFixed(0) + "/" + q.target + "</small>";
            }
            
            questsHTML += "<div class='daily-quest-item'>" +
                "<div class='daily-quest-info'>" +
                    "<b>" + q.text + "</b><br>" +
                    "<div style='width:100%; height:4px; background:#333; margin-top:4px; border-radius:2px;'><div style='height:100%; background:var(--accent-blue); width:" + Math.min(100, progressPct) + "%'></div></div>" +
                "</div>" +
                "<div style='margin-left:10px;'>" + btn + "</div>" +
            "</div>";
        });
    }
    document.getElementById('daily-quests-list').innerHTML = questsHTML;

    document.getElementById('stat-orders').innerText = G.totalOrders || 0;
    document.getElementById('stat-clicks').innerText = G.totalClicks || 0;
    document.getElementById('stat-bottles').innerText = G.totalBottles || 0;
    document.getElementById('stat-earned').innerText = (G.totalEarned || 0).toFixed(2) + " PLN";
    
    let timeLeft = (G.lastDailyUpdate + 86400000) - Date.now();
    if(timeLeft < 0) timeLeft = 0;
    let hours = Math.floor(timeLeft / (1000 * 60 * 60));
    let mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('daily-timer').innerText = "Обновление: " + hours + "ч " + mins + "м";

    const sphere = document.getElementById('work-sphere');
    if (isBroken) {
        sphere.classList.add('broken');
        document.getElementById('sphere-text').innerText = "ЧИНИТЬ";
        document.getElementById('repair-express-btn').style.display = 'block';
        document.getElementById('click-rate-ui').innerText = repairProgress + " / 50";
        document.getElementById('repair-progress').style.height = (repairProgress * 2) + "%";
    } else {
        sphere.classList.remove('broken');
        document.getElementById('sphere-text').innerText = "РАБОТАТЬ";
        document.getElementById('repair-express-btn').style.display = 'none';
        document.getElementById('repair-progress').style.height = "0%";
        
        let rankBonus = 0;
        if (G.totalOrders >= 50) rankBonus = 0.05;
        if (G.totalOrders >= 150) rankBonus = 0.10;
        if (G.totalOrders >= 400) rankBonus = 0.20;

        let rate = (0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (1 + rankBonus)).toFixed(2);
        if(order.visible && !order.active) rate = "0.00 (ПРИМИ ЗАКАЗ!)"; 
        document.getElementById('click-rate-ui').innerText = rate + " PLN";
    }

    const invDisp = document.getElementById('inventory-display'); 
    invDisp.innerHTML = ''; 
    UPGRADES.forEach(up => { 
        if(G[up.id] && G[up.id].dur > 0) { 
            const span = document.createElement('span'); 
            span.className = 'inv-item'; 
            span.innerText = up.icon + " " + up.bonus; 
            invDisp.appendChild(span); 
        } 
    });
    
    const myItemsList = document.getElementById('my-items-list');
    myItemsList.innerHTML = '';
    
    const shoeDiv = document.createElement('div');
    shoeDiv.className = 'card';
    shoeDiv.style.marginBottom = '5px';
    shoeDiv.style.borderColor = "var(--purple)";
    shoeDiv.innerHTML = "<b>👟 " + G.
