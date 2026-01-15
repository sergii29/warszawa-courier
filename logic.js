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
    transportMode: 'none', // 'none', 'veturilo', 'bolt'
    buffTime: 0,
    blindTime: 0, 
    history: [], 
    usedPromos: [], 
    isNewPlayer: true, 
    lastWelfare: 0, 
    lastAdminUpdate: 0, 
    shoes: { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 },
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
    ],
    lastActive: Date.now()
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0; 
let lastClickTime = 0; 
let clicksSinceBonus = 0;
let bonusActive = false;

let isSearching = false; 
let spamCounter = 0;

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500 } 
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

// === ДИНАМИЧЕСКАЯ ЦЕНА ===
function getDynamicPrice(basePrice) {
    if (basePrice === 0) return 0;
    // Инфляция: цена растет на 40% за каждый LVL выше 1
    let inflationFactor = 0.40;
    let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * inflationFactor;
    return parseFloat((basePrice * multiplier).toFixed(2));
}
// =========================

function addHistory(msg, val, type = 'plus') {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    if (!G.history) G.history = [];
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
    G.transportMode = 'none'; // !!! ВАЖНО: Сбрасываем аренду, чтобы включить велик
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

    if(window.db) {
        window.db.ref('users/' + userId).set(dataToSave);
    }
}

function listenToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";

    if(window.db) {
        window.db.ref('users/' + userId).on('value', (snapshot) => {
            const remote = snapshot.val();
            if (!remote) return;
            if (remote.isBanned) {
                document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:black;color:red;text-align:center;"><div style="font-size:60px;">⛔</div><h2>ACCESS DENIED</h2><p>Ваш аккаунт заблокирован.</p></div>';
                return;
            }
            if (remote.adminMessage) {
                alert("🔔 СИСТЕМА: " + remote.adminMessage);
                window.db.ref('users/' + userId + '/adminMessage').remove();
            }
            if (remote.lastAdminUpdate && remote.lastAdminUpdate > (G.lastAdminUpdate || 0)) {
                let wasNew = G.isNewPlayer;
                const invKeys = ['bag', 'phone', 'scooter', 'helmet', 'raincoat', 'powerbank', 'starter_bag', 'starter_phone'];
                invKeys.forEach(key => { if (!remote[key]) G[key] = null; });
                G = { ...G, ...remote };
                localStorage.setItem(SAVE_KEY, JSON.stringify(G));
                if (G.isNewPlayer && !wasNew) { location.reload(); return; }
                updateUI();
                log("⚡ Данные синхронизированы с сервером", "var(--accent-blue)");
            }
            if (G.isNewPlayer && remote.isNewPlayer === false) {
                 G = { ...G, ...remote };
                 document.getElementById('starter-modal').style.display = 'none';
                 localStorage.setItem(SAVE_KEY, JSON.stringify(G));
                 updateUI();
            }
        });
    }
}

function save() { 
    localStorage.setItem(SAVE_KEY, JSON.stringify(G)); 
    saveToCloud(); 
}

function validateInventory() {
    UPGRADES.forEach(up => {
        if(G[up.id] && G[up.id].dur > up.maxDur) {
            G[up.id].dur = up.maxDur;
        }
    });
}

function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { 
        try {
            let loaded = JSON.parse(d);
            G = {...G, ...loaded}; 
        } catch(e) { console.error(e); }
    } 
    
    if(isNaN(G.money)) G.money = 10;
    if(isNaN(G.lvl)) G.lvl = 1.0;
    if(isNaN(G.en)) G.en = 2000;
    if(isNaN(G.waterStock)) G.waterStock = 0;
    if(!G.transportMode) G.transportMode = 'none';
    G.maxEn = 2000; 
    if(!G.shoes) G.shoes = { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 }; 
    if(!G.blindTime) G.blindTime = 0;

    ['bag', 'phone', 'scooter', 'helmet', 'raincoat', 'powerbank'].forEach(item => {
        if (G[item] === true) G[item] = { active: true, dur: 100 };
    });

    if (!G.bag && !G.starter_bag) G.starter_bag = { active: true, dur: 50 };
    if (!G.phone && !G.starter_phone) G.starter_phone = { active: true, dur: 50 };

    validateInventory(); 
    checkStarterPack();
    generateDailyQuests();
    listenToCloud();
    updateUI(); 
}

function updateUI() {
    const moneyEl = document.getElementById('money-val');
    if(!moneyEl) return; 

    const isBlind = G.blindTime > 0; 
    if (isBlind) {
        let bMin = Math.floor(G.blindTime / 60);
        let bSec = G.blindTime % 60;
        moneyEl.innerText = "🔒 " + bMin + ":" + (bSec < 10 ? '0' : '') + bSec;
        moneyEl.style.color = "#aaa";
    } else {
        moneyEl.innerText = G.money.toFixed(2) + " PLN";
        moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
    }

    const lvlEl = document.getElementById('lvl-val');
    if(lvlEl) lvlEl.innerText = "LVL " + G.lvl.toFixed(6);

    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    document.getElementById('district-ui').innerText = "📍 " + DISTRICTS[G.district].name;
    document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️ Дождь" : "☀️ Ясно");
    
    if(weather === "Дождь") document.body.classList.add('rain-mode');
    else document.body.classList.remove('rain-mode');
    
    const autoStatus = document.getElementById('auto-status-ui');
    if(autoStatus) {
        autoStatus.style.display = G.autoTime > 0 ? 'block' : 'none';
        if(G.autoTime > 0) autoStatus.innerText = "🤖 " + Math.floor(G.autoTime/60) + ":" + ((G.autoTime%60<10?'0':'')+G.autoTime%60);
    }
    
    const bikeStatus = document.getElementById('bike-status-ui');
    if(bikeStatus) {
        let rentShow = false;
        let text = "";
        
        if (G.transportMode === 'veturilo') {
            rentShow = true; text = "🚲 VETURILO";
        } else if (G.transportMode === 'bolt') {
            rentShow = true; text = "🛴 BOLT";
        } else if (G.bikeRentTime > 0) {
            rentShow = true;
            text = "🚲 " + Math.floor(G.bikeRentTime/60) + ":" + ((G.bikeRentTime%60<10?'0':'')+G.bikeRentTime%60);
        }
        
        bikeStatus.style.display = rentShow ? 'block' : 'none';
        bikeStatus.innerText = text;
    }

    const buffUI = document.getElementById('buff-status-ui'); 
    if(buffUI) {
        buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
        if(G.buffTime > 0) buffUI.innerText = "⚡ " + Math.floor(G.buffTime/60) + ":" + ((G.buffTime%60<10?'0':'')+G.buffTime%60);
    }
    
    // === ОБНОВЛЕНИЕ ЦЕННИКОВ ===
    const hiddenPrice = isBlind ? "???" : null;
    const setBtnText = (id, price) => {
        const btn = document.getElementById(id);
        if(btn) btn.innerText = (hiddenPrice || price.toFixed(2)) + " PLN";
    };

    setBtnText('btn-buy-water', getDynamicPrice(1.50));
    setBtnText('btn-buy-coffee', getDynamicPrice(5.00));
    setBtnText('btn-buy-energy', getDynamicPrice(12.00));
    setBtnText('btn-buy-abibas', getDynamicPrice(50.00));
    setBtnText('btn-buy-jorban', getDynamicPrice(250.00));
    
    // Аренда кнопок (Veturilo / Bolt / Bike)
    const btnVeturilo = document.getElementById('btn-veturilo');
    if(btnVeturilo) {
        let rate = getDynamicPrice(0.50);
        if(G.transportMode === 'veturilo') {
            btnVeturilo.innerText = "СТОП (АКТИВНО)";
            btnVeturilo.style.background = "#faa";
        } else {
            btnVeturilo.innerText = (hiddenPrice || rate.toFixed(2)) + " PLN / мин";
            btnVeturilo.style.background = "#ddd";
        }
    }

    const btnBolt = document.getElementById('btn-bolt');
    if(btnBolt) {
        let rate = getDynamicPrice(2.50);
        if(G.transportMode === 'bolt') {
            btnBolt.innerText = "СТОП (АКТИВНО)";
            btnBolt.style.background = "#faa";
        } else {
            btnBolt.innerText = (hiddenPrice || rate.toFixed(2)) + " PLN / мин";
            btnBolt.style.background = "var(--success)";
        }
    }

    const rentBikeBtn = document.getElementById('buy-bike-rent');
    if(rentBikeBtn) {
        if(G.bikeRentTime > 0) {
            // КНОПКА ОТМЕНЫ
            rentBikeBtn.innerText = "ОТМЕНИТЬ (" + Math.floor(G.bikeRentTime/60) + "м)";
            rentBikeBtn.style.background = "#ef4444"; // Красный
            rentBikeBtn.onclick = cancelBikeRent;
        } else {
            // КНОПКА ПОКУПКИ
            rentBikeBtn.innerText = "АРЕНДОВАТЬ (" + (hiddenPrice || getDynamicPrice(30).toFixed(2)) + " PLN)";
            rentBikeBtn.style.background = ""; // Стандарт
            rentBikeBtn.onclick = rentBike;
        }
    }

    const autoPriceLabel = document.getElementById('price-auto');
    if(autoPriceLabel) autoPriceLabel.innerText = "(" + (hiddenPrice || getDynamicPrice(45).toFixed(2)) + " PLN)";

    const repairBtn = document.getElementById('btn-repair-express');
    if(repairBtn) repairBtn.innerText = "🔧 ЭКСПРЕСС РЕМОНТ (" + (hiddenPrice || getDynamicPrice(15).toFixed(2)) + " PLN)";
    // ===========================

    let shoeNameDisplay = G.shoes.name;
    let shoeBar = document.getElementById('shoe-bar');
    if(shoeBar) {
        if (G.shoes.dur <= 0) {
            shoeNameDisplay = "<span style='color:var(--danger); font-size:9px; font-weight:800; animation: pulse 1s infinite;'>⚠️ КУПИ НОВЫЕ В МАГАЗИНЕ!</span>";
            shoeBar.style.width = "100%";
            shoeBar.style.background = "var(--danger)";
            shoeBar.style.opacity = "0.3"; 
        } else {
            const sPct = (G.shoes.dur / G.shoes.maxDur) * 100;
            shoeBar.style.width = Math.min(100, Math.max(0, sPct)) + "%";
            shoeBar.style.background = sPct < 20 ? "var(--danger)" : "var(--purple)";
            shoeBar.style.opacity = "1";
        }
        document.getElementById('shoe-name').innerHTML = shoeNameDisplay;
    }

    let currentRank = RANKS[0];
    let nextRank = null;
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

    // КВЕСТЫ
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
            questsHTML += "<div class='daily-quest-item'><div class='daily-quest-info'><b>" + q.text + "</b><br><div style='width:100%; height:4px; background:#333; margin-top:4px; border-radius:2px;'><div style='height:100%; background:var(--accent-blue); width:" + Math.min(100, progressPct) + "%'></div></div></div><div style='margin-left:10px;'>" + btn + "</div></div>";
        });
    }
    const qList = document.getElementById('daily-quests-list');
    if(qList) qList.innerHTML = questsHTML;

    document.getElementById('stat-orders').innerText = G.totalOrders || 0;
    document.getElementById('stat-clicks').innerText = G.totalClicks || 0;
    document.getElementById('stat-bottles').innerText = G.totalBottles || 0;
    document.getElementById('stat-earned').innerText = (G.totalEarned || 0).toFixed(2) + " PLN";
    
    let timeLeft = (G.lastDailyUpdate + 86400000) - Date.now();
    if(timeLeft < 0) timeLeft = 0;
    let hours = Math.floor(timeLeft / (1000 * 60 * 60));
    let mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('daily-timer').innerText = "Обновление: " + hours + "ч " + mins + "м";

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
        
        if (isBlind) document.getElementById('click-rate-ui').innerText = "?.?? PLN";
        else document.getElementById('click-rate-ui').innerText = rate + " PLN";
    }

    // ИНВЕНТАРЬ (С ЗАЩИТОЙ ОТ МЕРЦАНИЯ)
    const myItemsList = document.getElementById('my-items-list');
    if (myItemsList) {
        let invHTML = "";
        
        // Обувь
        let shoeStatusText = Math.floor(G.shoes.dur) + "%";
        let isShoesBroken = G.shoes.dur <= 0;
        if (isShoesBroken) shoeStatusText = "0%";
        
        invHTML += `<div class="shop-item item-shoes ${isShoesBroken ? 'item-broken' : ''}" ${isShoesBroken ? 'onclick="switchTab(\'shop\', document.querySelectorAll(\'.tab-item\')[2])"' : ''}>
            <div class="shop-icon">👟</div>
            <div style="flex:1;">
                <div class="shop-title">${G.shoes.name}</div>
                <div class="shop-desc" style="margin-bottom:5px;">${isShoesBroken ? '<b style="color:var(--danger)">СЛОМАНО!</b>' : 'Бонус: ' + (G.shoes.bonus*100) + '%'}</div>
                <div class="inv-dur-track"><div class="inv-dur-fill" style="width:${G.shoes.dur}%; background:${isShoesBroken ? 'var(--danger)' : 'var(--success)'}"></div></div>
            </div>
        </div>`;

        // Остальные предметы
        UPGRADES.forEach(up => {
            if(G[up.id]) {
                const item = G[up.id];
                const isBroken = item.dur <= 0;
                let conf = UPGRADES.find(u => u.id === up.id);
                let max = conf ? conf.maxDur : 100;
                const pct = Math.floor((item.dur / max) * 100);
                let repairCost = getDynamicPrice(up.repairPrice);
                
                invHTML += `<div class="shop-item ${isBroken ? 'item-broken' : ''}">
                    <div class="shop-icon">${up.icon}</div>
                    <div class="shop-title">${up.name}</div>
                    <div class="shop-desc" style="color:${isBroken ? 'var(--danger)' : 'var(--text-secondary)'}">${isBroken ? 'ТРЕБУЕТ РЕМОНТА' : up.bonus}</div>
                    <div class="inv-dur-track"><div class="inv-dur-fill" style="width:${pct}%; background:${isBroken ? 'var(--danger)' : 'var(--accent-blue)'}"></div></div>
                    <div class="inv-action-row">
                        <button class="inv-btn-repair" onclick="repairItem('${up.id}', ${repairCost})">🛠️ ${hiddenPrice || repairCost}</button>
                        <button class="inv-btn-sell" onclick="sellInvest('${up.id}', ${getDynamicPrice(up.price) * 0.5})">💸 ${hiddenPrice || (getDynamicPrice(up.price) * 0.5).toFixed(2)}</button>
                    </div>
                </div>`;
            }
        });
        
        // Обновляем HTML только если он изменился (убирает мерцание)
        if (myItemsList.innerHTML !== invHTML) {
            myItemsList.innerHTML = invHTML;
        }
    }

    // МАГАЗИН ПРО (С ЗАЩИТОЙ ОТ МЕРЦАНИЯ)
    const shopList = document.getElementById('shop-upgrades-list'); 
    if(shopList) {
        let shopHTML = "";
        UPGRADES.forEach(up => { 
            if(!G[up.id] && !up.hidden) { 
                let curPrice = getDynamicPrice(up.price);
                shopHTML += `<div class="card" style="margin-bottom: 8px;">
                    <b>${up.icon} ${up.name}</b><br>
                    <small style="color:#aaa;">${up.desc}</small><br>
                    <button class="btn-action" style="margin-top:8px;" onclick="buyInvest('${up.id}', ${curPrice})">КУПИТЬ (${hiddenPrice || curPrice} PLN)</button>
                </div>`; 
            }
        });
        
        // Обновляем HTML только если он изменился
        if (shopList.innerHTML !== shopHTML) {
            shopList.innerHTML = shopHTML;
        }
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
    
    renderBank(); 
    renderMilestones();
    updateDistrictButtons();
    
    const taxTimer = document.getElementById('tax-timer');
    const rentTimer = document.getElementById('rent-timer');
    
    let currentTaxRate = 0;
    if (G.money > 200) currentTaxRate = 15;
    
    if(taxTimer) {
        let taxText = currentTaxRate > 0 ? currentTaxRate + "%" : "FREE";
        taxTimer.innerText = "Налог (" + taxText + ") через: " + Math.floor(G.tax/60) + ":" + ((G.tax%60<10?'0':'')+G.tax%60);
    }
    
    let rentP = (DISTRICTS[G.district].rentPct * 100).toFixed(0);
    if(rentTimer) rentTimer.innerText = "Аренда (" + rentP + "%) через: " + Math.floor(G.rent/60) + ":" + ((G.rent%60<10?'0':'')+G.rent%60);
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
        
        // БОНУС ОТ BOLT (Скорость +30%)
        if (G.transportMode === 'bolt') speed *= 1.3;

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

    let bagBonus = 1;
    if (G.bag && G.bag.dur > 0) bagBonus = 1.15;
    else if (G.starter_bag && G.starter_bag.dur > 0) bagBonus = 1.02;

    let gain = 0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (1 + rankBonus) * bagBonus;
    
    G.money = parseFloat((G.money + gain).toFixed(2));
    G.totalEarned += gain; 
    checkDailyQuests('earn', gain); 

    G.lvl += 0.00025; 
    checkMilestones(); 
    
    updateUI(); 
    save();
}

function consumeResources(isOrder) {
    let waterCost = isOrder ? 10 : 3;
    if (G.buffTime > 0) waterCost = isOrder ? 8 : 2; 
    G.waterStock = Math.max(0, G.waterStock - waterCost);

    if (G.buffTime > 0) {
        return; 
    }

    let cost = (G.scooter ? 7 : 10); 
    if (G.bikeRentTime > 0) cost *= 0.5; 
    
    // БОНУС ОТ VETURILO (Энергия -50%)
    if (G.transportMode === 'veturilo') cost *= 0.5;

    let rainMod = (weather === "Дождь" && !G.raincoat) ? 1.2 : 1;
    cost *= rainMod; 
    if (isOrder) cost *= 1.5; 
    
    G.en = Math.max(0, G.en - cost); 
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; 
    order.offerTimer = 15; 
    order.isCriminal = Math.random() < 0.12; 
    
    if (order.isCriminal) {
        tg.HapticFeedback.notificationOccurred('error'); 
    } else {
        tg.HapticFeedback.notificationOccurred('success'); 
    }

    let d = 0.5 + Math.random() * 3.5; 
    
    let bagBonus = 1;
    if (G.bag && G.bag.dur > 0) bagBonus = 1.15;
    else if (G.starter_bag && G.starter_bag.dur > 0) bagBonus = 1.02;

    let baseRew = (3.80 + d * 2.2) * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * bagBonus * (weather === "Дождь" ? 1.5 : 1); 
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

    let curPrice = getDynamicPrice(45);

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
        autoLabel.innerHTML = "<b>🤖 КУПИТЬ АВТО (" + curPrice + " PLN)</b>";
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
    let price = getDynamicPrice(45); // Динамическая цена
    if(G.money >= price && G.lvl >= 0.15) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        G.lvl -= 0.15; 
        
        let hasPower = (G.powerbank && G.powerbank.dur > 0);
        let timeAdd = hasPower ? 900 : 600; 
        
        G.autoTime += timeAdd; 
        addHistory('АВТОПИЛОТ', price, 'minus'); 
        acceptOrder(); 
        save(); 
        updateUI(); 
    } else {
        log("Не хватает денег или LVL!", "var(--danger)");
    }
}

function acceptOrder() { order.active = true; updateUI(); }

function buyShoes(name, basePrice, durability) {
    if (G.shoes.name === name && G.shoes.dur > 0) {
        log("У вас уже есть эти кроссовки!", "var(--danger)");
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    let price = getDynamicPrice(basePrice); // Динамическая цена

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
        log("Не хватает денег (" + price + " PLN)!", "var(--danger)");
    }
}

function buyInvest(type, basePrice) { 
    let price = getDynamicPrice(basePrice); // Динамическая цена
    if(!G[type] && G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        let maxDur = 100;
        let conf = UPGRADES.find(u => u.id === type);
        if(conf && conf.maxDur) maxDur = conf.maxDur;

        G[type] = { active: true, dur: maxDur };
        addHistory('ИНВЕСТ', price, 'minus'); 
        save(); 
        updateUI(); 
    } else if (G.money < price) {
        log("Нужно " + price + " PLN", "var(--danger)");
    }
}

function sellInvest(type, p) {
    if(G[type]) {
        G.money = parseFloat((G.money + p).toFixed(2)); 
        G[type] = null; 
        addHistory('💸 ЛОМБАРД', p, 'plus'); 
        log("Вы продали предмет в ломбард", "var(--gold)");
        save();
        updateUI();
    }
}

function repairItem(type, baseCost) {
    if (!G[type]) return;

    let conf = UPGRADES.find(u => u.id === type);
    let max = conf ? conf.maxDur : 100;
    
    if (G[type].dur >= max) {
        log("Предмет полностью цел!", "var(--accent-blue)");
        return;
    }

    let cost = getDynamicPrice(baseCost); // Динамическая цена ремонта

    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        G[type].dur = max;
        addHistory('🛠️ РЕМОНТ', cost, 'minus');
        log("Предмет отремонтирован!", "var(--success)");
        save();
        updateUI();
    } else {
        log("Нет денег на ремонт (" + cost + ")", "var(--danger)");
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
    let cost = getDynamicPrice(15); // Динамическая цена
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        isBroken = false;
        repairProgress = 0;
        addHistory('🔧 РЕМОНТ', cost, 'minus');
        log("Велик починен за деньги!", "var(--success)");
        save();
        updateUI();
    } else {
        log("Нет денег (" + cost + " PLN)!", "var(--danger)");
    }
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

function buyLvl(cost, amount) {
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        G.lvl += amount;
        addHistory('📈 PR-ХОД', cost, 'minus');
        log("Вы купили рекламу: +" + amount + " LVL", "var(--accent-blue)");
        save();
        updateUI();
    } else {
        log("Не хватает денег (" + cost + " PLN)!", "var(--danger)");
    }
}

function collectBottles() { 
    if (isSearching) {
        spamCounter++;
        if (spamCounter > 15) {
            log("🤖 Слишком быстро! Руки не мельница!", "var(--danger)");
            tg.HapticFeedback.notificationOccurred('error');
            G.money = Math.max(0, G.money - 100); 
            G.lvl -= 0.1; 
            spamCounter = 0;
            updateUI();
        }
        return; 
    }

    isSearching = true;
    spamCounter = 0;
    
    const btn = document.querySelector("button[onclick='collectBottles()']");
    const originalText = btn ? btn.innerText : "♻️ СБОР БУТЫЛОК";
    
    if(btn) {
        btn.innerText = "⏳ Роемся..."; 
        btn.style.opacity = "0.6";
    }

    setTimeout(() => {
        G.money = parseFloat((G.money + 0.05).toFixed(2)); 
        G.totalEarned += 0.05;
        checkDailyQuests('earn', 0.05);
        G.totalBottles++; 
        
        let repGain = 0;
        if (G.lvl < 1.0) repGain = 0.02; 
        else repGain = 0.002; 

        if (Math.random() < 0.10) { 
            repGain *= 3; 
            log("💎 Нашел стеклотару! Респект x3", "var(--success)");
        }

        G.lvl += repGain;
        checkMilestones(); 
        save(); 
        updateUI(); 

        isSearching = false;
        if(btn) {
            btn.innerText = originalText;
            btn.style.opacity = "1";
        }
    }, 1200); 
}

function buyWater() { 
    let price = getDynamicPrice(1.50); // Динамическая цена
    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        G.waterStock += 1500; 
        addHistory('🧴 ВОДА', price, 'minus'); 
        save(); 
        updateUI(); 
    } else {
        log("Нужно " + price + " PLN", "var(--danger)");
    }
}

function buyDrink(type, basePrice) { 
    let price = getDynamicPrice(basePrice); // Динамическая цена
    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory(type.toUpperCase(), price, 'minus'); 
        if(type === 'coffee') G.en = Math.min(G.maxEn, G.en + 300); 
        else G.buffTime += 120; 
        save(); 
        updateUI(); 
    } else {
        log("Нужно " + price + " PLN", "var(--danger)");
    }
}

// === НОВАЯ ЛОГИКА ТРАНСПОРТА ===
function toggleTransport(type) {
    if (G.transportMode === type) {
        // Выключение
        G.transportMode = 'none';
        log(type.toUpperCase() + " остановлен.", "var(--text-secondary)");
        updateUI();
        save();
        return;
    }

    if (G.transportMode !== 'none') {
        log("Сначала завершите текущую аренду!", "var(--danger)");
        return;
    }
    
    if (G.bikeRentTime > 0) {
        log("Нельзя брать аренду, пока активен E-Bike!", "var(--danger)");
        return;
    }

    // Включение
    if (type === 'veturilo') {
        // Старт 0 PLN, но нужна проверка баланса > 0
        if (G.money <= 0) {
            log("Нужен положительный баланс для старта!", "var(--danger)");
            return;
        }
        G.transportMode = 'veturilo';
        log("Veturilo активирован! (0.50 PLN/мин)", "var(--success)");
    } 
    else if (type === 'bolt') {
        let startCost = getDynamicPrice(2.00);
        if (G.money >= startCost) {
            G.money = parseFloat((G.money - startCost).toFixed(2));
            G.transportMode = 'bolt';
            addHistory('🛴 BOLT START', startCost, 'minus');
            log("Bolt активирован! (2.50 PLN/мин)", "var(--success)");
        } else {
            log("Не хватает на старт (" + startCost + " PLN)", "var(--danger)");
        }
    }
    updateUI();
    save();
}

function rentBike() { 
    // Старая аренда (Предоплата)
    if (G.transportMode !== 'none') {
        log("Сначала завершите поминутную аренду!", "var(--danger)");
        return;
    }

    let price = getDynamicPrice(30); // Динамическая цена
    if (G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory('🚲 ВЕЛИК', price, 'minus'); 
        G.bikeRentTime += 600; 
        save(); 
        updateUI(); 
    } else {
        log("Нужно " + price + " PLN", "var(--danger)");
    }
}

function cancelBikeRent() {
    if(confirm("Отменить аренду E-Bike? Деньги за остаток времени не вернутся.")) {
        G.bikeRentTime = 0;
        log("Аренда E-Bike отменена досрочно.", "var(--text-secondary)");
        updateUI();
        save();
    }
}
// ===============================

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
        save(); 
        updateUI(); 
    } 
}

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    const target = document.getElementById('view-'+v);
    if(target) target.classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    if(el) el.classList.add('active'); 
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

function updateDistrictButtons() {
    DISTRICTS.forEach((d, i) => {
        const btn = document.getElementById('btn-dist-' + i);
        if(btn) {
            if(G.district === i) {
                btn.innerText = "ВЫ ЗДЕСЬ";
                btn.classList.add('btn-secondary');
            } else {
                btn.innerText = "ПЕРЕЕХАТЬ" + (d.price > 0 ? " (" + d.price + " PLN)" : "");
                btn.classList.remove('btn-secondary');
            }
        }
    });
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
        </div>
    `;

    ui.innerHTML = creditHTML + buyLvlHTML;
}

function openProShop() {
    const el = document.getElementById('pro-shop-modal');
    if(el) el.style.display = 'flex';
}
function closeProShop() {
    const el = document.getElementById('pro-shop-modal');
    if(el) el.style.display = 'none';
}

setInterval(() => {
    if (isNaN(G.money)) G.money = 0;
    if (isNaN(G.en)) G.en = 0;

    if (G.en > G.maxEn) G.en = G.maxEn;

    if (G.money > 0) {
        // === ЛОГИКА СПИСАНИЯ АРЕНДЫ (ПОСЕКУНДНО) ===
        if (G.transportMode === 'veturilo') {
            let costPerSec = getDynamicPrice(0.50) / 60;
            G.money -= costPerSec;
        } 
        else if (G.transportMode === 'bolt') {
            let costPerSec = getDynamicPrice(2.50) / 60;
            G.money -= costPerSec;
        }
        // Если деньги кончились во время аренды
        if (G.transportMode !== 'none' && G.money <= 0) {
            G.transportMode = 'none';
            G.money = 0;
            log("Аренда завершена: Недостаточно средств!", "var(--danger)");
            updateUI();
        }
        // ===========================================

        G.tax--; 
        if(G.tax <= 0) { 
            let cost = 0;
            if (G.money > 200) {
                cost = parseFloat(((G.money - 200) * 0.15).toFixed(2));
            }

            if (cost > 0) {
                G.money = parseFloat((G.money - cost).toFixed(2)); 
                addHistory('🏛️ НАЛОГ', cost, 'minus'); 
                log("Списан налог 15% с сверхдоходов: -" + cost + " PLN"); 
            } else {
                log("Доход ниже минимума. Налог: 0 PLN", "var(--success)");
            }
            
            G.tax = 300; 
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
    if (G.blindTime > 0) G.blindTime--; 
    
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
                    
                    if (G.shoes.dur > 0) {
                        G.shoes.dur -= 0.01;
                        if(G.shoes.dur < 0) G.shoes.dur = 0;
                    }

                    order.steps += (G.bikeRentTime > 0 ? 3 : 2); 
                    
                    // УСКОРЕНИЕ БОЛТА В АВТОРЕЖИМЕ
                    if (G.transportMode === 'bolt') order.steps += 1;

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

