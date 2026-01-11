import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp;
// Используем ID пользователя Telegram для сохранения прогресса
const userId = tg.initDataUnsafe?.user?.id || "admin_test";
const userRef = ref(db, 'users/' + userId);

// Твои новые стартовые настройки (0.00 PLN, LVL 1.0)
let G = { 
    money: 0, 
    lvl: 1.0, 
    en: 2000, 
    waterStock: 0, 
    scooter: false, 
    phone: false, 
    bag: false,
    district: 0
};

let captchaActive = false;

// Подключаемся к твоей базе в Бельгии
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        G = data;
        updateUI();
    } else {
        // Создаем запись в Firebase, если зашли первый раз
        set(userRef, G);
    }
});

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('en-fill').style.width = (G.en / 20) + "%";
}

// Капча-антикликер: появляется внезапно
function triggerCaptcha() {
    if (captchaActive) return;
    captchaActive = true;
    document.getElementById('captcha-ui').style.display = 'flex';
    
    // Если игрок не нажмет за 10 секунд — штраф 5 PLN
    const timeout = setTimeout(() => {
        if (captchaActive) {
            G.money = Math.max(0, G.money - 5);
            update(userRef, { money: G.money });
            hideCaptcha();
        }
    }, 10000);

    document.getElementById('btn-captcha').onclick = () => {
        clearTimeout(timeout);
        hideCaptcha();
        G.money += 0.50; // Бонус за честность
        update(userRef, { money: G.money });
    };
}

function hideCaptcha() {
    captchaActive = false;
    document.getElementById('captcha-ui').style.display = 'none';
}

// Запускаем проверку раз в 10 минут
setInterval(triggerCaptcha, 600000);

// Логика работы по сфере
document.getElementById('work-sphere').onclick = () => {
    if (captchaActive || G.en <= 0) return;
    G.money += 0.10 * G.lvl;
    G.en -= 5;
    // Данные сразу улетают в Firebase
    update(userRef, { money: G.money, en: G.en });
};
