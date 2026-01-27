const tg = window.Telegram.WebApp; 
tg.expand();

const SAVE_KEY = "PRESIDENT_ULTIMATE_FIXED"; 
const userId = tg.initDataUnsafe?.user?.id || "test_pres_fix";
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

// === ДАННЫЕ СТРАН ===
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
    { text: "Олигарх предлагает взятку", cost: -50000, hit: 5, goodMsg: "Вы честно отказались", badMsg: "Деньги взяты, рейтинг упал" }
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
    personal: 0,
    population: 5000,
    approval: 60,
    advisors: { general: false, banker: false, spy: false },
    upgrades: { housing: 0, police: 0, industry: 0 },
    laws: []
};

// === ГЛАВНЫЙ ЗАПУСК ===

// 1. Сразу рисуем выбор стран (чтобы экран не был пустым)
showCountrySelection();

// 2. Пытаемся загрузить сохранение
dbRef.once('value').then(snap => {
    if (snap.exists()) {
        const data = snap.val();
        state = { ...state, ...data };
        
        // Если страна уже выбрана — сразу пускаем в игру
        if (state.countryId) {
            document.getElementById('countrySelectScreen').style.display = 'none';
            startGame();
        }
    }
    
    // Запускаем таймеры событий
    setInterval(randomEventLoop, 15000);
    setInterval(newsLoop, 5000);
});

function saveState() { 
    dbRef.set(state); 
}

// === ЛОГИКА МЕНЮ ===

function showCountrySelection() {
    const list = document.getElementById('countryList');
    if (!list) return;
    list.innerHTML = '';
    
    COUNTRIES.forEach(c => {
        const div = document.createElement('div');
        div.className = 'country-card';
        div.onclick = () => selectCountry(c.id);
        div.innerHTML = `
            <div style="font-size:40px">${c.flag}</div>
            <h3>${c.name}</h3>
            <small>Валюта: ${c.currency}</small>
        `;
        list.appendChild(div);
    });
}

window.selectCountry = function(id) {
    state.countryId = id;
    state.budget = 2000; // Стартовый капитал
    saveState();
    
    // Скрываем меню, показываем игру
    document.getElementById('countrySelectScreen').style.display = 'none';
    startGame();
};

function startGame() {
    const gameUI = document.getElementById('gameInterface');
    if (gameUI) gameUI.style.display = 'block';
    updateUI();
}

// === ИГРОВЫЕ ФУНКЦИИ ===

let isCollecting = false;
window.startFiscalYear = function() {
    if (isCollecting) return;
    if (state.approval <= 0) return tg.showAlert("ИМПИЧМЕНТ! Вы свергнуты.");

    isCollecting = true;
    const btn = document.getElementById('taxBtn');
    const bar = document.getElementById('taxProgress');
    
    // Если есть банкир - сбор быстрее
    let speed = 3000;
    if (state.advisors.banker) speed = 1500;

    btn.classList.add('active');
    bar.style.transition = `width ${speed}ms linear`;
    
    // Небольшая задержка перед стартом анимации
    setTimeout(() => { bar.style.width = '100%'; }, 50);

    setTimeout(() => {
        finishTax();
        // Сброс полоски
        bar.style.transition = 'none';
        bar.style.width = '0%';
        btn.classList.remove('active');
        isCollecting = false;
    }, speed);
};

function finishTax() {
    const country = COUNTRIES.find(c => c.id === state.countryId);
    
    let income = state.population * country.taxRate;
    income += (state.upgrades.industry || 0) * 500;
    
    state.budget += Math.floor(income);
    
    if (!state.advisors.general && Math.random() > 0.7) {
        state.approval -= 2;
        showTicker("Народ недоволен налогами!");
    }
    
    saveState();
    updateUI();
    tg.HapticFeedback.notificationOccurred('success');
}

window.stealMoney = function() {
    if (state.budget < 1000) return tg.showAlert("Казна пуста!");
    
    const amount = Math.floor(state.budget * 0.1);
    state.budget -= amount;
    state.personal += amount;
    
    let risk = 0.5;
    if (state.advisors.spy) risk = 0.1;
    
    if (Math.random() < risk) {
        state.approval -= 10;
        tg.showAlert("КОРРУПЦИОННЫЙ СКАНДАЛ!");
    } else {
        tg.showAlert(`Украдено ${formatNumber(amount)}. Никто не узнал.`);
    }
    saveState();
    updateUI();
};

window.hireAdvisor = function(type) {
    if (state.advisors[type]) return tg.showAlert("Уже работает!");
    if (state.budget >= 5000) {
        state.budget -= 5000;
        state.advisors[type] = true;
        saveState();
        updateUI();
    } else {
        tg.showAlert("Нужно 5000!");
    }
};

// События
function randomEventLoop() {
    if (document.getElementById('gameInterface').style.display === 'none') return;
    if (Math.random() > 0.4) return;

    window.activeEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    
    document.getElementById('eventTitle').textContent = "⚠️ СРОЧНО";
    document.getElementById('eventDesc').textContent = window.activeEvent.text;
    
    const btnText = window.activeEvent.cost < 0 ? `Взять (+${Math.abs(window.activeEvent.cost)})` : `Решить (-${window.activeEvent.cost})`;
    document.querySelector('.ev-btn.good').textContent = btnText;
    
    document.getElementById('eventCard').style.display = 'block';
    tg.HapticFeedback.notificationOccurred('warning');
}

window.resolveEvent = function(pay) {
    const evt = window.activeEvent;
    if (pay) {
        if (evt.cost < 0) { // Взятка
            state.budget += Math.abs(evt.cost);
            state.approval -= evt.hit;
            showTicker(evt.badMsg);
        } else {
            if (state.budget >= evt.cost) {
                state.budget -= evt.cost;
                state.approval += 5;
                showTicker(evt.goodMsg);
            } else {
                return tg.showAlert("Нет денег!");
            }
        }
    } else {
        state.approval -= evt.hit;
        showTicker(evt.badMsg);
    }
    document.getElementById('eventCard').style.display = 'none';
    window.activeEvent = null;
    saveState();
    updateUI();
};

function newsLoop() {
    const text = NEWS[Math.floor(Math.random() * NEWS.length)];
    showTicker(text);
}
function showTicker(text) {
    document.getElementById('newsTicker').textContent = "📢 " + text;
}

// UI Updater
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

    // Обновляем текст советников
    updateAdvisorText('general', 'Генерал', 'Нанять (5k)');
    updateAdvisorText('banker', 'Банкир', 'Нанять (5k)');
    updateAdvisorText('spy', 'Шпион', 'Нанять (5k)');
}

function updateAdvisorText(id, name, buyText) {
    const el = document.getElementById('adv_' + id);
    if (state.advisors[id]) {
        el.textContent = name;
        el.style.color = "#2ecc71";
    } else {
        el.textContent = buyText;
        el.style.color = "#888";
    }
}

// Меню
window.openMenu = (t) => {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    if(t==='infra') { renderInfra(); document.getElementById('infraModal').style.display='flex'; }
    if(t==='laws') tg.showAlert('Парламент на каникулах');
    if(t==='shop') document.getElementById('shopModal').style.display='flex';
};
window.closeModal = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

function renderInfra() {
    const list = document.getElementById('infraList');
    list.innerHTML = '';
    const ITEMS = [
        {id:'housing', n:'Жилье', c:1000}, {id:'police', n:'Полиция', c:2000}, {id:'industry', n:'Заводы', c:5000}
    ];
    ITEMS.forEach(i => {
        const lvl = state.upgrades[i.id] || 0;
        const cost = Math.floor(i.c * Math.pow(1.5, lvl));
        list.innerHTML += `<div class="upgrade-item" onclick="buyInfra('${i.id}', ${cost})">
            <div><b>${i.n} (Lvl ${lvl})</b><br><small>${formatNumber(cost)}</small></div>
            <div class="buy-btn">КУПИТЬ</div>
        </div>`;
    });
}
window.buyInfra = (id, cost) => {
    if(state.budget >= cost) {
        state.budget -= cost; state.upgrades[id] = (state.upgrades[id]||0)+1;
        state.population += 100; saveState(); updateUI(); renderInfra();
    } else tg.showAlert("Мало денег");
};

// Донат
window.buyBudget = (amt) => {
    tg.showConfirm('Взять транш за Stars?', ok => { if(ok) { state.budget+=50000; saveState(); updateUI(); closeModal(); }});
};
window.buyRating = () => {
    tg.showConfirm('Купить рейтинг?', ok => { if(ok) { state.approval = Math.min(100, state.approval+20); saveState(); updateUI(); closeModal(); }});
};

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return Math.floor(num);
}
