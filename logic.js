// --- logic.js ---
// VERSION: 8.0 (GOD MODE CONNECTED)
// Дизайн сохранен. Логика переписана под полную Админку.

const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// === НОВЫЕ НАСТРОЙКИ (СВЯЗЬ С АДМИНКОЙ) ===
// Мы расширили этот список, чтобы он совпадал с Admin v8.0
const DEFAULT_SETTINGS = {
    prices: {
        water: 1.50,
        coffee: 5.00,
        energy: 12.00,
        repair_express: 15.00,
        auto_route: 45.00,
        bike_rent: 30.00,
        veturilo_start: 0.00,
        veturilo_min: 0.50,
        bolt_start: 2.00,
        bolt_min: 2.50,
        bag: 350, phone: 1200, scooter: 500, helmet: 250, raincoat: 180, powerbank: 400, abibas: 50, jorban: 250
    },
    economy: {
        tax_rate: 0.15, tax_threshold: 200, inflation_rate: 0.40, 
        welfare_amount: 30, welfare_cooldown: 600,
        lvl_exchange_rate: 10, lvl_exchange_rate_big: 300, 
        tax_timer_sec: 300, rent_timer_sec: 300,
        bank_rate: 0.05, // Базовая ставка (5%)
        bottle_price: 0.05 // Цена бутылки
    },
    jobs: {
        base_pay: 3.80, // База за заказ
        km_pay: 2.20,   // За сложность/расстояние
        tips_chance: 0.40,
        tips_max: 15
    },
    gameplay: {
        criminal_chance: 0.12, police_chance: 0.02, police_chance_criminal: 0.35,
        accident_chance_risky: 0.30, accident_chance_safe: 0.002,
        bottle_find_chance: 0.40, // Шанс найти бутылку (NEW)
        fine_amount: 50, fine_amount_pro: 150,
        lvl_fine_police: 1.2, lvl_fine_missed: 0.05, lvl_fine_spam: 0.1, click_spam_limit: 15
    },
    toggles: {
        enable_bank: true, enable_shop: true, enable_auto: true, enable_work: true,
        service_veturilo: true, service_bolt: true
    }
};

let SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

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
    lastActive: Date.now()
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0; let lastClickTime = 0; let clicksSinceBonus = 0; let bonusActive = false;
let isSearching = false; let spamCounter = 0;

// (Метаданные предметов без изменений)
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

function getDynamicPrice(baseValue) {
    if (baseValue === 0) return 0;
    let price = 0;
    if (typeof baseValue === 'string') {
        price = SETTINGS.prices[baseValue] !== undefined ? SETTINGS.prices[baseValue] : 0;
    } else { price = baseValue; }
    let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * SETTINGS.economy.inflation_rate;
    return parseFloat((price * multiplier).toFixed(2));
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
        } else { log("Неверный код!", "var(--danger)"); }
    } catch (e) { log("Ошибка связи с базой!", "var(--danger)"); }
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
    document.getElementById('bonus-overlay').style.display = 'none';
    bonusActive = false; clicksSinceBonus = 0;
    G.money = parseFloat((G.money + 50).toFixed(2));
    G.totalEarned += 50;
    addHistory('🎁 БОНУС', 50, 'plus');
    log("Вы забрали бонус +50 PLN", "var(--success)");
    tg.HapticFeedback.notificationOccurred('success');
    save(); updateUI();
}

function checkStarterPack() {
    if (G.isNewPlayer === undefined) G.isNewPlayer = (G.totalOrders === 0);
    if (G.isNewPlayer) document.getElementById('starter-modal').style.display = 'flex';
}

function claimStarterPack() {
    document.getElementById('starter-modal').style.display = 'none';
    G.money += 50; G.waterStock += 500; G.transportMode = 'none'; 
    G.bikeRentTime += 900; G.isNewPlayer = false;
    G.shoes = { name: "Bazuka", maxDur: 100, dur: 100, bonus: 0 };
    G.starter_bag = { active: true, dur: 50 }; 
    G.starter_phone = { active: true, dur: 50 };
    addHistory('🎁 STARTER KIT', 50, 'plus');
    log("Вы получили набор новичка!", "var(--success)");
    save(); updateUI();
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
        save(); updateUI();
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
    let dataToSave = { ...G, name: firstName, user: userName, lastActive: Date.now() };
    if(window.db) window.db.ref('users/' + userId).set(dataToSave);
}

function listenToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";

    if(window.db) {
        window.db.ref('game_settings').on('value', (snapshot) => {
            const serverSettings = snapshot.val();
            if (serverSettings) {
                // ГЛУБОКОЕ ОБЪЕДИНЕНИЕ, ЧТОБЫ НЕ ПОТЕРЯТЬ НОВЫЕ ПАРАМЕТРЫ
                SETTINGS.prices = { ...DEFAULT_SETTINGS.prices, ...(serverSettings.prices || {}) };
                SETTINGS.economy = { ...DEFAULT_SETTINGS.economy, ...(serverSettings.economy || {}) };
                SETTINGS.jobs = { ...DEFAULT_SETTINGS.jobs, ...(serverSettings.jobs || {}) };
                SETTINGS.gameplay = { ...DEFAULT_SETTINGS.gameplay, ...(serverSettings.gameplay || {}) };
                SETTINGS.toggles = { ...DEFAULT_SETTINGS.toggles, ...(serverSettings.toggles || {}) };
                
                updateUI();
                console.log("⚡ Настройки мира обновлены (v8.0)");
            }
        });

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
                
                if(!remote.dailyQuests) remote.dailyQuests = [];
                if(!remote.usedPromos) remote.usedPromos = [];
                if(!remote.history) remote.history = [];
                if(!remote.bankHistory) remote.bankHistory = [];
                if(!remote.activeMilestones) remote.activeMilestones = [
                    { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
                    { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
                    { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
                ];
                if(!remote.housing) remote.housing = { id: -1 };
                
                const invKeys = ['bag', 'phone', 'scooter', 'helmet', 'raincoat', 'powerbank', 'starter_bag', 'starter_phone', 'deposit'];
                invKeys.forEach(key => { if (!remote[key]) remote[key] = null; });

                G = { ...G, ...remote };
                localStorage.setItem(SAVE_KEY, JSON.stringify(G));
                
                if (G.isNewPlayer && !wasNew) { location.reload(); return; }
                
                updateUI();
                log("⚡ Админ обновил данные", "var(--accent-blue)");
            }
        });
    }
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); saveToCloud(); }

function validateInventory() {
    UPGRADES_META.forEach(up => {
        if(G[up.id] && G[up.id].dur > up.maxDur) G[up.id].dur = up.maxDur;
    });
}

function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { 
        try { let loaded = JSON.parse(d); G = {...G, ...loaded}; } catch(e) { console.error(e); }
    } 
    
    if(isNaN(G.money)) G.money = 10;
    if(isNaN(G.lvl)) G.lvl = 1.0;
    if(isNaN(G.en)) G.en = 2000;
    if(isNaN(G.waterStock)) G.waterStock = 0;
    if(!G.transportMode) G.transportMode = 'none';
    if(!G.housing) G.housing = { id: -1 }; 
    G.maxEn = 2000; 
    if(!G.shoes) G.shoes = { name: "Tapki", maxDur: 100, dur: 100, bonus: 0 }; 
    if(!G.blindTime) G.blindTime = 0;
    if (!G.deposit) G.deposit = null;
    if (!G.bankHistory) G.bankHistory = [];

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
    if(lvlEl) {
        let houseIcon = (G.housing && G.housing.id !== -1) ? " 🏠" : "";
        lvlEl.innerText = "LVL " + G.lvl.toFixed(6) + houseIcon;
    }

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
        let rentShow = false; let text = "";
        if (G.transportMode === 'veturilo') { rentShow = true; text = "🚲 VETURILO"; } 
        else if (G.transportMode === 'bolt') { rentShow = true; text = "🛴 BOLT"; } 
        else if (G.bikeRentTime > 0) { rentShow = true; text = "🚲 " + Math.floor(G.bikeRentTime/60) + ":" + ((G.bikeRentTime%60<10?'0':'')+G.bikeRentTime%60); }
        bikeStatus.style.display = rentShow ? 'block' : 'none';
        bikeStatus.innerText = text;
    }

    const buffUI = document.getElementById('buff-status-ui'); 
    if(buffUI) {
        buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
        if(G.buffTime > 0) buffUI.innerText = "⚡ " + Math.floor(G.buffTime/60) + ":" + ((G.buffTime%60<10?'0':'')+G.buffTime%60);
    }
    
    const hiddenPrice = isBlind ? "???" : null;
    const setBtnText = (id, priceStr) => {
        const btn = document.getElementById(id);
        if(btn) btn.innerText = (hiddenPrice || priceStr) + " PLN";
    };

    setBtnText('btn-buy-water', getDynamicPrice('water').toFixed(2));
    setBtnText('btn-buy-coffee', getDynamicPrice('coffee').toFixed(2));
    setBtnText('btn-buy-energy', getDynamicPrice('energy').toFixed(2));
    setBtnText('btn-buy-abibas', getDynamicPrice('abibas').toFixed(2));
    setBtnText('btn-buy-jorban', getDynamicPrice('jorban').toFixed(2));
    
    const energyItemDesc = document.querySelector('.item-energy .shop-desc span');
    if (energyItemDesc) energyItemDesc.innerText = "Пауза расхода энергии. (Вода продолжает тратиться!)";

    const btnVeturilo = document.getElementById('btn-veturilo');
    if(btnVeturilo) {
        let rate = getDynamicPrice('veturilo_min');
        if(G.transportMode === 'veturilo') {
            btnVeturilo.innerText = "СТОП (АКТИВНО)";
            btnVeturilo.style.background = "#faa";
        } else {
            if (!SETTINGS.toggles.service_veturilo) {
                 btnVeturilo.innerText = "НЕДОСТУПНО"; btnVeturilo.disabled = true; btnVeturilo.style.opacity = "0.5";
            } else {
                 btnVeturilo.disabled = false; btnVeturilo.style.opacity = "1";
                 btnVeturilo.innerText = (hiddenPrice || rate.toFixed(2)) + " PLN / мин";
                 btnVeturilo.style.background = "#ddd";
            }
        }
    }

    const btnBolt = document.getElementById('btn-bolt');
    if(btnBolt) {
        let rate = getDynamicPrice('bolt_min');
        if(G.transportMode === 'bolt') {
            btnBolt.innerText = "СТОП (АКТИВНО)";
            btnBolt.style.background = "#faa";
        } else {
            if (!SETTINGS.toggles.service_bolt) {
                 btnBolt.innerText = "НЕДОСТУПНО"; btnBolt.disabled = true; btnBolt.style.opacity = "0.5";
            } else {
                 btnBolt.disabled = false; btnBolt.style.opacity = "1";
                 btnBolt.innerText = (hiddenPrice || rate.toFixed(2)) + " PLN / мин";
                 btnBolt.style.background = "var(--success)";
            }
        }
    }

    const rentBikeBtn = document.getElementById('buy-bike-rent');
    if(rentBikeBtn) {
        if(G.bikeRentTime > 0) {
            rentBikeBtn.innerText = "ОТМЕНИТЬ (" + Math.floor(G.bikeRentTime/60) + "м)";
            rentBikeBtn.style.background = "#ef4444"; 
            rentBikeBtn.onclick = cancelBikeRent;
        } else {
            rentBikeBtn.innerText = "АРЕНДОВАТЬ (" + (hiddenPrice || getDynamicPrice('bike_rent').toFixed(2)) + " PLN)";
            rentBikeBtn.style.background = ""; 
            rentBikeBtn.onclick = rentBike;
        }
    }

    const autoPriceLabel = document.getElementById('price-auto');
    if(autoPriceLabel) autoPriceLabel.innerText = "(" + (hiddenPrice || getDynamicPrice('auto_route').toFixed(2)) + " PLN)";

    const repairBtn = document.getElementById('btn-repair-express');
    if(repairBtn) repairBtn.innerText = "🔧 ЭКСПРЕСС РЕМОНТ (" + (hiddenPrice || getDynamicPrice('repair_express').toFixed(2)) + " PLN)";

    let shoeNameDisplay = G.shoes.name;
    let shoeBar = document.getElementById('shoe-bar');
    if(shoeBar) {
        if (G.shoes.dur <= 0) {
            shoeNameDisplay = "<span style='color:var(--danger); font-size:9px; font-weight:800; animation: pulse 1s infinite;'>⚠️ КУПИ НОВЫЕ В МАГАЗИНЕ!</span>";
            shoeBar.style.width = "100%"; shoeBar.style.background = "var(--danger)"; shoeBar.style.opacity = "0.3"; 
        } else {
            const sPct = (G.shoes.dur / G.shoes.maxDur) * 100;
            shoeBar.style.width = Math.min(100, Math.max(0, sPct)) + "%";
            shoeBar.style.background = sPct < 20 ? "var(--danger)" : "var(--purple)";
            shoeBar.style.opacity = "1";
        }
        document.getElementById('shoe-name').innerHTML = shoeNameDisplay;
    }

    let currentRank = RANKS[0]; let nextRank = null;
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
            let prevMax = (currentRank.name === "Бывалый") ? RANKS[0].max : (currentRank.name === "Профи") ? RANKS[1].max : 0;
            let progress = ((G.totalOrders - prevMax) / (currentRank.max - prevMax)) * 100;
            document.getElementById('rank-progress').style.width = Math.max(0, Math.min(100, progress)) + "%";
            document.getElementById('rank-next').innerText = "До ранга " + nextRank.name + ": " + (currentRank.max - G.totalOrders) + " заказов";
        } else {
            document.getElementById('rank-progress').style.width = "100%";
            document.getElementById('rank-next').innerText = "Вы достигли вершины!";
        }
    }

    let questsHTML = "";
    if(G.dailyQuests) {
        G.dailyQuests.forEach(q => {
            let btn = "";
            let progressPct = (q.current / q.target) * 100;
            if (q.claimed) { btn = "<span style='color:var(--success)'>✅</span>"; } 
            else if (q.current >= q.target) { btn = "<button class='btn-action' style='width:auto; padding:4px 8px; font-size:10px; background:var(--gold); color:black;' onclick='claimDaily(" + q.id + ")'>ЗАБРАТЬ " + q.reward + "</button>"; } 
            else { btn = "<small>" + parseFloat(q.current).toFixed(0) + "/" + q.target + "</small>"; }
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
        
        // НОВОЕ: ПРОВЕРКА НА ВКЛЮЧЕННУЮ РАБОТУ ИЗ АДМИНКИ
        if (!SETTINGS.toggles.enable_work) rate = "ВЫХОДНОЙ";

        if (isBlind) document.getElementById('click-rate-ui').innerText = "?.?? PLN";
        else document.getElementById('click-rate-ui').innerText = rate + (rate !== "ВЫХОДНОЙ" ? " PLN" : "");
    }

    const myItemsList = document.getElementById('my-items-list');
    if (myItemsList) {
        let invHTML = "";
        let shoeStatusText = Math.floor(G.shoes.dur) + "%";
        let isShoesBroken = G.shoes.dur <= 0;
        invHTML += `<div class="shop-item item-shoes ${isShoesBroken ? 'item-broken' : ''}" ${isShoesBroken ? 'onclick="switchTab(\'shop\', document.querySelectorAll(\'.tab-item\')[2])"' : ''}><div class="shop-icon">👟</div><div style="flex:1;"><div class="shop-title">${G.shoes.name}</div><div class="shop-desc" style="margin-bottom:5px;">${isShoesBroken ? '<b style="color:var(--danger)">СЛОМАНО!</b>' : 'Бонус: ' + (G.shoes.bonus*100) + '%'}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${G.shoes.dur}%; background:${isShoesBroken ? 'var(--danger)' : 'var(--success)'}"></div></div></div></div>`;

        UPGRADES_META.forEach(up => {
            if(G[up.id]) {
                const item = G[up.id];
                const isBroken = item.dur <= 0;
                let conf = UPGRADES_META.find(u => u.id === up.id);
                let max = conf ? conf.maxDur : 100;
                const pct = Math.floor((item.dur / max) * 100);
                let repairPriceVal = (typeof up.repairPriceKey === 'string') ? getDynamicPrice(up.repairPriceKey) : getDynamicPrice(up.repairPriceKey || 10);
                invHTML += `<div class="shop-item ${isBroken ? 'item-broken' : ''}"><div class="shop-icon">${up.icon}</div><div class="shop-title">${up.name}</div><div class="shop-desc" style="color:${isBroken ? 'var(--danger)' : 'var(--text-secondary)'}">${isBroken ? 'ТРЕБУЕТ РЕМОНТА' : up.bonus}</div><div class="inv-dur-track"><div class="inv-dur-fill" style="width:${pct}%; background:${isBroken ? 'var(--danger)' : 'var(--accent-blue)'}"></div></div><div class="inv-action-row"><button class="inv-btn-repair" onclick="repairItem('${up.id}', ${repairPriceVal}, true)">🛠️ ${hiddenPrice || repairPriceVal.toFixed(2)}</button><button class="inv-btn-sell" onclick="sellInvest('${up.id}')">💸 ПРОДАТЬ</button></div></div>`;
            }
        });
        if (myItemsList.innerHTML !== invHTML) myItemsList.innerHTML = invHTML;
    }

    const shopList = document.getElementById('shop-upgrades-list'); 
    if(shopList) {
        let shopHTML = "";
        if (SETTINGS.toggles.enable_shop) {
            UPGRADES_META.forEach(up => { 
                if(!G[up.id] && !up.hidden && up.priceKey) { 
                    let curPrice = getDynamicPrice(up.priceKey);
                    shopHTML += `<div class="card" style="margin-bottom: 8px;"><b>${up.icon} ${up.name}</b><br><small style="color:#aaa;">${up.desc}</small><br><button class="btn-action" style="margin-top:8px;" onclick="buyInvest('${up.id}', '${up.priceKey}')">КУПИТЬ (${hiddenPrice || curPrice} PLN)</button></div>`; 
                }
            });
        } else { shopHTML = "<div style='text-align:center; padding:20px; color:#666;'>Магазин закрыт на учет</div>"; }
        if (shopList.innerHTML !== shopHTML) shopList.innerHTML = shopHTML;
    }
    
    const distContainer = document.getElementById('districts-list-container');
    if (distContainer) {
        let distHTML = "";
        DISTRICTS.forEach((d, i) => {
            let isCurrent = G.district === i;
            let isOwner = G.housing && G.housing.id === i;
            let moveBtn = isCurrent ? `<button class="btn-action btn-secondary" style="margin-top:8px; opacity:0.7;">ВЫ ЗДЕСЬ</button>` : `<button class="btn-action" style="margin-top:8px;" onclick="moveDistrict(${i})">ПЕРЕЕХАТЬ ${d.price > 0 ? '('+d.price+' PLN)' : ''}</button>`;
            let houseBtn = isOwner ? `<button class="btn-action" style="margin-top:5px; background:var(--gold); color:black; font-weight:800;">🏠 ВЫ ВЛАДЕЛЕЦ</button>` : `<button class="btn-action" style="margin-top:5px; background:rgba(251, 191, 36, 0.1); color:var(--accent-gold); border:1px solid var(--accent-gold);" onclick="buyHouse(${i})">КУПИТЬ ЖИЛЬЕ (${(d.housePrice/1000).toFixed(0)}k PLN)</button>`;
            distHTML += `<div class="card" style="border: ${isOwner ? '1px solid var(--gold)' : 'none'};"><div style="display:flex; justify-content:space-between;"><b>${d.name} ${i>0 ? `<span style="color:var(--accent-gold); font-size:10px;">(LVL ${d.minLvl}+)</span>` : ''}</b>${isOwner ? '⭐' : ''}</div><small style="color:var(--text-secondary);">${isOwner ? `<span style="color:var(--success)">Квартплата (Czynsz): ${getDynamicPrice(d.czynszBase)} PLN</span>` : `Аренда: ${(d.rentPct*100).toFixed(0)}% от баланса`}<br>Доход: x${d.mult}</small>${moveBtn}${houseBtn}</div>`;
        });
        if(distContainer.innerHTML !== distHTML) distContainer.innerHTML = distHTML;
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
    
    renderBank(); renderBankFull(); renderMilestones();
    
    const taxTimer = document.getElementById('tax-timer');
    const rentTimer = document.getElementById('rent-timer');
    let currentTaxRate = (SETTINGS.economy.tax_rate * 100).toFixed(0);
    
    if(taxTimer) {
        let taxText = G.money > SETTINGS.economy.tax_threshold ? currentTaxRate + "%" : "FREE";
        taxTimer.innerText = "Налог (" + taxText + ") через: " + Math.floor(G.tax/60) + ":" + ((G.tax%60<10?'0':'')+G.tax%60);
    }
    
    if(rentTimer) {
        let isOwner = G.housing && G.housing.id === G.district;
        if (isOwner) {
            let czynszCost = getDynamicPrice(DISTRICTS[G.district].czynszBase);
            rentTimer.innerText = "Квартплата (" + czynszCost.toFixed(0) + " PLN): " + Math.floor(G.rent/60) + ":" + ((G.rent%60<10?'0':'')+G.rent%60);
            rentTimer.style.color = "var(--success)";
        } else {
            let rentP = (DISTRICTS[G.district].rentPct * 100).toFixed(0);
            rentTimer.innerText = "Аренда (" + rentP + "%): " + Math.floor(G.rent/60) + ":" + ((G.rent%60<10?'0':'')+G.rent%60);
            rentTimer.style.color = "var(--danger)";
        }
    }
    
    // ОБНОВЛЕНИЕ КНОПОК ОБМЕНА LVL НА ОСНОВЕ АДМИНКИ
    const btnLvlSmall = document.getElementById('btn-lvl-small');
    if (btnLvlSmall) btnLvlSmall.innerText = `ОБМЕН -0.05 LVL\n⮕ ${SETTINGS.economy.lvl_exchange_rate} PLN`;
    
    const btnLvlBig = document.getElementById('btn-lvl-big');
    if (btnLvlBig) btnLvlBig.innerText = `ОБМЕН -1.00 LVL\n⮕ ${SETTINGS.economy.lvl_exchange_rate_big} PLN`;
    
    // ОБНОВЛЕНИЕ ПЛАНОВ БАНКА НА ОСНОВЕ БАЗОВОЙ СТАВКИ
    const planRate1 = document.getElementById('plan-rate-1');
    if (planRate1) planRate1.innerText = "+" + (SETTINGS.economy.bank_rate * 100).toFixed(0) + "%";
    
    const planRate2 = document.getElementById('plan-rate-2');
    if (planRate2) planRate2.innerText = "+" + (SETTINGS.economy.bank_rate * 3 * 100).toFixed(0) + "%";
    
    const planRate3 = document.getElementById('plan-rate-3');
    if (planRate3) planRate3.innerText = "+" + (SETTINGS.economy.bank_rate * 8 * 100).toFixed(0) + "%";
    
    // КНОПКА СБОРА БУТЫЛОК
    const btnBottles = document.querySelector("button[onclick='collectBottles()']");
    if (btnBottles && !isSearching) {
        btnBottles.innerText = `♻️ СБОР БУТЫЛОК (+${SETTINGS.economy.bottle_price.toFixed(2)})`;
    }
}

function doWork() {
    G.totalClicks++; checkDailyQuests('clicks', 1);
    
    // ПРОВЕРКА: РАЗРЕШЕНА ЛИ РАБОТА В АДМИНКЕ
    if (!SETTINGS.toggles.enable_work) {
        log("⛔ Работа временно остановлена администрацией!", "var(--danger)");
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    if (isBroken) {
        repairProgress++; G.en = Math.max(0, G.en - 5); tg.HapticFeedback.impactOccurred('heavy');
        if (repairProgress >= 50) { isBroken = false; repairProgress = 0; log("🔧 Вы починили транспорт!", "var(--success)"); tg.HapticFeedback.notificationOccurred('success'); }
        updateUI(); save(); return;
    }
    if (bonusActive) { G.en = Math.max(0, G.en - 50); tg.HapticFeedback.notificationOccurred('error'); updateUI(); return; }
    
    let now = Date.now();
    if (now - lastClickTime < 80) return; 
    lastClickTime = now;
    
    if (order.visible && !order.active) { G.en = Math.max(0, G.en - 25); updateUI(); tg.HapticFeedback.notificationOccurred('error'); return; }
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
        if (G.housing && G.housing.id === G.district) eff *= 1.2;
        let drink = Math.min(G.waterStock, 50); 
        G.en = Math.min(G.maxEn, G.en + (drink * eff)); 
        G.waterStock -= drink; 
    }
    if (G.en < 1) return;
    
    clicksSinceBonus++;
    if (clicksSinceBonus > (300 + Math.random() * 100)) { showBonus(); clicksSinceBonus = 0; }

    if (G.shoes.dur > 0) { G.shoes.dur -= 0.05; if(G.shoes.dur < 0) G.shoes.dur = 0; }

    UPGRADES_META.forEach(up => {
        if (G[up.id] && G[up.id].dur > 0) {
            let wear = 0.02; 
            if (up.id === 'helmet' && order.isRiskyRoute) wear = 0.5; 
            if (up.id === 'scooter') wear = 0.05; 
            G[up.id].dur -= wear;
            if (G[up.id].dur <= 0) { G[up.id].dur = 0; if (Math.random() < 0.05) log("⚠️ " + up.name + " сломан! Зашей его!", "var(--danger)"); }
        }
    });

    if(order.active) { 
        consumeResources(true); 
        let speed = (G.bikeRentTime > 0 ? 2 : 1);
        if (order.isRiskyRoute) speed *= 2; 
        if (G.transportMode === 'bolt') speed *= 1.3;
        if (G.shoes.dur <= 0) speed *= 0.7; 

        order.steps += speed;
        if (G.bikeRentTime > 0 && Math.random() < SETTINGS.gameplay.accident_chance_safe) { triggerBreakdown(); return; } 
        if(order.steps >= order.target) finishOrder(true); 
        updateUI(); save(); return; 
    }
    
    if(!order.visible) { if(Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); }
    consumeResources(false);
    
    let rankBonus = 0;
    if (G.totalOrders >= 50) rankBonus = 0.05;
    if (G.totalOrders >= 150) rankBonus = 0.10;
    if (G.totalOrders >= 400) rankBonus = 0.20;

    let bagBonus = 1;
    if (G.bag && G.bag.dur > 0) bagBonus = 1.15;
    else if (G.starter_bag && G.starter_bag.dur > 0) bagBonus = 1.02;

    let gain = 0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (1 + rankBonus) * bagBonus;
    G.money = parseFloat((G.money + gain).toFixed(2)); G.totalEarned += gain; checkDailyQuests('earn', gain); 
    G.lvl += 0.00025; checkMilestones(); updateUI(); save();
}

function consumeResources(isOrder) {
    let waterCost = isOrder ? 10 : 3;
    if (G.buffTime > 0) waterCost = isOrder ? 8 : 2; 
    G.waterStock = Math.max(0, G.waterStock - waterCost);
    if (G.buffTime > 0) return; 

    let cost = (G.scooter ? 7 : 10); 
    if (G.bikeRentTime > 0) cost *= 0.5; 
    if (G.transportMode === 'veturilo') cost *= 0.5;
    let rainMod = (weather === "Дождь" && !G.raincoat) ? 1.2 : 1;
    cost *= rainMod; 
    if (isOrder) cost *= 1.5; 
    G.en = Math.max(0, G.en - cost); 
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; order.offerTimer = 15; 
    order.isCriminal = Math.random() < SETTINGS.gameplay.criminal_chance; 
    if (order.isCriminal) { tg.HapticFeedback.notificationOccurred('error'); } 
    else { tg.HapticFeedback.notificationOccurred('success'); }

    let d = 0.5 + Math.random() * 3.5; 
    let bagBonus = 1;
    if (G.bag && G.bag.dur > 0) bagBonus = 1.15;
    else if (G.starter_bag && G.starter_bag.dur > 0) bagBonus = 1.02;

    // РАСЧЕТ ИЗ АДМИНКИ (Base Pay + KM Pay)
    let base = SETTINGS.jobs.base_pay || 3.80;
    let perKm = SETTINGS.jobs.km_pay || 2.20;

    let baseRew = (base + d * perKm) * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * bagBonus * (weather === "Дождь" ? 1.5 : 1); 
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; } 
    order.baseReward = baseRew; order.reward = baseRew;
    order.target = Math.floor(d * 160); order.steps = 0; 
    order.time = Math.floor(order.target / 1.5 + 45); order.isRiskyRoute = false; 
    updateUI(); 
}

function openRouteModal() {
    document.getElementById('route-modal').style.display = 'flex';
    const autoBtn = document.getElementById('btn-auto-route');
    const autoLabel = document.getElementById('lbl-auto-route');
    const autoDesc = document.getElementById('desc-auto-route');

    if (!SETTINGS.toggles.enable_auto) {
        autoBtn.style.opacity = "0.5"; autoBtn.style.pointerEvents = "none"; 
        autoBtn.style.borderColor = "#555"; autoBtn.style.background = "transparent";
        autoLabel.innerHTML = "<b>🤖 АВТОПИЛОТ (ОТКЛ)</b>";
        autoDesc.innerHTML = "<small style='color:#aaa'>Сервис временно недоступен</small>";
        return;
    } else {
        autoBtn.style.opacity = "1"; autoBtn.style.pointerEvents = "auto";
    }

    let curPrice = getDynamicPrice('auto_route');
    if (G.autoTime > 0) {
        autoLabel.innerHTML = "<b>🤖 ПОРУЧИТЬ РОБОТУ</b>";
        autoDesc.innerHTML = "<small style='color:var(--success)'>Активно: " + Math.floor(G.autoTime/60) + " мин</small>";
        autoBtn.onclick = function() { closeRouteModal(); acceptOrder(); log("🤖 Робот принял заказ", "var(--accent-gold)"); };
        autoBtn.style.borderColor = "var(--success)"; autoBtn.style.background = "rgba(34, 197, 94, 0.1)";
    } else {
        autoLabel.innerHTML = "<b>🤖 КУПИТЬ АВТО (" + curPrice + " PLN)</b>";
        autoDesc.innerHTML = "<small style='color:var(--accent-gold)'>Робот сделает всё сам (+10 мин)</small>";
        autoBtn.onclick = function() { activateAutopilot(); };
        autoBtn.style.borderColor = "var(--accent-gold)"; autoBtn.style.background = "rgba(245, 158, 11, 0.1)";
    }
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
    let price = getDynamicPrice('auto_route'); 
    if(G.money >= price && G.lvl >= 0.15) { 
        G.money = parseFloat((G.money - price).toFixed(2)); G.lvl -= 0.15; 
        let hasPower = (G.powerbank && G.powerbank.dur > 0);
        let timeAdd = hasPower ? 900 : 600; 
        G.autoTime += timeAdd; addHistory('АВТОПИЛОТ', price, 'minus'); 
        acceptOrder(); save(); updateUI(); 
    } else { log("Не хватает денег или LVL!", "var(--danger)"); }
}

function acceptOrder() { order.active = true; updateUI(); }

function buyShoes(name, basePrice, durability) {
    if (G.shoes.name === name && G.shoes.dur > 0) { log("У вас уже есть эти кроссовки!", "var(--danger)"); tg.HapticFeedback.notificationOccurred('error'); return; }
    let priceKey = name === "Jorban" ? "jorban" : "abibas";
    let price = getDynamicPrice(priceKey); 
    if (G.money >= price) {
        G.money -= price;
        let bonus = (name === "Jorban") ? 0.2 : 0;
        G.shoes = { name: name, maxDur: durability, dur: durability, bonus: bonus };
        addHistory('👟 ' + name.toUpperCase(), price, 'minus');
        log("Куплены " + name + "!", "var(--purple)");
        save(); updateUI();
    } else { log("Не хватает денег (" + price + " PLN)!", "var(--danger)"); }
}

function buyInvest(type, priceKey) { 
    let price = getDynamicPrice(priceKey); 
    if(!G[type] && G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        let maxDur = 100;
        let conf = UPGRADES_META.find(u => u.id === type);
        if(conf && conf.maxDur) maxDur = conf.maxDur;
        G[type] = { active: true, dur: maxDur };
        addHistory('ИНВЕСТ', price, 'minus'); save(); updateUI(); 
    } else if (G.money < price) { log("Нужно " + price + " PLN", "var(--danger)"); }
}

function sellInvest(type) {
    if(G[type]) {
        let conf = UPGRADES_META.find(u => u.id === type);
        let priceKey = conf ? conf.priceKey : null;
        if (!priceKey) return; 
        let p = getDynamicPrice(priceKey) * 0.5;
        G.money = parseFloat((G.money + p).toFixed(2)); G[type] = null; 
        addHistory('💸 ЛОМБАРД', p, 'plus'); log("Вы продали предмет в ломбард", "var(--gold)");
        save(); updateUI();
    }
}

function repairItem(type, valPassed, isDynamic) {
    if (!G[type]) return;
    let conf = UPGRADES_META.find(u => u.id === type);
    let max = conf ? conf.maxDur : 100;
    if (G[type].dur >= max) { log("Предмет полностью цел!", "var(--accent-blue)"); return; }
    let cost = isDynamic ? valPassed : getDynamicPrice(valPassed);
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        G[type].dur = max;
        addHistory('🛠️ РЕМОНТ', cost, 'minus');
        log("Предмет отремонтирован!", "var(--success)");
        save(); updateUI();
    } else { log("Нет денег на ремонт (" + cost + ")", "var(--danger)"); }
}

function getWelfare() {
    let now = Date.now();
    if (G.money >= 0) { log("Пособие только для должников!", "var(--danger)"); return; }
    let cooldown = SETTINGS.economy.welfare_cooldown * 1000;
    if (now - G.lastWelfare < cooldown) { 
        let wait = Math.ceil((cooldown - (now - G.lastWelfare)) / 60000);
        log("Жди еще " + wait + " мин.", "var(--danger)"); return;
    }
    let amount = SETTINGS.economy.welfare_amount;
    G.money = parseFloat((G.money + amount).toFixed(2));
    G.lastWelfare = now;
    addHistory('👵 БАБУШКА', amount, 'plus');
    log("Бабушка прислала " + amount + " PLN на еду!", "var(--success)");
    save(); updateUI();
}

function repairBikeInstant() {
    let cost = getDynamicPrice('repair_express'); 
    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        isBroken = false; repairProgress = 0;
        addHistory('🔧 РЕМОНТ', cost, 'minus');
        log("Велик починен за деньги!", "var(--success)");
        save(); updateUI();
    } else { log("Нет денег (" + cost + " PLN)!", "var(--danger)"); }
}

function finishOrder(win) { 
    if(!order.active) return;
    order.active = false; 
    if(win) { 
        if (order.isRiskyRoute) {
            let riskRoll = Math.random();
            let hasHelmet = (G.helmet && G.helmet.dur > 0);
            let riskChance = hasHelmet ? (SETTINGS.gameplay.accident_chance_risky / 2) : SETTINGS.gameplay.accident_chance_risky; 
            if (riskRoll < riskChance) { 
                log("💥 АВАРИЯ на срезке!", "var(--danger)");
                isBroken = true; repairProgress = 0;
                G.money = parseFloat((G.money - 20).toFixed(2)); 
                addHistory('💥 АВАРИЯ', 20, 'minus');
                order.visible = false; updateUI(); save(); return; 
            }
        }
        let policeChance = order.isCriminal ? SETTINGS.gameplay.police_chance_criminal : SETTINGS.gameplay.police_chance; 
        if(Math.random() < policeChance) { 
            let fine = (G.lvl < 2) ? SETTINGS.gameplay.fine_amount : SETTINGS.gameplay.fine_amount_pro;
            let lvlFine = SETTINGS.gameplay.lvl_fine_police;
            G.lvl -= lvlFine; G.money = parseFloat((G.money - fine).toFixed(2)); 
            addHistory('👮 ШТРАФ', fine, 'minus');
            log("🚔 ПОЛИЦИЯ! Штраф -" + fine + " и -" + lvlFine + " LVL", "var(--danger)"); 
        } else { 
            G.money = parseFloat((G.money + order.reward).toFixed(2)); 
            G.totalEarned += order.reward; 
            addHistory(order.isCriminal ? '☠️ КРИМИНАЛ' : '📦 ЗАКАЗ', order.reward.toFixed(2), 'plus');
            G.lvl += (order.isCriminal ? 0.12 : 0.015); G.totalOrders++; 
            checkDailyQuests('orders', 1); checkDailyQuests('earn', order.reward); 
            
            // ЧАЕВЫЕ (ИЗ АДМИНКИ)
            let chance = SETTINGS.jobs.tips_chance || 0.40;
            if(Math.random() < chance) { 
                let maxTip = SETTINGS.jobs.tips_max || 15;
                let tip = parseFloat((5 + Math.random()*(maxTip-5)).toFixed(2)); 
                if (order.isRiskyRoute) tip *= 2; 
                if (G.shoes && G.shoes.bonus > 0) tip *= (1 + G.shoes.bonus);
                G.money = parseFloat((G.money + tip).toFixed(2)); 
                G.totalEarned += tip; checkDailyQuests('earn', tip);
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
        G.money = parseFloat((G.money - cost).toFixed(2)); G.lvl += amount;
        addHistory('📈 PR-ХОД', cost, 'minus');
        log("Вы купили рекламу: +" + amount + " LVL", "var(--accent-blue)");
        save(); updateUI();
    } else { log("Не хватает денег (" + cost + " PLN)!", "var(--danger)"); }
}

function collectBottles() { 
    if (isSearching) {
        spamCounter++;
        if (spamCounter > SETTINGS.gameplay.click_spam_limit) {
            log("🤖 Слишком быстро! Руки не мельница!", "var(--danger)");
            tg.HapticFeedback.notificationOccurred('error');
            G.money = Math.max(0, G.money - 100); 
            G.lvl -= SETTINGS.gameplay.lvl_fine_spam; 
            spamCounter = 0; updateUI();
        }
        return; 
    }
    isSearching = true; spamCounter = 0;
    const btn = document.querySelector("button[onclick='collectBottles()']");
    const originalText = btn ? btn.innerText : "♻️ СБОР БУТЫЛОК";
    if(btn) { btn.innerText = "⏳ Роемся..."; btn.style.opacity = "0.6"; }

    setTimeout(() => {
        // ИСПОЛЬЗУЕМ ЦЕНУ ИЗ АДМИНКИ
        let price = SETTINGS.economy.bottle_price || 0.05;
        
        // ИСПОЛЬЗУЕМ ШАНС ИЗ АДМИНКИ
        if (Math.random() < (SETTINGS.gameplay.bottle_find_chance || 0.40)) {
            G.money = parseFloat((G.money + price).toFixed(2)); G.totalEarned += price;
            checkDailyQuests('earn', price); G.totalBottles++; 
            let repGain = (G.lvl < 1.0) ? 0.02 : 0.002;
            if (Math.random() < 0.10) { repGain *= 3; log("💎 Нашел стеклотару! Респект x3", "var(--success)"); }
            G.lvl += repGain;
        } else {
             log("🗑️ Пусто...", "#aaa");
        }
        
        checkMilestones(); save(); updateUI(); 
        isSearching = false;
        if(btn) { btn.innerText = originalText; btn.style.opacity = "1"; }
    }, 1200); 
}

function buyWater() { 
    let price = getDynamicPrice('water'); 
    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        G.waterStock += 1500; addHistory('🧴 ВОДА', price, 'minus'); 
        save(); updateUI(); 
    } else { log("Нужно " + price + " PLN", "var(--danger)"); }
}

function buyDrink(type, basePriceVal) { 
    let priceKey = type === 'coffee' ? 'coffee' : 'energy';
    let price = getDynamicPrice(priceKey); 
    if(G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory(type.toUpperCase(), price, 'minus'); 
        if(type === 'coffee') G.en = Math.min(G.maxEn, G.en + 300); 
        else G.buffTime += 120; 
        save(); updateUI(); 
    } else { log("Нужно " + price + " PLN", "var(--danger)"); }
}

function toggleTransport(type) {
    if (G.transportMode === type) {
        G.transportMode = 'none'; log(type.toUpperCase() + " остановлен.", "var(--text-secondary)");
        updateUI(); save(); return;
    }
    if (G.transportMode !== 'none') { log("Сначала завершите текущую аренду!", "var(--danger)"); return; }
    if (G.bikeRentTime > 0) { log("Нельзя брать аренду, пока активен E-Bike!", "var(--danger)"); return; }

    if (type === 'veturilo') {
        if (!SETTINGS.toggles.service_veturilo) { log("Сервис недоступен!", "var(--danger)"); return; }
        let startCost = getDynamicPrice('veturilo_start'); 
        if (G.money <= startCost) { log("Нужен положительный баланс для старта!", "var(--danger)"); return; }
        G.transportMode = 'veturilo'; log("Veturilo активирован!", "var(--success)");
    } 
    else if (type === 'bolt') {
        if (!SETTINGS.toggles.service_bolt) { log("Сервис недоступен!", "var(--danger)"); return; }
        let startCost = getDynamicPrice('bolt_start');
        if (G.money >= startCost) {
            G.money = parseFloat((G.money - startCost).toFixed(2));
            G.transportMode = 'bolt';
            addHistory('🛴 BOLT START', startCost, 'minus');
            log("Bolt активирован!", "var(--success)");
        } else { log("Не хватает на старт (" + startCost + " PLN)", "var(--danger)"); }
    }
    updateUI(); save();
}

function rentBike() { 
    if (G.transportMode !== 'none') { log("Сначала завершите поминутную аренду!", "var(--danger)"); return; }
    let price = getDynamicPrice('bike_rent'); 
    if (G.money >= price) { 
        G.money = parseFloat((G.money - price).toFixed(2)); 
        addHistory('🚲 ВЕЛИК', price, 'minus'); G.bikeRentTime += 600; 
        save(); updateUI(); 
    } else { log("Нужно " + price + " PLN", "var(--danger)"); }
}

function cancelBikeRent() {
    if(confirm("Отменить аренду E-Bike? Деньги за остаток времени не вернутся.")) {
        G.bikeRentTime = 0; log("Аренда E-Bike отменена досрочно.", "var(--text-secondary)");
        updateUI(); save();
    }
}

function buyHouse(distId) {
    if (G.housing.id === distId) return; 
    let housePrice = DISTRICTS[distId].housePrice;
    if (G.money >= housePrice) {
        if(confirm(`Купить квартиру в ${DISTRICTS[distId].name} за ${housePrice} PLN?`)) {
            G.money -= housePrice; G.housing.id = distId;
            addHistory('🏠 КВАРТИРА', housePrice, 'minus');
            log(`Поздравляем! Вы купили квартиру в ${DISTRICTS[distId].name}!`, "var(--gold)");
            tg.HapticFeedback.notificationOccurred('success');
            save(); updateUI();
        }
    } else {
        log(`Не хватает денег! Нужно ${housePrice} PLN`, "var(--danger)");
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function exchangeLvl(l, m) { 
    // Теперь функция не используется, так как в UI жестко прописаны параметры в старом коде
    // Но мы обновим UI, чтобы кнопки вызывали функцию с правильными параметрами
    // Здесь оставляем логику, она корректна
    if(G.lvl >= l) { 
        if (m > 200 && Math.random() < 0.3) {
            G.blindTime = 600; log("👁️ БАНК СКРЫЛ СЧЕТА НА 10 МИН!", "var(--danger)");
        }
        G.lvl -= l; G.money = parseFloat((G.money + m).toFixed(2)); 
        G.totalEarned += m; checkDailyQuests('earn', m);
        addHistory('💎 ОБМЕН', m, 'plus'); save(); updateUI(); 
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
    if (G.money < DISTRICTS[id].price || G.lvl < DISTRICTS[id].minLvl) { log("Недостаточно ресурсов!", "var(--danger)"); return; }
    G.money = parseFloat((G.money - DISTRICTS[id].price).toFixed(2)); 
    addHistory('🏙️ ПЕРЕЕЗД', DISTRICTS[id].price, 'minus'); 
    G.district = id; save(); updateUI(); 
}

function triggerBreakdown() { 
    isBroken = true; repairProgress = 0; 
    log("🚲 ПОЛОМКА!", "var(--danger)"); tg.HapticFeedback.notificationOccurred('error');
    updateUI(); 
}

function renderBank() { 
    const ui = document.getElementById('bank-actions-ui'); 
    if(!ui) return;
    if (!SETTINGS.toggles.enable_bank) {
        ui.innerHTML = "<div style='color:var(--danger); text-align:center;'>Банк временно закрыт ЦБ РФ (или Варшавы)</div>"; return;
    }
    let creditHTML = "";
    if (G.money < 0) {
        creditHTML = "<button class='btn-action' style='background:var(--purple)' onclick='getWelfare()'>📞 ПОЗВОНИТЬ БАБУШКЕ (+" + SETTINGS.economy.welfare_amount + " PLN)</button><small style='color:#aaa; display:block; margin-top:5px; text-align:center;'>Только если баланс меньше нуля.</small>";
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

let selectedBankPlan = { days: 7, mult: 1 }; // Mult - множитель базовой ставки
function selectBankPlan(days, mult, el) {
    selectedBankPlan = { days, mult };
    document.querySelectorAll('.plan-item').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
}

function makeDeposit() {
    const inp = document.getElementById('bank-inp'); let val = parseFloat(inp.value);
    if (!val || val <= 0) { log("Введите сумму!", "var(--danger)"); return; }
    if (val > G.money) { log("Не хватает денег!", "var(--danger)"); return; }
    if (val < 100) { log("Минимальный вклад 100 PLN", "var(--danger)"); return; }
    
    // РАСЧЕТ ПРОЦЕНТА ОТ БАЗОВОЙ СТАВКИ АДМИНА
    let baseRate = SETTINGS.economy.bank_rate || 0.05;
    let finalRate = baseRate * selectedBankPlan.mult; // 7дн = x1, 15дн = x3, 30дн = x8

    G.money = parseFloat((G.money - val).toFixed(2));
    let durationMs = selectedBankPlan.days * 86400000; 
    G.deposit = {
        amount: val, start: Date.now(), end: Date.now() + durationMs, 
        rate: finalRate,
        profit: val * finalRate, 
        penalty: val * 0.30 
    };
    addBankLog("Вклад " + selectedBankPlan.days + "дн", val, "minus");
    log("💎 Средства заморожены в Royal Bank", "var(--accent-blue)");
    tg.HapticFeedback.notificationOccurred('success');
    inp.value = ""; save(); updateUI();
}

function claimDeposit() {
    if(!G.deposit) return;
    let total = parseFloat((G.deposit.amount + G.deposit.profit).toFixed(2));
    G.money = parseFloat((G.money + total).toFixed(2));
    addBankLog("Выплата %", total, "plus");
    log("💰 Выплата по вкладу: +" + total + " PLN", "var(--success)");
    G.deposit = null; tg.HapticFeedback.notificationOccurred('success'); save(); updateUI();
}

function breakDeposit() {
    if(!G.deposit) return;
    let penalty = parseFloat(G.deposit.penalty.toFixed(2));
    let returnVal = parseFloat((G.deposit.amount - penalty).toFixed(2));
    if(confirm(`⚠️ РАЗБИТЬ КОПИЛКУ?\n\nВы потеряете: ${penalty} PLN\nВам вернется: ${returnVal} PLN\n\nСделать это?`)) {
        G.money = parseFloat((G.money + returnVal).toFixed(2));
        addBankLog("Штраф", penalty, "fee"); addBankLog("Возврат", returnVal, "plus");
        log("Копилка разбита. Штраф списан.", "var(--danger)");
        G.deposit = null; tg.HapticFeedback.notificationOccurred('warning'); save(); updateUI();
    }
}

function addBankLog(msg, val, type) {
    if(!G.bankHistory) G.bankHistory = [];
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    G.bankHistory.unshift({ msg, val, type, time });
    if(G.bankHistory.length > 10) G.bankHistory.pop();
}

function renderBankFull() {
    const selUI = document.getElementById('bank-select-ui');
    const actUI = document.getElementById('bank-active-ui');
    if (!selUI || !actUI) return; 
    if (G.deposit) {
        selUI.style.display = 'none'; actUI.style.display = 'block';
        document.getElementById('locked-val').innerText = G.deposit.amount.toFixed(2) + " PLN";
        let now = Date.now(); let left = G.deposit.end - now; let totalDur = G.deposit.end - G.deposit.start;
        if (left <= 0) {
            document.getElementById('bank-timer').innerText = "СРОК ИСТЕК! ПРИБЫЛЬ ГОТОВА";
            document.getElementById('bank-timer').style.color = "var(--success)";
            document.getElementById('bank-prog-bar').style.width = "100%";
            document.getElementById('bank-prog-bar').style.background = "var(--success)";
            document.getElementById('btn-bank-claim').style.display = 'block';
            document.getElementById('btn-bank-break').style.display = 'none';
        } else {
            let pct = 100 - (left / totalDur * 100);
            document.getElementById('bank-prog-bar').style.width = pct + "%";
            document.getElementById('bank-prog-bar').style.background = "var(--accent-gold)";
            let days = Math.floor(left / (1000 * 60 * 60 * 24));
            let hours = Math.floor((left % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let mins = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
            document.getElementById('bank-timer').innerText = `БЛОКИРОВКА: ${days}д ${hours}ч ${mins}м`;
            document.getElementById('bank-timer').style.color = "var(--accent-gold)";
            document.getElementById('btn-bank-claim').style.display = 'none';
            document.getElementById('btn-bank-break').style.display = 'block';
        }
    } else {
        selUI.style.display = 'block'; actUI.style.display = 'none';
    }
    const hList = document.getElementById('bank-history-list');
    if(hList && G.bankHistory) {
        hList.innerHTML = G.bankHistory.map(h => {
            let color = h.type === 'plus' ? 'var(--success)' : (h.type === 'fee' ? 'var(--danger)' : '#fff');
            let sign = h.type === 'plus' ? '+' : '-'; if(h.type === 'fee') sign = '-';
            return `<div class="h-row"><span>${h.time} ${h.msg}</span><span style="color:${color}">${sign}${h.val} PLN</span></div>`;
        }).join('');
    }
}

function openProShop() { document.getElementById('pro-shop-modal').style.display = 'flex'; }
function closeProShop() { document.getElementById('pro-shop-modal').style.display = 'none'; }

setInterval(() => {
    if (isNaN(G.money)) G.money = 0; if (isNaN(G.en)) G.en = 0;
    if (G.en > G.maxEn) G.en = G.maxEn;

    if (G.money > 0) {
        if (G.transportMode === 'veturilo') { let costPerSec = getDynamicPrice('veturilo_min') / 60; G.money -= costPerSec; } 
        else if (G.transportMode === 'bolt') { let costPerSec = getDynamicPrice('bolt_min') / 60; G.money -= costPerSec; }
        if (G.transportMode !== 'none' && G.money <= 0) { G.transportMode = 'none'; G.money = 0; log("Аренда завершена: Недостаточно средств!", "var(--danger)"); updateUI(); }

        G.tax--; 
        if(G.tax <= 0) { 
            let cost = 0;
            if (G.money > SETTINGS.economy.tax_threshold) {
                cost = parseFloat(((G.money - SETTINGS.economy.tax_threshold) * SETTINGS.economy.tax_rate).toFixed(2));
            }
            if (cost > 0) {
                G.money = parseFloat((G.money - cost).toFixed(2)); 
                addHistory('🏛️ НАЛОГ', cost, 'minus'); 
                log("Списан налог " + (SETTINGS.economy.tax_rate*100).toFixed(0) + "% с сверхдоходов: -" + cost + " PLN"); 
            } else { log("Доход ниже минимума. Налог: 0 PLN", "var(--success)"); }
            G.tax = SETTINGS.economy.tax_timer_sec; save(); 
        }
        
        G.rent--; 
        if(G.rent <= 0) { 
            let isOwner = G.housing && G.housing.id === G.district;
            let cost = 0;
            if (isOwner) {
                let baseCzynsz = DISTRICTS[G.district].czynszBase;
                cost = getDynamicPrice(baseCzynsz); 
                log("🏠 Оплачена коммуналка: -" + cost.toFixed(2) + " PLN");
            } else {
                let pct = DISTRICTS[G.district].rentPct;
                cost = parseFloat((G.money * pct).toFixed(2));
                log("💸 Оплачена аренда: -" + cost.toFixed(2) + " PLN");
            }
            G.money = parseFloat((G.money - cost).toFixed(2)); 
            addHistory(isOwner ? '🏠 CZYNSZ' : '🏠 АРЕНДА', cost, 'minus'); 
            G.rent = SETTINGS.economy.rent_timer_sec; save(); 
        }
    }

    if (Math.random() < 0.015) weather = Math.random() < 0.35 ? "Дождь" : "Ясно";
    
    if (G.bikeRentTime > 0) { 
        G.bikeRentTime--; 
        if (G.bikeRentTime <= 0 && G.money >= 30) { 
            let cost = getDynamicPrice('bike_rent');
            if (G.money >= cost) {
                G.money = parseFloat((G.money - cost).toFixed(2)); 
                addHistory('🚲 ВЕЛИК', cost, 'minus'); G.bikeRentTime = 600; 
            } else { G.bikeRentTime = 0; log("Аренда E-Bike закончилась.", "var(--danger)"); }
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
                    G.en = Math.min(G.maxEn, G.en + (15 * eff)); G.waterStock -= 15; 
                }
                if (G.en > 5) { 
                    consumeResources(true); 
                    if (G.shoes.dur > 0) { G.shoes.dur -= 0.01; if(G.shoes.dur < 0) G.shoes.dur = 0; }
                    order.steps += (G.bikeRentTime > 0 ? 3 : 2); 
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
            G.lvl -= SETTINGS.gameplay.lvl_fine_missed; 
            log("Заказ упущен: LVL снижен!", "var(--danger)");
        } 
    }
    
    if(order.active) { order.time--; if(order.time <= 0) finishOrder(false); }
    updateUI();
}, 1000);

window.onload = load;


