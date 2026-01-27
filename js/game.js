const tg = window.Telegram.WebApp; 
tg.expand();

// === НАСТРОЙКИ ===
const SAVE_KEY = "CYBER_RACE_MASTER_V1"; 
const userId = tg.initDataUnsafe?.user?.id || "test_racer_1";
// Используем глобальную переменную db из firebase.js
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

let state = { 
    cash: 0, 
    stars: 0, 
    level: 1, 
    upgrades: { engine: 1, turbo: 1 } 
};

const COSTS = { 
    engine: (lvl) => Math.floor(100 * Math.pow(1.5, lvl - 1)), 
    turbo: (lvl) => Math.floor(250 * Math.pow(1.6, lvl - 1)) 
};

// === ЗАГРУЗКА ===
dbRef.once('value').then(snap => {
    if (snap.exists()) { 
        state = snap.val(); 
        // Защита от старых данных
        if(!state.upgrades) state.upgrades = {engine: 1, turbo: 1}; 
    } else { 
        saveState(); 
    }
    updateUI();
});

function saveState() { 
    dbRef.set(state); 
}

// === ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ===
function updateUI() {
    document.getElementById('cash').textContent = formatNumber(state.cash);
    document.getElementById('stars').textContent = state.stars;
    
    const income = (state.upgrades.engine * 100) + (state.upgrades.turbo * 250);
    document.getElementById('incomeDisplay').textContent = formatNumber(income);
    document.getElementById('carLevel').textContent = state.level;
    
    updateCard('engine'); 
    updateCard('turbo');
}

function updateCard(type) {
    const lvl = state.upgrades[type]; 
    const cost = COSTS[type](lvl + 1);
    document.getElementById(`${type}Lvl`).textContent = `Lvl ${lvl}`;
    document.getElementById(`${type}Cost`).textContent = formatNumber(cost);
}

// === ГОНКА ===
let isRacing = false;
function startRace() {
    if (isRacing) return;
    isRacing = true;
    
    const overlay = document.getElementById('raceOverlay');
    const car = document.querySelector('.race-car');
    overlay.style.display = 'flex'; 
    car.style.left = '10px';
    
    // Анимация
    setTimeout(() => { car.style.left = '90%'; }, 100);
    
    setTimeout(() => {
        // Расчет прибыли
        const income = (state.upgrades.engine * 100) + (state.upgrades.turbo * 250);
        state.cash += income;
        
        // Шанс 1% найти звезду
        if (Math.random() < 0.01) { 
            state.stars += 1; 
            tg.showAlert("Супер гонка! Найдена 1 Star!"); 
        }

        saveState(); 
        updateUI(); 
        tg.HapticFeedback.notificationOccurred('success');
        
        // Сброс
        overlay.style.display = 'none'; 
        isRacing = false;
        car.style.transition = 'none'; 
        car.style.left = '10px';
        setTimeout(() => car.style.transition = 'left 2s ease-in-out', 50);
    }, 2000);
}

// === ПРОКАЧКА ===
window.upgrade = function(type) {
    const lvl = state.upgrades[type]; 
    const cost = COSTS[type](lvl + 1);
    
    if (state.cash >= cost) {
        state.cash -= cost; 
        state.upgrades[type]++; 
        state.level++;
        tg.HapticFeedback.impactOccurred('medium'); 
        saveState(); 
        updateUI();
    } else { 
        tg.HapticFeedback.notificationOccurred('error'); 
        tg.showAlert(`Не хватает ${formatNumber(cost - state.cash)} $`); 
    }
};

// === МАГАЗИН ===
window.openShop = () => document.getElementById('shopModal').style.display = 'flex';
window.closeShop = () => document.getElementById('shopModal').style.display = 'none';

window.buyStars = function(amount) {
    tg.showConfirm(`Купить ${amount} Stars?`, (ok) => {
        if (ok) { 
            state.stars += amount; 
            state.cash += amount * 1000; // Бонус
            saveState(); 
            updateUI(); 
            closeShop(); 
            tg.showAlert("Успешно!"); 
        }
    });
};

// Форматирование чисел (1k, 1M)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num);
}
