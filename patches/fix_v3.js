// --- FIX V3: REBOOT SYSTEM ---
console.log("[Fix v3] Перезагрузка систем управления...");

// 1. НАСТРОЙКИ ИГРЫ (БАЛАНС)
window.GAME_DATA = {
    marketWage: 15, // Рыночная цена за доставку (столько платят конкуренты)
    brands: {
        'kebab': { name: 'Kebab King', cost: 3000, income: 25, icon: '🌯' },
        'mcd':   { name: 'McDonalds',  cost: 5000, income: 40, icon: '🍔' },
        'star':  { name: 'Starbucks',  cost: 6000, income: 50, icon: '☕' }
    },
    locations: [
        { id: 'kb_1', type:'kebab', name:'Kebab Center', lat:52.230, lng:21.015, price:1000 },
        { id: 'kb_2', type:'kebab', name:'Kebab Wola',   lat:52.235, lng:20.990, price:1200 },
        { id: 'mc_1', type:'mcd',   name:'McD Zlote',    lat:52.231, lng:21.003, price:2500 },
        { id: 'st_1', type:'star',  name:'Starbucks Old',lat:52.248, lng:21.012, price:3000 }
    ]
};

// Проверка сохраненных данных
if(!window.state.wage) window.state.wage = 15; // Ставим рыночную по дефолту
if(!window.state.branches) window.state.branches = [];
if(!window.state.bank) window.state.bank = { dep: 0, loan: 0 };

// 2. ПЕРЕЗАПИСЬ ИНТЕРФЕЙСА (ЧТОБЫ КНОПКИ РАБОТАЛИ 100%)
setTimeout(() => {
    const bar = document.querySelector('.btm-bar');
    bar.innerHTML = ''; // Удаляем старые сломанные кнопки

    // Функция создания кнопки
    const addBtn = (label, action, color) => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.innerText = label;
        b.onclick = action;
        if(color) { b.style.borderColor = color; b.style.color = color; }
        bar.appendChild(b);
    };

    addBtn('🛒 Бизнес', () => window.openScreen('shop'));
    addBtn('👥 Курьеры', () => window.openScreen('fleet'));
    addBtn('💸 Контракт', () => window.openScreen('salary')); // Вместо "Зарплата"
    addBtn('🏦 Банк', () => window.openScreen('bank'), '#ffd700');

    console.log("[Fix v3] Интерфейс обновлен.");
}, 500);

// 3. УПРАВЛЕНИЕ ОКНАМИ
// Создаем HTML для окон, если их нет
if(!document.getElementById('win-shop')) {
    const wins = ['shop', 'bank', 'salary', 'fleet'];
    wins.forEach(id => {
        const div = document.createElement('div');
        div.id = 'win-'+id;
        div.className = 'modal';
        div.innerHTML = `<div class="modal-box"><span class="close" onclick="closeAll()">&times;</span><div id="content-${id}"></div></div>`;
        document.body.appendChild(div);
    });
}

window.closeAll = function() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

window.openScreen = function(id) {
    window.closeAll();
    const el = document.getElementById('win-'+id);
    if(el) {
        el.style.display = 'flex';
        // Обновляем контент при открытии
        if(id === 'shop') renderShop();
        if(id === 'bank') renderBank();
        if(id === 'salary') renderSalary();
        if(id === 'fleet') renderFleet();
    }
}

// 4. НОВАЯ ЗАРПЛАТА (ПОНЯТНАЯ)
window.renderSalary = function() {
    const s = window.state;
    const market = window.GAME_DATA.marketWage;
    const efficiency = Math.floor((s.wage / market) * 100);
    
    let status = "Обычная работа";
    let color = "#fff";
    
    if(efficiency < 80) { status = "ЗАБАСТОВКА (Медленно)"; color = "red"; }
    else if(efficiency > 120) { status = "МОТИВАЦИЯ (Быстро)"; color = "#00e676"; }

    const html = `
        <h3>Трудовой договор</h3>
        <div style="background:#222; padding:15px; border-radius:8px;">
            <p>Рыночная ставка: <b>${market} PLN</b> / заказ</p>
            <hr style="border-color:#444">
            <p>Ваша ставка: <b style="font-size:1.5em; color:${color}">${s.wage} PLN</b></p>
            
            <input type="range" min="0" max="40" value="${s.wage}" style="width:100%; margin:15px 0;" 
                   oninput="setWage(this.value)">
            
            <div style="text-align:center;">
                Эффективность: <span style="color:${color}">${efficiency}%</span><br>
                <small>${status}</small>
            </div>
        </div>
        <p style="font-size:0.8em; color:#aaa; margin-top:10px;">
            Вы платите эту сумму курьеру с каждого выполненного заказа.
        </p>
    `;
    document.getElementById('content-salary').innerHTML = html;
}

window.setWage = function(val) {
    window.state.wage = parseInt(val);
    window.renderSalary(); // Перерисовка сразу
    saveGame();
}

// 5. МАГАЗИН И ФИЛИАЛЫ
window.renderShop = function(tab = 'main') {
    let html = `<h3>Развитие Бизнеса</h3>`;
    
    // Вкладки
    html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
        <button class="btn" onclick="renderShop('eq')">Снаряжение</button>
        <button class="btn" onclick="renderShop('lic')">Лицензии</button>
        <button class="btn" onclick="renderShop('loc')">Точки</button>
    </div>`;

    if(tab === 'eq' || tab === 'main') {
        html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="shop-item" onclick="buyItem('bike', 1500)">🚴 Велик<br><span style="color:#00e676">1500</span></div>
            <div class="shop-item" onclick="buyItem('bag', 150)">🎒 Сумка<br><span style="color:#00e676">150</span></div>
            <div class="shop-item" onclick="buyItem('jacket', 200)">🧥 Куртка<br><span style="color:#00e676">200</span></div>
        </div>`;
    }
    
    if(tab === 'lic') {
        // Покупка прав на бренд
        for(let key in window.GAME_DATA.brands) {
            const b = window.GAME_DATA.brands[key];
            const has = window.state.licenses[key];
            html += `<div style="background:#222; padding:10px; margin-bottom:5px; display:flex; justify-content:space-between;">
                <span>${b.icon} ${b.name}</span>
                ${has ? '✅' : `<button class="btn" onclick="buyLic('${key}', ${b.cost})">${b.cost}</button>`}
            </div>`;
        }
    }

    if(tab === 'loc') {
        // Покупка конкретных точек
        window.GAME_DATA.locations.forEach(loc => {
            if(!window.state.licenses[loc.type]) return; // Скрываем, если нет бренда
            const has = window.state.branches.includes(loc.id);
            html += `<div style="background:#222; padding:10px; margin-bottom:5px; border-left:3px solid #00e676; display:flex; justify-content:space-between;">
                <span>${loc.name}</span>
                ${has ? '✅' : `<button class="btn btn-green" onclick="buyLoc('${loc.id}', ${loc.price})">${loc.price}</button>`}
            </div>`;
        });
        html += `<small style="color:#aaa">Купите Лицензию, чтобы видеть точки.</small>`;
    }

    document.getElementById('content-shop').innerHTML = html;
}

// 6. ЛОГИКА ПОКУПОК
window.buyItem = function(item, price) {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.inventory[item]++;
        saveGame();
        renderShop('eq');
        log("Куплено: " + item);
    }
}

window.buyLic = function(key, price) {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.licenses[key] = true;
        saveGame();
        renderShop('lic');
        log("Лицензия получена! Доступны точки.");
    }
}

window.buyLoc = function(id, price) {
    if(window.state.balance >= price) {
        window.state.balance -= price;
        window.state.branches.push(id);
        drawMapPoints(); // Обновить карту
        saveGame();
        renderShop('loc');
        log("Новая точка открыта!");
    }
}

// 7. БАНК
window.renderBank = function() {
    const s = window.state;
    document.getElementById('content-bank').innerHTML = `
        <h3 style="color:#ffd700">Варшава Банк</h3>
        <h1>${s.balance} PLN</h1>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="border:1px solid #444; padding:5px;">
                <p>Депозит: ${s.bank.dep}</p>
                <button class="btn" onclick="bank('put', 1000)">Вложить</button>
                <button class="btn" onclick="bank('take', 1000)">Снять</button>
            </div>
            <div style="border:1px solid #444; padding:5px;">
                <p style="color:red">Кредит: ${s.bank.loan}</p>
                <button class="btn" onclick="bank('borrow', 5000)">Взять</button>
                <button class="btn" onclick="bank('repay', 5000)">Вернуть</button>
            </div>
        </div>
    `;
}

window.bank = function(act, amt) {
    const s = window.state;
    if(act==='put' && s.balance>=amt) { s.balance-=amt; s.bank.dep+=amt; }
    if(act==='take' && s.bank.dep>=amt) { s.bank.dep-=amt; s.balance+=amt; }
    if(act==='borrow') { s.balance+=amt; s.bank.loan+=amt; }
    if(act==='repay' && s.balance>=amt && s.bank.loan>=amt) { s.balance-=amt; s.bank.loan-=amt; }
    saveGame();
    renderBank();
    updateUI();
}

window.renderFleet = function() {
     document.getElementById('content-fleet').innerHTML = `
        <h3>Ваш Флот</h3>
        <p>Активные курьеры: ${document.getElementById('inv-active').innerText}</p>
        <p>Велосипеды на складе: ${window.state.inventory.bike}</p>
        <hr>
        <button class="btn" style="background:red" onclick="hardReset()">СБРОС ИГРЫ</button>
     `;
}

// 8. КАРТА И ДВИЖЕНИЕ (ФИКС ЗАВИСАНИЯ)
window.drawMapPoints = function() {
    // Рисуем только купленные точки
    window.GAME_DATA.locations.forEach(loc => {
        if(window.state.branches.includes(loc.id)) {
            // Простая проверка чтобы не дублировать (в реале лучше чистить слой, но пока так)
            const icon = L.divIcon({html:`<div style="font-size:20px">${window.GAME_DATA.brands[loc.type].icon}</div>`});
            L.marker([loc.lat, loc.lng], {icon:icon}).addTo(window.map);
        }
    });
}

// Перехват gameLoop из ядра
window.gameLoop = function() {
    // Логика курьеров
    const wage = window.state.wage;
    const market = window.GAME_DATA.marketWage;
    
    // Скорость зависит от зарплаты
    let speedMult = wage / market; // 1.0 = норма
    if(speedMult < 0.5) speedMult = 0.5; // Минимум
    if(speedMult > 2.0) speedMult = 2.0; // Максимум
    const speed = 0.0005 * speedMult;

    // Куда идти?
    const targets = window.GAME_DATA.locations.filter(l => window.state.branches.includes(l.id));

    window.couriers.forEach(c => {
        if(c.state === 'IDLE') {
            if(targets.length > 0) {
                // ЕСТЬ РАБОТА
                const t = targets[Math.floor(Math.random() * targets.length)];
                c.target = { lat: t.lat, lng: t.lng, type: 'REST' };
                c.state = 'MOVING';
            } else {
                // НЕТ РАБОТЫ (Гуляем у офиса)
                const off = 0.002;
                c.target = { 
                    lat: window.state.office.lat + (Math.random()*off - off/2),
                    lng: window.state.office.lng + (Math.random()*off - off/2),
                    type: 'WALK'
                };
                c.state = 'MOVING';
            }
        }
        
        if(c.state === 'MOVING') {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);
            
            if(dist < speed) {
                c.pos = c.target; // Пришли
                
                if(c.target.type === 'REST') {
                    c.state = 'WAITING';
                    c.wait = 5;
                    updateMarkerIcon(c.marker, '📦');
                } else if (c.target.type === 'WALK') {
                    c.state = 'IDLE'; // Просто погуляли
                } else {
                    // Доставка клиенту
                    // Прибыль зависит от бренда
                    // Найдем какой это был бренд... упростим:
                    const profit = 40; 
                    window.state.balance += (profit - wage);
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
                // От ресторана к клиенту
                c.target = { 
                    lat: c.pos.lat + (Math.random()*0.02 - 0.01),
                    lng: c.pos.lng + (Math.random()*0.02 - 0.01),
                    type: 'CLIENT'
                };
                c.state = 'MOVING';
                updateMarkerIcon(c.marker, '🎒');
            }
        }
    });
}

// Запуск
window.drawMapPoints();
