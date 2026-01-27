const tg = window.Telegram.WebApp; tg.expand();
const SAVE_KEY = "PRESIDENT_LOGIC_SIM_V3"; 
const userId = tg.initDataUnsafe?.user?.id || "test_logic_user";
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

// === ДАННЫЕ ===
const COUNTRIES = [
    { id: 'us', name: 'США', flag: '🇺🇸', currency: 'USD', economy: 2.0 },
    { id: 'de', name: 'Германия', flag: '🇩🇪', currency: 'EUR', economy: 1.8 },
    { id: 'ru', name: 'Россия', flag: '🇷🇺', currency: 'RUB', economy: 0.8 },
    { id: 'ua', name: 'Украина', flag: '🇺🇦', currency: 'UAH', economy: 0.7 },
    { id: 'kz', name: 'Казахстан', flag: '🇰🇿', currency: 'KZT', economy: 0.6 }
];

const LAWS = [
    { id: 'tax_up', name: 'Повысить НДС', effect: 'budget', val: 200, loyaltyCost: 10, approvalHit: 5 },
    { id: 'censorship', name: 'Цензура СМИ', effect: 'approval_lock', val: 0, loyaltyCost: 20, approvalHit: 10 },
    { id: 'retirement', name: 'Отмена пенсий', effect: 'pension_steal', val: 0, loyaltyCost: 50, approvalHit: 40 }
];

let state = {
    countryId: null,
    budget: 5000,
    pensionFund: 1000,
    personal: 500, // Личные деньги
    stress: 0,     // 0-100%
    population: 10000,
    approval: 60,  // Одобрение народа
    loyalty: 50,   // Лояльность парламента
    advisors: { general: false, banker: false, spy: false },
    upgrades: { housing: 0, industry: 0, police: 0 },
    activeLaws: []
};

// === СТАРТ ===
dbRef.once('value').then(snap => {
    if (snap.exists()) state = { ...state, ...snap.val() };
    if (!state.countryId) showCountrySelection();
    else startGame();
});

function saveState() { dbRef.set(state); }

// === МЕНЮ СТРАН ===
function showCountrySelection() {
    const list = document.getElementById('countryList');
    list.innerHTML = '';
    COUNTRIES.forEach(c => {
        list.innerHTML += `
        <div class="country-card" onclick="selectCountry('${c.id}')">
            <div style="font-size:40px">${c.flag}</div>
            <h3>${c.name}</h3>
            <small>Экономика: x${c.economy}</small>
        </div>`;
    });
}

window.selectCountry = function(id) {
    state.countryId = id;
    saveState();
    document.getElementById('countrySelectScreen').style.display = 'none';
    startGame();
};

function startGame() {
    document.getElementById('gameInterface').style.display = 'block';
    updateUI();
}

// === ГЛАВНЫЙ ЦИКЛ (ФИНАНСОВЫЙ ГОД) ===
let isProcessing = false;

window.endFiscalYear = function() {
    if (isProcessing) return;
    if (state.stress >= 100) return tg.showAlert("ИНФАРКТ! Вы погибли от стресса. Game Over.");
    if (state.approval <= 0) return tg.showAlert("РЕВОЛЮЦИЯ! Толпа взяла дворец.");

    isProcessing = true;
    const btn = document.getElementById('yearBtn');
    const bar = document.getElementById('yearProgress');
    
    // Анимация года (2 секунды)
    btn.classList.add('active');
    bar.style.transition = 'width 2s linear';
    setTimeout(() => { bar.style.width = '100%'; }, 50);

    setTimeout(() => {
        processYearLogic();
        // Сброс
        bar.style.transition = 'none';
        bar.style.width = '0%';
        btn.classList.remove('active');
        isProcessing = false;
    }, 2000);
};

function processYearLogic() {
    const country = COUNTRIES.find(c => c.id === state.countryId);
    let log = [];

    // 1. ДОХОДЫ (Налоги)
    // Банкир увеличивает сбор на 20%
    let taxEff = state.advisors.banker ? 1.2 : 1.0;
    let factoryBonus = (state.upgrades.industry || 0) * 200;
    let totalTax = Math.floor((state.population * 0.1 * country.economy * taxEff) + factoryBonus);
    
    // 30% налогов идет в Пенсионный фонд, остальное в Бюджет
    let toPension = Math.floor(totalTax * 0.3);
    let toBudget = totalTax - toPension;

    state.budget += toBudget;
    state.pensionFund += toPension;
    log.push(`Налоги: +${toBudget} в бюджет, +${toPension} в ПФ.`);

    // 2. РАСХОДЫ (Зарплаты советников)
    let salaryCost = 0;
    if (state.advisors.general) salaryCost += 500;
    if (state.advisors.banker) salaryCost += 500;
    if (state.advisors.spy) salaryCost += 500;

    if (state.budget >= salaryCost) {
        state.budget -= salaryCost;
        if (salaryCost > 0) log.push(`Зарплаты: -${salaryCost}`);
    } else {
        // Если нет денег — советники уходят и злятся
        state.advisors.general = false;
        state.advisors.banker = false;
        state.advisors.spy = false;
        state.loyalty -= 20;
        tg.showAlert("ДЕФОЛТ! Советники уволились и настроили Парламент против вас!");
    }

    // 3. НАСЕЛЕНИЕ И РЕЙТИНГ
    // Пенсии выплачиваются из фонда. Если фонда мало — рейтинг падает
    let pensionNeed = Math.floor(state.population * 0.05); // Потребность
    if (state.pensionFund >= pensionNeed) {
        state.pensionFund -= pensionNeed;
        state.approval += 1;
    } else {
        state.pensionFund = 0;
        state.approval -= 5;
        log.push("НЕВЫПЛАТА ПЕНСИЙ! Рейтинг упал.");
    }

    // Стресс растет каждый год на 5%
    state.stress = Math.min(100, state.stress + 5);

    saveState();
    updateUI();
    tg.showAlert(log.join('\n'));
}

// === ВОРОВСТВО И КОРРУПЦИЯ ===

window.stealFromBudget = function() {
    if (state.budget < 2000) return tg.showAlert("В бюджете пусто!");
    
    let stealAmount = 2000;
    state.budget -= stealAmount;
    state.personal += stealAmount;
    state.stress += 10; // Воровство нервирует
    
    // Шанс скандала
    let risk = 0.4;
    if (state.advisors.spy) risk = 0.1; // Шпион прикрывает
    
    if (Math.random() < risk) {
        state.approval -= 15;
        tg.showAlert("СМИ раскрыли коррупцию! Рейтинг рухнул.");
    } else {
        tg.showAlert("Деньги успешно выведены в офшор.");
    }
    updateUI(); saveState();
};

window.stealPensions = function() {
    if (state.pensionFund <= 0) return tg.showAlert("Фонд пуст.");
    
    tg.showConfirm("Украсть ВСЕ пенсии? Это уничтожит рейтинг!", (ok) => {
        if (ok) {
            let amount = state.pensionFund;
            state.pensionFund = 0;
            state.personal += amount;
            state.approval -= 40; // Катастрофа
            state.stress += 20;
            tg.showAlert(`Вы украли ${amount} у стариков. Вас ненавидят.`);
            updateUI(); saveState();
        }
    });
};

// === ПАРЛАМЕНТ И ЗАКОНЫ ===
window.voteLaw = function(lawId) {
    const law = LAWS.find(l => l.id === lawId);
    
    if (state.loyalty >= law.loyaltyCost) {
        // Парламент голосует ЗА
        state.loyalty -= 10; // Тратим "кредит доверия"
        state.approval -= law.approvalHit;
        
        if (law.effect === 'budget') state.budget += law.val;
        // Другие эффекты...
        
        tg.showAlert(`Закон "${law.name}" принят!`);
        state.activeLaws.push(lawId);
    } else {
        tg.showAlert("Парламент заблокировал закон! Нужно больше лояльности.");
    }
    updateUI(); saveState();
};

window.bribeParliament = function() {
    if (state.personal >= 1000) {
        state.personal -= 1000;
        state.loyalty = Math.min(100, state.loyalty + 15);
        tg.showAlert("Депутаты получили подарки. Лояльность выросла.");
        updateUI(); saveState();
    } else {
        tg.showAlert("Не хватает ЛИЧНЫХ денег на взятки.");
    }
};

window.intimidateParliament = function() {
    if (!state.advisors.general) return tg.showAlert("Нужен Генерал!");
    state.loyalty = Math.min(100, state.loyalty + 10);
    state.approval -= 5; // Народ не любит диктатуру
    state.stress += 5;
    tg.showAlert("Генерал припугнул депутатов.");
    updateUI(); saveState();
};

// === СОВЕТНИКИ ===
window.hireAdvisor = function(type) {
    if (state.advisors[type]) return tg.showAlert("Уже нанят.");
    if (state.budget >= 1000) {
        state.budget -= 1000;
        state.advisors[type] = true;
        updateUI(); saveState();
    } else tg.showAlert("Нет денег в бюджете (1000).");
};

// === ЛИЧНАЯ ЖИЗНЬ ===
window.relax = function(cost) {
    if (state.personal >= cost) {
        state.personal -= cost;
        state.stress = Math.max(0, state.stress - 10);
        updateUI(); saveState();
    } else tg.showAlert("Нет личных денег.");
};

window.buyEscape = function(type, cost) {
    if (state.personal >= cost) {
        alert("ПОЗДРАВЛЯЕМ! Вы сбежали из страны с деньгами. Вы Победили!");
        state.budget = 0; // Ресет или что-то типа того
    } else tg.showAlert("Копите деньги!");
};

// === UI ===
function updateUI() {
    if (!state.countryId) return;
    const country = COUNTRIES.find(c => c.id === state.countryId);

    document.querySelectorAll('.currency').forEach(el => el.textContent = country.currency);
    document.getElementById('budget').textContent = formatNumber(state.budget);
    document.getElementById('pensionFund').textContent = formatNumber(state.pensionFund);
    document.getElementById('personalCash').textContent = formatNumber(state.personal);
    document.getElementById('modalPersonal').textContent = formatNumber(state.personal) + " $";
    
    // Статы
    const app = document.getElementById('approval');
    app.textContent = state.approval;
    app.style.color = state.approval < 30 ? 'red' : '#2ecc71';

    const loy = document.getElementById('parlLoyalty');
    loy.textContent = state.loyalty;
    document.getElementById('modalLoyalty').textContent = state.loyalty + "%";

    const str = document.getElementById('stress');
    str.textContent = state.stress;
    str.style.color = state.stress > 80 ? 'red' : 'white';
    document.getElementById('modalStress').textContent = state.stress + "%";

    // Советники
    updateAdvisorBtn('general', 'Генерал', 500);
    updateAdvisorBtn('banker', 'Банкир', 500);
    updateAdvisorBtn('spy', 'Шпион', 500);
}

function updateAdvisorBtn(id, name, salary) {
    const el = document.getElementById('adv_' + id);
    const sal = document.getElementById('sal_' + id);
    if (state.advisors[id]) {
        el.textContent = name;
        el.style.color = "#2ecc71";
        sal.textContent = `-${salary}/год`;
    } else {
        el.textContent = "Нанять";
        el.style.color = "#888";
        sal.textContent = "1000";
    }
}

// === МЕНЮ ИНФРАСТРУКТУРЫ ===
window.openMenu = (t) => {
    document.querySelectorAll('.modal').forEach(m => m.style.display='none');
    if(t === 'infra') { renderInfra(); document.getElementById('infraModal').style.display='flex'; }
    if(t === 'parliament') { renderLaws(); document.getElementById('parliamentModal').style.display='flex'; }
    if(t === 'escape') { document.getElementById('escapeModal').style.display='flex'; }
};
window.closeModal = () => document.querySelectorAll('.modal').forEach(m => m.style.display='none');

function renderInfra() {
    const list = document.getElementById('infraList');
    list.innerHTML = '';
    const items = [
        { id:'housing', n:'Соц. Жилье', c:1000 },
        { id:'industry', n:'Промзона', c:3000 },
        { id:'police', n:'Полицейский участок', c:1500 }
    ];
    items.forEach(i => {
        const lvl = state.upgrades[i.id] || 0;
        const cost = Math.floor(i.c * Math.pow(1.3, lvl));
        list.innerHTML += `<div class="upgrade-item" onclick="buyInfra('${i.id}', ${cost})">
            <div><b>${i.n}</b> (Lvl ${lvl})<br><small>Бюджет: ${formatNumber(cost)}</small></div>
            <div class="buy-btn">КУПИТЬ</div>
        </div>`;
    });
}
window.buyInfra = (id, cost) => {
    if (state.budget >= cost) {
        state.budget -= cost; state.upgrades[id] = (state.upgrades[id]||0)+1;
        if(id==='housing') state.approval+=2;
        saveState(); updateUI(); renderInfra();
    } else tg.showAlert("Нет денег в бюджете!");
};

function renderLaws() {
    const list = document.getElementById('lawsList');
    list.innerHTML = '';
    LAWS.forEach(l => {
        const active = state.activeLaws.includes(l.id);
        if(!active) {
            list.innerHTML += `<div class="upgrade-item" onclick="voteLaw('${l.id}')">
                <div><b>${l.name}</b><br><small>Треб. Лояльность: ${l.loyaltyCost}%</small></div>
                <div class="buy-btn" style="background:${active?'grey':'var(--gold)'}">ГОЛОСОВАТЬ</div>
            </div>`;
        }
    });
}

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return Math.floor(num);
}
