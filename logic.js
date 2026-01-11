import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { 
    money: 0, 
    lvl: 1.0, 
    en: 2000, 
    waterStock: 0,
    totalBottles: 0
};

// 1. ПОДКЛЮЧЕНИЕ К БАЗЕ
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { 
        G = { ...G, ...data }; 
        updateUI(); 
    } else { 
        set(userRef, G); 
    }
});

// 2. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    // Полоска энергии
    const enPerc = (G.en / 2000) * 100;
    document.getElementById('en-fill').style.width = enPerc + "%";
}

// 3. ЛОГИКА ВКЛАДОК (Чтобы работало меню)
document.querySelectorAll('.tab-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('view-' + item.dataset.view).classList.add('active');
        
        // Если открыли магазин или банк - перерисовываем их содержимое
        if(item.dataset.view === 'shop') renderShop();
        if(item.dataset.view === 'bank') renderBank();
    };
});

// 4. МАГАЗИН И БАНК (Функции внутри модуля)
function renderShop() {
    const shop = document.getElementById('view-shop');
    shop.innerHTML = `
        <h3 style="color:var(--success); text-align:center;">🛒 Магазин</h3>
        <div style="background:#1a1a1c; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #333;">
            <b>🧴 Вода (1.5 л)</b><br>
            <button class="btn-action" style="margin-top:10px; background:var(--accent);" id="buy-water-btn">Купить за 1.50 PLN</button>
        </div>
    `;
    document.getElementById('buy-water-btn').onclick = () => {
        if (G.money >= 1.50) {
            G.money -= 1.50;
            G.waterStock += 1500;
            update(userRef, G);
        } else { alert("Мало денег!"); }
    };
}

function renderBank() {
    const bank = document.getElementById('view-bank');
    bank.innerHTML = `
        <h3 style="color:var(--accent); text-align:center;">🏦 Банк</h3>
        <div style="background:#1a1a1c; padding:15px; border-radius:10px; border:1px solid #333;">
            <p>Обмен рейтинга на наличные:</p>
            <button class="btn-action" id="exch-btn">-0.01 LVL ⮕ 2.00 PLN</button>
        </div>
    `;
    document.getElementById('exch-btn').onclick = () => {
        if (G.lvl >= 1.01) {
            G.lvl -= 0.01;
            G.money += 2.00;
            update(userRef, G);
        } else { alert("Минимальный рейтинг 1.0!"); }
    };
}

// 5. РАБОТА (СФЕРА)
document.getElementById('work-sphere').onclick = () => {
    if (G.en < 10) {
        tg.HapticFeedback.notificationOccurred('error');
        alert("Нет энергии! Выпей воды или отдохни.");
        return;
    }
    G.money += 0.10 * G.lvl;
    G.en -= 10;
    update(userRef, { money: G.money, en: G.en });
    tg.HapticFeedback.impactOccurred('light');
};

// 6. БУТЫЛКИ
document.getElementById('btn-bottles').onclick = () => {
    G.money += 0.02;
    G.totalBottles = (G.totalBottles || 0) + 1;
    update(userRef, { money: G.money, totalBottles: G.totalBottles });
    tg.HapticFeedback.impactOccurred('medium');
};

// 7. РЕГЕНЕРАЦИЯ (Вода восстанавливает энергию)
setInterval(() => {
    if (G.waterStock > 0 && G.en < 2000) {
        G.waterStock -= 2;
        G.en = Math.min(2000, G.en + 5);
        update(userRef, { waterStock: G.waterStock, en: G.en });
    }
}, 2000);
