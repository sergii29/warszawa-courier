// --- RELEASE PATCH: ECONOMY & MAP FIX ---
console.log("[RELEASE] Загрузка полной версии...");

// ИНДИКАТОР ВЕРСИИ (ЧТОБЫ ТЫ ВИДЕЛ ЧТО ПАТЧ РАБОТАЕТ)
setTimeout(() => {
    const ver = document.createElement('div');
    ver.style = "position:absolute; bottom:5px; right:5px; color:#00e676; z-index:9999; font-size:10px; font-family:monospace;";
    ver.innerText = "VER: 3.0 FINAL (CACHE CLEARED)";
    document.body.appendChild(ver);
}, 1000);

// 1. ДАННЫЕ ИГРЫ
window.GAME_DATA = {
    restShare: 0.35, 
    brands: {
        'kebab': { name: 'Kebab King', cost: 3000, icon: '🌯' },
        'mcd':   { name: 'McDonalds',  cost: 5000, icon: '🍔' },
        'star':  { name: 'Starbucks',  cost: 6000, icon: '☕' }
    },
    locations: [
        { id: 'kb_center', type:'kebab', name:'Kebab Center', lat:52.230, lng:21.015, price:1000 },
        { id: 'kb_wola',   type:'kebab', name:'Kebab Wola',   lat:52.235, lng:20.990, price:1200 },
        { id: 'mc_zlota',  type:'mcd',   name:'McD Zlote',    lat:52.231, lng:21.003, price:2500 },
        { id: 'st_old',    type:'star',  name:'Starbucks Old',lat:52.248, lng:21.012, price:3000 },
        { id: 'kb_praga',  type:'kebab', name:'Kebab Praga',  lat:52.250, lng:21.030, price:1100 }
    ]
};

if(!window.state.bank) window.state.bank = { credit: 0, deposit: 0 };
if(!window.state.branches) window.state.branches = []; 
if(!window.state.licenses) window.state.licenses = {}; 
if(!window.state.wage) window.state.wage = 15; 

// 2. ИНТЕРФЕЙС
setTimeout(() => {
    const bar = document.querySelector('.btm-bar');
    if(bar) {
        bar.innerHTML = ''; 
        const mkBtn = (name, fn, color) => {
            const b = document.createElement('button');
            b.className = 'btn'; 
            b.innerText = name; 
            b.onclick = fn;
            if(color) { b.style.color = color; b.style.borderColor = color; }
            bar.appendChild(b);
        };
        mkBtn('🛒 Магазин', () => window.openScreen('shop'));
        mkBtn('👥 Флот', () => window.openScreen('fleet'));
        mkBtn('💸 Зарплата', () => window.openScreen('salary'));
        mkBtn('🏦 Банк', () => window.openScreen('bank'), '#ffd700');
    }
    
    ['shop','fleet','salary','bank'].forEach(id => {
        const old = document.getElementById('win-'+id);
        if(old) old.remove();
        document.body.insertAdjacentHTML('beforeend', 
            `<div id="win-${id}" class="modal" style="display:none">
                <div class="modal-box" id="con-${id}"></div>
             </div>`
        );
    });
}, 500);

window.openScreen = function(id) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    const el = document.getElementById('win-'+id);
    if(el) {
        el.style.display = 'flex';
        if(id==='shop') renderShop();
        if(id==='bank') renderBank();
        if(id==='salary') renderSalary();
        if(id==='fleet') renderFleet();
    }
}
window.closeAll = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

// 3. МАГАЗИН
window.renderShop = function(tab = 'eq') {
    let h = `<span class="close" onclick="closeAll()">&times;</span><h3>🛒 Магазин</h3>`;
    h += `<div style="display:flex; gap:5px; margin-bottom:15px;">
        <button class="btn" onclick="renderShop('eq')">Снаряжение</button>
        <button class="btn" onclick="renderShop('lic')">Лицензии</button>
        <button class="btn" onclick="renderShop('loc')">Франшиза</button>
    </div>`;

    if(tab === 'eq') {
        h += `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🚲 Велик</div><div style="color:#00e676">1500</div>
                <button class="btn btn-green" onclick="buyItem('bike',1500)">Купить</button>
            </div>
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🎒 Сумка</div><div style="color:#00e676">150</div>
                <button class="btn btn-green" onclick="buyItem('bag',150)">Купить</button>
            </div>
            <div style="background:#222; padding:5px; text-align:center;">
                <div>🧥 Куртка</div><div style="color:#00e676">200</div>
                <button class="btn btn-green" onclick="buyItem('jacket',200)">Купить</button>
            </div>
        </div>`;
    }

    if(tab === 'lic') {
        for(let k in window.GAME_DATA.brands) {
            const b = window.GAME_DATA.brands[k];
            const has = window.state.licenses[k];
            h += `<div style="background:#222; padding:10px; margin-bottom:5px; display:flex; justify-content:space-between;">
                <span>${b.icon} ${b.name}</span>
                ${has ? '✅' : `<button class="btn" onclick="buyLic('${k}',${b.cost})">${b.cost}</button>`}
            </div>`;
        }
    }

    if(tab === 'loc') {
        let count = 0;
        window.GAME_DATA.locations.forEach(loc => {
            if(!window.state.licenses[loc.type]) return; 
            count++;
            const has = window.state.branches.includes(loc.id);
            h += `<div style="background:#222; padding:10px; margin-bottom:5px; border-left:3px solid #00e676; display:flex; justify-content:space-between;">
                <span>${loc.name}</span>
                ${has ? '✅ Работает' : `<button class="btn btn-green" onclick="buyBranch('${loc.id}',${loc.price})">${loc.price}</button>`}
            </div>`;
        });
        if(count === 0) h += `<p style="color:red; text-align:center;">Сначала купите Лицензию!</p>`;
    }
    document.getElementById('con-shop').innerHTML = h;
}

// 4. БАНК
window.renderBank = function() {
    const s = window.state;
    let h = `<span class="close" onclick="closeAll()">&times;</span><h3 style="color:#ffd700">🏦 Варшава Банк</h3>`;
    h += `<div style="text-align:center; margin-bottom:20px;">
            <div style="font-size:2em;">${s.balance} PLN</div>
            <div style="color:#aaa">Текущий баланс</div>
          </div>`;
    h += `<div style="border:1px solid #444; padding:15px; border-radius:8px;">
            <h4>Кредитная линия</h4>
            <p>Ваш долг: <span style="color:red; font-weight:bold;">${s.bank.credit} PLN</span></p>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn" style="background:#00e676; color:#000" onclick="bankOp('get', 5000)">Взять 5000</button>
                <button class="btn" style="background:#d32f2f;" onclick="bankOp('pay', 5000)">Вернуть 5000</button>
            </div>
          </div>`;
    document.getElementById('con-bank').innerHTML = h;
}

// 5. ЗАРПЛАТА
window.renderSalary = function() {
    const s = window.state;
    let h = `<span class="close" onclick="closeAll()">&times;</span><h3>💸 Финансы</h3>`;
    h += `<div style="background:#222; padding:15px; border-radius:8px;">
            <p>Ставка курьеру: <b style="color:#00e676; font-size:1.4em;">${s.wage} PLN</b></p>
            <input type="range" min="0" max="50" value="${s.wage}" style="width:100%" oninput="setWage(this.value)">
            <p style="font-size:0.8em; color:#aaa">Ресторан дает 35%. Из них платишь курьеру.</p>
          </div>`;
    document.getElementById('con-salary').innerHTML = h;
}

window.renderFleet = function() {
    const s = window.state;
    let h = `<span class="close" onclick="closeAll()">&times;</span><h3>👥 Персонал</h3>`;
    h += `<div>Активных курьеров: <b style="color:#00e676">${document.getElementById('inv-active').innerText}</b></div>`;
    h += `<hr><div>🚲 ${s.inventory.bike} | 🎒 ${s.inventory.bag} | 🧥 ${s.inventory.jacket}</div>`;
    document.getElementById('con-fleet').innerHTML = h;
}

// 6. ДЕЙСТВИЯ
window.buyItem = (item, price) => {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.inventory[item]++;
        saveGame(); renderShop('eq'); checkFleet();
        log(`Куплено: ${item}`);
    } else log("Нет денег!", true);
}
window.buyLic = (k, price) => {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.licenses[k] = true;
        saveGame(); renderShop('lic');
        log(`Лицензия ${window.GAME_DATA.brands[k].name} получена!`);
    } else log("Нет денег!", true);
}
window.buyBranch = (id, price) => {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.branches.push(id);
        saveGame(); renderShop('loc'); drawMap();
        log("Точка открыта!");
    } else log("Нет денег!", true);
}
window.bankOp = (op, amt) => {
    if(op==='get') { window.state.balance += amt; window.state.bank.credit += amt; }
    if(op==='pay' && window.state.balance >= amt) { window.state.balance -= amt; window.state.bank.credit -= amt; }
    saveGame(); renderBank(); updateUI();
}
window.setWage = (val) => {
    window.state.wage = parseInt(val);
    document.querySelector('#con-salary b').innerText = val + ' PLN';
    saveGame();
}

// 7. КАРТА И ЛОГИКА
window.drawMap = function() {
    window.GAME_DATA.locations.forEach(loc => {
        if(window.state.branches.includes(loc.id)) {
            const icon = L.divIcon({ html:`<div style="font-size:24px;">${window.GAME_DATA.brands[loc.type].icon}</div>`, className:'' });
            L.marker([loc.lat, loc.lng], {icon:icon}).addTo(window.map);
        }
    });
}

window.gameLoop = function() {
    const targets = window.GAME_DATA.locations.filter(l => window.state.branches.includes(l.id));
    
    window.couriers.forEach(c => {
        if(targets.length === 0 && c.state === 'IDLE') return; 

        if(c.state === 'IDLE') {
            const t = targets[Math.floor(Math.random() * targets.length)];
            c.target = { lat: t.lat, lng: t.lng, type: 'REST' };
            c.state = 'MOVING';
        }
        
        if(c.state === 'MOVING') {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);
            const speed = 0.0005; 

            if(dist < speed) {
                c.pos = c.target;
                if(c.target.type === 'REST') {
                    c.state = 'WAITING';
                    c.wait = 5; 
                    updateMarkerIcon(c.marker, '🥡');
                } else {
                    const orderValue = Math.floor(Math.random() * (150 - 25 + 1)) + 25;
                    const grossProfit = Math.floor(orderValue * window.GAME_DATA.restShare);
                    const courierPay = window.state.wage;
                    const netProfit = grossProfit - courierPay;
                    
                    window.state.balance += netProfit;
                    log(`Чек: ${orderValue}. Вам: +${grossProfit}. ЗП: -${courierPay}.`);
                    saveGame();
                    updateUI();
                    c.state = 'IDLE';
                    updateMarkerIcon(c.marker, '🚴');
                }
            } else {
                c.pos.lat += dLat * (speed/dist);
                c.pos.lng += dLng * (speed/dist);
                c.marker.setLatLng([c.pos.lat, c.pos.lng]);
            }
        }
        if(c.state === 'WAITING') {
            c.wait--;
            if(c.wait <= 0) {
                c.target = { lat: c.pos.lat + (Math.random()*0.02 - 0.01), lng: c.pos.lng + (Math.random()*0.02 - 0.01), type: 'CLIENT' };
                c.state = 'MOVING';
                updateMarkerIcon(c.marker, '🎒');
            }
        }
    });
}
window.drawMap();
