// --- ULTRA PATCH: ПОЛНЫЙ ПЕРЕХВАТ УПРАВЛЕНИЯ ---
console.log("Загрузка ULTRA патча...");

// 1. НАСТРОЙКИ ЭКОНОМИКИ (ТВОЯ ФОРМУЛА)
window.GAME_OPTS = {
    restShare: 0.35, // 35% от чека
    brands: {
        'kebab': { name: 'Kebab King', cost: 3000, icon: '🌯' },
        'mcd':   { name: 'McDonalds',  cost: 5000, icon: '🍔' },
        'star':  { name: 'Starbucks',  cost: 6000, icon: '☕' }
    },
    locations: [
        { id: 'kb_center', type:'kebab', name:'Kebab Center', lat:52.230, lng:21.015, price:1000 },
        { id: 'kb_wola',   type:'kebab', name:'Kebab Wola',   lat:52.235, lng:20.990, price:1200 },
        { id: 'mc_zlota',  type:'mcd',   name:'McD Zlote',    lat:52.231, lng:21.003, price:2500 },
        { id: 'st_old',    type:'star',  name:'Starbucks Old',lat:52.248, lng:21.012, price:3000 }
    ]
};

// Проверка данных
if(!window.state) window.state = { balance: 5000, inventory: {bike:0, bag:0, jacket:0}, licenses:{}, branches:[], wage:15, bank:{credit:0, deposit:0} };
if(!window.state.bank) window.state.bank = { credit:0, deposit:0 };

// 2. ГЛАВНАЯ ФУНКЦИЯ: ПОЛНАЯ ПЕРЕРИСОВКА ИНТЕРФЕЙСА
// Мы удаляем всё старое, чтобы кнопки 100% работали
window.forceRebuildUI = function() {
    // Удаляем старые панели, оставляем только карту
    const oldUI = document.querySelectorAll('.ui-container, .modal, #start-overlay');
    oldUI.forEach(el => el.remove());

    // Создаем НОВУЮ оболочку
    const ui = document.createElement('div');
    ui.className = 'ui-container';
    ui.style = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999; display:flex; flex-direction:column; justify-content:space-between;";
    
    ui.innerHTML = `
        <div class="top-bar" style="background:rgba(0,0,0,0.8); padding:10px; border-bottom:2px solid #00e676; pointer-events:auto; display:flex; justify-content:space-between; color:#fff;">
            <div>💰 <span id="u-bal">${window.state.balance}</span> PLN</div>
            <div style="font-size:0.8em; color:#aaa;">VER: ULTRA WORKING</div>
        </div>

        <div id="u-logs" style="align-self:flex-end; padding:10px; max-height:200px; overflow:hidden; text-shadow:1px 1px 0 #000;"></div>

        <div class="btm-bar" style="background:rgba(0,0,0,0.9); padding:10px; display:flex; gap:5px; pointer-events:auto;">
            <button class="btn" onclick="window.openWin('shop')" style="flex:1; padding:15px; background:#222; color:#fff; border:1px solid #444;">🛒 Магазин</button>
            <button class="btn" onclick="window.openWin('fleet')" style="flex:1; padding:15px; background:#222; color:#fff; border:1px solid #444;">👥 Флот</button>
            <button class="btn" onclick="window.openWin('salary')" style="flex:1; padding:15px; background:#222; color:#fff; border:1px solid #444;">💸 ЗП</button>
            <button class="btn" onclick="window.openWin('bank')" style="flex:1; padding:15px; background:#222; color:#ffd700; border:1px solid #ffd700;">🏦 Банк</button>
        </div>
    `;
    document.body.appendChild(ui);

    // Создаем контейнер для окон
    const modalContainer = document.createElement('div');
    modalContainer.id = 'u-modal-con';
    modalContainer.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:none; align-items:center; justify-content:center; pointer-events:auto;";
    modalContainer.innerHTML = `<div id="u-modal-box" style="background:#1e1e1e; padding:20px; border-radius:10px; width:90%; max-width:400px; color:#fff; max-height:80vh; overflow-y:auto; border:1px solid #444;"></div>`;
    document.body.appendChild(modalContainer);
    
    console.log("UI ПЕРЕРИСОВАН ПОЛНОСТЬЮ");
};

// 3. ОТКРЫТИЕ ОКОН
window.openWin = function(name) {
    const con = document.getElementById('u-modal-con');
    const box = document.getElementById('u-modal-box');
    con.style.display = 'flex';
    
    let html = `<button onclick="document.getElementById('u-modal-con').style.display='none'" style="float:right; background:none; border:none; color:#fff; font-size:20px;">&times;</button>`;
    
    if(name === 'shop') html += renderShopHTML();
    if(name === 'bank') html += renderBankHTML();
    if(name === 'salary') html += renderSalaryHTML();
    if(name === 'fleet') html += renderFleetHTML();
    
    box.innerHTML = html;
};

// 4. ГЕНЕРАЦИЯ HTML ДЛЯ ОКОН
window.renderShopHTML = function() {
    return `
        <h3>Магазин</h3>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button onclick="window.uTab='eq'; window.openWin('shop')">Снаряга</button>
            <button onclick="window.uTab='lic'; window.openWin('shop')">Лицензии</button>
            <button onclick="window.uTab='loc'; window.openWin('shop')">Точки</button>
        </div>
        ${getShopContent(window.uTab || 'eq')}
    `;
};

function getShopContent(tab) {
    if(tab==='eq') return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <button onclick="uBuy('bike',1500)">🚴 Велик (1500)</button>
            <button onclick="uBuy('bag',150)">🎒 Сумка (150)</button>
            <button onclick="uBuy('jacket',200)">🧥 Куртка (200)</button>
        </div>`;
        
    if(tab==='lic') {
        let h = '';
        for(let k in window.GAME_OPTS.brands) {
            let b = window.GAME_OPTS.brands[k];
            let has = window.state.licenses[k] ? '✅' : `<button onclick="uLic('${k}',${b.cost})">${b.cost}</button>`;
            h += `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${b.name}</span>${has}</div>`;
        }
        return h;
    }
    
    if(tab==='loc') {
        let h = '';
        window.GAME_OPTS.locations.forEach(l => {
            if(!window.state.licenses[l.type]) return;
            let has = window.state.branches.includes(l.id) ? '✅' : `<button onclick="uBranch('${l.id}',${l.price})">${l.price}</button>`;
            h += `<div style="display:flex; justify-content:space-between; margin-bottom:5px; border-left:2px solid green; padding-left:5px;"><span>${l.name}</span>${has}</div>`;
        });
        return h || 'Сначала купите лицензию!';
    }
}

window.renderBankHTML = function() {
    const s = window.state;
    return `
        <h3 style="color:gold">Банк</h3>
        <h1>${s.balance} PLN</h1>
        <div style="border:1px solid #555; padding:10px; margin-bottom:10px;">
            <p>Кредит: <b style="color:red">${s.bank.credit}</b></p>
            <button onclick="uBank('get',5000)">Взять 5000</button>
            <button onclick="uBank('pay',5000)">Вернуть 5000</button>
        </div>
    `;
};

window.renderSalaryHTML = function() {
    return `
        <h3>Зарплата: ${window.state.wage} PLN</h3>
        <input type="range" min="0" max="50" value="${window.state.wage}" style="width:100%" oninput="window.state.wage=parseInt(this.value); document.querySelector('h3').innerText='Зарплата: '+this.value+' PLN'">
        <p style="font-size:0.8em; color:#aaa">35% от чека - ваши. Из них платите ЗП.</p>
    `;
};

window.renderFleetHTML = function() {
    return `<h3>Флот</h3><p>Активные: ${window.couriers.length}</p><p>Велосипедов: ${window.state.inventory.bike}</p>`;
};

// 5. ЛОГИКА (БЕЗ ЛИШНИХ ПРОВЕРОК)
window.uBuy = function(item, price) {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.inventory[item]++;
        uLog("Куплено: "+item);
        window.openWin('shop'); // Обновить
        uSave();
        window.checkFleet();
    }
};

window.uLic = function(k, price) {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.licenses[k] = true;
        uLog("Лицензия куплена!");
        window.openWin('shop');
        uSave();
    }
};

window.uBranch = function(id, price) {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.branches.push(id);
        uLog("Точка открыта!");
        window.openWin('shop');
        uSave();
        window.drawMap();
    }
};

window.uBank = function(act, amt) {
    if(act==='get') { window.state.balance += amt; window.state.bank.credit += amt; }
    if(act==='pay' && window.state.balance >= amt) { window.state.balance -= amt; window.state.bank.credit -= amt; }
    window.openWin('bank');
    uSave();
};

window.uLog = function(msg) {
    document.getElementById('u-logs').innerHTML += `<div>${msg}</div>`;
    document.getElementById('u-bal').innerText = window.state.balance;
};

window.uSave = function() {
    localStorage.setItem('WAW_COURIER_V3', JSON.stringify(window.state));
    document.getElementById('u-bal').innerText = window.state.balance;
};

// 6. КАРТА И ЦИКЛ
window.drawMap = function() {
    window.GAME_OPTS.locations.forEach(loc => {
        if(window.state.branches.includes(loc.id)) {
            L.marker([loc.lat, loc.lng]).addTo(window.map).bindTooltip(loc.name);
        }
    });
};

window.gameLoop = function() {
    // Простая логика движения
    const targets = window.GAME_OPTS.locations.filter(l => window.state.branches.includes(l.id));
    
    window.couriers.forEach(c => {
        if(targets.length === 0) return; // Нет работы
        
        if(c.state === 'IDLE') {
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
                    c.state = 'WAITING'; c.wait = 10;
                } else {
                    // Прибыль
                    let order = Math.floor(Math.random()*100)+25;
                    let profit = Math.floor(order * 0.35) - window.state.wage;
                    window.state.balance += profit;
                    uLog(`Заказ ${order}. Прибыль: ${profit}`);
                    c.state = 'IDLE';
                    uSave();
                }
            } else {
                c.pos.lat += dLat * 0.1; // Очень быстро для теста
                c.pos.lng += dLng * 0.1;
                c.marker.setLatLng([c.pos.lat, c.pos.lng]);
            }
        }
        if(c.state === 'WAITING') {
            c.wait--;
            if(c.wait<=0) {
                c.target = {lat: c.pos.lat+0.01, lng: c.pos.lng+0.01, type:'CLIENT'};
                c.state = 'MOVING';
            }
        }
    });
};

// ЗАПУСК (ЖДЕМ 1 СЕКУНДУ И ЛОМАЕМ СТАРЫЙ ИНТЕРФЕЙС)
setTimeout(() => {
    window.forceRebuildUI();
    window.drawMap();
    window.checkFleet(); // Старт курьеров
}, 1000);
