const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// КОНФИГУРАЦИЯ РАНГОВ
const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" }, // +5%
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },   // +10%
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" } // +20%
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
    scooter: false, 
    bag: false, 
    phone: false, 
    raincoat: false, // НОВОЕ
    helmet: false, // НОВОЕ
    powerbank: false, // НОВОЕ
    district: 0, 
    bikeRentTime: 0, 
    buffTime: 0, 
    history: [], 
    usedPromos: [], 
    isNewPlayer: true, 
    lastWelfare: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
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

// ОБНОВЛЕННЫЙ СПИСОК ТОВАРОВ
const UPGRADES = [
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам.', price: 350, bonus: '+15% PLN' }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы чаще.', price: 1200, bonus: 'Заказы x1.4' }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Расход энергии -30%.', price: 500, bonus: '⚡ -30%' },
    { id: 'helmet', name: 'Шлем Safety', icon: '🧢', desc: 'Риск аварии -50% (до 15%).', price: 250, bonus: '🛡️ Безопасность' },
    { id: 'raincoat', name: 'Дождевик', icon: '🧥', desc: 'Нет штрафа энергии в дождь.', price: 180, bonus: '☔ Сухость' },
    { id: 'powerbank', name: 'Powerbank 20k', icon: '🔋', desc: 'Автопилот работает 15 минут.', price: 400, bonus: '🤖 +50% времени' }
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
    if(isNaN(G.totalClicks)) G.totalClicks = 0;
    if(isNaN(G.totalBottles)) G.totalBottles = 0;
    if(!G.lastWelfare) G.lastWelfare = 0; 

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

    // КАРЬЕРА UI
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
        if(G[up.id]) { 
            const span = document.createElement('span'); 
            span.className = 'inv-item'; 
            span.innerText = up.icon + " " + up.bonus; 
            invDisp.appendChild(span); 
        } 
    });
    
    // --- ИНВЕНТАРЬ (ЛОМБАРД) ---
    const myItemsList = document.getElementById('my-items-list');
    myItemsList.innerHTML = '';
    
    const shoeDiv = document.createElement('div');
    shoeDiv.className = 'card';
    shoeDiv.style.marginBottom = '5px';
    shoeDiv.style.borderColor = "var(--purple)";
    shoeDiv.innerHTML = "<b>👟 " + G.shoes.name + "</b><br><small>Состояние: " + Math.floor(G.shoes.dur) + "%</small>";
    myItemsList.appendChild(shoeDiv);

    UPGRADES.forEach(up => {
        if(G[up.id]) {
            const div = document.createElement('div'); 
            div.className = 'card'; 
            div.style.marginBottom = '5px'; 
            div.style.borderColor = "var(--gold)";
            div.innerHTML = "<b>" + up.icon + " " + up.name + "</b><br><small style='color:#aaa;'>" + up.bonus + "</small><br><button class='btn-action' style='margin-top:8px; background:transparent; border:1px solid var(--danger); color:var(--danger); font-size:10px; padding:6px;' onclick=\"sellInvest('" + up.id + "', " + (up.price * 0.5) + ")\">💸 ПРОДАТЬ (+ " + (up.price * 0.5) + " PLN)</button>"; 
            myItemsList.appendChild(div);
        }
    });
    
    // --- МАГАЗИН: СПИСОК УЛУЧШЕНИЙ ---
    const shopList = document.getElementById('shop-upgrades-list'); 
    shopList.innerHTML = ''; 
    UPGRADES.forEach(up => { 
        if(!G[up.id]) { 
            const div = document.createElement('div'); 
            div.className = 'card'; 
            div.style.marginBottom = '8px'; 
            div.innerHTML = "<b>" + up.icon + " " + up.name + "</b><br><small style='color:#aaa;'>" + up.desc + "</small><br><button class='btn-action' style='margin-top:8px;' onclick=\"buyInvest('" + up.id + "', " + up.price + ")\">КУПИТЬ (" + up.price + " PLN)</button>"; 
            shopList.appendChild(div); 
        }
    });
    
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
            document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        } 
    } else { qBar.style.display = 'none'; }
    
    document.getElementById('buy-bike-rent').innerText = G.bikeRentTime > 0 ? "В АРЕНДЕ" : "АРЕНДОВАТЬ (30 PLN)";
    
    document.getElementById('history-ui').innerHTML = G.history.map(h => "<div class='history-item'><span>" + h.time + " " + h.msg + "</span><b style='color:" + (h.type==='plus'?'var(--success)':'var(--danger)') + "'>" + (h.type==='plus'?'+':'-') + h.val + "</b></div>").join('');
    
    renderBank(); 
    renderMilestones();
    updateDistrictButtons();
    
    const taxTimer = document.getElementById('tax-timer');
    const rentTimer = document.getElementById('rent-timer');
    if(taxTimer) taxTimer.innerText = "Налог (37%) через: " + Math.floor(G.tax/60) + ":" + ((G.tax%60<10?'0':'')+G.tax%60);
    let rentP = (DISTRICTS[G.district].rentPct * 100).toFixed(0);
    if(rentTimer) rentTimer.innerText = "Аренда (" + rentP + "%) через: " + Math.floor(G.rent/60) + ":" + ((G.rent%60<10?'0':'')+G.rent%60);
}

function updateDistrictButtons() {
    DISTRICTS.forEach((d, i) => {
        const btn = document.getElementById("btn-dist-" + i);
        if(!btn) return;

        if (G.district === i) {
            btn.innerText = "✅ ТЕКУЩИЙ";
            btn.style.background = "rgba(34, 197, 94, 0.2)";
            btn.style.color = "var(--success)";
            btn.style.cursor = "default";
            btn.onclick = null;
        } else {
            let canAfford = G.money >= d.price;
            let levelOk = G.lvl >= d.minLvl;
            
            if (canAfford && levelOk) {
                btn.innerText = "ПЕРЕЕХАТЬ (" + d.price + " PLN)";
                btn.style.background = "var(--accent-blue)";
                btn.style.color = "white";
                btn.style.cursor = "pointer";
                btn.onclick = () => moveDistrict(i);
            } else {
                if(!levelOk) btn.innerText = "НУЖЕН LVL " + d.minLvl;
                else btn.innerText = "НЕТ ДЕНЕГ (" + d.price + " PLN)";
                btn.style.background = "rgba(255,255,255,0.1)";
                btn.style.color = "#777";
                btn.style.cursor = "not-allowed";
                btn.onclick = null;
            }
        }
    });
}

function doWork() {
    G.totalClicks++; 
    checkDailyQuests('clicks', 1);

    if (isBroken) {
        repairProgress++;
        G.en = Math.max(0, G.en - 5); 
        tg.HapticFeedback.impactOccurred('heavy');
        if (repairProgress >= 50) {
            isBroken = false;
            repairProgress = 0;
            log("🔧 Вы починили транспорт!", "var(--success)");
            tg.HapticFeedback.notificationOccurred('success');
        }
        updateUI();
        save(); 
        return;
    }

    if (bonusActive) {
        G.en = Math.max(0, G.en - 50); 
        tg.HapticFeedback.notificationOccurred('error');
        updateUI();
        return; 
    }
    
    let now = Date.now();
    if (now - lastClickTime < 80) return; 
    lastClickTime = now;
    
    if (order.visible && !order.active) {
        G.en = Math.max(0, G.en - 25); 
        updateUI();
        tg.HapticFeedback.notificationOccurred('error');
        return; 
    }
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
        let drink = Math.min(G.waterStock, 50); 
        G.en = Math.min(G.maxEn, G.en + (drink * eff)); 
        G.waterStock -= drink; 
    }
    if (G.en < 1) return;
    
    clicksSinceBonus++;
    if (clicksSinceBonus > (300 + Math.random() * 100)) {
        showBonus();
        clicksSinceBonus = 0; 
    }

    if (G.shoes.dur > 0) {
        G.shoes.dur -= 0.05; 
    }

    if(order.active) { 
        consumeResources(true); 
        let speed = (G.bikeRentTime > 0 ? 2 : 1);
        if (order.isRiskyRoute) speed *= 2; 
        
        if (G.shoes.dur <= 0) speed *= 0.7; 

        order.steps += speed;
        if (G.bikeRentTime > 0 && Math.random() < 0.002) { triggerBreakdown(); return; } 
        if(order.steps >= order.target) finishOrder(true); 
        updateUI(); 
        save();
        return; 
    }
    
    if(!order.visible) { 
        if(Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); 
    }
    consumeResources(false);
    
    let rankBonus = 0;
    if (G.totalOrders >= 50) rankBonus = 0.05;
    if (G.totalOrders >= 150) rankBonus = 0.10;
    if (G.totalOrders >= 400) rankBonus = 0.20;

    let gain = 0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (1 + rankBonus);
    G.money = parseFloat((G.money + gain).toFixed(2));
    G.totalEarned += gain; 
    checkDailyQuests('earn', gain); 

    G.lvl += 0.00025; 
    checkMilestones(); 
    
    updateUI(); 
    save();
}

function consumeResources(isOrder) {
    if (G.buffTime > 0) { 
        if (isOrder || Math.random() < 0.2) G.waterStock = Math.max(0, G.waterStock - (isOrder ? 8 : 2)); 
        return; 
    }
    let cost = (G.scooter ? 7 : 10); 
    if (G.bikeRentTime > 0) cost *= 0.5; 
    
    // ДОЖДЕВИК: Если есть, дождь не увеличивает расход
    let rainMod = (weather === "Дождь" && !G.raincoat) ? 1.2 : 1;
    
    cost *= rainMod; 
    if (isOrder) cost *= 1.5; 
    G.en = Math.max(0, G.en - cost); 
    G.waterStock = Math.max(0, G.waterStock - (isOrder ? 10 : 3));
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; 
    order.offerTimer = 15; 
    order.isCriminal = Math.random() < 0.12; 
    let d = 0.5 + Math.random() * 3.5; 
    let baseRew = (3.80 + d * 2.2) * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (G.bag ? 1.15 : 1) * (weather === "Дождь" ? 1.5 : 1); 
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; } 
    order.baseReward = baseRew;
    order.reward = baseRew;
    order.target = Math.floor(d * 160); 
    order.steps = 0; 
    order.time = Math.floor(order.target / 1.5 + 45); 
    order.isRiskyRoute = false; 
    updateUI(); 
}

function openRouteModal() {
    const autoBtn = document.getElementById('btn-auto-route');
    const autoLabel = document.getElementById('lbl-auto-route');
    const autoDesc = document.getElementById('desc-auto-route');

    if (G.autoTime > 0) {
        autoLabel.innerHTML = "<b>🤖 ПОРУЧИТЬ РОБОТУ</b>";
        autoDesc.innerHTML = "<small style='color:var(--success)'>Активно: " + Math.floor(G.autoTime/60) + " мин</small>";
        autoBtn.onclick = function() {
             closeRouteModal();
             acceptOrder(); 
             log("🤖 Робот принял заказ", "var(--accent-gold)");
        };
        autoBtn.style.borderColor = "var(--success)";
        autoBtn.style.background = "rgba(34, 197, 94, 0.1)";
    } else {
        autoLabel.innerHTML = "<b>🤖 КУПИТЬ АВТО (45 PLN)</b>";
        autoDesc.innerHTML = "<small style='color:var(--accent-gold)'>Робот сделает всё сам (+10 мин)</small>";
        autoBtn.onclick = function() { activateAutopilot(); };
        autoBtn.style.borderColor = "var(--accent-gold)";
        autoBtn.style.background = "rgba(245, 158, 11, 0.1)";
    }
    document.getElementById('route-modal').style.display = 'flex';
}

function closeRouteModal() {
    document.getElementById('route-modal').style.display = 'none';
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

function activateAutopilot() { 
    closeRouteModal();
    if(G.money >= 45 && G.lvl >= 0.15) { 
        G.money = parseFloat((G.money - 45).toFixed(2)); 
        G.lvl -= 0.15; 
        // POWERBANK БОНУС
        let timeAdd = G.powerbank ? 900 : 600; // 15 мин или 10 мин
        G.autoTime += timeAdd; 
        addHistory('АВТОПИЛОТ', 45, 'minus'); 
        acceptOrder(); 
        save(); 
        updateUI(); 
    } else {
        log("Не хватает денег или LVL!", "var(--danger)");
    }
}

function acceptOrder() { order.active = true; updateUI(); }

function buyShoes(name, price, durability) {
    if (G.money >= price) {
        G.money -= price;
        let bonus = 0;
        if (name === "Jorban") bonus = 0.2; 
        
        G.shoes = { name: name, maxDur: durability, dur: durability, bonus: bonus };
        addHistory('👟 ' + name.toUpperCase(), price, 'minus');
        log("Куплены " + name + "!", "var(--purple)");
        save();
        updateUI();
    } else {
        log("Не хватает денег!", "var(--danger)");
    }
}

function buyInvest(type, p) { 
    if(!G[type] && G.money >= p) { 
        G.money = parseFloat((G.money - p).toFixed(2)); 
        addHistory('ИНВЕСТ', p, 'minus'); 
        G[type] = true; 
        save(); 
        updateUI(); 
    } 
}

function sellInvest(type, p) {
    if(G[type]) {
        G.money = parseFloat((G.money + p).toFixed(2)); 
        G[type] = false;
        addHistory('💸 ЛОМБАРД', p, 'plus'); 
        log("Вы продали предмет в ломбард", "var(--gold)");
        save();
        updateUI();
    }
}

function getWelfare() {
    let now = Date.now();
    if (G.money >= 0) {
        log("Пособие только для должников!", "var(--danger)");
        return;
    }
    if (now - G.lastWelfare < 600000) { 
        let wait = Math.ceil((600000 - (now - G.lastWelfare)) / 60000);
        log("Жди еще " + wait + " мин.", "var(--danger)");
        return;
    }
    
    G.money = parseFloat((G.money + 30).toFixed(2));
    G.lastWelfare = now;
    addHistory('👵 БАБУШКА', 30, 'plus');
    log("Бабушка прислала 30 PLN на еду!", "var(--success)");
    save();
    updateUI();
}

function repairBikeInstant() {
    if (G.money >= 15) {
        G.money = parseFloat((G.money - 15).toFixed(2));
        isBroken = false;
        repairProgress = 0;
        addHistory('🔧 РЕМОНТ', 15, 'minus');
        log("Велик починен за деньги!", "var(--success)");
        save();
        updateUI();
    } else {
        log("Нет денег (15 PLN)!", "var(--danger)");
    }
}

function finishOrder(win) { 
    if(!order.active) return;
    order.active = false; 
    if(win) { 
        if (order.isRiskyRoute) {
            let riskRoll = Math.random();
            // ШЛЕМ БОНУС
            let riskChance = G.helmet ? 0.15 : 0.30; 

            if (riskRoll < riskChance) { 
                log("💥 АВАРИЯ на срезке!", "var(--danger)");
                isBroken = true;
                repairProgress = 0;
                
                G.money = parseFloat((G.money - 20).toFixed(2)); 
                addHistory('💥 АВАРИЯ', 20, 'minus');
                order.visible = false; updateUI(); save();
                return; 
            }
        }
        let policeChance = order.isCriminal ? 0.35 : 0.02; 
        if(Math.random() < policeChance) { 
            let fine = (G.lvl < 2) ? 50 : 150;
            G.lvl -= 1.2; G.money = parseFloat((G.money - fine).toFixed(2)); 
            addHistory('👮 ШТРАФ', fine, 'minus');
            log("🚔 ПОЛИЦИЯ! Штраф -" + fine, "var(--danger)"); 
        } else { 
            G.money = parseFloat((G.money + order.reward).toFixed(2)); 
            G.totalEarned += order.reward; 
            addHistory(order.isCriminal ? '☠️ КРИМИНАЛ' : '📦 ЗАКАЗ', order.reward.toFixed(2), 'plus');
            G.lvl += (order.isCriminal ? 0.12 : 0.015); 
            G.totalOrders++; 
            
            checkDailyQuests('orders', 1); 
            checkDailyQuests('earn', order.reward); 

            if(Math.random() < 0.40) { 
                let tip = parseFloat((5 + Math.random()*15).toFixed(2)); 
                if (order.isRiskyRoute) tip *= 2; 
                
                if (G.shoes && G.shoes.bonus > 0) {
                    tip *= (1 + G.shoes.bonus);
                }

                G.money = parseFloat((G.money + tip).toFixed(2)); 
                G.totalEarned += tip; 
                checkDailyQuests('earn', tip);

                addHistory('💰 ЧАЕВЫЕ', tip, 'plus');
                log("💰 Чаевые: +" + tip.toFixed(2), "var(--success)"); 
            } 
        } 
    } 
    order.visible = false; updateUI(); save(); 
}

function checkMilestones() { 
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
    document.getElementById('milestones-list').innerHTML = G.activeMilestones.map(m => { 
        let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; 
        return "<div class='card' style='margin-top:8px;'><b>" + m.name + "</b><br><small style='color:var(--gold);'>Награда: " + m.reward + " PLN</small><div class='career-progress'><div class='career-fill' style='width:" + Math.min(100,(cur/m.goal*100)) + "%'></div></div><small>" + cur + "/" + m.goal + "</small></div>"; 
    }).join(''); 
}

function collectBottles() { 
    G.money = parseFloat((G.money + 0.02).toFixed(2)); 
    G.totalEarned += 0.02;
    checkDailyQuests('earn', 0.02);
    G.totalBottles++; 
    checkMilestones(); 
    save(); 
    updateUI(); 
}

function buyWater() { 
    if(G.money >= 1.50) { 
        G.money = parseFloat((G.money - 1.50).toFixed(2)); 
        G.waterStock += 1500; 
        addHistory('🧴 ВОДА', 1.50, 'minus'); 
        save(); 
        updateUI(); 
    } 
}

function buyDrink(type, p) { 
    if(G.money >= p) { 
        G.money = parseFloat((G.money - p).toFixed(2)); 
        addHistory(type.toUpperCase(), p, 'minus'); 
        if(type === 'coffee') G.en = Math.min(G.maxEn, G.en + 300); 
        else G.buffTime += 120; 
        save(); 
        updateUI(); 
    } 
}

function rentBike() { 
    if (G.money >= 30) { 
        G.money = parseFloat((G.money - 30).toFixed(2)); 
        addHistory('🚲 ВЕЛИК', 30, 'minus'); 
        G.bikeRentTime += 600; 
        save(); 
        updateUI(); 
    } 
}

function exchangeLvl(l, m) { 
    if(G.lvl >= l) { 
        G.lvl -= l; 
        G.money = parseFloat((G.money + m).toFixed(2)); 
        G.totalEarned += m;
        checkDailyQuests('earn', m);
        addHistory('💎 ОБМЕН', m, 'plus'); 
        save(); 
        updateUI(); 
    } 
}

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    el.classList.add('active'); 
    updateUI(); 
}

function moveDistrict(id) { 
    if (G.district === id) return;
    if (G.money < DISTRICTS[id].price || G.lvl < DISTRICTS[id].minLvl) {
        log("Недостаточно ресурсов!", "var(--danger)");
        return;
    }
    G.money = parseFloat((G.money - DISTRICTS[id].price).toFixed(2)); 
    addHistory('🏙️ ПЕРЕЕЗД', DISTRICTS[id].price, 'minus'); 
    G.district = id; 
    save(); 
    updateUI(); 
}

function triggerBreakdown() { 
    isBroken = true; 
    repairProgress = 0; 
    log("🚲 ПОЛОМКА!", "var(--danger)"); 
    tg.HapticFeedback.notificationOccurred('error');
    updateUI(); 
}

function renderBank() { 
    const ui = document.getElementById('bank-actions-ui'); 
    if (G.money < 0) {
        ui.innerHTML = "<button class='btn-action' style='background:var(--purple)' onclick='getWelfare()'>📞 ПОЗВОНИТЬ БАБУШКЕ (+30 PLN)</button><small style='color:#aaa; display:block; margin-top:5px; text-align:center;'>Только если баланс меньше нуля.</small>";
    } else if (G.debt <= 0) {
        ui.innerHTML = "<button class='btn-action' onclick=\"G.money=parseFloat((G.money+50).toFixed(2));G.debt=50;addHistory('🏦 КРЕДИТ', 50, 'plus');updateUI();save();\">ВЗЯТЬ КРЕДИТ (50 PLN)</button>";
    } else {
        ui.innerHTML = "<button class='btn-action' style='background:var(--success)' onclick=\"if(G.money>=G.debt){G.money=parseFloat((G.money-G.debt).toFixed(2));addHistory('🏦 ДОЛГ', G.debt, 'minus');G.debt=0;updateUI();save();}\">ВЕРНУТЬ ДОЛГ (" + G.debt + " PLN)</button>";
    }
}

setInterval(() => {
    if (G.en > G.maxEn) G.en = G.maxEn;

    if (G.money > 0) {
        G.tax--; 
        if(G.tax <= 0) { 
            let cost = parseFloat((G.money * 0.37).toFixed(2)); 
            G.money = parseFloat((G.money - cost).toFixed(2)); 
            addHistory('🏛️ НАЛОГ', cost, 'minus'); 
            G.tax = 300; 
            log("Налог 37% списан"); 
            save(); 
        }
        
        G.rent--; 
        if(G.rent <= 0) { 
            let pct = DISTRICTS[G.district].rentPct;
            let cost = parseFloat((G.money * pct).toFixed(2));
            G.money = parseFloat((G.money - cost).toFixed(2)); 
            addHistory('🏠 АРЕНДА', cost, 'minus'); 
            G.rent = 300; 
            save(); 
        }
    }

    if (Math.random() < 0.015) weather = Math.random() < 0.35 ? "Дождь" : "Ясно";
    
    if (G.bikeRentTime > 0) { 
        G.bikeRentTime--; 
        if (G.bikeRentTime <= 0 && G.money >= 30) { 
            G.money = parseFloat((G.money - 30).toFixed(2)); 
            addHistory('🚲 ВЕЛИК', 30, 'minus'); 
            G.bikeRentTime = 600; 
        } 
    }
    
    if (G.buffTime > 0) G.buffTime--;
    
    generateDailyQuests(); 

    if (G.autoTime > 0) { 
        G.autoTime--;
        if (order.active && !isBroken) {
            for(let i=0; i<10; i++) {
                if(!order.active || isBroken) break;
                if (G.waterStock > 0 && G.en < 600) { 
                    let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
                    G.en = Math.min(G.maxEn, G.en + (15 * eff)); 
                    G.waterStock -= 15; 
                }
                if (G.en > 5) { 
                    consumeResources(true); 
                    
                    if (G.shoes.dur > 0) G.shoes.dur -= 0.01;

                    order.steps += (G.bikeRentTime > 0 ? 3 : 2); 
                    if (order.steps >= order.target) { finishOrder(true); break; } 
                }
            }
        }
    }
    
    if(order.visible && !order.active) { 
        order.offerTimer--; 
        let decay = order.isCriminal ? 0.05 : 0.03;
        order.reward = parseFloat((order.reward * (1 - decay)).toFixed(2));
        
        if(order.offerTimer <= 0) { 
            order.visible = false; 
            G.lvl -= 0.05; 
            log("Заказ упущен: LVL снижен!", "var(--danger)");
        } 
    }
    
    if(order.active) { 
        order.time--; 
        if(order.time <= 0) finishOrder(false); 
    }
    
    updateUI();
}, 1000);

window.onload = load;
