// --- WARSAW COURIER: FINAL FIX ---

// 1. НАСТРОЙКИ
const CONFIG = {
    minOrder: 25,
    maxOrder: 150,
    restShare: 0.35, 
    defaultWage: 15  
};

const BRANDS = {
    'kebab': { name: 'Kebab King', cost: 3000, icon: '🌯' },
    'mcd':   { name: 'McDonalds',  cost: 5000, icon: '🍔' },
    'star':  { name: 'Starbucks',  cost: 6000, icon: '☕' }
};

const LOCATIONS = [
    { id: 'kb_center', type:'kebab', name:'Kebab Center', lat:52.230, lng:21.015, price:1000 },
    { id: 'kb_wola',   type:'kebab', name:'Kebab Wola',   lat:52.235, lng:20.990, price:1200 },
    { id: 'mc_zlota',  type:'mcd',   name:'McD Zlote',    lat:52.231, lng:21.003, price:2500 },
    { id: 'st_old',    type:'star',  name:'Starbucks Old',lat:52.248, lng:21.012, price:3000 },
    { id: 'kb_praga',  type:'kebab', name:'Kebab Praga',  lat:52.250, lng:21.030, price:1100 }
];

// 2. СТАРТ ИГРЫ (ИСПРАВЛЕНО ЗАВИСАНИЕ)
window.onload = function() {
    console.log("ЗАПУСК ИГРЫ...");
    
    // !!! ГЛАВНОЕ ИСПРАВЛЕНИЕ: УДАЛЯЕМ ЗАСТАВКУ !!!
    const overlay = document.getElementById('start-overlay');
    if(overlay) overlay.style.display = 'none';

    // Запускаем системы
    initMap(); 
    loadGame(); 
    initUI(); 
    setInterval(gameLoop, 500);
    
    console.log("ИГРА ЗАПУЩЕНА");
};

// 3. КАРТА
function initMap() {
    if(window.map) window.map.remove();
    window.map = L.map('map', { zoomControl: false }).setView([52.230, 21.012], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(window.map);
    
    // Офис
    const icon = L.divIcon({className: 'office-marker', html: '🏢', iconSize:[30,30]});
    window.officeMarker = L.marker([52.2297, 21.0122], {icon: icon}).addTo(window.map);
}

// 4. СОХРАНЕНИЕ
function loadGame() {
    const save = localStorage.getItem('WAW_SAVE_FINAL');
    if (save) {
        window.state = JSON.parse(save);
    } else {
        window.state = {
            balance: 5000,
            inventory: { bike:0, bag:0, jacket:0 },
            licenses: {},
            branches: [],
            wage: CONFIG.defaultWage,
            bank: { credit:0 }
        };
    }
    // Проверки на всякий случай
    if(!window.state.bank) window.state.bank = { credit:0 };
    if(!window.state.licenses) window.state.licenses = {};
    if(!window.state.branches) window.state.branches = [];

    drawLocations();
    spawnFleet();
}

function saveGame() {
    localStorage.setItem('WAW_SAVE_FINAL', JSON.stringify(window.state));
    updateTopBar();
}

// 5. ИНТЕРФЕЙС
function initUI() {
    // Удаляем всё старое, чтобы не мешало
    document.querySelectorAll('.ui-container, .modal').forEach(e => e.remove());

    const ui = document.createElement('div');
    ui.className = 'ui-container';
    ui.innerHTML = `
        <div class="top-bar">
            <div>Баланс: <span id="ui-bal" class="stat-val">0</span> PLN</div>
        </div>
        <div id="logs" style="position:absolute; top:50px; right:10px; width:200px; max-height:300px; overflow:hidden; pointer-events:none;"></div>
        <div class="btm-bar">
            <button class="btn" onclick="openModal('shop')">🛒 Магазин</button>
            <button class="btn" onclick="openModal('fleet')">👥 Флот</button>
            <button class="btn" onclick="openModal('salary')">💸 Зарплата</button>
            <button class="btn" onclick="openModal('bank')" style="color:#ffd700; border-color:#ffd700">🏦 Банк</button>
        </div>
    `;
    document.body.appendChild(ui);
    updateTopBar();

    ['shop', 'fleet', 'salary', 'bank'].forEach(id => {
        const m = document.createElement('div');
        m.id = 'modal-'+id;
        m.className = 'modal';
        m.style.display = 'none';
        m.innerHTML = `<div class="modal-box" id="content-${id}"></div>`;
        document.body.appendChild(m);
    });
}

function updateTopBar() {
    const el = document.getElementById('ui-bal');
    if(el) el.innerText = Math.floor(window.state.balance);
}

// ОКНА
window.openModal = function(id) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    const m = document.getElementById('modal-'+id);
    if(m) {
        m.style.display = 'flex';
        if(id === 'shop') renderShop();
        if(id === 'fleet') renderFleet();
        if(id === 'salary') renderSalary();
        if(id === 'bank') renderBank();
    }
}

window.closeModals = function() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// --- ОТРИСОВКА ОКОН ---

window.renderShop = function(tab = 'eq') {
    let html = `<span class="close" onclick="closeModals()">&times;</span><h3>Магазин</h3>`;
    html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
        <button class="btn" onclick="renderShop('eq')">Снаряжение</button>
        <button class="btn" onclick="renderShop('lic')">Лицензии</button>
        <button class="btn" onclick="renderShop('loc')">Франшиза</button>
    </div>`;

    if(tab === 'eq') {
        html += `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🚲</div><div style="color:#00e676">1500</div>
                <button class="btn btn-green" onclick="buy('bike',1500)">Куп</button>
            </div>
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🎒</div><div style="color:#00e676">150</div>
                <button class="btn btn-green" onclick="buy('bag',150)">Куп</button>
            </div>
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🧥</div><div style="color:#00e676">200</div>
                <button class="btn btn-green" onclick="buy('jacket',200)">Куп</button>
            </div>
        </div>`;
    }

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

    if(tab === 'loc') {
        let count = 0;
        LOCATIONS.forEach(loc => {
            if(!window.state.licenses[loc.type]) return;
            count++;
            let has = window.state.branches.includes(loc.id);
            html += `<div style="background:#222; padding:10px; margin-bottom:5px; border-left:3px solid #00e676; display:flex; justify-content:space-between;">
                <span>${loc.name}</span>
                ${has ? '✅' : `<button class="btn btn-green" onclick="buyBranch('${loc.id}',${loc.price})">${loc.price}</button>`}
            </div>`;
        });
        if(count === 0) html += `<p style="color:red">Нет лицензий!</p>`;
    }
    document.getElementById('content-shop').innerHTML = html;
}

window.renderFleet = function() {
    let active = window.couriers.length;
    let inv = window.state.inventory;
    document.getElementById('content-fleet').innerHTML = 
    `<span class="close" onclick="closeModals()">&times;</span><h3>Флот</h3>
    <div>Активные: <b style="color:#00e676">${active}</b></div>
    <div>Склад: 🚲${inv.bike} 🎒${inv.bag} 🧥${inv.jacket}</div>
    <hr><button class="btn" style="background:red; width:100%" onclick="hardReset()">СБРОС</button>`;
}

window.renderSalary = function() {
    let w = window.state.wage;
    document.getElementById('content-salary').innerHTML = 
    `<span class="close" onclick="closeModals()">&times;</span><h3>Зарплата</h3>
    <div style="text-align:center;">
        <h1 style="color:#00e676">${w} PLN</h1>
        <input type="range" min="0" max="50" value="${w}" style="width:100%" oninput="setWage(this.value)">
        <p>Вы платите это с каждого заказа.</p>
    </div>`;
}

window.renderBank = function() {
    let s = window.state;
    document.getElementById('content-bank').innerHTML = 
    `<span class="close" onclick="closeModals()">&times;</span><h3>Банк</h3>
    <h1 style="text-align:center">${s.balance} PLN</h1>
    <div style="border:1px solid #444; padding:10px;">
        <p>Долг: <b style="color:red">${s.bank.credit}</b></p>
        <button class="btn" onclick="bankOp('get', 5000)">Взять 5к</button>
        <button class="btn" onclick="bankOp('pay', 5000)">Вернуть 5к</button>
    </div>`;
}

// --- ДЕЙСТВИЯ ---
window.buy = function(item, cost) {
    if(window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.inventory[item]++;
        saveGame(); spawnFleet(); renderShop('eq');
        log(`Куплено: ${item}`);
    }
}
window.buyLic = function(id, cost) {
    if(window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.licenses[id] = true;
        saveGame(); renderShop('lic');
    }
}
window.buyBranch = function(id, cost) {
    if(window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.branches.push(id);
        drawLocations(); saveGame(); renderShop('loc');
    }
}
window.setWage = function(val) {
    window.state.wage = parseInt(val);
    renderSalary(); saveGame();
}
window.bankOp = function(act, val) {
    if(act === 'get') { window.state.balance += val; window.state.bank.credit += val; }
    if(act === 'pay' && window.state.balance >= val) { window.state.balance -= val; window.state.bank.credit -= val; }
    saveGame(); renderBank();
}
window.hardReset = function() {
    if(confirm("Сброс?")) { localStorage.removeItem('WAW_SAVE_FINAL'); location.reload(); }
}

// --- ЛОГИКА ---
function drawLocations() {
    LOCATIONS.forEach(loc => {
        if(window.state.branches.includes(loc.id)) {
            const b = BRANDS[loc.type];
            const icon = L.divIcon({html:`<div style="font-size:25px;">${b.icon}</div>`, className:''});
            L.marker([loc.lat, loc.lng], {icon:icon}).addTo(window.map);
        }
    });
}

function spawnFleet() {
    if(!window.couriers) window.couriers = [];
    const inv = window.state.inventory;
    const max = Math.min(inv.bike, inv.bag, inv.jacket);
    while(window.couriers.length < max) {
        const c = {
            marker: L.marker([52.2297, 21.0122], {icon: L.divIcon({html:'🚴', className:'courier-marker'})}).addTo(window.map),
            pos: {lat: 52.2297, lng: 21.0122},
            target: null, state: 'IDLE', wait: 0
        };
        window.couriers.push(c);
    }
}

function gameLoop() {
    const targets = LOCATIONS.filter(l => window.state.branches.includes(l.id));
    window.couriers.forEach(c => {
        if(c.state === 'IDLE' && targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)];
            c.target = { lat: t.lat, lng: t.lng, type: 'REST' };
            c.state = 'MOVING';
        }
        if(c.state === 'MOVING') {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);
            if(dist < 0.0005) {
                c.pos = c.target;
                if(c.target.type === 'REST') {
                    c.state = 'WAITING'; c.wait = 6;
                    updateIcon(c.marker, '🥡');
                } else {
                    // ПРИБЫЛЬ
                    const order = Math.floor(Math.random() * 125) + 25;
                    const profit = Math.floor(order * CONFIG.restShare) - window.state.wage;
                    window.state.balance += profit;
                    saveGame();
                    log(`Заказ: ${order}. Прибыль: ${profit}`);
                    c.state = 'IDLE';
                    updateIcon(c.marker, '🚴');
                }
            } else {
                c.pos.lat += dLat * (0.0005 / dist);
                c.pos.lng += dLng * (0.0005 / dist);
                c.marker.setLatLng([c.pos.lat, c.pos.lng]);
            }
        }
        if(c.state === 'WAITING') {
            c.wait--;
            if(c.wait <= 0) {
                const off = 0.015;
                c.target = { lat: c.pos.lat+(Math.random()*off*2-off), lng: c.pos.lng+(Math.random()*off*2-off), type:'CLIENT' };
                c.state = 'MOVING';
                updateIcon(c.marker, '🎒');
            }
        }
    });
}

function updateIcon(m, h) { if(m.getElement()) m.getElement().innerHTML = h; }
function log(t) {
    const b = document.getElementById('logs');
    if(b) {
        b.innerHTML = `<div style="background:rgba(0,0,0,0.7); margin-bottom:2px; padding:2px 5px; border-left:3px solid #00e676;">${t}</div>` + b.innerHTML;
        if(b.children.length > 5) b.lastChild.remove();
    }
}
