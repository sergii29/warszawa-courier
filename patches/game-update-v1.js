// --- ПАТЧ: РАСШИРЕНИЕ ГЕЙМПЛЕЯ v1 ---
console.log("[Patch] Загрузка обновления геймплея...");

// 1. РАСШИРЯЕМ СПИСОК РЕСТОРАНОВ
window.restaurants = [
    { id: 'kebab', name: 'Kebab King', lat: 52.230, lng: 21.015, icon: '🌯', price: 3000 },
    { id: 'mcd', name: 'McDonalds', lat: 52.235, lng: 21.008, icon: '🍔', price: 5000 },
    { id: 'sushi', name: 'Sushi Master', lat: 52.225, lng: 21.020, icon: '🍣', price: 7000 },
    { id: 'pizza', name: 'Dominos', lat: 52.240, lng: 21.010, icon: '🍕', price: 4500 },
    { id: 'starbucks', name: 'Starbucks', lat: 52.232, lng: 21.002, icon: '☕', price: 6000 }
];

// Инициализируем ставку зарплаты, если её нет
if (!window.state.wage) {
    window.state.wage = 10; // Стандартная зарплата
}

// 2. ПЕРЕПИСЫВАЕМ ИНТЕРФЕЙС (ДОБАВЛЯЕМ КНОПКУ ЗАРПЛАТЫ)
// Добавляем кнопку в нижнюю панель
const btmBar = document.querySelector('.btm-bar');
const salaryBtn = document.createElement('button');
salaryBtn.className = 'btn';
salaryBtn.innerText = '💸 Зарплата';
salaryBtn.onclick = () => window.openModal('salary');
btmBar.insertBefore(salaryBtn, btmBar.children[2]); // Вставляем перед кнопкой Аренды

// Создаем Модальное окно Зарплаты
const salaryModalHTML = `
<div id="modal-salary" class="modal">
    <div class="modal-box">
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>Управление Зарплатой</h3>
        <p>Текущая ставка: <span id="ui-wage" style="color:#00e676; font-weight:bold;">${window.state.wage}</span> PLN / заказ</p>
        <p style="font-size:0.8em; color:#aaa;">Выше зарплата = быстрее курьеры.</p>
        
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button class="btn" style="background:#d32f2f;" onclick="changeWage(-5)">-5 PLN</button>
            <button class="btn btn-green" onclick="changeWage(5)">+5 PLN</button>
        </div>
        <div style="margin-top:10px; text-align:center; font-size:0.9em;">
            Скорость флота: <span id="ui-speed-desc">Норма</span>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', salaryModalHTML);

// 3. ПЕРЕПИСЫВАЕМ МАГАЗИН (ДВЕ ВКЛАДКИ)
window.renderShop = function() {
    const shopContent = `
        <span class="close" onclick="closeModals()">&times;</span>
        <h3>Магазин</h3>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
             <button class="btn" onclick="showShopTab('items')">Снаряжение</button>
             <button class="btn" onclick="showShopTab('licenses')">Лицензии</button>
        </div>
        
        <div id="shop-tab-items">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div style="background:#2a2a2a; padding:10px; border-radius:5px; text-align:center;">
                    <div>Велосипед</div><div style="color:#00e676">1500 PLN</div>
                    <button class="btn btn-green" style="width:100%; padding:5px;" onclick="buy('bike', 1500)">Купить</button>
                </div>
                <div style="background:#2a2a2a; padding:10px; border-radius:5px; text-align:center;">
                    <div>Сумка</div><div style="color:#00e676">150 PLN</div>
                    <button class="btn btn-green" style="width:100%; padding:5px;" onclick="buy('bag', 150)">Купить</button>
                </div>
                <div style="background:#2a2a2a; padding:10px; border-radius:5px; text-align:center;">
                    <div>Куртка</div><div style="color:#00e676">200 PLN</div>
                    <button class="btn btn-green" style="width:100%; padding:5px;" onclick="buy('jacket', 200)">Купить</button>
                </div>
            </div>
        </div>

        <div id="shop-tab-licenses" style="display:none; overflow-y:auto; max-height:300px;">
            ${window.restaurants.map(r => {
                const bought = window.state.licenses[r.id];
                return `
                <div style="background:#2a2a2a; padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                    <div>${r.icon} ${r.name}</div>
                    ${bought ? '<span style="color:#aaa">Куплено</span>' : 
                      `<button class="btn" style="background:#ffa726; color:#000; padding:5px 10px;" onclick="buyLicense('${r.id}', ${r.price})">${r.price}</button>`}
                </div>`;
            }).join('')}
        </div>
    `;
    document.querySelector('#modal-shop .modal-box').innerHTML = shopContent;
};

// Функция переключения вкладок
window.showShopTab = function(tab) {
    document.getElementById('shop-tab-items').style.display = tab === 'items' ? 'block' : 'none';
    document.getElementById('shop-tab-licenses').style.display = tab === 'licenses' ? 'block' : 'none';
};

// Переопределяем открытие модалки, чтобы рендерить магазин каждый раз
const oldOpen = window.openModal;
window.openModal = function(id) {
    if (id === 'shop') window.renderShop();
    oldOpen(id);
    if (id === 'salary') updateWageUI();
}

// 4. ЛОГИКА ЗАРПЛАТЫ
window.changeWage = function(delta) {
    let newWage = (window.state.wage || 10) + delta;
    if (newWage < 0) newWage = 0;
    window.state.wage = newWage;
    updateWageUI();
    saveGame();
}

function updateWageUI() {
    document.getElementById('ui-wage').innerText = window.state.wage;
    const desc = document.getElementById('ui-speed-desc');
    if (window.state.wage < 10) { desc.innerText = "🐢 Медленно (Злы)"; desc.style.color = 'red'; }
    else if (window.state.wage === 10) { desc.innerText = "🚶 Норма"; desc.style.color = 'white'; }
    else { desc.innerText = "🚀 Быстро!"; desc.style.color = '#00e676'; }
}

// 5. ПЕРЕОПРЕДЕЛЯЕМ ЛОГИКУ ПОКУПКИ ЛИЦЕНЗИЙ (теперь с ценами)
window.buyLicense = function(id, price) {
    if (window.state.balance >= price) {
        window.state.balance -= price;
        window.state.licenses[id] = true;
        saveGame();
        
        // Сразу добавляем на карту
        const r = window.restaurants.find(x => x.id === id);
        if (r) {
             const rIcon = L.divIcon({ html: `<div style="font-size:25px;">${r.icon}</div>`, className:'' });
             L.marker([r.lat, r.lng], {icon: rIcon}).addTo(window.map);
        }
        
        renderShop(); // Обновить кнопки
        log(`Лицензия ${id} куплена!`);
    } else {
        log("Не хватает денег!", true);
    }
}

// 6. ПЕРЕОПРЕДЕЛЯЕМ ОТОБРАЖЕНИЕ РЕСТОРАНОВ (Только купленные)
window.resumeGame = function() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('main-ui').style.display = 'flex';
    
    // Офис
    const icon = L.divIcon({ className: 'office-marker', html: '🏢', iconSize:[40,40], iconAnchor:[20,40] });
    window.officeMarker = L.marker([window.state.office.lat, window.state.office.lng], {icon: icon}).addTo(window.map);
    window.map.setView([window.state.office.lat, window.state.office.lng], 15);

    // Рестораны (ТОЛЬКО КУПЛЕННЫЕ)
    window.restaurants.forEach(r => {
        if (window.state.licenses[r.id]) {
            const rIcon = L.divIcon({ html: `<div style="font-size:25px;">${r.icon}</div>`, className:'' });
            L.marker([r.lat, r.lng], {icon: rIcon}).addTo(window.map);
        }
    });

    setInterval(gameLoop, 500); 
    checkFleet(); 
    updateUI();
}

// 7. ПЕРЕОПРЕДЕЛЯЕМ АРЕНДУ И ДВИЖЕНИЕ
window.gameLoop = function() {
    // АРЕНДА (Автоматическое списание)
    const now = Date.now();
    const elapsed = now - window.state.rentTime;
    const RENT_INTERVAL = 5 * 60 * 1000; // 5 минут
    const RENT_COST = 50;

    const left = RENT_INTERVAL - elapsed;
    
    if (left <= 0) {
        // Списываем
        window.state.balance -= RENT_COST;
        window.state.rentTime = now;
        saveGame();
        log(`Списана аренда: -${RENT_COST} PLN`, true);
        document.getElementById('ui-timer').innerText = "5:00";
    } else {
        const m = Math.floor(left / 60000);
        const s = Math.floor((left % 60000) / 1000);
        document.getElementById('ui-timer').innerText = `${m}:${s<10?'0':''}${s}`;
    }

    // ДВИЖЕНИЕ КУРЬЕРОВ
    moveCouriersNew();
}

// Новая логика движения с учетом зарплаты
window.moveCouriersNew = function() {
    // Базовая скорость
    let baseSpeed = 0.0003;
    
    // Множитель зарплаты (10 PLN = 1.0x, 20 PLN = 1.5x, 0 PLN = 0.5x)
    let wage = window.state.wage || 10;
    let speedMult = 0.5 + (wage / 20); // Простая формула
    if (speedMult > 2.0) speedMult = 2.0; // Кап скорости

    let currentSpeed = baseSpeed * speedMult;

    window.couriers.forEach(c => {
        if (c.state === 'IDLE') {
            // Ищем только открытые рестораны
            const available = window.restaurants.filter(r => window.state.licenses[r.id]);
            if (available.length > 0) {
                const r = available[Math.floor(Math.random() * available.length)];
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
                    // НОВАЯ ИКОНКА (Рюкзак покруче - оранжевый квадрат для видимости)
                    updateMarkerIcon(c.marker, '<div style="background:orange; width:10px; height:10px; border:1px solid #fff; box-shadow:0 0 5px orange;"></div>');
                } else {
                    // ПРИБЫЛЬ ЗА ВЫЧЕТОМ ЗАРПЛАТЫ
                    const revenue = Math.floor(Math.random() * 20) + 15;
                    const finalProfit = revenue - wage;
                    
                    window.state.balance += finalProfit;
                    saveGame();
                    
                    let msg = `Доставка: +${revenue}`;
                    if (wage > 0) msg += ` (-${wage} з/п)`;
                    log(msg);
                    
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
        
        // Waiting logic copy (standard)
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
