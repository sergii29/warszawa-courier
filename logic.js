import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { 
    money: 10, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 600, waterStock: 0, 
    totalOrders: 0, totalClicks: 0, totalBottles: 0, autoTime: 0, 
    scooter: false, bag: false, phone: false, district: 0, bikeRentTime: 0, buffTime: 0,
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 },
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }
    ]
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, baseReward: 0 };
let weather = "Ясно";
const DISTRICTS = [{ name: "Praga", rent: 50, mult: 1, price: 0 }, { name: "Mokotow", rent: 120, mult: 1.5, price: 150 }];

// СИНХРОНИЗАЦИЯ (Чтобы уровни не сбрасывались)
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { G = { ...G, ...data }; updateUI(); } 
    else { set(userRef, G); }
});

function log(msg, color = "#eee") {
    const logEl = document.getElementById('game-log');
    if (!logEl) return;
    const entry = document.createElement('div');
    entry.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
    entry.style.color = color;
    logEl.appendChild(entry);
    if (logEl.childNodes.length > 5) logEl.removeChild(logEl.firstChild);
}

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/2000";
    document.getElementById('en-fill').style.width = (G.en / 20) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('district-ui').innerText = "Район: " + DISTRICTS[G.district].name;
    
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
    
    renderMilestones();
}

// РАБОТА
document.getElementById('work-sphere').onclick = () => {
    // Питье воды при клике
    if (G.waterStock > 0 && G.en < 1990) {
        let eff = 1 + (G.lvl * 0.1);
        let drink = Math.min(G.waterStock, 50);
        G.en = Math.min(2000, G.en + (drink * eff));
        G.waterStock -= drink;
    }

    if (G.en < 10) return;

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
};

function generateOrder() {
    order.visible = true; order.offerTimer = 15;
    let d = 0.5 + Math.random() * 3.5;
    order.reward = (3.80 + d * 2.2) * G.lvl * DISTRICTS[G.district].mult;
    order.target = Math.floor(d * 160);
    order.steps = 0;
    order.time = Math.floor(order.target / 1.5 + 45);
    updateUI();
}

function finishOrder(win) {
    order.active = false; order.visible = false;
    if (win) {
        G.money += order.reward; G.lvl += 0.015; G.totalOrders++;
        log(`📦 Заказ выполнен! +${order.reward.toFixed(2)}`, "var(--success)");
    }
    update(userRef, G);
}

// Кнопки интерфейса
document.getElementById('btn-accept-order').onclick = () => { order.active = true; updateUI(); };
document.getElementById('btn-collect-bottles').onclick = () => { G.money += 0.02; G.totalBottles++; update(userRef, G); };
document.getElementById('btn-exch-small').onclick = () => { if(G.lvl >= 1.05) { G.lvl -= 0.05; G.money += 10; update(userRef, G); } };

// Таймеры
setInterval(() => {
    G.tax--; G.rent--;
    if (G.tax <= 0) { G.money *= 0.75; G.tax = 300; log("🏛️ Налог 25%"); }
    if (G.rent <= 0) { G.money -= DISTRICTS[G.district].rent; G.rent = 600; log("🏠 Аренда"); }
    
    if (order.visible && !order.active) {
        order.offerTimer--; order.reward *= 0.97;
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

// Навигация
document.querySelectorAll('.tab-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('view-' + item.dataset.view).classList.add('active');
    };
});

function renderMilestones() {
    const list = document.getElementById('milestones-list');
    if (!list) return;
    list.innerHTML = G.activeMilestones.map(m => {
        let cur = m.type === 'orders' ? G.totalOrders : G.totalBottles;
        return `<div class="card" style="margin-top:5px;"><b>${m.name}</b><br><small>${cur}/${m.goal}</small></div>`;
    }).join('');
}
