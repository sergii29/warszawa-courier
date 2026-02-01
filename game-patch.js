// --- WARSAW COURIER PATCH v2.0 (GARAGE & SPLIT SHOPS) ---
const tg = window.Telegram.WebApp;
tg.expand();

// 1. КЛЮЧ СОХРАНЕНИЯ (Новый, чтобы не смешать с старым инвентарем)
const SAVE_KEY = 'WARSAWBEST_GARAGE_V1'; 

// --- НАСТРОЙКИ ТЕХНИКИ ---
const BIKES_DB = {
    'default': { 
        name: 'Rower Miejski', 
        speed: 1.0, 
        energyCost: 2.0, 
        durabilityLoss: 0, // Не ломается
        price: 0, 
        repairTimeSec: 0,
        desc: 'Надежный, но тяжелый.'
    },
    'e250': { 
        name: 'E-Bike 250W', 
        speed: 1.5, // +50% скорости
        energyCost: 1.0, // Меньше устаешь
        durabilityLoss: 0.8, 
        price: 150, 
        repairTimeSec: 60, // 1 минута ремонта
        desc: 'Помогает крутить педали.'
    },
    'e500': { 
        name: 'Volt 500W', 
        speed: 2.2, // x2.2 скорости
        energyCost: 0.5, 
        durabilityLoss: 1.2, 
        price: 450, 
        repairTimeSec: 120, // 2 минуты
        desc: 'Быстрый городской зверь.'
    },
    'e1000': { 
        name: 'Monster 1000W', 
        speed: 3.5, // Летит
        energyCost: 0.1, // Почти не устаешь
        durabilityLoss: 2.0, // Быстро изнашивается
        price: 1200, 
        repairTimeSec: 360, // 6 минут
        desc: 'Король дороги. Хрупкий.'
    }
};

// --- ИНИЦИАЛИЗАЦИЯ КАРТЫ ---
const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([52.2297, 21.0122], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

const courierIcon = L.divIcon({ html: '<div style="background:#3b82f6; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px #3b82f6;"></div>', className: 'cm' });
const targetIcon = L.divIcon({ html: '<div style="background:#ef4444; width:15px; height:15px; border-radius:50%; border:2px solid white; animation: pulse 1s infinite;"></div>', className: 'tm' });

let courierMarker = L.marker([52.2297, 21.0122], {icon: courierIcon}).addTo(map);
let targetMarker = null;

// --- СОСТОЯНИЕ ИГРЫ ---
let state = {
    cash: 50,
    energy: 100, water: 100, mood: 100,
    exp: 0, lvl: 1,
    currentOrder: null,
    // ГАРАЖ
    ownedBikes: ['default'], // ID купленных байков
    activeBike: 'default',   // На чем едем сейчас
    bikesHealth: { 'default': 100 }, // Состояние (HP) каждого байка
    repairTimers: {} // Когда закончится ремонт { 'e250': 1700000000 }
};

let pendingOrder = null;
let offerInterval = null;
let isResting = false;
let lastDrinkTime = 0;

// --- ЗАПУСК ---
function init() {
    loadGame();
    injectCustomUI(); // <-- Перестраиваем интерфейс
    updateUI();
    updateMainButtonState();
    
    // Восстановление маркера
    if (state.currentOrder) {
        if (targetMarker) map.removeLayer(targetMarker);
        targetMarker = L.marker(state.currentOrder.dest, {icon: targetIcon}).addTo(map);
        document.getElementById('order-info').style.display = 'block';
    }

    setInterval(autoTick, 1000); 
    setInterval(saveGame, 5000);
}

// --- ПЕРЕСТРОЙКА ИНТЕРФЕЙСА (JS INJECTION) ---
function injectCustomUI() {
    // Находим сетку кнопок
    const navGrid = document.querySelector('.nav-grid');
    if (navGrid) {
        navGrid.innerHTML = ''; // Очищаем старые кнопки
        navGrid.style.gridTemplateColumns = '1fr 1fr 1fr 1fr'; // 4 колонки
        navGrid.style.gap = '5px';

        // 1. Еда (7-Eleven)
        const btnFood = createNavBtn('fa-burger', 'ЕДА', '#10b981', openFoodShop);
        // 2. Гараж (Велосипеды)
        const btnBike = createNavBtn('fa-bicycle', 'ГАРАЖ', '#f59e0b', openBikeShop);
        // 3. Вода (Фонтан)
        const btnWater = createNavBtn('fa-faucet', 'ВОДА', '#0ea5e9', drinkFreeWater);
        // 4. Отдых
        const btnRest = createNavBtn('fa-couch', 'ОТДЫХ', '#d946ef', toggleRest);

        navGrid.appendChild(btnFood);
        navGrid.appendChild(btnBike);
        navGrid.appendChild(btnWater);
        navGrid.appendChild(btnRest);
    }
}

function createNavBtn(icon, text, color, onclick) {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.onclick = onclick;
    btn.innerHTML = `<i class="fas ${icon}" style="color:${color}; font-size:14px;"></i> <span>${text}</span>`;
    return btn;
}

// --- ТИКЕР (ВРЕМЯ И РЕМОНТ) ---
function autoTick() {
    const now = Date.now();

    // 1. Проверка ремонта
    for (let bikeId in state.repairTimers) {
        if (state.repairTimers[bikeId] && state.repairTimers[bikeId] < now) {
            // Ремонт окончен
            state.bikesHealth[bikeId] = 100;
            delete state.repairTimers[bikeId];
            showToast(`🔧 ${BIKES_DB[bikeId].name} отремонтирован!`, "success");
            // Если мы были на дефолтном, можно авто-переключить (опционально), но лучше просто уведомить
        }
    }

    // 2. Логика отдыха
    if (isResting) {
        if (state.energy < 100) {
            state.energy += 3; // Отдых эффективный
            if(state.energy > 100) state.energy = 100;
            document.getElementById('rest-bar').style.width = state.energy + '%';
        } else {
            showToast("🔋 Полон сил!");
            toggleRest(); 
        }
    }

    // 3. Таймер заказа
    if (state.currentOrder) {
        if (now > state.currentOrder.deadline) {
            failOrderTimeout();
        } else {
            const diff = Math.floor((state.currentOrder.deadline - now) / 1000);
            const m = Math.floor(diff / 60);
            const s = diff % 60;
            document.getElementById('time-left').innerText = `${m}:${s < 10 ? '0'+s : s}`;
            document.getElementById('timer-widget').style.display = 'block';
        }
    } else {
        document.getElementById('timer-widget').style.display = 'none';
        if(!isResting && state.energy < 50) state.energy += 0.2; // Медленный реген покоя
    }
    
    updateUI();
}

// --- ДВИЖЕНИЕ (С УЧЕТОМ ВЕЛОСИПЕДА) ---
function pedal() {
    if (isResting) { toggleRest(); return; }
    
    // Проверка текущего байка
    const bikeId = state.activeBike;
    const bikeData = BIKES_DB[bikeId];
    let currentHp = state.bikesHealth[bikeId] || 0;

    // ЕСЛИ БАЙК СЛОМАН
    if (bikeId !== 'default' && currentHp <= 0) {
        // Проверяем, в ремонте ли он
        if (state.repairTimers[bikeId]) {
            const timeLeft = Math.ceil((state.repairTimers[bikeId] - Date.now())/1000);
            showToast(`🛠 Байк в ремонте! Еще ${timeLeft} сек.`, "error");
            // Предлагаем сменить на дефолтный
            if(confirm("Этот велосипед в ремонте. Взять городской велосипед (Default)?")) {
                state.activeBike = 'default';
                updateUI(); updateMainButtonState();
            }
        } else {
            // Сломался только что -> В ремонт
            startRepair(bikeId);
        }
        return;
    }

    // ПОИСК ЗАКАЗА
    if (!state.currentOrder) { findOrder(); return; }

    // РАСХОД ЭНЕРГИИ И СКОРОСТЬ
    let moveSpeed = 0.1 * bikeData.speed; // Базовая скорость * множитель байка
    let energyCost = bikeData.energyCost;

    if (state.energy <= 0) {
        moveSpeed *= 0.3; // Усталость режет скорость
        energyCost = 0;
        showToast("🐌 Сил нет... еле плетемся", "error");
    }

    // ДВИГАЕМСЯ
    state.energy = Math.max(0, state.energy - energyCost);
    
    // ИЗНОС (Только если не дефолтный)
    if (bikeData.durabilityLoss > 0) {
        state.bikesHealth[bikeId] = Math.max(0, currentHp - bikeData.durabilityLoss);
        if (state.bikesHealth[bikeId] <= 0) {
            startRepair(bikeId);
            return; // Остановились из-за поломки
        }
    }

    // Обновляем карту
    const dest = state.currentOrder.dest;
    const pos = courierMarker.getLatLng();
    const newLat = pos.lat + (dest[0] - pos.lat) * moveSpeed; 
    const newLng = pos.lng + (dest[1] - pos.lng) * moveSpeed;
    courierMarker.setLatLng([newLat, newLng]);
    map.setView([newLat, newLng]); 

    // Дистанция
    const dist = map.distance([newLat, newLng], dest);
    document.getElementById('dist-display').innerText = Math.floor(dist);

    if (dist < 20) finishOrder();
    
    updateUI(); updateMainButtonState();
}

function startRepair(bikeId) {
    const data = BIKES_DB[bikeId];
    state.repairTimers[bikeId] = Date.now() + (data.repairTimeSec * 1000);
    showToast(`💥 ${data.name} сломался! Ремонт: ${data.repairTimeSec} сек.`, "error");
    // Автосмена на дефолт, чтобы игрок не застрял
    state.activeBike = 'default';
    showToast("🔄 Пересели на городской велосипед");
    updateUI(); updateMainButtonState();
}

// --- СИСТЕМА ЗАКАЗОВ ---
function findOrder() {
    const center = [52.2297, 21.0122];
    const dest = [ center[0] + (Math.random() - 0.5) * 0.04, center[1] + (Math.random() - 0.5) * 0.04 ];
    
    // Расчет времени: Даем время с запасом ("Без стресса")
    // Берем дистанцию и считаем, как будто едем на среднем электровелосипеде
    const dist = map.distance(center, dest); 
    const secondsAllowed = 90 + Math.floor(dist / 15); // Очень щедрое время
    
    pendingOrder = { 
        dest: dest, 
        pay: 20 + Math.floor(Math.random() * 30),
        timeLimitSeconds: secondsAllowed
    };

    document.getElementById('offer-price').innerText = pendingOrder.pay + " PLN";
    const m = Math.floor(secondsAllowed / 60);
    const s = secondsAllowed % 60;
    document.getElementById('offer-time').innerText = `~ ${m} мин ${s} сек`;
    document.getElementById('offer-modal').style.display = 'flex';
    
    if(offerInterval) clearTimeout(offerInterval);
    offerInterval = setTimeout(() => rejectOrder(true), 15000); // 15 сек на раздумья
}

function acceptOrder() {
    clearTimeout(offerInterval);
    document.getElementById('offer-modal').style.display = 'none';
    state.currentOrder = pendingOrder;
    state.currentOrder.deadline = Date.now() + (pendingOrder.timeLimitSeconds * 1000);
    
    if (targetIcon) map.removeLayer(targetIcon);
    targetMarker = L.marker(state.currentOrder.dest, {icon: targetIcon}).addTo(map);
    
    document.getElementById('order-info').style.display = 'block';
    showToast("✅ Заказ принят! Погнали.", "success");
    updateMainButtonState(); saveGame();
}

function rejectOrder(timeout=false) {
    clearTimeout(offerInterval);
    document.getElementById('offer-modal').style.display = 'none';
    state.cash -= 2; // Маленький штраф (Без стресса)
    showToast("❌ Отказ (-2 PLN)", "info");
    updateUI();
}

function failOrderTimeout() {
    state.currentOrder = null;
    if (targetMarker) map.removeLayer(targetMarker);
    document.getElementById('order-info').style.display = 'none';
    showToast("⌛ Время вышло! Клиент ушел.", "error");
    saveGame(); updateMainButtonState();
}

function finishOrder() {
    state.cash += state.currentOrder.pay;
    state.exp += 20;
    if (state.exp > 100 * state.lvl) { state.lvl++; state.exp=0; showToast("🎉 LEVEL UP!"); }
    showToast(`💰 Получено: ${state.currentOrder.pay} PLN`, "success");
    state.currentOrder = null;
    if (targetMarker) map.removeLayer(targetMarker);
    document.getElementById('order-info').style.display = 'none';
    saveGame(); updateMainButtonState();
}

// --- МАГАЗИНЫ ---

// 1. ЕДА (7-Eleven)
function openFoodShop() {
    const items = [
        { id: 'snickers', name: 'Сникерс', price: 8, effect: 'energy', val: 30, icon: '🍫' },
        { id: 'water', name: 'Вода 0.5', price: 4, effect: 'water', val: 40, icon: '💧' },
        { id: 'coffee', name: 'Кофе', price: 12, effect: 'energy', val: 15, icon: '☕' } // + mood
    ];
    renderShop("🏪 7-Eleven (Еда)", items, (item) => {
        if (state.cash >= item.price) {
            state.cash -= item.price;
            if (item.effect === 'energy') state.energy = Math.min(100, state.energy + item.val);
            if (item.effect === 'water') state.water = Math.min(100, state.water + item.val);
            showToast(`Съедено: ${item.name}`, "success");
            updateUI();
        } else showToast("Нет денег!", "error");
    });
}

// 2. ГАРАЖ И ТЕХНИКА
function openBikeShop() {
    // Формируем список: Сначала купленные (для выбора), потом некупленные (для покупки)
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    
    document.querySelector('#shop-modal h2').innerText = "🚲 Гараж & Магазин";

    Object.keys(BIKES_DB).forEach(key => {
        const bike = BIKES_DB[key];
        const isOwned = state.ownedBikes.includes(key);
        const isActive = state.activeBike === key;
        const hp = state.bikesHealth[key] || 100;
        const isBroken = state.repairTimers[key] > Date.now();

        const div = document.createElement('div');
        div.style.cssText = "padding:15px 0; border-bottom:1px solid rgba(255,255,255,0.1);";
        
        let statusHtml = '';
        let btnHtml = '';

        if (isOwned) {
            // Если куплен
            if (isActive) statusHtml = '<span style="color:#10b981; font-size:10px;">✅ ВЫБРАН</span>';
            else if (isBroken) statusHtml = '<span style="color:#ef4444; font-size:10px;">🛠 РЕМОНТ</span>';
            
            let hpColor = hp > 50 ? '#10b981' : (hp > 20 ? 'orange' : 'red');
            statusHtml += ` <span style="color:${hpColor}; font-size:10px;">HP: ${Math.floor(hp)}%</span>`;

            if (!isActive && !isBroken) {
                btnHtml = `<button onclick="equipBike('${key}')" style="background:#3b82f6; border:none; padding:5px 10px; border-radius:8px; color:white;">Взять</button>`;
            }
        } else {
            // Если не куплен
            btnHtml = `<button onclick="buyBike('${key}')" style="background:#f59e0b; border:none; padding:5px 10px; border-radius:8px; color:black;">Купить ${bike.price}</button>`;
        }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:14px;">${bike.name} ${statusHtml}</div>
                    <div style="font-size:11px; color:#aaa;">${bike.desc}</div>
                    <div style="font-size:10px; color:#666;">⚡Энергия: -${bike.energyCost} | 🚀Скор: x${bike.speed}</div>
                </div>
                <div>${btnHtml}</div>
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('shop-modal').style.display = 'flex';
}

// Вспомогательная функция для рендера обычного магазина
function renderShop(title, items, onBuy) {
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    document.querySelector('#shop-modal h2').innerText = title;
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item'; // Используем стили из HTML
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid rgba(255,255,255,0.1);";
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px">${item.icon}</span>
                <div>
                    <div style="font-weight:bold">${item.name}</div>
                    <div style="font-size:12px; color:#aaa;">${item.price} PLN</div>
                </div>
            </div>
        `;
        const btn = document.createElement('button');
        btn.innerText = "КУПИТЬ";
        btn.style.cssText = "background:#10b981; color:#000; border:none; padding:5px 15px; border-radius:15px; font-weight:bold; cursor:pointer;";
        btn.onclick = () => onBuy(item);
        
        div.appendChild(btn);
        list.appendChild(div);
    });
    document.getElementById('shop-modal').style.display = 'flex';
}

// --- ЛОГИКА ГАРАЖА ---
window.buyBike = function(key) {
    const bike = BIKES_DB[key];
    if (state.cash >= bike.price) {
        state.cash -= bike.price;
        state.ownedBikes.push(key);
        state.bikesHealth[key] = 100;
        showToast(`Куплен: ${bike.name}`, "success");
        updateUI();
        openBikeShop(); // Обновляем список
    } else {
        showToast("Не хватает денег!", "error");
    }
};

window.equipBike = function(key) {
    state.activeBike = key;
    showToast(`Вы пересели на: ${BIKES_DB[key].name}`);
    updateUI();
    updateMainButtonState();
    openBikeShop();
};

// --- ОБЩИЕ ФУНКЦИИ ---
function toggleRest() {
    isResting = !isResting;
    document.getElementById('rest-overlay').style.display = isResting ? 'flex' : 'none';
}

function drinkFreeWater() {
    const now = Date.now();
    if (now - lastDrinkTime < 60000) { showToast("Жди, фонтан набирается...", "info"); return; }
    state.water = Math.min(100, state.water + 30);
    lastDrinkTime = now;
    showToast("Вода восстановлена!", "success");
    updateUI();
}

function updateUI() {
    document.getElementById('cash-display').innerText = state.cash + ' PLN';
    document.getElementById('lvl-display').innerText = 'LVL ' + state.lvl;
    document.getElementById('energy-bar').style.width = state.energy + '%';
    document.getElementById('water-bar').style.width = state.water + '%';
    
    // Обновляем инфо о байке
    const bikeName = BIKES_DB[state.activeBike].name;
    const bikeHp = state.bikesHealth[state.activeBike] || 0;
    
    document.getElementById('bike-hp').innerText = `${bikeName} (${Math.floor(bikeHp)}%)`;
    document.getElementById('bike-bar').style.width = bikeHp + '%';
    document.getElementById('bike-bar').style.background = bikeHp > 50 ? '#10b981' : (bikeHp > 20 ? 'orange' : 'red');
}

function updateMainButtonState() {
    const btn = document.getElementById('main-btn');
    if (isResting) return;
    
    const hp = state.bikesHealth[state.activeBike] || 0;
    const isBroken = state.activeBike !== 'default' && hp <= 0;
    
    if (isBroken) {
        btn.innerHTML = '<i class="fas fa-tools"></i> СЛОМАН (ЖМИ)';
        btn.className = 'action-btn btn-repair'; // Красная кнопка
    } else if (state.currentOrder) {
        if (state.energy <= 0) {
            btn.innerHTML = '<i class="fas fa-walking"></i> УСТАЛ (ПЕШКОМ)';
            btn.className = 'action-btn btn-tired';
        } else {
            // Показываем скорость на кнопке
            const spd = BIKES_DB[state.activeBike].speed;
            let icon = spd > 2 ? 'fa-rocket' : 'fa-bicycle';
            btn.innerHTML = `<i class="fas ${icon}"></i> ЕХАТЬ (x${spd})`;
            btn.className = 'action-btn';
        }
    } else {
        btn.innerHTML = '<i class="fas fa-search"></i> НАЙТИ ЗАКАЗ';
        btn.className = 'action-btn';
    }
}

function showToast(msg, type="info") {
    const t = document.getElementById('toast');
    t.innerText = msg; t.style.display = 'block';
    t.style.border = type==='error'?'1px solid red':'1px solid #333';
    setTimeout(()=>t.style.display='none', 2000);
}

function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function loadGame() { 
    const saved = localStorage.getItem(SAVE_KEY); 
    if (saved) {
        const loaded = JSON.parse(saved);
        // Мержим с дефолтным стейтом, чтобы новые поля (bikesHealth) не были undefined
        state = { ...state, ...loaded };
        // Патч для старых сейвов без гаража
        if(!state.ownedBikes) state.ownedBikes = ['default'];
        if(!state.bikesHealth) state.bikesHealth = {'default': 100};
        if(!state.repairTimers) state.repairTimers = {};
    }
}

init();
