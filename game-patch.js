// --- WARSAW COURIER GAME LOGIC (PATCH) ---
const tg = window.Telegram.WebApp;
tg.expand();

// 1. КЛЮЧ СОХРАНЕНИЯ
const SAVE_KEY = 'WARSAWBEST'; 

// Карта
const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([52.2297, 21.0122], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

const courierIcon = L.divIcon({ html: '<div style="background:#3b82f6; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px #3b82f6;"></div>', className: 'cm' });
const targetIcon = L.divIcon({ html: '<div style="background:#ef4444; width:15px; height:15px; border-radius:50%; border:2px solid white; animation: pulse 1s infinite;"></div>', className: 'tm' });

let courierMarker = L.marker([52.2297, 21.0122], {icon: courierIcon}).addTo(map);
let targetMarker = null;

// 2. СОСТОЯНИЕ (Добавили поле deadline)
let state = {
    cash: 50,
    energy: 100, water: 100, mood: 100,
    bike: 100, gear: 100,
    exp: 0, lvl: 1,
    currentOrder: null // Тут теперь будет храниться { dest, pay, deadline }
};

let pendingOrder = null;
let offerInterval = null;
let isResting = false;
let lastDrinkTime = 0;

// 3. ИНИЦИАЛИЗАЦИЯ
function init() {
    loadGame();
    updateUI();
    updateMainButtonState();
    
    // Если игра была загружена с активным заказом, восстанавливаем маркер
    if (state.currentOrder && state.currentOrder.dest) {
        if (targetMarker) map.removeLayer(targetMarker);
        targetMarker = L.marker(state.currentOrder.dest, {icon: targetIcon}).addTo(map);
        document.getElementById('order-info').style.display = 'block';
    }

    setInterval(autoTick, 1000); 
    setInterval(saveGame, 5000);
}

// 4. ГЛАВНЫЙ ЦИКЛ (ТИКЕР)
function autoTick() {
    const now = Date.now();

    // -- ЛОГИКА ОТДЫХА --
    if (isResting) {
        if (state.energy < 100) {
            state.energy += 2; // Быстрое восстановление
            if(state.energy > 100) state.energy = 100;
            document.getElementById('rest-bar').style.width = state.energy + '%';
        } else {
            showToast("🔋 Вы полностью отдохнули!");
            toggleRest(); 
        }
    }

    // -- ЛОГИКА ТАЙМЕРА ЗАКАЗА --
    if (state.currentOrder) {
        // Проверяем время
        if (now > state.currentOrder.deadline) {
            failOrderTimeout(); // ВРЕМЯ ВЫШЛО!
        } else {
            // Показываем таймер
            const secondsLeft = Math.floor((state.currentOrder.deadline - now) / 1000);
            const m = Math.floor(secondsLeft / 60);
            const s = secondsLeft % 60;
            document.getElementById('time-left').innerText = `${m}:${s < 10 ? '0'+s : s}`;
            document.getElementById('timer-widget').style.display = 'block';
        }
        
        // Медленный расход воды в работе
        if (!isResting && Math.random() < 0.1) state.water -= 1;
    } else {
        document.getElementById('timer-widget').style.display = 'none';
        // Если нет заказа и энергия < 50, медленно регеним (сидим на лавке)
        if(!isResting && state.energy < 50) state.energy += 0.1;
    }
    
    updateUI();
}

// 5. ДВИЖЕНИЕ И ПЕДАЛИ
function pedal() {
    if (isResting) { toggleRest(); return; }

    // Ремонт
    if (state.bike <= 0) {
        if (state.energy >= 10) {
            state.energy -= 10; state.bike += 15;
            showToast("🔧 Починил (+15% HP)", "success");
        } else showToast("😫 Нет сил чинить! Отдохни.", "error");
        updateUI(); updateMainButtonState(); return;
    }

    // Поиск
    if (!state.currentOrder) { findOrder(); return; }

    // Езда
    let speedMultiplier = 1;
    let energyCost = 2;

    if (state.energy <= 0) {
        // Усталость (Пешком)
        speedMultiplier = 0.2; 
        energyCost = 0;
        showToast("🐌 Сил нет... Пешком.", "error");
    } else {
        state.energy = Math.max(0, state.energy - energyCost);
    }

    const dest = state.currentOrder.dest;
    const pos = courierMarker.getLatLng();
    const moveStep = 0.1 * speedMultiplier;
    const newLat = pos.lat + (dest[0] - pos.lat) * moveStep; 
    const newLng = pos.lng + (dest[1] - pos.lng) * moveStep;

    courierMarker.setLatLng([newLat, newLng]);
    map.setView([newLat, newLng]); 

    state.bike = Math.max(0, state.bike - 0.5); 
    state.gear = Math.max(0, state.gear - 0.2);

    const dist = map.distance([newLat, newLng], dest);
    document.getElementById('dist-display').innerText = Math.floor(dist);

    if (dist < 20) finishOrder();
    
    updateUI(); updateMainButtonState();
}

// 6. СИСТЕМА ЗАКАЗОВ
function findOrder() {
    const center = [52.2297, 21.0122];
    const dest = [ center[0] + (Math.random() - 0.5) * 0.03, center[1] + (Math.random() - 0.5) * 0.03 ];
    
    // Рассчитываем время на доставку
    const dist = map.distance(center, dest); // Примерная дистанция от центра
    // Даем: 60 сек базы + 1 сек на каждые 10 метров
    const secondsAllowed = 60 + Math.floor(dist / 10); 
    
    pendingOrder = { 
        dest: dest, 
        pay: 15 + Math.floor(Math.random() * 25),
        timeLimitSeconds: secondsAllowed
    };

    document.getElementById('offer-price').innerText = pendingOrder.pay + " PLN";
    
    const m = Math.floor(secondsAllowed / 60);
    const s = secondsAllowed % 60;
    document.getElementById('offer-time').innerText = `${m} мин ${s} сек`;

    document.getElementById('offer-modal').style.display = 'flex';
    
    if(offerInterval) clearTimeout(offerInterval);
    offerInterval = setTimeout(() => rejectOrder(true), 10000); 
}

function acceptOrder() {
    clearTimeout(offerInterval);
    document.getElementById('offer-modal').style.display = 'none';
    
    // Устанавливаем ДЕДЛАЙН
    state.currentOrder = pendingOrder;
    state.currentOrder.deadline = Date.now() + (pendingOrder.timeLimitSeconds * 1000);
    
    if (targetIcon) map.removeLayer(targetIcon);
    targetMarker = L.marker(state.currentOrder.dest, {icon: targetIcon}).addTo(map);
    
    document.getElementById('order-info').style.display = 'block';
    showToast(`✅ Принято! Успей за ${Math.floor(pendingOrder.timeLimitSeconds/60)} мин!`, "success");
    
    updateMainButtonState(); saveGame();
}

function rejectOrder(timeout=false) {
    clearTimeout(offerInterval);
    document.getElementById('offer-modal').style.display = 'none';
    state.cash -= 5;
    showToast(timeout ? "⏰ Долго думал (-5 PLN)" : "❌ Отказ (-5 PLN)", "error");
    updateUI();
}

function failOrderTimeout() {
    state.currentOrder = null;
    if (targetMarker) map.removeLayer(targetMarker);
    document.getElementById('order-info').style.display = 'none';
    document.getElementById('timer-widget').style.display = 'none';
    
    // Штраф
    state.cash -= 10;
    showToast("💀 ВРЕМЯ ВЫШЛО! Клиент отменил заказ. (-10 PLN)", "error");
    
    saveGame();
    updateMainButtonState();
}

function finishOrder() {
    state.cash += state.currentOrder.pay;
    state.exp += 10;
    if (state.exp > 100 * state.lvl) { state.lvl++; state.exp=0; showToast("🎉 LEVEL UP!"); }
    
    showToast(`💵 УСПЕЛ! +${state.currentOrder.pay} PLN`, "success");
    
    state.currentOrder = null;
    if (targetMarker) map.removeLayer(targetMarker);
    document.getElementById('order-info').style.display = 'none';
    document.getElementById('timer-widget').style.display = 'none';
    
    saveGame(); updateMainButtonState();
}

// 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function toggleRest() {
    isResting = !isResting;
    const overlay = document.getElementById('rest-overlay');
    if (isResting) {
        overlay.style.display = 'flex';
        document.getElementById('rest-bar').style.width = state.energy + '%';
    } else {
        overlay.style.display = 'none';
    }
}

function drinkFreeWater() {
    const now = Date.now();
    if (now - lastDrinkTime < 60000) { showToast(`⏳ Жди еще ${Math.ceil((60000-(now-lastDrinkTime))/1000)} сек.`); return; }
    state.water = Math.min(100, state.water + 25);
    lastDrinkTime = now; showToast("💧 +25% Воды", "success"); updateUI();
}

const items = [
    { id: 'snickers', name: 'Сникерс', price: 10, effect: { energy: 40 }, icon: '🍫' },
    { id: 'coffee', name: 'Кофе', price: 15, effect: { energy: 20, mood: 20 }, icon: '☕' },
    { id: 'repair', name: 'Мастерская', price: 40, effect: { bike: 100 }, icon: '🔧' }
];

function openShop() {
    const list = document.getElementById('shop-list'); list.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid rgba(255,255,255,0.1);";
        div.innerHTML = `<div><span style="font-size:20px">${item.icon}</span> <b>${item.name}</b> <div style="font-size:12px;color:#aaa">${item.price} PLN</div></div> <button onclick="buyItem('${item.id}')" style="background:#10b981; border:none; padding:5px 15px; border-radius:15px;">Купить</button>`;
        list.appendChild(div);
    });
    document.getElementById('shop-modal').style.display = 'flex';
}

function buyItem(id) {
    const item = items.find(i => i.id === id);
    if (state.cash >= item.price) {
        state.cash -= item.price;
        if (item.effect.energy) state.energy = Math.min(100, state.energy + item.effect.energy);
        if (item.effect.water) state.water = Math.min(100, state.water + item.effect.water);
        if (item.effect.bike) state.bike = Math.min(100, state.bike + item.effect.bike);
        showToast(`Куплено: ${item.name}`, "success"); updateUI();
    } else showToast("❌ Нет денег!", "error");
}

function updateUI() {
    document.getElementById('cash-display').innerText = state.cash + ' PLN';
    document.getElementById('lvl-display').innerText = 'LVL ' + state.lvl;
    document.getElementById('energy-bar').style.width = state.energy + '%';
    document.getElementById('water-bar').style.width = state.water + '%';
    document.getElementById('bike-bar').style.width = state.bike + '%';
    document.getElementById('bike-hp').innerText = Math.floor(state.bike) + '%';
}

function updateMainButtonState() {
    const btn = document.getElementById('main-btn');
    if (isResting) return;

    if (state.bike <= 0) {
        btn.innerHTML = '<i class="fas fa-wrench"></i> ЧИНИТЬ';
        btn.className = 'action-btn btn-repair';
    } else if (state.currentOrder) {
        if (state.energy <= 0) {
            btn.innerHTML = '<i class="fas fa-walking"></i> ИДТИ ПЕШКОМ (Медленно)';
            btn.className = 'action-btn btn-tired';
        } else {
            btn.innerHTML = '<i class="fas fa-bicycle"></i> КРУТИТЬ ПЕДАЛИ';
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
    t.style.border = type === 'error' ? '1px solid red' : '1px solid #333';
    setTimeout(() => t.style.display = 'none', 2000);
}

function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function loadGame() { const saved = localStorage.getItem(SAVE_KEY); if (saved) state = JSON.parse(saved); }

// ЗАПУСК
init();
