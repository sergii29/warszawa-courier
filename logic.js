import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { money: 0, lvl: 1.0, en: 2000, waterStock: 0, totalBottles: 0 };

// 1. ЗАГРУЗКА ДАННЫХ
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        G = { ...G, ...data };
        updateUI();
    } else {
        set(userRef, G);
    }
});

function updateUI() {
    if (document.getElementById('money-val')) {
        document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
        document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
        document.getElementById('water-val').innerText = Math.floor(G.waterStock);
        document.getElementById('en-fill').style.width = (G.en / 20) + "%";
    }
}

// 2. ЛОГИКА КЛИКОВ (СФЕРА И БУТЫЛКИ)
document.addEventListener('click', (e) => {
    // Клик по сфере
    if (e.target.closest('#work-sphere')) {
        if (G.en < 10) return tg.showAlert("Нет энергии!");
        G.money += 0.10 * G.lvl;
        G.en -= 10;
        update(userRef, { money: G.money, en: G.en });
        tg.HapticFeedback.impactOccurred('light');
    }

    // Сбор бутылок
    if (e.target.id === 'btn-bottles') {
        G.money += 0.02;
        G.totalBottles++;
        update(userRef, { money: G.money, totalBottles: G.totalBottles });
        tg.HapticFeedback.impactOccurred('medium');
    }

    // Смена района
    if (e.target.id === 'btn-districts') {
        tg.showAlert("Смена района доступна с LVL 2.0");
    }

    // ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
    if (e.target.classList.contains('tab-item')) {
        const view = e.target.dataset.view;
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById('view-' + view).classList.add('active');

        if (view === 'shop') renderShop();
        if (view === 'bank') renderBank();
        if (view === 'quests') renderQuests();
    }

    // КНОПКИ ВНУТРИ ВКЛАДОК
    if (e.target.id === 'buy-water-btn') {
        if (G.money >= 1.50) {
            G.money -= 1.50; G.waterStock += 1500;
            update(userRef, { money: G.money, waterStock: G.waterStock });
        }
    }
});

// 3. НАПОЛНЕНИЕ ВКЛАДОК (Чтобы не были пустыми)
function renderShop() {
    document.getElementById('shop-content').innerHTML = `
        <div style="background:#1a1a1c; padding:15px; border-radius:10px; margin-top:10px;">
            <b>🧴 Вода (1.5 л)</b><br>
            <button class="btn-action" id="buy-water-btn" style="background:var(--accent); margin-top:10px;">1.50 PLN</button>
        </div>`;
}

function renderBank() {
    document.getElementById('bank-content').innerHTML = `
        <div style="background:#1a1a1c; padding:15px; border-radius:10px; margin-top:10px;">
            <button class="btn-action" id="exch-btn">-0.01 LVL ⮕ 2.00 PLN</button>
        </div>`;
}

function renderQuests() {
    document.getElementById('quests-content').innerHTML = `
        <div style="background:#1a1a1c; padding:15px; border-radius:10px; margin-top:10px;">
            <p>Собрано бутылок: ${G.totalBottles}</p>
        </div>`;
}
