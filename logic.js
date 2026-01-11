import { db, ref, onValue, update } from './database.js';

const tg = window.Telegram.WebApp;
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

let G = { money: 0, lvl: 1.0, en: 2000, waterStock: 0, scooter: false, phone: false, bag: false };
let captchaActive = false;

// Загрузка данных из Firebase
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        G = data;
        updateUI();
    } else {
        // Если игрока нет в базе, создаем новый аккаунт 0/1/0
        update(userRef, G);
    }
});

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('water-val').innerText = G.waterStock;
    document.getElementById('en-fill').style.width = (G.en / 20) + "%";
}

// АНТИКЛИКЕР: Появление капчи раз в 7-12 минут
function triggerCaptcha() {
    if (captchaActive) return;
    captchaActive = true;
    const captchaUi = document.getElementById('captcha-ui');
    captchaUi.style.display = 'flex';
    
    // Если не нажать за 10 секунд - штраф
    const timeout = setTimeout(() => {
        if (captchaActive) {
            G.money = Math.max(0, G.money - 5);
            G.lvl -= 0.05;
            hideCaptcha();
            alert("Ты пропустил проверку! Штраф за использование ботов.");
        }
    }, 10000);

    document.getElementById('btn-captcha').onclick = () => {
        clearTimeout(timeout);
        hideCaptcha();
        G.money += 0.50; // Бонус за бдительность
        update(userRef, { money: G.money });
    };
}

function hideCaptcha() {
    captchaActive = false;
    document.getElementById('captcha-ui').style.display = 'none';
}

setInterval(triggerCaptcha, (7 + Math.random() * 5) * 60000);

// Логика работы
document.getElementById('work-sphere').onclick = () => {
    if (captchaActive || G.en <= 0) return;
    G.money += 0.10 * G.lvl;
    G.en -= 10;
    update(userRef, { money: G.money, en: G.en });
};

