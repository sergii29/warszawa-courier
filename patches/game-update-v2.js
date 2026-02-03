// --- SUPER PATCH V2: ПОЛНАЯ ПЕРЕЗАГРУЗКА ЭКОНОМИКИ ---
console.log("[Patch v2] Загрузка единой системы (Банк, Налоги, Филиалы)...");

// 1. НАСТРОЙКИ И ДАННЫЕ
const CONFIG = {
    taxRate: 0.10,        // Налог 10%
    taxInterval: 300000,  // 5 минут
    rentCost: 50,         // Аренда 50 монет
    rentInterval: 300000, // 5 минут
    bankDepoRate: 0.01,   // 1% в минуту
    bankLoanRate: 0.05    // 5% в минуту
};

const BRANDS = {
    'kebab': { name: 'Kebab King', price: 3000, icon: '🌯' },
    'mcd':   { name: 'McDonalds',  price: 5000, icon: '🍔' },
    'star':  { name: 'Starbucks',  price: 6000, icon: '☕' },
    'sushi': { name: 'Sushi Master', price: 7000, icon: '🍣' }
};

const LOCATIONS = [
    { id: 'kb_center', brand: 'kebab', name: 'Kebab Centrum', lat: 52.230, lng: 21.015, price: 1000 },
    { id: 'kb_wola',   brand: 'kebab', name: 'Kebab Wola',    lat: 52.235, lng: 20.990, price: 1200 },
    { id: 'mc_zloty',  brand: 'mcd',   name: 'McD Zlote T.',  lat: 52.231, lng: 21.003, price: 2500 },
    { id: 'st_nowy',   brand: 'star',  name: 'Starbucks N.S', lat: 52.233, lng: 21.018, price: 3000 },
    { id: 'su_mok',    brand: 'sushi', name: 'Sushi Mokotow', lat: 52.200, lng: 21.025, price: 4000 }
];

// Инициализация переменных сохранения
if (!window.state.bank) window.state.bank = { deposit: 0, loan: 0 };
if (!window.state.branches) window.state.branches = [];
if (typeof window.state.wage === 'undefined') window.state.wage = 10;

// 2. ИНТЕРФЕЙС (КНОПКИ И МОДАЛКИ)
// Очищаем нижнюю панель и создаем заново, чтобы не дублировать
setTimeout(() => {
    const btmBar = document.querySelector('.btm-bar');
    btmBar.innerHTML = ''; // Чистим старые кнопки
    
    // Создаем новые кнопки
    const btns = [
        { text: '🛒 Магазин', onclick: "openModal('shop')" },
        { text: '👥 Флот', onclick: "openModal('fleet')" },
        { text: '💸 Зарплата', onclick: "openModal('salary')" },
        { text: '🏦 Банк', onclick: "openModal('bank')", color: '#ffd700' }
    ];

    btns.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = b.text;
        btn.onclick = () => eval(b.onclick); // Простой биндинг
        if(b.color) { btn.style.borderColor = b.color; btn.style.color = b.color; }
        btmBar.appendChild(btn);
    });
}, 200);

// Добавляем HTML модалок
const modalsHTML = `
<div id="modal-bank" class="modal">
    <div class="modal-box">
        <span class="close" onclick="closeModals()">&times;</span>
        <h3 style="color:#ffd700">Варшава Банк</h3>
        <p>Баланс: <span id="bank-cash" style="color:#fff">0</span> PLN</p>
        <div style="border:1px solid #444; padding:10px; margin-bottom:10px;">
            <h4>Вклад (1%/мин)</h4>
            <div style="color:#00e676">В банке: <span id="bank-depo">0</span></div>
            <button class="btn" onclick="bankAction('depo_in', 1000)">Положить 1k</button>
            <button class="btn" onclick="bankAction('depo_out', 1000)">Снять 1k</button>
        </div>
        <div style="border:1px solid #444; padding:10px;">
            <h4>Кредит (5%/мин)</h4>
            <div style="color:#ff5252">Долг: <span id="bank-loan">0</span></div>
            <button class="btn" onclick="bankAction('loan_get', 5000)">Взять 5k</button>
            <button class="btn" onclick="bankAction('loan_pay', 5000)">Вернуть 5k</button>
        </div>
    </div>
</div>

<div id="modal-stats" class="modal">
    <div class="modal-box">
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>📊 Статистика</h3>
        <p>💰 Деньги: <span id="st-bal"></span></p>
        <p>🏦 Депозит: <span id="st-depo"></span></p>
        <p>📉 Долг: <span id="st-loan" style="color:red"></span></p>
        <hr>
        <p>🚴 Курьеры: <span id="st-couriers"></span></p>
        <p>🏪 Точки: <span id="st-branches"></span></p>
        <p>💸 Зарплата: <span id="st-wage"></span></p>
    </div>
</div>

<div id="modal-salary" class="modal">
    <div class="modal-box">
        </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalsHTML);

// 3. ПЕРЕХВАТ ОТКРЫТИЯ ОКОН (ГЛАВНЫЙ ФИКС)
const coreOpenModal = window.openModal; // Сохраняем оригинал из core.js

window.openModal = function(id) {
    // Сначала обновляем данные внутри окна
    if (id === 'shop') renderShopV2();
    if (id === 'bank') updateBankUI();
    if (id === 'stats') updateStatsUI();
    if (id === 'salary') renderSalaryUI();

    // Показываем само окно
    document.getElementById('modal-' + id).style.display = 'flex';
}

// 4. ЛОГИКА МАГАЗИНА (ВКЛАДКИ)
window.renderShopV2 = function() {
    const box = document.querySelector('#modal-shop .modal-box');
    box.innerHTML = `
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>Магазин</h3>
        <div style="display:flex; gap:5px; margin-bottom:15px;">
             <button class="btn" style="padding:5px; font-size:0.8em;" onclick="switchTab('items')">Снаряжение</button>
             <button class="btn" style="padding:5px; font-size:0.8em;" onclick="switchTab('licenses')">Лицензии</button>
             <button class="btn" style="padding:5px; font-size:0.8em;" onclick="switchTab('branches')">Филиалы</button>
        </div>
        
        <div id="tab-items">
             <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div style="background:#222; padding:5px; border-radius:5px; text-align:center;">
                    <div>Велик</div><div style="color:#00e676">1500</div>
                    <button class="btn btn-green" onclick="buy('bike', 1500)">Купить</button>
                </div>
                <div style="background:#222; padding:5px; border-radius:5px; text-align:center;">
                    <div>Сумка</div><div style="color:#00e676">150</div>
                    <button class="btn btn-green" onclick="buy('bag', 150)">Купить</button>
                </div>
                <div style="background:#222; padding:5px; border-radius:5px; text-align:center;">
                    <div>Куртка</div><div style="color:#00e676">200</div>
                    <button class="btn btn-green" onclick="buy('jacket', 200)">Купить</button>
                </div>
            </div>
        </div>

        <div id="tab-licenses" style="display:none;">
            ${Object.keys(BRANDS).map(k => {
                const b = BRANDS[k];
                const has = window.state.licenses[k];
                return `<div style="background:#222; padding:10px; margin-bottom:5px; display:flex; justify-content:space-between;">
                    <span>${b.icon} ${b.name}</span>
                    ${has ? '<span style="color:#aaa">Куплено</span>' : `<button class="btn" style="padding:2px 10px;" onclick="buyLic('${k}', ${b.price})">${b.price}</button>`}
                </div>`;
            }).join('')}
        </div>

        <div id="tab-branches" style="display:none; max-height:300px; overflow-y:auto;">
            ${LOCATIONS.map(loc => {
                const hasLic = window.state.licenses[loc.brand];
                if (!hasLic) return '';
                const hasBranch = window.state.branches.includes(loc.id);
                return `<div style="background:#222; padding:10px; margin-bottom:5px; display:flex; justify-content:space-between; border-left:3px solid #00e676;">
                    <span>${loc.name}</span>
                    ${hasBranch ? '<span style="color:#aaa">✅</span>' : `<button class="btn btn-green" style="padding:2px 10px;" onclick="buyBranch('${loc.id}', ${loc.price})">${loc.price}</button>`}
                </div>`;
            }).join('')}
        </div>
    `;
}

window.switchTab = function(t) {
    ['items','licenses','branches'].forEach(x => document.getElementById('tab-'+x).style.display = 'none');
    document.getElementById('tab-'+t).style.display = 'block';
}

// 5. ДЕЙСТВИЯ (ПОКУПКИ, БАНК)
window.buyLic = function(id, price) {
    if (window.state.balance >= price) {
        window.state.balance -= price;
        window.state.licenses[id] = true;
        saveGame();
        renderShopV2();
        log(`Лицензия куплена! Теперь доступны филиалы.`);
    } else log("Мало денег!", true);
}

window.buyBranch = function(id, price) {
    if (window.state.balance >= price) {
        window.state.balance -= price;
        window.state.branches.push(id);
        
        // Рисуем на карте
        const loc = LOCATIONS.find(l => l.id === id);
        const b = BRANDS[loc.brand];
        const icon = L.divIcon({ html: `<div style="font-size:25px;">${b.icon}</div>`, className:'' });
        L.marker([loc.lat, loc.lng], {icon: icon}).addTo(window.map);

        saveGame();
        renderShopV2();
        log(`Открыта точка: ${loc.name}`);
    } else log("Мало денег!", true);
}

window.bankAction = function(type, amount) {
    const s = window.state;
    if (type === 'depo_in' && s.balance >= amount) { s.balance-=amount; s.bank.deposit+=amount; }
    if (type === 'depo_out' && s.bank.deposit >= amount) { s.bank.deposit-=amount; s.balance+=amount; }
    if (type === 'loan_get') { s.balance+=amount; s.bank.loan+=amount; }
    if (type === 'loan_pay' && s.balance >= amount && s.bank.loan >= amount) { s.balance-=amount; s.bank.loan-=amount; }
    saveGame();
    updateBankUI();
    updateUI();
}

// 6. ЗАРПЛАТА UI
window.renderSalaryUI = function() {
    const w = window.state.wage;
    const mood = w < 5 ? '🤬' : (w < 15 ? '😐' : '🤩');
    document.querySelector('#modal-salary .modal-box').innerHTML = `
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>Зарплата</h3>
        <h1 style="color:#00e676; text-align:center;">${w} PLN</h1>
        <input type="range" min="0" max="50" value="${w}" style="width:100%" oninput="setWage(this.value)">
        <p style="text-align:center">Настроение: ${mood}</p>
    `;
}
window.setWage = function(val) {
    window.state.wage = parseInt(val);
    renderSalaryUI();
    saveGame();
}

// 7. ОБНОВЛЕНИЕ UI
window.updateBankUI = function() {
    document.getElementById('bank-cash').innerText = window.state.balance;
    document.getElementById('bank-depo').innerText = window.state.bank.deposit;
    document.getElementById('bank-loan').innerText = window.state.bank.loan;
}

window.updateStatsUI = function() {
    document.getElementById('st-bal').innerText = window.state.balance;
    document.getElementById('st-depo').innerText = window.state.bank.deposit;
    document.getElementById('st-loan').innerText = window.state.bank.loan;
    document.getElementById('st-couriers').innerText = document.getElementById('inv-active').innerText;
    document.getElementById('st-branches').innerText = window.state.branches.length;
    document.getElementById('st-wage').innerText = window.state.wage;
}

// 8. СТАРТ ИГРЫ (Отрисовка точек)
const _origResume = window.resumeGame;
window.resumeGame = function() {
    _origResume();
    
    // Рисуем купленные филиалы
    LOCATIONS.forEach(loc => {
        if (window.state.branches.includes(loc.id)) {
            const b = BRANDS[loc.brand];
            const icon = L.divIcon({ html: `<div style="font-size:25px;">${b.icon}</div>`, className:'' });
            L.marker([loc.lat, loc.lng], {icon: icon}).addTo(window.map);
        }
    });

    // Клик по офису
    if (window.officeMarker) {
        window.officeMarker.on('click', () => window.openModal('stats'));
        window.officeMarker.bindTooltip("Статистика", {direction:'top'});
    }
}

// 9. ГЛАВНЫЙ ЦИКЛ (Налоги, Банк, Аренда)
let lastMinute = Date.now();
let lastRent = Date.now();

// Полностью заменяем gameLoop, чтобы не зависеть от core.js таймеров
window.gameLoop = function() {
    const now = Date.now();

    // 1. АРЕНДА + НАЛОГ (5 минут)
    if (now - lastRent > CONFIG.rentInterval) {
        lastRent = now;
        const tax = Math.floor(window.state.balance * CONFIG.taxRate);
        const total = CONFIG.rentCost + tax;
        
        window.state.balance -= total;
        saveGame();
        log(`💸 Аренда (${CONFIG.rentCost}) + Налог (${tax}) = -${total}`, true);
        updateUI();
    }
    
    // Таймер аренды визуальный
    const left = CONFIG.rentInterval - (now - lastRent);
    const m = Math.floor(left/60000);
    const s = Math.floor((left%60000)/1000);
    const timerEl = document.getElementById('ui-timer');
    if(timerEl) timerEl.innerText = `${m}:${s<10?'0':''}${s}`;

    // 2. БАНК (1 минута)
    if (now - lastMinute > 60000) {
        lastMinute = now;
        if(window.state.bank.deposit > 0) {
            const profit = Math.floor(window.state.bank.deposit * CONFIG.bankDepoRate);
            window.state.bank.deposit += profit;
            log(`🏦 % по вкладу: +${profit}`);
        }
        if(window.state.bank.loan > 0) {
            const debt = Math.ceil(window.state.bank.loan * CONFIG.bankLoanRate);
            window.state.bank.loan += debt;
            log(`🏦 % по кредиту: -${debt}`, true);
        }
        updateBankUI();
    }

    // 3. ДВИЖЕНИЕ
    moveCouriersAdvanced();
}

// 10. УМНОЕ ДВИЖЕНИЕ КУРЬЕРОВ
window.moveCouriersAdvanced = function() {
    const wage = window.state.wage;
    let speed = 0.0003 * (0.5 + (wage/20));
    if (speed > 0.0008) speed = 0.0008; // Limit

    // Курьеры идут к купленным филиалам
    const targets = LOCATIONS.filter(l => window.state.branches.includes(l.id));
    
    window.couriers.forEach(c => {
        if (c.state === 'IDLE') {
            if (targets.length > 0) {
                const t = targets[Math.floor(Math.random() * targets.length)];
                c.target = { lat: t.lat, lng: t.lng, type: 'REST' };
                c.state = 'MOVING';
            }
        }
        else if (c.state === 'MOVING') {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);
            
            if (dist < speed) {
                c.pos = c.target;
                if (c.target.type === 'REST') {
                    c.state = 'WAITING';
                    c.wait = 4;
                    updateMarkerIcon(c.marker, '🥡');
                } else {
                    const rev = Math.floor(Math.random()*30)+20;
                    window.state.balance += (rev - wage);
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
        else if (c.state === 'WAITING') {
            c.wait--;
            if(c.wait<=0) {
                c.target = { lat: c.pos.lat+(Math.random()*0.02-0.01), lng: c.pos.lng+(Math.random()*0.02-0.01), type:'CLIENT' };
                c.state = 'MOVING';
            }
        }
    });
}
