import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { money: 0, lvl: 1.0, en: 2000, waterStock: 0 };
let captchaActive = false;

onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { G = data; updateUI(); } 
    else { set(userRef, G); }
});

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('water-val').innerText = G.waterStock;
    document.getElementById('en-fill').style.width = (G.en / 20) + "%";
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
document.querySelectorAll('.tab-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('view-' + item.dataset.view).classList.add('active');
    };
});

document.getElementById('work-sphere').onclick = () => {
    if (captchaActive || G.en <= 5) return;
    G.money += 0.10 * G.lvl;
    G.en -= 5;
    update(userRef, { money: G.money, en: G.en });
};

document.getElementById('btn-bottles').onclick = () => {
    G.money += 0.02;
    update(userRef, { money: G.money });
};
