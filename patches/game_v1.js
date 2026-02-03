// --- WARSAW COURIER: FINAL LOGIC ---

// 1. НАСТРОЙКИ ИГРЫ
const CONFIG = {
    minOrder: 25,
    maxOrder: 150,
    restShare: 0.35, // Ресторан отдает нам 35%
    defaultWage: 15  // Начальная зарплата курьеру
};

// База данных брендов
const BRANDS = {
    'kebab': { name: 'Kebab King', cost: 3000, icon: '🌯' },
    'mcd':   { name: 'McDonalds',  cost: 5000, icon: '🍔' },
    'star':  { name: 'Starbucks',  cost: 6000, icon: '☕' }
};

// База данных точек (Франшизы)
const LOCATIONS = [
    { id: 'kb_center', type:'kebab', name:'Kebab Center', lat:52.230, lng:21.015, price:1000 },
    { id: 'kb_wola',   type:'kebab', name:'Kebab Wola',   lat:52.235, lng:20.990, price:1200 },
    { id: 'mc_zlote',  type:'mcd',   name:'McD Zlote',    lat:52.231, lng:21.003, price:2500 },
    { id: 'st_old',    type:'star',  name:'Starbucks Old',lat:52.248, lng:21.012, price:3000 },
    { id: 'kb_praga',  type:'kebab', name:'Kebab Praga',  lat:52.250, lng:21.030, price:1100 }
];

// 2. ИНИЦИАЛИЗАЦИЯ (СТАРТ)
window.onload = function() {
    initMap(); // Запускаем карту
    loadGame(); // Грузим сохранение
    initUI(); // Рисуем кнопки
    setInterval(gameLoop, 500); // Запускаем игру
};

// 3. КАРТА
function initMap() {
    // Удаляем карту если была (фикс дублей)
    if(window.map) { window.map.remove(); }
    
    window.map = L.map('map', { zoomControl: false }).setView([52.230, 21.012], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(window.map);

    // Добавляем Офис (Дом)
    const icon = L.divIcon({className: 'office-marker', html: '🏢', iconSize:[30,30]});
    window.officeMarker = L.marker([52.2297, 21.0122], {icon: icon}).addTo(window.map)
        .bindTooltip("Главный Офис", {direction:'top'});
}

// 4. СОХРАНЕНИЕ И ЗАГРУЗКА
function loadGame() {
    const save = localStorage.getItem('WAW_SAVE_FINAL');
    if (save) {
        window.state = JSON.parse(save);
    } else {
        // Старт с нуля
        window.state = {
            balance: 5000,
            inventory: { bike:0, bag:0, jacket:0 },
            licenses: {}, // Купленные бренды
            branches: [], // Купленные точки ID
            wage: CONFIG.defaultWage,
            bank: { credit:0 }
        };
    }
    // Проверка целостности
    if(!window.state.bank) window.state.bank = { credit:0 };
    
    // Рисуем купленные точки на карте
    drawLocations();
    // Спавним курьеров
    spawnFleet();
}

function saveGame() {
    localStorage.setItem('WAW_SAVE_FINAL', JSON.stringify(window.state));
    updateTopBar();
}

// 5. ИНТЕРФЕЙС (UI)
function initUI() {
    // Очистка старого HTML
    document.querySelectorAll('.ui-container, .modal').forEach(e => e.remove());

    const ui = document.createElement('div');
    ui.className = 'ui-container';
    ui.innerHTML = `
        <div class="top-bar">
            <div>Баланс: <span id="ui-bal" class="stat-val">0</span> PLN</div>
        </div>
        <div id="logs"></div>
        <div class="btm-bar">
            <button class="btn" onclick="openModal('shop')">🛒 Магазин</button>
            <button class="btn" onclick="openModal('fleet')">👥 Флот</button>
            <button class="btn" onclick="openModal('salary')">💸 Зарплата</button>
            <button class="btn" onclick="openModal('bank')" style="color:#ffd700; border-color:#ffd700">🏦 Банк</button>
        </div>
    `;
    document.body.appendChild(ui);
    updateTopBar();

    // Создаем пустые модальные окна
    ['shop', 'fleet', 'salary', 'bank'].forEach(id => {
        const m = document.createElement('div');
        m.id = 'modal-'+id;
        m.className = 'modal';
        m.innerHTML = `<div class="modal-box" id="content-${id}"></div>`;
        document.body.appendChild(m);
    });
}

function updateTopBar() {
    if(document.getElementById('ui-bal')) 
        document.getElementById('ui-bal').innerText = Math.floor(window.state.balance);
}

// ГЛОБАЛЬНЫЕ ФУНКЦИИ ОТКРЫТИЯ ОКОН
window.openModal = function(id) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById('modal-'+id).style.display = 'flex';
    
    if(id === 'shop') renderShop();
    if(id === 'fleet') renderFleet();
    if(id === 'salary') renderSalary();
    if(id === 'bank') renderBank();
}

window.closeModals = function() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// --- ЛОГИКА ОКОН ---

// МАГАЗИН (3 ВКЛАДКИ)
window.renderShop = function(tab = 'eq') {
    let html = `<span class="close" onclick="closeModals()">&times;</span><h3>Магазин</h3>`;
    
    html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
        <button class="btn" onclick="renderShop('eq')">Снаряжение</button>
        <button class="btn" onclick="renderShop('lic')">Лицензии</button>
        <button class="btn" onclick="renderShop('loc')">Франшиза</button>
    </div>`;

    // 1. СНАРЯЖЕНИЕ
    if(tab === 'eq') {
        html += `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🚲 Велик</div><div style="color:#00e676">1500</div>
                <button class="btn btn-green" onclick="buy('bike',1500)">Купить</button>
            </div>
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🎒 Сумка</div><div style="color:#00e676">150</div>
                <button class="btn btn-green" onclick="buy('bag',150)">Купить</button>
            </div>
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🧥 Куртка</div><div style="color:#00e676">200</div>
                <button class="btn btn-green" onclick="buy('jacket',200)">Купить</button>
            </div>
        </div>
        <p style="font-size:0.8em; color:#aaa; margin-top:10px;">Купите все 3 предмета, чтобы нанять 1 курьера.</p>`;
    }

    // 2. ЛИЦЕНЗИИ
    if(tab === 'lic') {
        for(let k in BRANDS) {
            let b = BRANDS[k];
            let has = window.state.licenses[k];
            html += `<div style="background:#222; padding:10px; margin-bottom:5px; display:flex; justify-content:space-between;">
                <span>${b.icon} ${b.name}</span>
                ${has ? '✅' : `<button class="btn" onclick="buyLic('${k}',${b.cost})">${b.cost}</button>`}
            </div>`;
        }
    }

    // 3. ФРАНШИЗА (ТОЧКИ)
    if(tab === 'loc') {
        let count = 0;
        LOCATIONS.forEach(loc => {
            if(!window.state.licenses[loc.type]) return; // Скрываем, если нет лицензии
            count++;
            let has = window.state.branches.includes(loc.id);
            html += `<div style="background:#222; padding:10px; margin-bottom:5px; border-left:3px solid #00e676; display:flex; justify-content:space-between;">
                <span>${loc.name}</span>
                ${has ? '✅ Работает' : `<button class="btn btn-green" onclick="buyBranch('${loc.id}',${loc.price})">${loc.price}</button>`}
            </div>`;
        });
        if(count === 0) html += `<p style="color:red">Сначала купите Лицензию!</p>`;
    }

    document.getElementById('content-shop').innerHTML = html;
}

// ФЛОТ
window.renderFleet = function() {
    let active = window.couriers.length;
    let inv = window.state.inventory;
    let html = `<span class="close" onclick="closeModals()">&times;</span><h3>Персонал</h3>
    <div style="font-size:1.2em; margin-bottom:10px;">Активные курьеры: <b style="color:#00e676">${active}</b></div>
    <div style="background:#222; padding:10px;">
        Склад:<br>
        🚲 ${inv.bike} | 🎒 ${inv.bag} | 🧥 ${inv.jacket}
    </div>`;
    
    // Проверка комплекта
    let max = Math.min(inv.bike, inv.bag, inv.jacket);
    if(max > active) {
        html += `<p style="color:#00e676">Снаряжение готово! Курьер выйдет автоматически.</p>`;
    } else {
        html += `<p style="color:#aaa">Купите снаряжение для найма.</p>`;
    }
    
    // Кнопка сброса
    html += `<hr><button class="btn" style="background:red; width:100%" onclick="hardReset()">СБРОС ИГРЫ</button>`;
    
    document.getElementById('content-fleet').innerHTML = html;
}

// ЗАРПЛАТА
window.renderSalary = function() {
    let w = window.state.wage;
    let html = `<span class="close" onclick="closeModals()">&times;</span><h3>Контракт</h3>
    <div style="background:#222; padding:15px; text-align:center;">
        <div style="font-size:2em; color:#00e676">${w} PLN</div>
        <input type="range" min="0" max="50" value="${w}" style="width:100%" oninput="setWage(this.value)">
        <p>Ваша выплата курьеру за 1 заказ.</p>
    </div>
    <div style="font-size:0.8em; color:#aaa; margin-top:10px;">
        Пример расчета:<br>
        Клиент платит: 100 PLN<br>
        Доля ресторана (35%): +35 PLN<br>
        Вы платите курьеру: -${w} PLN<br>
        <b>Ваша прибыль: ${35 - w} PLN</b>
    </div>`;
    document.getElementById('content-salary').innerHTML = html;
}

// БАНК
window.renderBank = function() {
    let s = window.state;
    let html = `<span class="close" onclick="closeModals()">&times;</span><h3 style="color:#ffd700">Банк</h3>
    <div style="text-align:center; font-size:1.5em; margin-bottom:10px;">${s.balance} PLN</div>
    <div style="border:1px solid #444; padding:10px;">
        <p>Кредит: <b style="color:red">${s.bank.credit}</b></p>
        <button class="btn" onclick="bankOp('get', 5000)">Взять 5000</button>
        <button class="btn" onclick="bankOp('pay', 5000)">Вернуть 5000</button>
    </div>`;
    document.getElementById('content-bank').innerHTML = html;
}


// --- ДЕЙСТВИЯ (ПОКУПКИ) ---

window.buy = function(item, cost) {
    if(window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.inventory[item]++;
        saveGame();
        spawnFleet(); // Проверка, может появился новый курьер
        renderShop('eq');
        log(`Куплено: ${item}`);
    } else log("Мало денег!", true);
}

window.buyLic = function(id, cost) {
    if(window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.licenses[id] = true;
        saveGame();
        renderShop('lic');
        log("Лицензия куплена!");
    } else log("Мало денег!", true);
}

window.buyBranch = function(id, cost) {
    if(window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.branches.push(id);
        drawLocations(); // Рисуем на карте
        saveGame();
        renderShop('loc');
        log("Точка открыта!");
    } else log("Мало денег!", true);
}

window.setWage = function(val) {
    window.state.wage = parseInt(val);
    renderSalary();
    saveGame();
}

window.bankOp = function(act, val) {
    if(act === 'get') {
        window.state.balance += val;
        window.state.bank.credit += val;
    }
    if(act === 'pay') {
        if(window.state.balance >= val && window.state.bank.credit >= val) {
            window.state.balance -= val;
            window.state.bank.credit -= val;
        }
    }
    saveGame();
    renderBank();
}

window.hardReset = function() {
    if(confirm("Точно удалить все?")) {
        localStorage.removeItem('WAW_SAVE_FINAL');
        location.reload();
    }
}

// --- ИГРОВАЯ ЛОГИКА ---

// Отрисовка точек на карте
function drawLocations() {
    LOCATIONS.forEach(loc => {
        if(window.state.branches.includes(loc.id)) {
            const b = BRANDS[loc.type];
            const icon = L.divIcon({html:`<div style="font-size:25px;">${b.icon}</div>`, className:''});
            // Не добавляем дубли
            // (в упрощенном варианте просто добавляем, Leaflet стерпит)
            L.marker([loc.lat, loc.lng], {icon:icon}).addTo(window.map);
        }
    });
}

// Спавн курьеров (если хватает шмота)
function spawnFleet() {
    if(!window.couriers) window.couriers = [];
    const inv = window.state.inventory;
    const max = Math.min(inv.bike, inv.bag, inv.jacket);
    
    while(window.couriers.length < max) {
        // Создаем курьера
        const c = {
            marker: L.marker([52.2297, 21.0122], {icon: L.divIcon({html:'🚴', className:'courier-marker'})}).addTo(window.map),
            pos: {lat: 52.2297, lng: 21.0122},
            target: null,
            state: 'IDLE',
            wait: 0
        };
        window.couriers.push(c);
        log("Новый курьер нанят!");
    }
}

// Главный цикл (Движение)
function gameLoop() {
    // Список доступных точек (куда ехать)
    const targets = LOCATIONS.filter(l => window.state.branches.includes(l.id));

    window.couriers.forEach(c => {
        
        // 1. СТОИТ (ИЩЕТ РАБОТУ)
        if(c.state === 'IDLE') {
            if(targets.length > 0) {
                // Едем в случайную открытую точку
                const t = targets[Math.floor(Math.random() * targets.length)];
                c.target = { lat: t.lat, lng: t.lng, type: 'REST' };
                c.state = 'MOVING';
            } else {
                // Работы нет - стоим у офиса
            }
        }
        
        // 2. ДВИЖЕНИЕ
        if(c.state === 'MOVING') {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);
            const speed = 0.0005;

            if(dist < speed) {
                // ПРИШЕЛ
                c.pos = c.target;
                
                if(c.target.type === 'REST') {
                    // Пришел в ресторан -> Ждет заказ
                    c.state = 'WAITING';
                    c.wait = 6; // 3 секунды
                    updateIcon(c.marker, '🥡');
                } else if(c.target.type === 'CLIENT') {
                    // Пришел к клиенту -> ДЕНЬГИ
                    calculateProfit();
                    c.state = 'IDLE'; // Свободен
                    updateIcon(c.marker, '🚴');
                }
            } else {
                // Идет
                const ratio = speed / dist;
                c.pos.lat += dLat * ratio;
                c.pos.lng += dLng * ratio;
                c.marker.setLatLng([c.pos.lat, c.pos.lng]);
            }
        }
        
        // 3. ОЖИДАНИЕ (В РЕСТОРАНЕ)
        if(c.state === 'WAITING') {
            c.wait--;
            if(c.wait <= 0) {
                // Получил заказ -> Идет к клиенту (Рандомная точка рядом)
                const off = 0.015;
                c.target = { 
                    lat: c.pos.lat + (Math.random()*off*2 - off), 
                    lng: c.pos.lng + (Math.random()*off*2 - off), 
                    type: 'CLIENT' 
                };
                c.state = 'MOVING';
                updateIcon(c.marker, '🎒');
            }
        }
    });
}

function calculateProfit() {
    // ТВОЯ ФОРМУЛА
    const order = Math.floor(Math.random() * (CONFIG.maxOrder - CONFIG.minOrder)) + CONFIG.minOrder; // Чек 25-150
    const gross = Math.floor(order * CONFIG.restShare); // Нам 35%
    const wage = window.state.wage; // Зарплата
    const profit = gross - wage; // Чистая прибыль

    window.state.balance += profit;
    saveGame();
    
    // Пишем в лог
    let color = profit > 0 ? '#00e676' : '#ff5252';
    log(`Заказ: ${order}. Прибыль: <span style="color:${color}">${profit}</span>`);
}

function updateIcon(marker, icon) {
    const el = marker.getElement();
    if(el) el.innerHTML = icon;
}

function log(msg, err) {
    const box = document.getElementById('logs');
    if(!box) return;
    const div = document.createElement('div');
    div.innerHTML = msg;
    div.className = 'log-msg';
    if(err) div.style.borderRight = '3px solid red';
    box.prepend(div);
    if(box.children.length > 6) box.lastChild.remove();
}
