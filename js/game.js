const tg = window.Telegram.WebApp; tg.expand();
const SAVE_KEY = "PRESIDENT_ULTIMATE_V1"; 
const userId = tg.initDataUnsafe?.user?.id || "test_pres_3";
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

// === ДАННЫЕ ===
const COUNTRIES = [
    { id: 'us', name: 'США', flag: '🇺🇸', currency: 'USD', taxRate: 3.0 },
    { id: 'pl', name: 'Польша', flag: '🇵🇱', currency: 'PLN', taxRate: 1.0 },
    { id: 'ua', name: 'Украина', flag: '🇺🇦', currency: 'UAH', taxRate: 0.8 },
    { id: 'ru', name: 'Россия', flag: '🇷🇺', currency: 'RUB', taxRate: 0.7 },
    { id: 'cn', name: 'Китай', flag: '🇨🇳', currency: 'CNY', taxRate: 1.5 },
    { id: 'ae', name: 'ОАЭ', flag: '🇦🇪', currency: 'AED', taxRate: 5.0 }
];

const EVENTS = [
    { text: "Наводнение в провинции!", cost: 5000, hit: 10, goodMsg: "Вы спасли людей (+Rep)", badMsg: "Народ тонет (-Rep)" },
    { text: "Оппозиция вышла на митинг!", cost: 2000, hit: 15, goodMsg: "Митинг разогнан чаем", badMsg: "Вас закидали яйцами" },
    { text: "Эпидемия гриппа!", cost: 10000, hit: 20, goodMsg: "Вакцина создана!", badMsg: "Больницы переполнены" },
    { text: "Олигарх предлагает взятку", cost: -50000, hit: 5, goodMsg: "Вы честно отказались", badMsg: "Деньги взяты, рейтинг упал" } // Отрицательная цена = доход
];

const NEWS = [
    "Президент пообещал, что завтра будет лучше, чем вчера.",
    "Введен налог на бороды. Хипстеры негодуют.",
    "Оппозиция заявляет, что бюджет пуст. Это фейк!",
    "Уровень счастья достиг 146%.",
    "Коты признаны стратегическим ресурсом."
];

let state = {
    countryId: null,
    budget: 0,
    personal: 0, // Личный счет
    population: 5000,
    approval: 60,
    advisors: { general: false, banker: false, spy: false },
    upgrades: { housing: 0, police: 0, industry: 0 },
    laws: []
};

// === ИНИЦИАЛИЗАЦИЯ ===
dbRef.once('value').then(snap => {
    if (snap.exists()) {
        state = { ...state, ...snap.val() };
    }
    if (!state.countryId) showCountrySelection();
    else startGame();
    
    // Таймеры
    setInterval(randomEventLoop, 15000); // Раз в 15 сек событие
    setInterval(newsLoop, 5000); // Новости
});

function saveState() { dbRef.set(state); }

// === ВЫБОР СТРАНЫ ===
function showCountrySelection() {
    const list = document.getElementById('countryList');
    list.innerHTML = '';
    COUNTRIES.forEach(c => {
        list.innerHTML += `
        <div class="country-card" onclick="selectCountry('${c.id}')">
            <div style="font-size:40px">${c.flag}</div>
            <h3>${c.name}</h3>
            <small>Валюта: ${c.currency}</small>
        </div>`;
    });
}

window.selectCountry = function(id) {
    state.countryId = id;
    state.budget = 2000;
    saveState();
    document.getElementById('countrySelectScreen').style.display = 'none';
    startGame();
};

function startGame() {
    document.getElementById('gameInterface').style.display = 'block';
    updateUI();
}

// === ЭКОНОМИКА ===
let isCollecting = false;

window.startFiscalYear = function() {
    if (isCollecting) return;
    if (state.approval <= 0) return tg.showAlert("ИМПИЧМЕНТ! Вы свергнуты.");

    isCollecting = true;
    const btn = document.getElementById('taxBtn');
    const bar = document.getElementById('taxProgress');
    
    // Банкир ускоряет сбор налогов в 2 раза
    let speed = 3000;
    if (state.advisors.banker) speed = 1500;

    btn.classList.add('active');
    bar.style.transition = `width ${speed}ms linear`;
    setTimeout(() => { bar.style.width = '100%'; }, 50);

    setTimeout(() => {
        finishTax(speed);
    }, speed);
};

function finishTax(speed) {
    const country = COUNTRIES.find(c => c.id === state.countryId);
    
    // Формула дохода
    let income = state.population * country.taxRate;
    income += (state.upgrades.industry || 0) * 500;
    
    state.budget += Math.floor(income);
    
    // Шанс падения рейтинга (Генерал защищает)
    if (!state.advisors.general && Math.random() > 0.7) {
        state.approval -= 2;
        showTicker("Народ недоволен налогами!");
    }

    // Сброс UI
    const bar = document.getElementById('taxProgress');
    const btn = document.getElementById('taxBtn');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    btn.classList.remove('active');
    isCollecting = false;
    
    saveState();
    updateUI();
    tg.HapticFeedback.notificationOccurred('success');
}

// === ВОРОВСТВО ===
window.stealMoney = function() {
    if (state.budget < 1000) return tg.showAlert("В казне пусто, нечего красть!");
    
    const amount = Math.floor(state.budget * 0.1); // Крадем 10%
    state.budget -= amount;
    state.personal += amount;
    
    // Шанс спалиться (Шпион уменьшает шанс)
    let risk = 0.5;
    if (state.advisors.spy) risk = 0.1;
    
    if (Math.random() < risk) {
        state.approval -= 10;
        tg.showAlert("СМИ узнали о коррупции! Рейтинг рухнул!");
    } else {
        tg.showAlert(`Вывели ${amount} в офшор. Никто не заметил.`);
    }
    
    if (state.personal >= 1000000000) {
        alert("ВЫ НАКОПИЛИ $1 МЛРД! ПОБЕДА! Вы улетаете на Мальдивы.");
    }

    saveState();
    updateUI();
};

// === СОВЕТНИКИ ===
window.hireAdvisor = function(type) {
    if (state.advisors[type]) return tg.showAlert("Уже нанят!");
    
    const cost = 5000;
    if (state.budget >= cost) {
        state.budget -= cost;
        state.advisors[type] = true;
        saveState();
        updateUI();
        tg.showAlert("Министр назначен!");
    } else {
        tg.showAlert(`Нужно ${cost} на зарплату министру.`);
    }
};

// === СОБЫТИЯ ===
let activeEvent = null;

function randomEventLoop() {
    if (activeEvent || document.getElementById('gameInterface').style.display === 'none') return;
    if (Math.random() > 0.4) return; // Не всегда срабатывает

    activeEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    
    document.getElementById('eventTitle').textContent = "⚠️ СРОЧНОЕ СООБЩЕНИЕ";
    document.getElementById('eventDesc').textContent = activeEvent.text;
    
    // Кнопка решения
    const btnText = activeEvent.cost < 0 ? `Взять (+${Math.abs(activeEvent.cost)})` : `Решить (-${activeEvent.cost})`;
    document.querySelector('.ev-btn.good').textContent = btnText;
    
    document.getElementById('eventCard').style.display = 'block';
    tg.HapticFeedback.notificationOccurred('warning');
}

window.resolveEvent = function(pay) {
    if (pay) {
        if (activeEvent.cost < 0) {
            // Это взятка (получаем деньги)
            state.budget += Math.abs(activeEvent.cost);
            state.approval -= activeEvent.hit;
            showTicker(activeEvent.badMsg);
        } else {
            // Это проблема (платим деньги)
            if (state.budget >= activeEvent.cost) {
                state.budget -= activeEvent.cost;
                state.approval += 5;
                showTicker(activeEvent.goodMsg);
            } else {
                return tg.showAlert("Нет денег в бюджете!");
            }
        }
    } else {
        // Игнор
        state.approval -= activeEvent.hit;
        showTicker(activeEvent.badMsg);
    }
    
    document.getElementById('eventCard').style.display = 'none';
    activeEvent = null;
    saveState();
    updateUI();
};

// === НОВОСТИ ===
function newsLoop() {
    const text = NEWS[Math.floor(Math.random() * NEWS.length)];
    showTicker(text);
}

function showTicker(text) {
    const el = document.getElementById('newsTicker');
    el.textContent = "📢 " + text;
}

// === UI ===
function updateUI() {
    if (!state.countryId) return;
    const country = COUNTRIES.find(c => c.id === state.countryId);

    document.getElementById('flag').textContent = country.flag;
    document.getElementById('budget').textContent = formatNumber(state.budget);
    document.getElementById('currency').textContent = country.currency;
    document.getElementById('population').textContent = formatNumber(state.population);
    document.getElementById('personalCash').textContent = formatNumber(state.personal);
    
    const appEl = document.getElementById('approval');
    appEl.textContent = state.approval;
    appEl.style.color = state.approval < 30 ? 'red' : '#2ecc71';

    // Советники
    document.getElementById('adv_general').textContent = state.advisors.general ? "Генерал (Активен)" : "Нанять Генерала (5k)";
    document.getElementById('adv_general').style.color = state.advisors.general ? "#2ecc71" : "#888";

    document.getElementById('adv_banker').textContent = state.advisors.banker ? "Банкир (Активен)" : "Нанять Банкира (5k)";
    document.getElementById('adv_banker').style.color = state.advisors.banker ? "#2ecc71" : "#888";

    document.getElementById('adv_spy').textContent = state.advisors.spy ? "Шпион (Активен)" : "Нанять Шпиона (5k)";
    document.getElementById('adv_spy').style.color = state.advisors.spy ? "#2ecc71" : "#888";
}

// === ИНФРАСТРУКТУРА (МЕНЮ) ===
window.openMenu = function(type) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    if (type === 'infra') {
        renderInfra();
        document.getElementById('infraModal').style.display = 'flex';
    }
    if (type === 'laws') { /* Реализуй сам по аналогии */ tg.showAlert('Дума закрыта'); }
    if (type === 'shop') { document.getElementById('shopModal').style.display = 'flex'; }
};

function renderInfra() {
    const list = document.getElementById('infraList');
    list.innerHTML = '';
    
    const ITEMS = [
        { id: 'housing', name: 'Соц. жилье', cost: 1000 },
        { id: 'police', name: 'Полицейский участок', cost: 2000 },
        { id: 'industry', name: 'Завод', cost: 5000 }
    ];

    ITEMS.forEach(i => {
        const lvl = state.upgrades[i.id] || 0;
        const cost = Math.floor(i.cost * Math.pow(1.5, lvl));
        list.innerHTML += `
        <div class="upgrade-item" onclick="buyInfra('${i.id}', ${cost})">
            <div><b>${i.name} (Lvl ${lvl})</b><br><small>Цена: ${formatNumber(cost)}</small></div>
            <div class="buy-btn">КУПИТЬ</div>
        </div>`;
    });
}

window.buyInfra = function(id, cost) {
    if (state.budget >= cost) {
        state.budget -= cost;
        state.upgrades[id] = (state.upgrades[id] || 0) + 1;
        state.population += 100; // Бонус людей
        saveState(); updateUI(); renderInfra();
    } else { tg.showAlert('Мало денег!'); }
};

window.closeModal = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

// Донат
window.buyBudget = function(amount) {
    tg.showConfirm('Взять транш за Stars?', ok => { if(ok) { state.budget += 50000; saveState(); updateUI(); closeModal(); }});
};

function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num);
}
