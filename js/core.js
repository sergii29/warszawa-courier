// --- CORE SYSTEM ---
const SAVE_KEY = 'WAW_COURIER_V3';
window.map = null;
window.officeMarker = null;
window.couriers = [];
window.restaurants = [
    { id: 'kebab', name: 'Kebab King', lat: 52.230, lng: 21.015, icon: '🌯' },
    { id: 'mcd', name: 'McDonalds', lat: 52.235, lng: 21.008, icon: '🍔' }
];

window.state = {
    balance: 5000,
    inventory: { bike: 0, bag: 0, jacket: 0 },
    office: null, // {lat, lng}
    rentTime: Date.now(),
    licenses: {}
};

// --- INIT ---
window.onload = () => {
    initMap();
    loadGame();
    console.log("Core initialized. Waiting for patches...");
};

window.initMap = function() {
    window.map = L.map('map', { zoomControl: false }).setView([52.2297, 21.0122], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(window.map);

    // CLICK HANDLER FOR OFFICE SELECTION
    window.map.on('click', (e) => {
        // Only if we are in "Selection Mode"
        if (document.getElementById('start-overlay').style.display !== 'none' && !window.state.office) {
            if (confirm("Открыть офис здесь?")) {
                setOffice(e.latlng.lat, e.latlng.lng);
            }
        }
    });
}

// --- GAME LOGIC ---
window.loadGame = function() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        window.state = JSON.parse(saved);
        if (window.state.office) {
            resumeGame();
        } else {
            showStartScreen(true);
        }
    } else {
        showStartScreen(false);
    }
}

window.saveGame = function() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(window.state));
    updateUI();
}

window.showStartScreen = function(hasSave) {
    const msg = document.getElementById('start-msg');
    
    if (hasSave && !window.state.office) {
            msg.innerText = "Выберите место для офиса на карте (кликните)";
            document.getElementById('start-overlay').style.pointerEvents = 'none'; 
            document.getElementById('start-overlay').style.background = 'rgba(0,0,0,0.4)'; 
    } else if (!hasSave) {
            msg.innerText = "Добро пожаловать. Кликните на карту, чтобы выбрать офис.";
            document.getElementById('start-overlay').style.pointerEvents = 'none';
            document.getElementById('start-overlay').style.background = 'rgba(0,0,0,0.4)';
    }
}

window.handleStart = function() {
    // Placeholder if needed for button logic
}

window.setOffice = function(lat, lng) {
    window.state.office = { lat, lng };
    window.state.rentTime = Date.now();
    saveGame();
    resumeGame();
}

window.resumeGame = function() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('main-ui').style.display = 'flex';
    
    // Draw Office
    const icon = L.divIcon({ className: 'office-marker', html: '🏢', iconSize:[40,40], iconAnchor:[20,40] });
    window.officeMarker = L.marker([window.state.office.lat, window.state.office.lng], {icon: icon}).addTo(window.map);
    window.map.setView([window.state.office.lat, window.state.office.lng], 15);

    // Draw Restaurants
    window.restaurants.forEach(r => {
        const opacity = window.state.licenses[r.id] ? 1 : 0.5;
        const rIcon = L.divIcon({ html: `<div style="font-size:25px; opacity:${opacity}">${r.icon}</div>`, className:'' });
        L.marker([r.lat, r.lng], {icon: rIcon}).addTo(window.map);
    });

    // Start Loop
    setInterval(gameLoop, 500); 
    checkFleet(); 
    updateUI();
}

window.gameLoop = function() {
    // Rent Logic
    const now = Date.now();
    const elapsed = now - window.state.rentTime;
    const left = (5 * 60 * 1000) - elapsed;
    
    if (left > 0) {
        const m = Math.floor(left / 60000);
        const s = Math.floor((left % 60000) / 1000);
        document.getElementById('ui-timer').innerText = `${m}:${s<10?'0':''}${s}`;
    } else {
        document.getElementById('ui-timer').innerText = "ПЛАТИ!";
    }

    // Move Couriers
    moveCouriers();
}

// --- COURIER SYSTEM ---
window.checkFleet = function() {
    const count = Math.min(window.state.inventory.bike, window.state.inventory.bag, window.state.inventory.jacket);
    while (window.couriers.length < count) {
        spawnCourier();
    }
}

window.spawnCourier = function() {
    const icon = L.divIcon({ html: '🚴', className: 'courier-marker', iconSize:[25,25] });
    const marker = L.marker([window.state.office.lat, window.state.office.lng], {icon: icon}).addTo(window.map);
    
    window.couriers.push({
        marker: marker,
        pos: { lat: window.state.office.lat, lng: window.state.office.lng },
        target: null,
        state: 'IDLE',
        wait: 0
    });
    log("Новый курьер на линии!");
}

window.moveCouriers = function() {
    const SPEED = 0.0003; 

    window.couriers.forEach(c => {
        if (c.state === 'IDLE') {
            const r = window.restaurants[Math.floor(Math.random() * window.restaurants.length)];
            c.target = { lat: r.lat, lng: r.lng, type: 'REST' };
            c.state = 'MOVING';
        }

        if (c.state === 'MOVING' && c.target) {
            const dLat = c.target.lat - c.pos.lat;
            const dLng = c.target.lng - c.pos.lng;
            const dist = Math.sqrt(dLat*dLat + dLng*dLng);

            if (dist < SPEED) {
                c.pos = c.target;
                if (c.target.type === 'REST') {
                    c.state = 'WAITING';
                    c.wait = 4; 
                    updateMarkerIcon(c.marker, '⏳');
                } else {
                    const profit = Math.floor(Math.random() * 20) + 15;
                    window.state.balance += profit;
                    saveGame();
                    log(`Доставка! +${profit} PLN`);
                    c.state = 'IDLE';
                    updateMarkerIcon(c.marker, '🚴');
                }
            } else {
                const ratio = SPEED / dist;
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

window.updateMarkerIcon = function(marker, iconHtml) {
    const el = marker.getElement();
    if(el) el.innerHTML = iconHtml;
}

// --- ACTIONS ---
window.buy = function(item, cost) {
    if (window.state.balance >= cost) {
        window.state.balance -= cost;
        window.state.inventory[item]++;
        saveGame();
        checkFleet();
        log(`Куплено: ${item}`);
    } else {
        log("Не хватает денег!", true);
    }
}

window.buyLicense = function(id) {
    if (window.state.balance >= 3000) {
        window.state.balance -= 3000;
        window.state.licenses[id] = true;
        saveGame();
        resumeGame();
        log("Лицензия куплена!");
    } else {
            log("Не хватает денег!", true);
    }
}

window.payRent = function() {
    if (window.state.balance >= 500) {
        window.state.balance -= 500;
        window.state.rentTime = Date.now();
        saveGame();
        log("Аренда продлена.");
    } else {
        log("Нет денег на аренду!", true);
    }
}

window.hardReset = function() {
    if(confirm("Удалить весь прогресс?")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

// --- UI ---
window.updateUI = function() {
    document.getElementById('ui-bal').innerText = window.state.balance;
    document.getElementById('inv-bike').innerText = window.state.inventory.bike;
    document.getElementById('inv-bag').innerText = window.state.inventory.bag;
    document.getElementById('inv-jacket').innerText = window.state.inventory.jacket;
    
    const active = Math.min(window.state.inventory.bike, window.state.inventory.bag, window.state.inventory.jacket);
    document.getElementById('inv-active').innerText = active;
    document.getElementById('ui-couriers').innerText = active;
}

window.log = function(text, isError) {
    const box = document.getElementById('logs');
    const el = document.createElement('div');
    el.className = 'log-msg';
    el.innerText = text;
    if (isError) el.style.borderRightColor = '#ff5252';
    box.prepend(el);
    if (box.children.length > 5) box.lastChild.remove();
}

window.openModal = function(id) { document.getElementById('modal-'+id).style.display = 'flex'; }
window.closeModals = function() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
