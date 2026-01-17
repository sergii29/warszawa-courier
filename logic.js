// --- logic.js ---
// VERSION: 10.3 (REANIMATION FIX)
// Полная защита от зависаний.
// Исправляет старые сохранения автоматически.
// Весь функционал (Ручной бизнес, Найм, Сейфы) на месте.

const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// === НАСТРОЙКИ ===
const DEFAULT_SETTINGS = {
    prices: {
        water: 1.50, coffee: 5.00, energy: 12.00,
        repair_express: 15.00, auto_route: 45.00, bike_rent: 30.00,
        veturilo_start: 0.00, veturilo_min: 0.50,
        bolt_start: 2.00, bolt_min: 2.50,
        bag: 350, phone: 1200, scooter: 500, helmet: 250, raincoat: 180, powerbank: 400, abibas: 50, jorban: 250
    },
    business_goods: {
        vending_buy: 8.0, vending_sell: 12.0, 
        vege_buy: 15.0, vege_sell: 25.0,      
        kebab_buy: 40.0, kebab_sell: 75.0,    
        zabka_buy: 100.0, zabka_sell: 180.0   
    },
    business_costs: {
        employee_base: 150 
    },
    economy: {
        tax_rate: 0.15, tax_threshold: 200, inflation_rate: 0.40, 
        welfare_amount: 30, welfare_cooldown: 600,
        lvl_exchange_rate: 10, lvl_exchange_rate_big: 300, 
        tax_timer_sec: 300, rent_timer_sec: 300,
        bank_rate: 0.05, bottle_price: 0.05, click_base: 0.10,
        transfer_fee: 0.15
    },
    jobs: { base_pay: 3.80, km_pay: 2.20, tips_chance: 0.40, tips_max: 15 },
    gameplay: {
        criminal_chance: 0.12, police_chance: 0.02, police_chance_criminal: 0.35,
        accident_chance_risky: 0.30, accident_chance_safe: 0.002,
        bottle_find_chance: 0.40, fine_amount: 50, fine_amount_pro: 150,
        lvl_fine_police: 1.2, lvl_fine_missed: 0.05, lvl_fine_spam: 0.1, click_spam_limit: 15
    },
    toggles: { enable_bank: true, enable_shop: true, enable_auto: true, enable_work: true, service_veturilo: true, service_bolt: true }
};

// === БИЗНЕС ДАННЫЕ ===
const BUSINESS_META = [
    { 
        id: 'vending', name: 'Vending Machine', icon: '🍫', 
        basePrice: 5000, minLvl: 5.0, taxRate: 0.18, 
        stockConsume: 1, maxStock: 500, maxCash: 2000, 
        priceKeys: { buy: 'vending_buy', sell: 'vending_sell' },
        hireCostMult: 1, desc: "Автомат. Купи сникерсы оптом, продай в розницу."
    },
    { 
        id: 'vege', name: 'Warzywniak', icon: '🥦', 
        basePrice: 20000, minLvl: 10.0, taxRate: 0.23, 
        stockConsume: 2, maxStock: 1500, maxCash: 8000, 
        priceKeys: { buy: 'vege_buy', sell: 'vege_sell' },
        hireCostMult: 2, desc: "Овощи гниют быстро, но наценка хорошая."
    },
    { 
        id: 'kebab', name: 'Kebab u Aliego', icon: '🥙', 
        basePrice: 75000, minLvl: 20.0, taxRate: 0.30, 
        stockConsume: 4, maxStock: 4000, maxCash: 25000, 
        priceKeys: { buy: 'kebab_buy', sell: 'kebab_sell' },
        hireCostMult: 5, desc: "Мясо, лаваш, соус. Клиенты идут потоком."
    },
    { 
        id: 'zabka', name: 'Żabka Franchise', icon: '🐸', 
        basePrice: 300000, minLvl: 30.0, taxRate: 0.40, 
        stockConsume: 8, maxStock: 20000, maxCash: 150000, 
        priceKeys: { buy: 'zabka_buy', sell: 'zabka_sell' },
        hireCostMult: 10, desc: "Высокие обороты. Главное успевать завозить товар."
    }
];

let SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

const RANKS = [
    { name: "Новичок", max: 50, bonus: 0, icon: "👶" },
    { name: "Бывалый", max: 150, bonus: 0.05, icon: "🦊" },
    { name: "Профи", max: 400, bonus: 0.10, icon: "😎" },
    { name: "Легенда", max: 999999, bonus: 0.20, icon: "👑" }
];

// ГЛОБАЛЬНОЕ СОСТОЯНИЕ (Default)
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
    activeMilestones: [],
    business: {}, 
    dailyBizWithdrawals: 0,
    lastBizWithdrawalDay: null,
    lastActive: Date.now()
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0, isRiskyRoute: false };
let curView = 'main', weather = "Ясно", isBroken = false;
let repairProgress = 0; let lastClickTime = 0; let clicksSinceBonus = 0; let bonusActive = false;
let isSearching = false; let spamCounter = 0;
let gameLoaded = false;
let activeBizModalId = null;

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
    try {
        if (baseValue === 0) return 0;
        let price = 0;
        if (typeof baseValue === 'string') {
            if (SETTINGS.prices[baseValue] !== undefined) price = SETTINGS.prices[baseValue];
            else if (SETTINGS.business_goods && SETTINGS.business_goods[baseValue] !== undefined) price = SETTINGS.business_goods[baseValue];
            else price = 0;
        } else { price = baseValue; }
        let multiplier = 1 + (Math.max(1.0, G.lvl) - 1.0) * SETTINGS.economy.inflation_rate;
        return parseFloat((price * multiplier).toFixed(2));
    } catch(e) { return 0; }
}

function getBusinessPrice(basePrice) {
    let mult = 1 + (Math.max(1.0, G.lvl) * 0.2);
    return parseFloat((basePrice * mult).toFixed(2));
}

function addHistory(msg, val, type = 'plus') {
    try {
        const time = new Date().toLocaleTimeString().split(' ')[0];
        if (!G.history) G.history = [];
        G.history.unshift({ time, msg, val, type });
        if (G.history.length > 20) G.history.pop();
    } catch(e) {}
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
                SETTINGS.prices = { ...DEFAULT_SETTINGS.prices, ...(serverSettings.prices || {}) };
                if (serverSettings.business_goods) {
                    SETTINGS.business_goods = { ...DEFAULT_SETTINGS.business_goods, ...serverSettings.business_goods };
                }
                if (serverSettings.business_costs) {
                    SETTINGS.business_costs = { ...DEFAULT_SETTINGS.business_costs, ...serverSettings.business_costs };
                }
                SETTINGS.economy = { ...DEFAULT_SETTINGS.economy, ...(serverSettings.economy || {}) };
                SETTINGS.jobs = { ...DEFAULT_SETTINGS.jobs, ...(serverSettings.jobs || {}) };
                SETTINGS.gameplay = { ...DEFAULT_SETTINGS.gameplay, ...(serverSettings.gameplay || {}) };
                SETTINGS.toggles = { ...DEFAULT_SETTINGS.toggles, ...(serverSettings.toggles || {}) };
                updateUI();
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
                if(!remote.business) remote.business = {}; 
                G = { ...G, ...remote };
                localStorage.setItem(SAVE_KEY, JSON.stringify(G));
                if (G.isNewPlayer && !wasNew) { location.reload(); return; }
                updateUI();
            }
        });
    }
}

function save() { 
    if(!gameLoaded) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(G)); 
    saveToCloud(); 
}

function validateInventory() {
    UPGRADES_META.forEach(up => {
        if(G[up.id] && G[up.id].dur > up.maxDur) G[up.id].dur = up.maxDur;
    });
}

function load() { 
    try {
        let d = localStorage.getItem(SAVE_KEY); 
        if(d) { 
            let loaded = JSON.parse(d); 
            G = {...G, ...loaded}; 
        } 
        
        // === АВТО-РЕМОНТ (ГЛАВНАЯ ЧАСТЬ) ===
        if(!G.business) G.business = {};
        if(!G.housing) G.housing = { id: -1 };
        if(isNaN(G.money)) G.money = 10;
        
        BUSINESS_META.forEach(biz => {
            if(!G.business[biz.id]) G.business[biz.id] = null; 
            else {
                let b = G.business[biz.id];
                if(b.stock === undefined) b.stock = 0;
                if(b.cash === undefined) b.cash = 0;
                if(b.employeeTime === undefined) b.employeeTime = 0;
            }
        });

        if (G.dailyBizWithdrawals === undefined) G.dailyBizWithdrawals = 0;
        if (G.lastBizWithdrawalDay === undefined) G.lastBizWithdrawalDay = null;

        if(isNaN(G.lvl)) G.lvl = 1.0;
        if(isNaN(G.en)) G.en = 2000;
        if(isNaN(G.waterStock)) G.waterStock = 0;
        if(!G.transportMode) G.transportMode = 'none';
        
        ['bag', 'phone', 'scooter', 'helmet', 'raincoat', 'powerbank'].forEach(item => {
            if (G[item] === true) G[item] = { active: true, dur: 100 };
        });

        if (!G.bag && !G.starter_bag) G.starter_bag = { active: true, dur: 50 };
        if (!G.phone && !G.starter_phone) G.starter_phone = { active: true, dur: 50 };

        validateInventory(); 
        checkStarterPack();
        generateDailyQuests();
        listenToCloud();
        
        gameLoaded = true;
        updateUI(); 
        console.log("Game Loaded Successfully");
    } catch(e) {
        console.error("Critical Load Error:", e);
        // Если совсем всё плохо - сброс, но это крайний случай
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

// === УПРАВЛЕНИЕ БИЗНЕСОМ ===

function renderBusiness() {
    const list = document.getElementById('business-list');
    if(!list) return;

    let html = "";
    let hasHouse = G.housing && G.housing.id !== -1;
    let totalCash = 0;
    let totalValue = 0;

    BUSINESS_META.forEach(biz => {
        let userBiz = G.business[biz.id];
        let isOwned = !!userBiz;
        let currentPrice = getBusinessPrice(biz.basePrice);
        let hasLvl = G.lvl >= biz.minLvl;

        if(userBiz) {
            totalCash += (userBiz.cash || 0);
            totalValue += currentPrice;
        }

        if (!isOwned) {
            let reason = "";
            if (!hasHouse) reason = "🔒 НУЖНА КВАРТИРА";
            else if (!hasLvl) reason = `🔒 НУЖЕН LVL ${biz.minLvl}`;
            else reason = `КУПИТЬ ${currentPrice} PLN`;

            let canBuy = hasHouse && hasLvl;
            let btnStyle = canBuy ? "background:var(--accent-gold); color:black;" : "background:#334155; color:#94a3b8; border:1px solid #475569;";
            let btnAction = canBuy ? `onclick="buyBusiness('${biz.id}')"` : "";

            html += `
            <div class="biz-card biz-locked">
                <div class="biz-header">
                    <div style="display:flex; align-items:center;">
                        <div class="biz-icon">${biz.icon}</div>
                        <div>
                            <div class="biz-title">${biz.name}</div>
                            <div style="font-size:10px; color:#aaa;">${biz.desc}</div>
                        </div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <div style="font-size:9px; color:#64748b;">
                        Входной билет: ${currentPrice} PLN<br>
                        <span style="color:var(--danger)">Налог на прибыль: -${(biz.taxRate*100).toFixed(0)}%</span>
                    </div>
                    <button class="btn-action" style="width:auto; padding:8px 15px; ${btnStyle}" ${btnAction}>
                        ${reason}
                    </button>
                </div>
            </div>`;
        } else {
            html += `
            <div class="biz-card" style="border:1px solid var(--success);">
                <div class="biz-header">
                    <div style="display:flex; align-items:center;">
                        <div class="biz-icon">${biz.icon}</div>
                        <div>
                            <div class="biz-title">${biz.name} <span class="biz-level">Владелец</span></div>
                            <div style="font-size:10px; color:var(--text-secondary);">
                                Управление персоналом и финансами
                            </div>
                        </div>
                    </div>
                </div>
                <button class="btn-action" style="margin-top:10px;" onclick="openBusinessModal('${biz.id}')">
                    ⚙️ УПРАВЛЕНИЕ ОБЪЕКТОМ
                </button>
            </div>`;
        }
    });
    
    if (list.innerHTML !== html) list.innerHTML = html;

    const bizTotalCash = document.getElementById('biz-total-cash');
    const bizTotalValue = document.getElementById('biz-total-value');
    if(bizTotalCash) bizTotalCash.innerText = totalCash.toFixed(2) + " PLN";
    if(bizTotalValue) bizTotalValue.innerText = totalValue.toFixed(0) + " PLN";
}

// === ФУНКЦИИ МОДАЛКИ ===

function openBusinessModal(id) {
    try {
        activeBizModalId = id;
        let biz = BUSINESS_META.find(b => b.id === id);
        
        document.getElementById('bm-title').innerText = biz.name;
        document.getElementById('bm-desc').innerText = biz.desc;
        document.getElementById('business-modal').style.display = 'flex';
        
        let baseHire = SETTINGS.business_costs?.employee_base || 100;
        let hirePrice = (baseHire * (biz.hireCostMult || 1)).toFixed(0);
        document.getElementById('hire-price').innerText = hirePrice + " PLN";

        updateBusinessModal();
    } catch(e) { console.error("Modal Error", e); }
}

function closeBusinessModal() {
    document.getElementById('business-modal').style.display = 'none';
    activeBizModalId = null;
}

function updateBusinessModal() {
    if (!activeBizModalId) return;
    try {
        let id = activeBizModalId;
        let userBiz = G.business[id];
        let biz = BUSINESS_META.find(b => b.id === id);

        document.getElementById('bm-stock').innerText = userBiz.stock.toFixed(0) + " / " + biz.maxStock;
        document.getElementById('bm-cash').innerText = userBiz.cash.toFixed(2) + " PLN";

        let timerUI = document.getElementById('emp-timer-ui');
        let hireBtn = document.getElementById('btn-hire-emp');
        
        if (userBiz.employeeTime > 0) {
            hireBtn.disabled = true;
            hireBtn.style.opacity = "0.5";
            hireBtn.style.background = "#334155";
            
            timerUI.style.display = "block";
            let m = Math.floor(userBiz.employeeTime / 60);
            let s = userBiz.employeeTime % 60;
            timerUI.innerText = `ПРОДАВЕЦ РАБОТАЕТ: ${m}:${s<10?'0':''}${s}`;
        } else {
            hireBtn.disabled = false;
            hireBtn.style.opacity = "1";
            hireBtn.style.background = "var(--purple)";
            timerUI.style.display = "none";
        }

        let limitUI = document.getElementById('bm-withdraw-limit');
        let feeUI = document.getElementById('bm-fee-warn');
        
        if (G.dailyBizWithdrawals < 3) {
            limitUI.innerText = `Лимит: ${3 - G.dailyBizWithdrawals}/3 FREE`;
            limitUI.style.color = "var(--success)";
            feeUI.innerText = "0% (Бесплатно)";
            feeUI.style.color = "var(--success)";
        } else {
            limitUI.innerText = "Лимит исчерпан";
            limitUI.style.color = "var(--danger)";
            feeUI.innerText = `${(SETTINGS.economy.transfer_fee*100).toFixed(0)}% (Комиссия)`;
            feeUI.style.color = "var(--danger)";
        }
    } catch(e) {}
}

function manualSell() {
    if (!activeBizModalId) return;
    let success = performSale(activeBizModalId, 1); 
    if(success) tg.HapticFeedback.impactOccurred('light');
    else tg.HapticFeedback.notificationOccurred('error'); 
}

function hireEmployee() {
    if (!activeBizModalId) return;
    let id = activeBizModalId;
    let biz = BUSINESS_META.find(b => b.id === id);
    
    let baseHire = SETTINGS.business_costs?.employee_base || 100;
    let cost = baseHire * (biz.hireCostMult || 1);

    if (G.money >= cost) {
        G.money = parseFloat((G.money - cost).toFixed(2));
        G.business[id].employeeTime = 600; 
        addHistory('🤝 СОТРУДНИК', cost, 'minus');
        tg.HapticFeedback.notificationOccurred('success');
        save(); updateUI(); updateBusinessModal();
    } else {
        log("Не хватает денег на зарплату!", "var(--danger)");
    }
}

function restockFromModal() {
    if (!activeBizModalId) return;
    restockBusiness(activeBizModalId);
    updateBusinessModal();
}

function withdrawFromModal() {
    if (!activeBizModalId) return;
    collectBusiness(activeBizModalId);
    updateBusinessModal();
}

function performSale(id, amount) {
    if(!G.business[id]) return false;
    let userBiz = G.business[id];
    let biz = BUSINESS_META.find(b => b.id === id);

    if (userBiz.stock >= amount && userBiz.cash < biz.maxCash) {
        let sellPrice = getDynamicPrice(biz.priceKeys.sell);
        let revenue = amount * sellPrice;
        let tax = revenue * biz.taxRate;
        let netProfit = revenue - tax;

        userBiz.stock -= amount;
        userBiz.cash = Math.min(biz.maxCash, userBiz.cash + netProfit);
        
        if(activeBizModalId === id) updateBusinessModal();
        return true;
    } 
    return false;
}

function buyBusiness(id) {
    if (G.housing.id === -1) { log("⛔ Сначала купите квартиру!", "var(--danger)"); return; }
    
    let biz = BUSINESS_META.find(b => b.id === id);
    if (G.lvl < biz.minLvl) { log(`⛔ Нужен уровень ${biz.minLvl}!`, "var(--danger)"); return; }

    let price = getBusinessPrice(biz.basePrice);

    if (G.money >= price) {
        G.money = parseFloat((G.money - price).toFixed(2));
        G.business[id] = { stock: 50, cash: 0, employeeTime: 0 }; 
        addHistory('🏗️ БИЗНЕС', price, 'minus');
        tg.HapticFeedback.notificationOccurred('success');
        save(); updateUI();
    } else {
        log(`Не хватает денег! Нужно ${price} PLN`, "var(--danger)");
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function restockBusiness(id) {
    let biz = BUSINESS_META.find(b => b.id === id);
    let userBiz = G.business[id];
    
    if (userBiz.stock >= biz.maxStock) { log("Склад полон!", "var(--accent-blue)"); return; }

    let unitCost = getDynamicPrice(biz.priceKeys.buy);
    let batchSize = 10;
    let totalCost = unitCost * batchSize;

    if (G.money >= totalCost) {
        G.money = parseFloat((G.money - totalCost).toFixed(2));
        userBiz.stock = Math.min(biz.maxStock, userBiz.stock + batchSize); 
        addHistory('📦 ЗАКУПКА', totalCost, 'minus');
        save(); updateUI();
    } else {
        log(`Нет денег (${totalCost.toFixed(0)} PLN)`, "var(--danger)");
    }
}

function collectBusiness(id) {
    let userBiz = G.business[id];
    if (!userBiz || userBiz.cash <= 0.1) { log("Сейф пуст!", "#aaa"); return; }
    
    let today = new Date().toDateString();
    if (G.lastBizWithdrawalDay !== today) {
        G.dailyBizWithdrawals = 0;
        G.lastBizWithdrawalDay = today;
    }

    let amount = parseFloat(userBiz.cash.toFixed(2));
    let fee = 0;
    
    if (G.dailyBizWithdrawals >= 3) {
        let feeRate = SETTINGS.economy.transfer_fee || 0.15;
        fee = amount * feeRate;
        amount = amount - fee;
    }

    G.money = parseFloat((G.money + amount).toFixed(2));
    userBiz.cash = 0;
    G.dailyBizWithdrawals++; 

    if (fee > 0) {
        addHistory('🏦 КОМИССИЯ', fee, 'minus');
        addHistory('💰 ПРИБЫЛЬ', amount, 'plus');
        log(`Вывод: +${amount.toFixed(2)} PLN (Комиссия: ${fee.toFixed(2)})`, "var(--accent-gold)");
    } else {
        addHistory('💰 ПРИБЫЛЬ', amount, 'plus');
        log(`Вывод: +${amount.toFixed(2)} PLN (Бесплатно ${G.dailyBizWithdrawals}/3)`, "var(--success)");
    }

    tg.HapticFeedback.notificationOccurred('success');
    save(); updateUI();
}

function updateUI() {
    if(!gameLoaded) return; 

    try {
        const moneyEl = document.getElementById('money-val');
        if(!moneyEl) return; 

        const isBlind = G.blindTime > 0; 
        if (isBlind) {
            moneyEl.innerText = "🔒 СКРЫТО"; moneyEl.style.color = "#aaa";
        } else {
            moneyEl.innerText = G.money.toFixed(2) + " PLN";
            moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
        }

        document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
        document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
        document.getElementById('water-val').innerText = Math.floor(G.waterStock);
        document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6) + (G.housing.id !== -1 ? " 🏠" : "");
        
        document.getElementById('district-ui').innerText = "📍 " + DISTRICTS[G.district].name;
        document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️ Дождь" : "☀️ Ясно");
        
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

            let baseClick = SETTINGS.economy.click_base !== undefined ? SETTINGS.economy.click_base : 0.10;
            let rate = (baseClick * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (1 + rankBonus)).toFixed(2);
            
            if(order.visible && !order.active) rate = "0.00 (ПРИМИ ЗАКАЗ!)"; 
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
        
        // Рендер бизнеса
        if (curView === 'business') renderBusiness();

    } catch (e) { console.error(e); }
}

setInterval(() => {
    if (!gameLoaded) return;

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
            } else {
                let pct = DISTRICTS[G.district].rentPct;
                cost = parseFloat((G.money * pct).toFixed(2));
            }
            G.money = parseFloat((G.money - cost).toFixed(2)); 
            addHistory(isOwner ? '🏠 CZYNSZ' : '🏠 АРЕНДА', cost, 'minus'); 
            G.rent = SETTINGS.economy.rent_timer_sec; save(); 
        }
    }

    if (Math.random() < 0.015) weather = Math.random() < 0.35 ? "Дождь" : "Ясно";
    if (G.bikeRentTime > 0) G.bikeRentTime--; 
    if (G.buffTime > 0) G.buffTime--;
    if (G.blindTime > 0) G.blindTime--; 

    // БИЗНЕС ЛОГИКА (АВТО-ПРОДАЖА)
    if (G.business) {
        BUSINESS_META.forEach(biz => {
            let userBiz = G.business[biz.id];
            if (userBiz && userBiz.employeeTime > 0) {
                userBiz.employeeTime--;
                // Продаем 1 раз в секунду
                performSale(biz.id, biz.stockConsume);
            }
        });
        updateBusinessModal();
    }

    if (G.autoTime > 0) { 
        G.autoTime--;
        if (order.active && !isBroken) {
             // ... логика автопилота курьера (без изменений) ...
             if (G.en > 5) { 
                consumeResources(true); 
                order.steps += 3;
                if (order.steps >= order.target) finishOrder(true);
            }
        }
    }
    
    if(order.active) { order.time--; if(order.time <= 0) finishOrder(false); }
    updateUI();
}, 1000);

window.onload = load;
