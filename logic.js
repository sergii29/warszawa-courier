import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp; tg.expand();
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { 
    money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 600, 
    waterStock: 0, totalOrders: 0, totalClicks: 0, totalBottles: 0, 
    autoTime: 0, scooter: false, bag: false, phone: false, district: 0, 
    bikeRentTime: 0, buffTime: 0, history: [], usedPromos: [], 
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 },
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }
    ] 
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, baseReward: 0 };
const DISTRICTS = [
    { name: "Praga", rent: 50, mult: 1, price: 0 }, 
    { name: "Mokotów", rent: 120, mult: 1.5, price: 150 }
];

// СИНХРОНИЗАЦИЯ С БАЗОЙ
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { 
        G = { ...G, ...data }; 
        updateUI(); 
    } else { 
        set(userRef, G); 
    }
});

function log(msg, color = "#eee") {
    const logEl = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = "log-entry"; entry.style.color = color;
    entry.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
    logEl.prepend(entry);
    if (logEl.childNodes.length > 5) logEl.removeChild(logEl.lastChild);
}

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/2000";
    document.getElementById('en-fill').style.width = (G.en/2000*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    // Рендер инвентаря
    const inv = document.getElementById('inventory-display');
    inv.innerHTML = '';
    if(G.bag) inv.innerHTML += '<span class="inv-item">🎒 +15%</span>';
    if(G.phone) inv.innerHTML += '<span class="inv-item">📱 x1.4</span>';
    
    // Quest Bar
    const qBar = document.getElementById('quest-bar');
    if (order.visible) {
        qBar.style.display = 'block';
        if (order.active) {
            document.getElementById('quest-actions-choice').style.display = 'none';
            document.getElementById('quest-active-ui').style.display = 'block';
            document.getElementById('quest-timer-ui').innerText = `${Math.floor(order.time/60)}:${order.time%60<10?'0':''}${order.time%60}`;
            document.getElementById('quest-progress-bar').style.width = (order.steps/order.target*100) + "%";
        } else {
            document.getElementById('quest-actions-choice').style.display = 'flex';
            document.getElementById('quest-active-ui').style.display = 'none';
            document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        }
    } else { qBar.style.display = 'none'; }

    // Таймеры в шапке
    document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
    document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
    
    renderShop();
    renderBank();
}

// КЛИКИ И РАБОТА
document.addEventListener('touchstart', (e) => {
    if (e.target.closest('#work-sphere')) {
        e.preventDefault();
        doWork();
    }
});

function doWork() {
    // Питье воды при клике
    if (G.waterStock > 0 && G.en < 1990) {
        let eff = 1 + (G.lvl * 0.1);
        let drink = Math.min(G.waterStock, 50);
        G.en = Math.min(2000, G.en + (drink * eff));
        G.waterStock -= drink;
    }

    if (G.en < 1) return;

    if (order.active) {
        order.steps += (G.bikeRentTime > 0 ? 2 : 1);
        if (order.steps >= order.target) finishOrder(true);
    } else {
        if (!order.visible && Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder();
        G.money += 0.10 * G.lvl * DISTRICTS[G.district].mult;
        G.lvl += 0.00025;
    }
    G.en -= (G.scooter ? 7 : 10);
    update(userRef, G);
}

// ТАЙМЕРЫ И ЛОГИКА ОРДЕРА
setInterval(() => {
    G.tax--; G.rent--;
    if (G.tax <= 0) { G.money *= 0.75; G.tax = 300; log("🏛️ Налог 25%", "var(--danger)"); }
    if (G.rent <= 0) { G.money -= DISTRICTS[G.district].rent; G.rent = 600; log("🏠 Аренда"); }
    
    if (order.visible && !order.active) {
        order.offerTimer--; 
        order.reward *= 0.97;
        if (order.offerTimer <= 0) order.visible = false;
    }
    if (order.active) {
        order.time--;
        if (order.time <= 0) finishOrder(false);
    }

    document.getElementById('tax-timer').innerText = `Налог: ${Math.floor(G.tax/60)}:${G.tax%60<10?'0':''}${G.tax%60}`;
    document.getElementById('rent-timer').innerText = `Аренда: ${Math.floor(G.rent/60)}:${G.rent%60<10?'0':''}${G.rent%60}`;
    updateUI();
}, 1000);

// ФУНКЦИИ МАГАЗИНА И БАНКА
function renderShop() {
    const shop = document.getElementById('shop-list');
    shop.innerHTML = `
        <div class="card"><b>🧴 Вода (1.5л)</b><br><button class="btn-action buy-btn" data-type="water" data-price="1.5">1.50 PLN</button></div>
        <div class="card"><b>☕ Кофе (+300⚡)</b><br><button class="btn-action buy-btn" data-type="coffee" data-price="5">5.00 PLN</button></div>
    `;
}

function renderBank() {
    const bank = document.getElementById('bank-actions-ui');
    bank.innerHTML = G.debt <= 0 ? 
        `<button class="btn-action" id="take-loan">ВЗЯТЬ КРЕДИТ (50 PLN)</button>` : 
        `<button class="btn-action" style="background:var(--success)" id="pay-loan">ВЕРНУТЬ ДОЛГ (${G.debt})</button>`;
}

// СЛУШАТЕЛИ СОБЫТИЙ
document.addEventListener('click', (e) => {
    if(e.target.dataset.view) {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('view-' + e.target.dataset.view).classList.add('active');
    }
    if(e.target.id === 'collect-bottles') { G.money += 0.02; G.totalBottles++; update(userRef, G); }
    if(e.target.id === 'btn-accept') { order.active = true; updateUI(); }
    if(e.target.id === 'take-loan') { G.money += 50; G.debt = 50; update(userRef, G); }
    if(e.target.id === 'pay-loan' && G.money >= G.debt) { G.money -= G.debt; G.debt = 0; update(userRef, G); }
    if(e.target.classList.contains('buy-btn')) {
        const p = parseFloat(e.target.dataset.price);
        if(G.money >= p) {
            G.money -= p;
            if(e.target.dataset.type === 'water') G.waterStock += 1500;
            if(e.target.dataset.type === 'coffee') G.en = Math.min(2000, G.en + 300);
            update(userRef, G);
        }
    }
});
