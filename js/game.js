const tg = window.Telegram.WebApp; tg.expand();
const SAVE_KEY = "PRESIDENT_SIM_V1"; 
const userId = tg.initDataUnsafe?.user?.id || "test_pres_1";
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

// === ЗАКОНЫ (ДУРАЦКИЕ) ===
const LAWS_DB = [
    { id: 'air_tax', name: "Налог на воздух", cost: 500, income: 10, rating: -5 },
    { id: 'ban_sad', name: "Запрет на грусть", cost: 2000, income: 50, rating: -10 },
    { id: 'red_shoes', name: "Штраф за красные кеды", cost: 5000, income: 150, rating: -2 },
    { id: 'breathing', name: "Лицензия на дыхание", cost: 15000, income: 500, rating: -20 },
    { id: 'statue', name: "Статуя Меня (Золотая)", cost: 50000, income: 0, rating: +50 } // Это восстанавливает рейтинг
];

let state = {
    budget: 0,
    population: 1000,
    approval: 70, // Рейтинг %
    laws: [], // Принятые законы
    upgrades: { housing: 0, propaganda: 0, police: 0 }
};

const COSTS = {
    housing: (lvl) => Math.floor(100 * Math.pow(1.5, lvl)),
    propaganda: (lvl) => Math.floor(500 * Math.pow(1.6, lvl)),
    police: (lvl) => Math.floor(1000 * Math.pow(1.8, lvl))
};

// === ЗАГРУЗКА ===
dbRef.once('value').then(snap => {
    if (snap.exists()) {
        const data = snap.val();
        state = { ...state, ...data };
        if(!state.laws) state.laws = [];
    } else {
        saveState();
    }
    updateUI();
    // Пассивный рост населения
    setInterval(populationGrowth, 3000);
});

function saveState() {
    dbRef.set(state);
}

// === ЛОГИКА ===

function collectTaxes() {
    // Формула: (Популяция / 10) * (Пропаганда + 1) + Доход от законов
    let lawIncome = 0;
    state.laws.forEach(lawId => {
        const law = LAWS_DB.find(l => l.id === lawId);
        if(law) lawIncome += law.income;
    });

    const baseTax = Math.floor(state.population / 10);
    const multiplier = 1 + (state.upgrades.propaganda * 0.5);
    const total = Math.floor((baseTax * multiplier) + lawIncome);

    state.budget += total;
    
    // Сбор налогов бесит людей (немного)
    if (Math.random() < 0.3 && state.approval > 0) {
        // Полиция снижает шанс падения рейтинга
        const policeChance = state.upgrades.police * 0.1; 
        if (Math.random() > policeChance) {
            state.approval -= 1;
        }
    }

    updateUI();
    saveState();
    
    // Анимация денег (вибрация)
    tg.HapticFeedback.impactOccurred('light');
}

function populationGrowth() {
    // Жилье увеличивает лимит и скорость роста
    const capacity = 1000 + (state.upgrades.housing * 500);
    if (state.population < capacity && state.approval > 20) {
        state.population += Math.floor(1 + state.upgrades.housing);
        updateUI();
    }
}

// === ПОКУПКИ И ЗАКОНЫ ===

window.signLaw = function(id) {
    const law = LAWS_DB.find(l => l.id === id);
    if (state.budget >= law.cost) {
        state.budget -= law.cost;
        state.laws.push(id);
        state.approval = Math.min(100, Math.max(0, state.approval + law.rating));
        
        tg.showAlert(`Закон "${law.name}" принят!`);
        saveState();
        updateUI();
        renderLaws(); // Обновить список
    } else {
        tg.showAlert("Не хватает средств в казне!");
    }
};

window.upgrade = function(type) {
    const lvl = state.upgrades[type];
    const cost = COSTS[type](lvl);
    
    if (state.budget >= cost) {
        state.budget -= cost;
        state.upgrades[type]++;
        
        if(type === 'housing') tg.showAlert("Построено гетто!");
        if(type === 'police') tg.showAlert("ОМОН укомплектован!");
        
        saveState();
        updateUI();
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
};

// === UI ===

function updateUI() {
    document.getElementById('budget').textContent = formatNumber(state.budget);
    document.getElementById('population').textContent = formatNumber(state.population);
    
    const appEl = document.getElementById('approval');
    appEl.textContent = state.approval;
    appEl.style.color = state.approval < 30 ? 'red' : '#00e676';

    // Расчет текущего сбора
    let lawIncome = 0;
    state.laws.forEach(lawId => {
        const law = LAWS_DB.find(l => l.id === lawId);
        if(law) lawIncome += law.income;
    });
    const baseTax = Math.floor(state.population / 10);
    const multiplier = 1 + (state.upgrades.propaganda * 0.5);
    const total = Math.floor((baseTax * multiplier) + lawIncome);
    document.getElementById('taxIncome').textContent = formatNumber(total);

    // Цены
    document.getElementById('housingLvl').textContent = state.upgrades.housing;
    document.getElementById('housingCost').textContent = formatNumber(COSTS.housing(state.upgrades.housing));
    
    document.getElementById('propagandaLvl').textContent = state.upgrades.propaganda;
    document.getElementById('propagandaCost').textContent = formatNumber(COSTS.propaganda(state.upgrades.propaganda));

    document.getElementById('policeLvl').textContent = state.upgrades.police;
    document.getElementById('policeCost').textContent = formatNumber(COSTS.police(state.upgrades.police));
}

// === МЕНЮШКИ ===
window.openMenu = function(type) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    if (type === 'laws') {
        renderLaws();
        document.getElementById('lawsModal').style.display = 'flex';
    }
    if (type === 'ministry') {
        document.getElementById('ministryModal').style.display = 'flex';
    }
};

window.openShop = () => document.getElementById('shopModal').style.display = 'flex';
window.closeModal = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

function renderLaws() {
    const list = document.getElementById('lawsList');
    list.innerHTML = '';
    
    LAWS_DB.forEach(law => {
        const isSigned = state.laws.includes(law.id);
        
        let html = `
        <div class="upgrade-item ${isSigned ? 'signed' : ''}" onclick="${isSigned ? '' : `signLaw('${law.id}')`}">
            <div class="u-info">
                <b>${law.name}</b>
                <div style="font-size:11px; opacity:0.7">Рейтинг: ${law.rating > 0 ? '+' : ''}${law.rating}% | Доход: +${law.income}$</div>
                ${!isSigned ? `<small>Цена принятия: ${formatNumber(law.cost)} $</small>` : '<small style="color:#00ff88">ПРИНЯТО</small>'}
            </div>
        </div>`;
        list.innerHTML += html;
    });
}

// === ДОНАТ (STARS) ===
window.buyBudget = function(amount) {
    tg.showConfirm(`Потратить ${amount} Stars на пополнение бюджета?`, (ok) => {
        if (ok) {
            state.budget += 100000;
            saveState(); updateUI(); closeModal();
            tg.showAlert("Средства из офшора переведены!");
        }
    });
};

window.buyRating = function() {
    tg.showConfirm(`Купить 20% рейтинга за 100 Stars?`, (ok) => {
        if (ok) {
            state.approval = Math.min(100, state.approval + 20);
            saveState(); updateUI(); closeModal();
            tg.showAlert("СМИ куплены! Народ вас любит.");
        }
    });
};

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num);
}
