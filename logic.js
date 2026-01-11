import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
tg.expand(); // Развернуть на весь экран

const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { 
    money: 0, 
    lvl: 1.0, 
    en: 2000, 
    waterStock: 0,
    totalBottles: 0
};

// 1. СИНХРОНИЗАЦИЯ С БАЗОЙ (Баланс начнет двигаться)
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
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    const enPerc = (G.en / 2000) * 100;
    document.getElementById('en-fill').style.width = enPerc + "%";
}

// 2. ПРИВЯЗКА КНОПОК (Теперь всё будет нажиматься)
document.addEventListener('DOMContentLoaded', () => {
    
    // Клик по синей сфере
    const sphere = document.getElementById('work-sphere');
    if(sphere) {
        sphere.onclick = () => {
            if (G.en < 10) {
                tg.showAlert("Нет энергии! Нужна вода.");
                return;
            }
            G.money += 0.10 * G.lvl;
            G.en -= 10;
            update(userRef, { money: G.money, en: G.en });
            tg.HapticFeedback.impactOccurred('light');
        };
    }

    // Кнопка бутылок
    const btnBottles = document.getElementById('btn-bottles');
    if(btnBottles) {
        btnBottles.onclick = () => {
            G.money += 0.02;
            G.totalBottles++;
            update(userRef, { money: G.money, totalBottles: G.totalBottles });
            tg.HapticFeedback.impactOccurred('medium');
        };
    }

    // Сменить район (пока просто уведомление, раз мы договорились не усложнять)
    const btnDistrict = document.getElementById('btn-districts');
    if(btnDistrict) {
        btnDistrict.onclick = () => {
            tg.showAlert("Смена района будет доступна на LVL 2.0!");
        };
    }

    // Навигация (вкладки внизу)
    document.querySelectorAll('.tab-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            
            item.classList.add('active');
            const viewId = 'view-' + item.dataset.view;
            const viewElem = document.getElementById(viewId);
            if(viewElem) {
                viewElem.classList.add('active');
                if(item.dataset.view === 'shop') renderShop();
                if(item.dataset.view === 'bank') renderBank();
            }
        };
    });
});

// 3. НАПОЛНЕНИЕ ПУСТЫХ ВКЛАДОК
function renderShop() {
    const shop = document.getElementById('view-shop');
    shop.innerHTML = `
        <h3 style="color:var(--success); text-align:center;">🛒 Магазин</h3>
        <div class="card" style="background:#1a1a1c; padding:15px; border-radius:10px; border:1px solid #333;">
            <b>🧴 Вода (1.5 л)</b><br>
            <p style="font-size:12px; color:#888;">Восстанавливает энергию</p>
            <button class="btn-action" id="buy-water-now" style="background:var(--accent); width:100%; padding:10px; border-radius:8px; border:none; color:white; font-weight:bold;">1.50 PLN</button>
        </div>
    `;
    document.getElementById('buy-water-now').onclick = () => {
        if (G.money >= 1.50) {
            G.money -= 1.50;
            G.waterStock += 1500;
            update(userRef, { money: G.money, waterStock: G.waterStock });
        } else { tg.showAlert("Мало денег!"); }
    };
}

function renderBank() {
    const bank = document.getElementById('view-bank');
    bank.innerHTML = `
        <h3 style="color:var(--accent); text-align:center;">🏦 Банк</h3>
        <div class="card" style="background:#1a1a1c; padding:15px; border-radius:10px; border:1px solid #333;">
            <b>Обмен LVL на деньги</b><br>
            <button class="btn-action" id="exchange-now" style="background:#333; width:100%; padding:10px; border-radius:8px; border:none; color:white; font-weight:bold; margin-top:10px;">-0.01 LVL ⮕ 2.00 PLN</button>
        </div>
    `;
    document.getElementById('exchange-now').onclick = () => {
        if (G.lvl >= 1.01) {
            G.lvl -= 0.01;
            G.money += 2.00;
            update(userRef, { lvl: G.lvl, money: G.money });
        } else { tg.showAlert("Нужен рейтинг выше 1.0!"); }
    };
}
