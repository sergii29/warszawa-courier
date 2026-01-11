import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp; tg.expand();
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { 
    money: 10, lvl: 1.0, en: 2000, waterStock: 0,
    autoTime: 0, bikeTime: 0, buffTime: 0,
    totalOrders: 0, totalBottles: 0, district: 0
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false };

// ЗАГРУЗКА
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { 
        G = { ...G, ...data }; 
        updateUI(); 
    } else { set(userRef, G); }
});

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-fill').style.width = (G.en / 20) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    // Сфера (красная при криминале)
    const sphere = document.getElementById('work-sphere');
    if (order.visible && order.isCriminal) sphere.classList.add('danger-mode');
    else sphere.classList.remove('danger-mode');

    // Таймеры вверху
    updateBadge('auto-status-ui', G.autoTime, "АВТО");
    updateBadge('bike-status-ui', G.bikeTime, "🚲");
    updateBadge('buff-status-ui', G.buffTime, "⚡");

    // Окно заказа
    const qBar = document.getElementById('quest-bar');
    if (order.visible) {
        qBar.style.display = 'block';
        document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        document.getElementById('quest-timer-ui').innerText = order.active ? formatTime(order.time) : `0:${order.offerTimer}`;
        if (order.active) {
            document.getElementById('quest-actions-choice').style.display = 'none';
            document.getElementById('quest-active-ui').style.display = 'block';
            document.getElementById('quest-progress-bar').style.width = (order.steps / order.target * 100) + "%";
        } else {
            document.getElementById('quest-actions-choice').style.display = 'flex';
            document.getElementById('quest-active-ui').style.display = 'none';
        }
    } else { qBar.style.display = 'none'; }
}

function updateBadge(id, time, text) {
    const el = document.getElementById(id);
    if (time > 0) { el.style.display = 'block'; el.innerText = `${text} ${formatTime(time)}`; }
    else el.style.display = 'none';
}

function formatTime(s) { return `${Math.floor(s/60)}:${s%60<10?'0':''}${s%60}`; }

// РАБОТА (СФЕРА)
document.getElementById('work-sphere').onclick = () => {
    if (G.en < 10 && G.buffTime <= 0) return;

    // Питье воды (плавно восстанавливает при клике)
    if (G.waterStock > 0 && G.en < 1980) { G.en += 30; G.waterStock -= 20; }

    if (order.active) {
        order.steps += (G.bikeTime > 0 ? 4 : 1);
        if (order.steps >= order.target) finishOrder(true);
    } else {
        if (!order.visible && Math.random() < 0.2) generateOrder();
        G.money += 0.10 * G.lvl;
    }

    if (G.buffTime <= 0) G.en -= 10;
    updateUI();
    saveData();
};

function generateOrder() {
    order.visible = true; order.offerTimer = 15;
    order.isCriminal = Math.random() < 0.25;
    order.reward = (8 + Math.random() * 20) * G.lvl;
    if (order.isCriminal) order.reward *= 4;
    order.target = 60 + Math.floor(Math.random() * 120);
    order.time = 45;
}

function finishOrder(win) {
    if (win) {
        G.money += order.reward; G.lvl += 0.01; G.totalOrders++;
        if (order.isCriminal && Math.random() < 0.35) {
            const fine = 50 + Math.floor(Math.random() * 500);
            G.money -= fine; alert(`🚔 ШТРАФ: ${fine} PLN!`);
        }
    } else { G.lvl -= 0.15; }
    order.visible = false; order.active = false;
    updateUI(); saveData();
}

// МАГАЗИН (СУММИРОВАНИЕ)
window.buyItem = (type) => {
    if (type === 'energy' && G.money >= 35) { G.money -= 35; G.buffTime += 600; }
    if (type === 'bike' && G.money >= 120) { G.money -= 120; G.bikeTime += 600; }
    if (type === 'auto' && G.money >= 55) { G.money -= 55; G.lvl += 0.11; G.autoTime += 600; }
    updateUI(); saveData();
};

// ЕЖЕСЕКУНДНЫЙ ТАЙМЕР
setInterval(() => {
    if (G.autoTime > 0) { G.autoTime--; G.money += 0.08; }
    if (G.bikeTime > 0) G.bikeTime--;
    if (G.buffTime > 0) { G.buffTime--; G.waterStock = Math.max(0, G.waterStock - 2); }

    if (order.visible && !order.active) {
        order.offerTimer--; order.reward *= 0.96;
        if (order.offerTimer <= 0) finishOrder(false);
    }
    if (order.active) { order.time--; if (order.time <= 0) finishOrder(false); }
    updateUI();
}, 1000);

function saveData() { update(userRef, G); }

// ВКЛАДКИ
document.querySelectorAll('.tab-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('view-' + item.dataset.view).classList.add('active');
        if (item.dataset.view === 'shop') renderShop();
        if (item.dataset.view === 'quests') renderQuests();
    };
});

function renderShop() {
    document.getElementById('view-shop').innerHTML = `
        <div class="card"><b>🔋 Энергетик (10 мин)</b><p>Заморозка энергии. Суммируется.</p><button class="btn-action" onclick="buyItem('energy')">35 PLN</button></div>
        <div class="card"><b>🚲 Электровелосипед (10 мин)</b><p>Скорость x4. Суммируется.</p><button class="btn-action" onclick="buyItem('bike')">120 PLN</button></div>
        <div class="card"><b>🤖 Автопилот (10 мин)</b><p>Пассивный доход +0.11 LVL.</p><button class="btn-action" onclick="buyItem('auto')">55 PLN</button></div>
    `;
}

function renderQuests() {
    document.getElementById('view-quests').innerHTML = `
        <h3>🏆 Карьера</h3>
        <p>Выполнено заказов: ${G.totalOrders}</p>
        <p>Собрано бутылок: ${G.totalBottles}</p>
    `;
}

document.getElementById('btn-accept').onclick = () => { order.active = true; updateUI(); };
document.getElementById('collect-bottles').onclick = () => { G.money += 0.02; G.totalBottles++; updateUI(); saveData(); };
