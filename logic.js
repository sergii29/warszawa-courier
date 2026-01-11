import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { 
    money: 10, lvl: 1.0, en: 2000, maxEn: 2000, waterStock: 0, 
    tax: 300, rent: 600, district: 0, 
    totalOrders: 0, totalClicks: 0, totalBottles: 0,
    autoTime: 0, bikeRentTime: 0, buffTime: 0,
    scooter: false, bag: false, phone: false
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false };
const DISTRICTS = [{ name: "Praga", rent: 50, mult: 1 }, { name: "Mokotów", rent: 120, mult: 1.5 }, { name: "Śródmieście", rent: 300, mult: 2.5 }];

// ЗАГРУЗКА
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { G = { ...G, ...data }; updateUI(); } 
    else { set(userRef, G); }
});

function log(msg, color = "#eee") {
    const logEl = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = "log-entry"; entry.style.color = color;
    entry.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
    logEl.appendChild(entry);
    if (logEl.childNodes.length > 5) logEl.removeChild(logEl.firstChild);
}

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    // Quest Bar logic
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
            document.getElementById('quest-timer-ui').innerText = `0:${order.offerTimer<10?'0':''}${order.offerTimer}`;
            document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        }
    } else { qBar.style.display = 'none'; }
}

// РАБОТА И КЛИКИ
document.addEventListener('click', (e) => {
    if (e.target.closest('#work-sphere')) {
        if (G.en < 1) return;
        // Потребление воды (как в старом коде)
        if (G.waterStock > 0 && G.en < (G.maxEn - 10)) {
            let eff = 1 + (G.lvl * 0.1);
            let drink = Math.min(G.waterStock, 50);
            G.en = Math.min(G.maxEn, G.en + (drink * eff));
            G.waterStock -= drink;
        }

        if (order.active) {
            order.steps += (G.bikeRentTime > 0 ? 2 : 1);
            if (order.steps >= order.target) finishOrder(true);
        } else {
            if (!order.visible && Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder();
            G.money += 0.10 * G.lvl * DISTRICTS[G.district].mult;
            G.lvl += 0.00025;
        }
        G.en = Math.max(0, G.en - (G.scooter ? 7 : 10));
        update(userRef, G);
        tg.HapticFeedback.impactOccurred('light');
    }

    if (e.target.id === 'btn-bottles') {
        G.money += 0.02; G.totalBottles++;
        update(userRef, { money: G.money, totalBottles: G.totalBottles });
    }

    if (e.target.id === 'btn-accept') { order.active = true; updateUI(); }
});

function generateOrder() {
    order.visible = true; order.offerTimer = 15;
    order.isCriminal = Math.random() < 0.12;
    let d = 0.5 + Math.random() * 3.5;
    order.reward = (3.80 + d * 2.2) * G.lvl * DISTRICTS[G.district].mult;
    if (order.isCriminal) order.reward *= 6.5;
    order.target = Math.floor(d * 160);
    order.steps = 0;
    order.time = Math.floor(order.target / 1.5 + 45);
    updateUI();
}

function finishOrder(win) {
    order.active = false; order.visible = false;
    if (win) {
        G.money += order.reward;
        G.lvl += (order.isCriminal ? 0.12 : 0.015);
        log(`📦 Заказ выполнен! +${order.reward.toFixed(2)}`, "var(--success)");
    }
    update(userRef, G);
}

// ТАЙМЕРЫ (СЕКУНДНОЕ ОБНОВЛЕНИЕ)
setInterval(() => {
    G.tax--; G.rent--;
    if (G.tax <= 0) { G.money *= 0.75; G.tax = 300; log("🏛️ Налог 25% списан", "var(--danger)"); }
    if (G.rent <= 0) { G.money -= DISTRICTS[G.district].rent; G.rent = 600; log("🏠 Аренда списана"); }
    
    if (order.visible && !order.active) {
        order.offerTimer--;
        order.reward *= 0.97;
        if (order.offerTimer <= 0) order.visible = false;
    }
    if (order.active) {
        order.time--;
        if (order.time <= 0) finishOrder(false);
    }

    document.getElementById('tax-timer').innerText = `Налог через: ${Math.floor(G.tax/60)}:${G.tax%60<10?'0':''}${G.tax%60}`;
    document.getElementById('rent-timer').innerText = `Аренда через: ${Math.floor(G.rent/60)}:${G.rent%60<10?'0':''}${G.rent%60}`;
    updateUI();
    // Сохраняем важные таймеры раз в 10 сек
    if (G.tax % 10 === 0) update(userRef, { tax: G.tax, rent: G.rent, money: G.money });
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
