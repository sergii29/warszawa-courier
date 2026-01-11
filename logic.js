import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

// Возвращаем классические данные
let G = { 
    money: 0, 
    lvl: 1.0, 
    en: 2000, 
    waterStock: 0,
    totalBottles: 0
};

// Загрузка из Firebase
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { 
        G = { ...G, ...data }; 
        updateUI(); 
        renderShop(); 
        renderBank();
    } else { 
        set(userRef, G); 
    }
});

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('en-fill').style.width = (G.en / 20) + "%";
}

// Наполняем Магазин
function renderShop() {
    const shop = document.getElementById('view-shop');
    shop.innerHTML = `
        <h3 style="color:var(--success); text-align:center;">🛒 Магазин</h3>
        <div style="background:#1a1a1c; padding:15px; border-radius:10px; margin-bottom:10px;">
            <b>🧴 Вода (1.5 л)</b><br>
            <small>Восстанавливает жажду</small>
            <button class="btn-action" style="margin-top:10px;" onclick="buyItem('water', 1.50)">1.50 PLN</button>
        </div>
    `;
}

// Наполняем Банк
function renderBank() {
    const bank = document.getElementById('view-bank');
    bank.innerHTML = `
        <h3 style="color:var(--accent); text-align:center;">🏦 Банк</h3>
        <div style="background:#1a1a1c; padding:15px; border-radius:10px;">
            <p>Обменяй свой опыт на наличные:</p>
            <button class="btn-action" onclick="exchange(0.01, 2)">-0.01 LVL ⮕ 2 PLN</button>
        </div>
    `;
}

// Функции для кнопок (window делает их доступными из HTML)
window.buyItem = (type, price) => {
    if (G.money >= price) {
        G.money -= price;
        if (type === 'water') G.waterStock += 1500;
        update(userRef, G);
    }
};

window.exchange = (lvl, cash) => {
    if (G.lvl >= lvl + 1) { // Оставляем минимум 1.0 LVL
        G.lvl -= lvl;
        G.money += cash;
        update(userRef, G);
    } else {
        alert("Рейтинг не может быть ниже 1.0!");
    }
};

// Переключение вкладок
document.querySelectorAll('.tab-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('view-' + item.dataset.view).classList.add('active');
    };
});

// Клик по сфере
document.getElementById('work-sphere').onclick = () => {
    if (G.en <= 5) return;
    G.money += 0.10 * G.lvl;
    G.en -= 5;
    update(userRef, { money: G.money, en: G.en });
};

// Сбор бутылок
document.getElementById('btn-bottles').onclick = () => {
    G.money += 0.02;
    G.totalBottles = (G.totalBottles || 0) + 1;
    update(userRef, { money: G.money, totalBottles: G.totalBottles });
};
