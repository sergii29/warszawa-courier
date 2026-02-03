// --- EMERGENCY BOOTLOADER v5 ---

// 1. ГЛОБАЛЬНЫЙ ПЕРЕХВАТ ОШИБОК (ЧТОБЫ ВИДЕТЬ ИХ НА ТЕЛЕФОНЕ)
window.onerror = function(msg, url, line) {
    const d = document.getElementById('debug-console');
    if(d) d.innerHTML += `<div style="color:red; border-bottom:1px solid #333;">❌ ERR: ${msg} (Line: ${line})</div>`;
};

// 2. СОЗДАЕМ КОНСОЛЬ НА ЭКРАНЕ
(function createDebugScreen() {
    // Чистим всё, кроме карты, если она есть
    document.querySelectorAll('.ui-container, .modal, #start-overlay').forEach(e => e.remove());
    
    // Создаем блок для логов
    const debug = document.createElement('div');
    debug.id = 'debug-console';
    debug.style = "position:absolute; top:0; left:0; width:100%; height:50%; background:rgba(0,0,0,0.8); color:#00e676; font-family:monospace; font-size:12px; z-index:99999; overflow-y:auto; padding:10px; pointer-events:none;";
    debug.innerHTML = "<div>🚀 SYSTEM BOOTING...</div>";
    document.body.appendChild(debug);
})();

function log(txt) {
    const d = document.getElementById('debug-console');
    if(d) d.innerHTML += `<div>> ${txt}</div>`;
    console.log(txt);
}

// 3. НАСТРОЙКИ
const CONFIG = { min: 25, max: 150, share: 0.35, wage: 15 };
const LOCATIONS = [
    { id: 'kb_1', type:'kebab', name:'Kebab Center', lat:52.230, lng:21.015, price:1000 },
    { id: 'kb_2', type:'kebab', name:'Kebab Wola',   lat:52.235, lng:20.990, price:1200 },
    { id: 'mc_1', type:'mcd',   name:'McD Zlote',    lat:52.231, lng:21.003, price:2500 }
];

// 4. ЗАПУСК (НЕ ЖДЕМ ONLOAD, ЗАПУСКАЕМ СРАЗУ)
setTimeout(() => {
    try {
        log("Step 1: Init Data...");
        if(!window.state) window.state = { balance:5000, inventory:{bike:0,bag:0,jacket:0}, licenses:{}, branches:[], wage:15, bank:{credit:0} };

        log("Step 2: Init Map...");
        initMap();

        log("Step 3: Init UI...");
        initUI();

        log("Step 4: Start Loop...");
        setInterval(gameLoop, 1000);

        log("✅ SUCCESS. Hiding Debug in 5s...");
        setTimeout(() => { document.getElementById('debug-console').style.display = 'none'; }, 5000);

    } catch (e) {
        log("FATAL ERROR: " + e.message);
    }
}, 500); // Небольшая задержка, чтобы HTML прогрузился

// --- ФУНКЦИИ ---

function initMap() {
    // Проверка контейнера
    let mapDiv = document.getElementById('map');
    if(!mapDiv) {
        log("⚠️ No #map div found! Creating one...");
        mapDiv = document.createElement('div');
        mapDiv.id = 'map';
        mapDiv.style = "height:100vh; width:100vw; z-index:1;";
        document.body.appendChild(mapDiv);
    }

    if(window.map) window.map.remove();
    
    // Проверка Leaflet
    if(typeof L === 'undefined') {
        throw new Error("Leaflet Library (L) not loaded!");
    }

    window.map = L.map('map', { zoomControl: false }).setView([52.230, 21.012], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(window.map);
    
    // Офис
    L.marker([52.2297, 21.0122]).addTo(window.map).bindTooltip("ОФИС").openTooltip();
}

function initUI() {
    // Удаляем старые окна
    document.querySelectorAll('.ui-container, .modal').forEach(e => e.remove());

    const ui = document.createElement('div');
    ui.className = 'ui-container';
    ui.innerHTML = `
        <div class="top-bar">
            <div>Баланс: <span id="ui-bal" style="color:#00e676; font-weight:bold;">${window.state.balance}</span></div>
        </div>
        <div class="btm-bar">
            <button class="btn" onclick="openW('shop')">🛒 Маг</button>
            <button class="btn" onclick="openW('fleet')">👥 Флот</button>
            <button class="btn" onclick="openW('bank')" style="color:gold">🏦 Банк</button>
        </div>
    `;
    document.body.appendChild(ui);

    // Окна
    const box = document.createElement('div');
    box.id = 'modal-box';
    box.className = 'modal';
    box.style.display = 'none';
    box.innerHTML = `<div class="modal-box" style="position:relative"><span onclick="closeW()" class="close" style="position:absolute; right:10px; top:5px;">&times;</span><div id="m-cont"></div></div>`;
    document.body.appendChild(box);
}

// Простые функции для окон
window.openW = function(id) {
    const m = document.getElementById('modal-box');
    const c = document.getElementById('m-cont');
    m.style.display = 'flex';
    if(id==='shop') c.innerHTML = `<h3>Магазин</h3><button class="btn" onclick="buy('bike',1500)">Велик (1500)</button><br><br><button class="btn" onclick="buy('lic_kb',3000)">Лиц. Кебаб (3000)</button>`;
    if(id==='fleet') c.innerHTML = `<h3>Флот</h3>Курьеров: ${window.couriers ? window.couriers.length : 0}`;
    if(id==='bank') c.innerHTML = `<h3>Банк</h3>Кредит: ${window.state.bank.credit}`;
}
window.closeW = () => document.getElementById('modal-box').style.display = 'none';

window.buy = function(i,p) {
    if(window.state.balance >= p) {
        window.state.balance -= p;
        if(i==='bike') window.state.inventory.bike++;
        document.getElementById('ui-bal').innerText = window.state.balance;
    }
}

// Цикл
window.couriers = [];
function gameLoop() {
    // Пока пустой, чтобы проверить запускается ли
}
