const tg = window.Telegram.WebApp; tg.expand();
const SAVE_KEY = "PRESIDENT_REAL_SIM_V1"; 
const userId = tg.initDataUnsafe?.user?.id || "test_pres_2";
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

// === ДАННЫЕ СТРАН ===
const COUNTRIES = [
    { id: 'pl', name: 'Польша', flag: '🇵🇱', currency: 'PLN', taxRate: 1.0 },
    { id: 'ua', name: 'Украина', flag: '🇺🇦', currency: 'UAH', taxRate: 0.9 },
    { id: 'us', name: 'США', flag: '🇺🇸', currency: 'USD', taxRate: 2.5 }, // Доллар дорогой, сложнее играть
    { id: 'de', name: 'Германия', flag: '🇩🇪', currency: 'EUR', taxRate: 2.2 },
    { id: 'ru', name: 'Россия', flag: '🇷🇺', currency: 'RUB', taxRate: 0.8 },
    { id: 'kz', name: 'Казахстан', flag: '🇰🇿', currency: 'KZT', taxRate: 0.7 }
];

// === ВЕТКИ РАЗВИТИЯ ===
const INFRASTRUCTURE = {
    social: [
        { id: 'hospitals', name: 'Больницы', desc: '+Рост населения', baseCost: 1000 },
        { id: 'schools', name: 'Школы', desc: '+Одобрение', baseCost: 500 },
        { id: 'parks', name: 'Парки', desc: 'Народ счастлив', baseCost: 300 }
    ],
    economy: [
        { id: 'factories', name: 'Заводы', desc: '+Налоги', baseCost: 2000 },
        { id: 'roads', name: 'Дороги', desc: '+Эффективность', baseCost: 1500 },
        { id: 'banks', name: 'Банки', desc: 'Больше денег', baseCost: 5000 }
    ],
    power: [
        { id: 'police', name: 'Полиция', desc: 'Меньше бунтов', baseCost: 1000 },
        { id: 'army', name: 'Армия', desc: 'Уважение', baseCost: 5000 },
        { id: 'propaganda', name: 'ТВ Каналы', desc: 'Рейтинг не падает', baseCost: 3000 }
    ]
};

// Состояние
let state = {
    countryId: null,
    budget: 0,
    population: 5000,
    approval: 60,
    upgrades: {}, // { hospitals: 1, factories: 2 ... }
    laws: []
};

// === СТАРТ ===
dbRef.once('value').then(snap => {
    if (snap.exists()) {
        const data = snap.val();
        state = { ...state, ...data };
    }
    
    if (!state.countryId) {
        showCountrySelection();
    } else {
        startGame();
    }
    
    // Цикл жизни: население растет или умирает
    setInterval(lifeCycle, 5000);
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
    state.budget = 1000; // Подъемные
    saveState();
    document.getElementById('countrySelectScreen').style.display = 'none';
    startGame();
};

function startGame() {
    document.getElementById('gameInterface').style.display = 'block';
    updateUI();
}

// === ЭКОНОМИКА (СЛОЖНАЯ) ===
let isCollecting = false;

window.startFiscalYear = function() {
    if (isCollecting) return;
    
    // Проверка одобрения
    if (state.approval <= 0) {
        return tg.showAlert("Вас свергли! Рейтинг 0%. Сбросьте игру.");
    }

    const btn = document.getElementById('taxBtn');
    const bar = document.getElementById('taxProgress');
    const txt = document.getElementById('taxBtnText');
    
    isCollecting = true;
    btn.classList.add('active');
    txt.textContent = "СБОР НАЛОГОВ...";
    
    // Время сбора зависит от размера населения (чем больше людей, тем дольше)
    let duration = 2000 + (state.population / 100); 
    if (duration > 5000) duration = 5000; // Макс 5 сек

    bar.style.transition = `width ${duration}ms linear`;
    
    // Запуск анимации
    setTimeout(() => { bar.style.width = '100%'; }, 50);

    // Конец года
    setTimeout(() => {
        finishFiscalYear();
        bar.style.transition = 'none';
        bar.style.width = '0%';
        btn.classList.remove('active');
        txt.textContent = "НАЧАТЬ ФИНАНСОВЫЙ ГОД";
        isCollecting = false;
    }, duration);
};

function finishFiscalYear() {
    const country = COUNTRIES.find(c => c.id === state.countryId);
    
    // Формула налогов:
    // (Люди * Ставка страны) + (Заводы * 100)
    const baseIncome = state.population * 0.5 * country.taxRate;
    const factoryBonus = (state.upgrades.factories || 0) * 200 * country.taxRate;
    let total = Math.floor(baseIncome + factoryBonus);

    // Если народ зол, они платят меньше (уклонение)
    if (state.approval < 50) {
        total = Math.floor(total * (state.approval / 100));
        showMessage("Народ недоволен! Уклонение от налогов!", "red");
    } else {
        showMessage(`Бюджет пополнен: +${formatNumber(total)} ${country.currency}`);
    }

    state.budget += total;
    
    // Налоги бесят людей
    if (Math.random() > 0.3) {
        changeApproval(-2);
    }

    saveState();
    updateUI();
    tg.HapticFeedback.notificationOccurred('success');
}

// === ЖИЗНЬ ===
function lifeCycle() {
    // Рост населения (зависит от больниц)
    const hospitals = state.upgrades.hospitals || 0;
    const growth = Math.floor(5 + (hospitals * 5));
    
    // Если нет денег, люди уезжают
    if (state.budget < 0) {
        state.population = Math.max(0, state.population - 50);
        changeApproval(-5);
    } else {
        state.population += growth;
    }
    
    updateUI();
}

function changeApproval(amount) {
    // Пропаганда смягчает падение
    if (amount < 0) {
        const propaganda = state.upgrades.propaganda || 0;
        if (Math.random() < (propaganda * 0.1)) amount = 0; // Шанс игнора негатива
    }
    state.approval = Math.min(100, Math.max(0, state.approval + amount));
    updateUI();
}

function showMessage(msg, color='white') {
    const el = document.getElementById('statusMsg');
    el.textContent = msg;
    el.style.color = color;
    setTimeout(() => {
        el.textContent = "Народ ждет ваших решений...";
        el.style.color = "#aaa";
    }, 3000);
}

// === UI ОБНОВЛЕНИЕ ===
function updateUI() {
    if (!state.countryId) return;
    const country = COUNTRIES.find(c => c.id === state.countryId);

    document.getElementById('flag').textContent = country.flag;
    document.getElementById('countryName').textContent = country.name;
    document.getElementById('currency').textContent = country.currency;
    
    document.getElementById('budget').textContent = formatNumber(state.budget);
    document.getElementById('population').textContent = formatNumber(state.population);
    
    const appEl = document.getElementById('approval');
    appEl.textContent = state.approval;
    appEl.style.color = state.approval < 30 ? '#e74c3c' : '#2ecc71';
}

// === ИНФРАСТРУКТУРА ===
let currentTab = 'social';

window.openInfrastructure = function() {
    document.getElementById('infraModal').style.display = 'flex';
    renderInfra();
};

window.switchInfraTab = function(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderInfra();
};

function renderInfra() {
    const list = document.getElementById('infraList');
    list.innerHTML = '';
    const country = COUNTRIES.find(c => c.id === state.countryId);
    
    INFRASTRUCTURE[currentTab].forEach(item => {
        const lvl = state.upgrades[item.id] || 0;
        const cost = Math.floor(item.baseCost * Math.pow(1.5, lvl));
        
        list.innerHTML += `
        <div class="upgrade-item" onclick="buyUpgrade('${item.id}', ${cost})">
            <div>
                <div style="font-weight:bold">${item.name} <span class="lvl-badge">${lvl}</span></div>
                <div style="font-size:12px; color:#888">${item.desc}</div>
            </div>
            <div class="price-tag">${formatNumber(cost)} ${country.currency}</div>
        </div>`;
    });
}

window.buyUpgrade = function(id, cost) {
    if (state.budget >= cost) {
        state.budget -= cost;
        state.upgrades[id] = (state.upgrades[id] || 0) + 1;
        
        // Эффекты сразу
        if (id === 'schools') changeApproval(5);
        if (id === 'parks') changeApproval(3);
        
        saveState();
        updateUI();
        renderInfra();
        tg.HapticFeedback.impactOccurred('medium');
    } else {
        tg.showAlert("Бюджет пуст! Собирайте налоги.");
    }
};

// === ОСТАЛЬНОЕ ===
window.closeModal = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
window.openShop = () => document.getElementById('shopModal').style.display = 'flex';

window.openLaws = function() {
    tg.showAlert("Госдума на каникулах (в разработке)"); 
    // Сюда можно добавить законы по аналогии с прошлой версией
};

// Донат
window.buyBudget = function(amount) {
    tg.showConfirm(`Взять транш МВФ за ${amount} Stars?`, (ok) => {
        if(ok) {
            state.budget += 100000;
            saveState(); updateUI(); closeModal();
        }
    });
};

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num);
}
