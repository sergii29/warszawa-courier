// --- ПАТЧ V2: БАНК, НАЛОГИ, ФРАНШИЗЫ, СТАТИСТИКА ---
console.log("[Patch v2] Загрузка продвинутой экономики...");

// 1. ДАННЫЕ: БРЕНДЫ И ФИЛИАЛЫ
// Теперь у нас есть Бренды (покупаем право) и Локации (покупаем точки)
const BRANDS = {
    'kebab': { name: 'Kebab King', price: 3000, icon: '🌯' },
    'mcd':   { name: 'McDonalds',  price: 5000, icon: '🍔' },
    'star':  { name: 'Starbucks',  price: 6000, icon: '☕' },
    'sushi': { name: 'Sushi Master', price: 7000, icon: '🍣' }
};

// Список всех возможных точек в Варшаве
const LOCATIONS = [
    { id: 'kb_center', brand: 'kebab', name: 'Kebab Centrum', lat: 52.230, lng: 21.015, price: 1000 },
    { id: 'kb_wola',   brand: 'kebab', name: 'Kebab Wola',    lat: 52.235, lng: 20.990, price: 1200 },
    { id: 'kb_praga',  brand: 'kebab', name: 'Kebab Praga',   lat: 52.250, lng: 21.030, price: 900 },
    
    { id: 'mc_zloty',  brand: 'mcd',   name: 'McD Zlote T.',  lat: 52.231, lng: 21.003, price: 2500 },
    { id: 'mc_wist',   brand: 'mcd',   name: 'McD Wisla',     lat: 52.220, lng: 21.040, price: 2000 },
    
    { id: 'st_nowy',   brand: 'star',  name: 'Starbucks N.S', lat: 52.233, lng: 21.018, price: 3000 },
    { id: 'st_old',    brand: 'star',  name: 'Starbucks Old', lat: 52.248, lng: 21.012, price: 3200 },

    { id: 'su_mok',    brand: 'sushi', name: 'Sushi Mokotow', lat: 52.200, lng: 21.025, price: 4000 }
];

// 2. ИНИЦИАЛИЗАЦИЯ НОВЫХ ДАННЫХ
if (!window.state.bank) {
    window.state.bank = { deposit: 0, loan: 0 }; // Депозит и Кредит
}
if (!window.state.branches) {
    window.state.branches = []; // Купленные филиалы (ID)
}

// 3. ПЕРЕПИСЫВАЕМ ИНТЕРФЕЙС
// Заменяем кнопку "Аренда" на "Банк" в нижней панели
setTimeout(() => {
    const btmBar = document.querySelector('.btm-bar');
    // Удаляем старую кнопку аренды/зарплаты если они мешают, или просто меняем текст последней кнопки
    // По дефолту у нас: Магазин, Флот, Аренда (или Зарплата из v1)
    // Давайте найдем кнопку с "Аренда" или добавим новую
    
    // Добавим кнопку БАНК
    const bankBtn = document.createElement('button');
    bankBtn.className = 'btn';
    bankBtn.style.borderColor = '#ffd700';
    bankBtn.style.color = '#ffd700';
    bankBtn.innerText = '🏦 Банк';
    bankBtn.onclick = () => window.openModal('bank');
    btmBar.appendChild(bankBtn);
}, 500);

// Добавляем HTML для модалки Банка и Статистики
document.body.insertAdjacentHTML('beforeend', `
<div id="modal-bank" class="modal">
    <div class="modal-box">
        <span class="close" onclick="closeModals()">&times;</span>
        <h3 style="color:#ffd700">Варшава Банк</h3>
        <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px;">
            <div>💰 Ваш баланс: <span id="bank-cash" style="color:#fff">0</span></div>
        </div>
        
        <div style="margin-bottom:15px; border:1px solid #444; padding:10px;">
            <h4>Депозит (1% / мин)</h4>
            <div style="font-size:1.2em; color:#00e676; margin-bottom:5px;">На счету: <span id="bank-depo">0</span> PLN</div>
            <button class="btn" onclick="bankAction('depo_in', 1000)">Положить 1k</button>
            <button class="btn" onclick="bankAction('depo_out', 1000)">Снять 1k</button>
        </div>

        <div style="margin-bottom:15px; border:1px solid #444; padding:10px;">
            <h4>Кредит (5% / мин)</h4>
            <div style="font-size:1.2em; color:#ff5252; margin-bottom:5px;">Долг: <span id="bank-loan">0</span> PLN</div>
            <button class="btn" onclick="bankAction('loan_get', 5000)">Взять 5k</button>
            <button class="btn" onclick="bankAction('loan_pay', 5000)">Вернуть 5k</button>
        </div>
    </div>
</div>

<div id="modal-stats" class="modal">
    <div class="modal-box">
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>📊 Статистика Бизнеса</h3>
        <hr>
        <p>Наличные: <span id="st-bal"></span></p>
        <p>В банке: <span id="st-depo"></span></p>
        <p>Долг: <span id="st-loan" style="color:red"></span></p>
        <hr>
        <p>Курьеры: <span id="st-couriers"></span></p>
        <p>Зарплата: <span id="st-wage"></span> PLN/заказ</p>
        <p>Точки: <span id="st-branches"></span> шт.</p>
        <hr>
        <p style="font-size:0.8em; color:#aaa">Налог 10% от всей суммы снимается каждые 5 минут.</p>
    </div>
</div>
`);

// 4. ЛОГИКА БАНКА
window.bankAction = function(type, amount) {
    const s = window.state;
    
    if (type === 'depo_in') {
        if (s.balance >= amount) { s.balance -= amount; s.bank.deposit += amount; log(`Депозит: +${amount}`); }
    }
    else if (type === 'depo_out') {
        if (s.bank.deposit >= amount) { s.bank.deposit -= amount; s.balance += amount; log(`Снято: ${amount}`); }
    }
    else if (type === 'loan_get') {
        s.balance += amount; s.bank.loan += amount; log(`Кредит взят: ${amount}`);
    }
    else if (type === 'loan_pay') {
        if (s.balance >= amount && s.bank.loan >= amount) { 
            s.balance -= amount; s.bank.loan -= amount; log(`Кредит погашен: ${amount}`); 
        } else if (s.bank.loan < amount && s.balance >= s.bank.loan) {
            // Погасить остаток
            s.balance -= s.bank.loan; s.bank.loan = 0; log(`Кредит полностью погашен!`);
        }
    }
    
    saveGame();
    updateBankUI();
    updateUI();
}

function updateBankUI() {
    document.getElementById('bank-cash').innerText = window.state.balance;
    document.getElementById('bank-depo').innerText = window.state.bank.deposit;
    document.getElementById('bank-loan').innerText = window.state.bank.loan;
}

// Перехватываем открытие модалки
const oldOpen2 = window.openModal;
window.openModal = function(id) {
    if (id === 'bank') updateBankUI();
    if (id === 'stats') updateStatsUI();
    if (id === 'shop') renderShopV2(); // Используем новый рендер магазина
    if (typeof oldOpen2 === 'function') oldOpen2(id);
}

// 5. НОВЫЙ МАГАЗИН (СНАРЯЖЕНИЕ, ЛИЦЕНЗИИ, ФИЛИАЛЫ)
window.renderShopV2 = function() {
    const shopContent = `
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>Магазин</h3>
        <div style="display:flex; gap:5px; margin-bottom:15px;">
             <button class="btn" style="padding:5px; font-size:0.8em;" onclick="showShopTab('items')">Снаряжение</button>
             <button class="btn" style="padding:5px; font-size:0.8em;" onclick="showShopTab('licenses')">Лицензии</button>
             <button class="btn" style="padding:5px; font-size:0.8em;" onclick="showShopTab('branches')">Филиалы</button>
        </div>
        
        <div id="shop-tab-items">
             <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div style="background:#2a2a2a; padding:5px; border-radius:5px; text-align:center;">
                    <div>Велосипед</div><div style="color:#00e676">1500</div>
                    <button class="btn btn-green" style="width:100%;" onclick="buy('bike', 1500)">Купить</button>
                </div>
                <div style="background:#2a2a2a; padding:5px; border-radius:5px; text-align:center;">
                    <div>Сумка</div><div style="color:#00e676">150</div>
                    <button class="btn btn-green" style="width:100%;" onclick="buy('bag', 150)">Купить</button>
                </div>
                <div style="background:#2a2a2a; padding:5px; border-radius:5px; text-align:center;">
                    <div>Куртка</div><div style="color:#00e676">200</div>
                    <button class="btn btn-green" style="width:100%;" onclick="buy('jacket', 200)">Купить</button>
                </div>
            </div>
        </div>

        <div id="shop-tab-licenses" style="display:none;">
            ${Object.keys(BRANDS).map(key => {
                const b = BRANDS[key];
                const bought = window.state.licenses[key];
                return `
                <div style="background:#2a2a2a; padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                    <div>${b.icon} ${b.name}</div>
                    ${bought ? '<span style="color:#aaa">✅ Есть</span>' : 
                      `<button class="btn" style="background:#ffa726; color:#000; padding:2px 10px;" onclick="buyLicense('${key}', ${b.price})">${b.price}</button>`}
                </div>`;
            }).join('')}
        </div>

        <div id="shop-tab-branches" style="display:none; overflow-y:auto; max-height:300px;">
            <p style="font-size:0.8em; color:#aaa">Сначала купите лицензию бренда!</p>
            ${LOCATIONS.map(loc => {
                const hasLicense = window.state.licenses[loc.brand];
                const hasBranch = window.state.branches.includes(loc.id);
                const brandInfo = BRANDS[loc.brand];
                
                if (!hasLicense) return ''; // Скрываем, если нет лицензии

                return `
                <div style="background:#222; border-left: 3px solid #00e676; padding:10px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div>${brandInfo.icon} ${loc.name}</div>
                        <div style="font-size:0.8em; color:#aaa">Прибыль +++</div>
                    </div>
                    ${hasBranch ? '<span style="color:#aaa">Куплено</span>' : 
                      `<button class="btn btn-green" style="padding:2px 10px;" onclick="buyBranch('${loc.id}', ${loc.price})">${loc.price}</button>`}
                </div>`;
            }).join('')}
        </div>
    `;
    document.querySelector('#modal-shop .modal-box').innerHTML = shopContent;
};

window.buyBranch = function(id, price) {
    if (window.state.balance >= price) {
        window.state.balance -= price;
        window.state.branches.push(id);
        saveGame();
        
        // Рисуем на карте
        const loc = LOCATIONS.find(l => l.id === id);
        const b = BRANDS[loc.brand];
        const rIcon = L.divIcon({ html: `<div style="font-size:25px;">${b.icon}</div>`, className:'' });
        L.marker([loc.lat, loc.lng], {icon: rIcon}).addTo(window.map);

        renderShopV2();
        log(`Открыт филиал: ${loc.name}`);
    } else {
        log("Мало денег!", true);
    }
}

// 6. ПЕРЕОПРЕДЕЛЯЕМ ЗАРПЛАТУ (СЛАЙДЕР)
// Нужно обновить HTML модалки зарплаты.
// Мы делаем это "на лету" при открытии, или заменяем контент один раз.
window.updateWageUI = function() {
    const wage = window.state.wage || 10;
    const modal = document.querySelector('#modal-salary .modal-box');
    if (modal) {
        modal.innerHTML = `
            <span class="close" onclick="closeModals()">&times;</span>
            <h3>Зарплата Курьеров</h3>
            <div style="text-align:center; margin:20px 0;">
                <div style="font-size:2em; font-weight:bold; color:#00e676;">${wage} PLN</div>
                <div style="font-size:0.8em; color:#aaa;">за доставку</div>
            </div>
            
            <input type="range" min="0" max="50" value="${wage}" style="width:100%; accent-color: #00e676;" oninput="onWageSlide(this.value)">
            
            <div style="margin-top:10px; text-align:center;">
                Настроение: <span id="ui-mood">${getMoodEmoji(wage)}</span>
            </div>
        `;
    }
}

window.onWageSlide = function(val) {
    window.state.wage = parseInt(val);
    document.querySelector('#modal-salary h3').nextElementSibling.firstElementChild.innerText = val + " PLN";
    document.getElementById('ui-mood').innerText = getMoodEmoji(val);
    saveGame();
}

function getMoodEmoji(val) {
    if(val < 5) return "🤬 Бунт";
    if(val < 10) return "😡 Злость";
    if(val < 15) return "😐 Норм";
    if(val < 25) return "🙂 Радость";
    return "🤩 Экстаз (Турбо)";
}

// 7. СТАТИСТИКА ОФИСА (КЛИК)
function updateStatsUI() {
    const s = window.state;
    document.getElementById('st-bal').innerText = s.balance;
    document.getElementById('st-depo').innerText = s.bank.deposit;
    document.getElementById('st-loan').innerText = s.bank.loan;
    document.getElementById('st-couriers').innerText = document.getElementById('inv-active').innerText;
    document.getElementById('st-wage').innerText = s.wage || 10;
    document.getElementById('st-branches').innerText = s.branches.length;
}

// Привязываем клик к офису заново
const _origResume = window.resumeGame;
window.resumeGame = function() {
    _origResume(); // Запускаем стандартную загрузку
    
    // Перерисовываем ТОЛЬКО купленные филиалы
    // Удаляем старые маркеры ресторанов (из core или v1), чтобы не дублировать?
    // В leaflet сложнее удалить, но мы просто добавим поверх.
    // Лучше очистить карту, но это опасно. Оставим как есть, просто добавим новые точки.
    
    LOCATIONS.forEach(loc => {
        if (window.state.branches.includes(loc.id)) {
            const b = BRANDS[loc.brand];
            const rIcon = L.divIcon({ html: `<div style="font-size:25px;">${b.icon}</div>`, className:'' });
            L.marker([loc.lat, loc.lng], {icon: rIcon}).addTo(window.map);
        }
    });

    // Клик по офису
    if (window.officeMarker) {
        window.officeMarker.off('click'); // Снимаем старые
        window.officeMarker.on('click', () => {
             window.openModal('stats');
        });
        // Добавляем подсказку
        window.officeMarker.bindTooltip("Мой Офис (Клик)", {permanent: false, direction: 'top'});
    }
}

// 8. ОБНОВЛЕННЫЙ ЦИКЛ (НАЛОГИ И БАНК)
const _origLoop = window.gameLoop;
let lastBankTick = Date.now();

window.gameLoop = function() {
    _origLoop(); // Выполняем движение и аренду

    const now = Date.now();
    
    // Каждую минуту (60000 мс) - Банковский процент
    if (now - lastBankTick > 60000) {
        lastBankTick = now;
        
        // Депозит +1%
        if (window.state.bank.deposit > 0) {
            const profit = Math.floor(window.state.bank.deposit * 0.01);
            window.state.bank.deposit += profit;
            if (document.getElementById('modal-bank').style.display !== 'none') updateBankUI();
            log(`Банк: % по вкладу +${profit}`);
        }
        
        // Кредит +5% (растет долг)
        if (window.state.bank.loan > 0) {
            const debt = Math.ceil(window.state.bank.loan * 0.05);
            window.state.bank.loan += debt;
            if (document.getElementById('modal-bank').style.display !== 'none') updateBankUI();
            log(`Банк: % по кредиту -${debt}`, true);
        }
    }

    // НАЛОГ (Встроен в таймер аренды, проверяем когда таймер обновляется)
    // Проще сделать отдельный таймер, но чтобы не нагружать, проверим:
    // Если таймер аренды сбросился (значит прошло 5 минут), спишем налог.
    // Сложно поймать момент сброса. 
    // Давайте просто проверять время.
}

// Переопределяем логику списания аренды, чтобы добавить налог
// Придется скопировать кусок из V1, но добавить Tax.
// Чтобы не конфликтовать, сделаем "Hook" на списание.

// Самый надежный способ - свой интервал для налогов.
setInterval(() => {
    if (!window.state.office) return;
    
    // Налог 10% от баланса
    if (window.state.balance > 0) {
        const tax = Math.floor(window.state.balance * 0.10);
        if (tax > 0) {
            window.state.balance -= tax;
            saveGame();
            log(`🏛 Налог на бизнес: -${tax} PLN`, true);
            updateUI();
        }
    }
}, 300000); // 5 минут (300 000 мс)

// 9. КУРЬЕРЫ ХОДЯТ ТОЛЬКО ПО ФИЛИАЛАМ
// Нам нужно обновить moveCouriersNew, чтобы он видел НОВЫЕ точки (LOCATIONS)
// Если мы оставим старый, они будут ходить только в Kebab King и McD (дефолтные).
// Мы хотим, чтобы они ходили в: Дефолтные рестораны (если куплены) + Филиалы.

window.moveCouriersNew = function() {
    // Копия логики из V1, но с расширенным списком целей
    let baseSpeed = 0.0003;
    let wage = window.state.wage || 10;
    let speedMult = 0.5 + (wage / 20); 
    if (speedMult > 2.5) speedMult = 2.5; // Чуть быстрее макс скорость

    let currentSpeed = baseSpeed * speedMult;

    // Собираем все доступные цели
    let targets = [];
    
    // Добавляем филиалы
    LOCATIONS.forEach(loc => {
        if (window.state.branches.includes(loc.id)) {
            targets.push({ lat: loc.lat, lng: loc.lng });
        }
    });

    // Если нет филиалов, пусть хоть куда-то ходят (в базовые, если есть лицензия)
    // Но по новой логике нужны филиалы. Если targets пуст - стоят.

    window.couriers.forEach(c => {
        if (c.state === 'IDLE') {
            if (targets.length > 0) {
                const r = targets[Math.floor(Math.random() * targets.length)];
                c.target = { lat: r.lat, lng: r.lng, type: 'REST' };
                c.state = 'MOVING';
            }
        }

        if (c.state === 'MOVING' && c.target) {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);

            if (dist < currentSpeed) {
                c.pos = c.target;
                if (c.target.type === 'REST') {
                    c.state = 'WAITING';
                    c.wait = 4; 
                    // Визуализация рюкзака
                    let color = (wage > 20) ? '#00e676' : 'orange';
                    updateMarkerIcon(c.marker, `<div style="background:${color}; width:12px; height:12px; border:1px solid #fff; box-shadow:0 0 5px ${color}; border-radius:50%;"></div>`);
                } else {
                    const revenue = Math.floor(Math.random() * 25) + 20; // Чуть больше доход с филиалов
                    const finalProfit = revenue - wage;
                    
                    window.state.balance += finalProfit;
                    saveGame();
                    
                    // Реже спамим в лог, если много курьеров
                    if (Math.random() > 0.7) log(`Доставка: +${revenue} (-${wage})`);
                    
                    c.state = 'IDLE';
                    updateMarkerIcon(c.marker, '🚴');
                }
            } else {
                const ratio = currentSpeed / dist;
                c.pos.lat += dLat * ratio;
                c.pos.lng += dLng * ratio;
            }
            c.marker.setLatLng([c.pos.lat, c.pos.lng]);
        }
        
        if (c.state === 'WAITING') {
            c.wait--;
            if (c.wait <= 0) {
                const offset = 0.015;
                c.target = { 
                    lat: c.pos.lat + (Math.random()*offset*2 - offset),
                    lng: c.pos.lng + (Math.random()*offset*2 - offset),
                    type: 'CLIENT' 
                };
                c.state = 'MOVING';
                updateMarkerIcon(c.marker, '🎒');
            }
        }
    });
}
