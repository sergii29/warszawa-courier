const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// Основные данные игры
let G = { 
    money: 10, 
    debt: 0, 
    lvl: 1.0, 
    en: 2000, 
    maxEn: 2000, 
    tax: 300, 
    rent: 600, 
    waterStock: 0, 
    totalOrders: 0, 
    totalClicks: 0, 
    totalBottles: 0, 
    autoTime: 0, 
    scooter: false, 
    bag: false, 
    phone: false, 
    district: 0, 
    bikeRentTime: 0, 
    buffTime: 0, 
    history: [], 
    usedPromos: [], 
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ] 
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0 };
let curView = 'main', weather = "Ясно", isBroken = false;

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rent: 50, mult: 1, price: 0 }, 
    { name: "Mokotów", minLvl: 2.5, rent: 120, mult: 1.5, price: 150 }, 
    { name: "Śródmieście", minLvl: 5.0, rent: 300, mult: 2.5, price: 500 }
];

const UPGRADES = [
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам за каждый заказ.', price: 350, bonus: '+15% PLN' }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы прилетают на 40% чаще.', price: 1200, bonus: 'Заказы x1.4' }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Снижает расход энергии на 30% навсегда.', price: 500, bonus: '⚡ -30%' }
];

// Функция добавления записи в историю
function addHistory(msg, val, type = 'plus') {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    G.history.unshift({ time, msg, val, type });
    if (G.history.length > 20) G.history.pop();
}

// УМНЫЕ ПРОМОКОДЫ
async function usePromo() {
    const inputField = document.getElementById('promo-input');
    const code = inputField.value.trim().toUpperCase();
    if (!G.usedPromos) G.usedPromos = [];
    if (G.usedPromos.includes(code)) { log("Уже использовано!", "var(--danger)"); return; }

    try {
        // Ищем файл promos.json рядом с index.html
        const response = await fetch('promos.json?nocache=' + Date.now());
        const promoData = await response.json();

        if (promoData[code]) {
            let reward = promoData[code].reward;
            let msg = promoData[code].msg;
            G.money = parseFloat((G.money + reward).toFixed(2));
            G.usedPromos.push(code);
            addHistory('🎁 ПРОМО', reward, 'plus');
            log(`🎁 ${msg} +${reward} PLN`, "var(--gold)");
            inputField.value = "";
            save(); updateUI();
        } else {
            log("Неверный код!", "var(--danger)");
        }
    } catch (e) {
        log("Ошибка связи с базой!", "var(--danger)");
        console.error(e);
    }
}

const sphere = document.getElementById('work-sphere');
// Обработчики нажатий
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); }, {passive: false});
    sphere.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) doWork(); });
}

function log(msg, color = "#eee") { 
    const logEl = document.getElementById('game-log'); 
    if(!logEl) return;
    const entry = document.createElement('div'); 
    entry.className = "log-entry"; 
    entry.style.color = color; 
    entry.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`; 
    logEl.appendChild(entry); 
    if (logEl.childNodes.length > 5) logEl.removeChild(logEl.firstChild); 
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function load() { let d = localStorage.getItem(SAVE_KEY); if(d) { G = {...G, ...JSON.parse(d)}; } G.maxEn = 2000; updateUI(); }

function updateUI() {
    // Обновление текстов и баланса
    const moneyEl = document.getElementById('money-val');
    if(moneyEl) {
        moneyEl.innerText = G.money.toFixed(2) + " PLN";
        moneyEl.style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
    }
    
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    
    document.getElementById('district-ui').innerText = "Район: " + DISTRICTS[G.district].name;
    document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️" : "☀️");
    
    // Статусы
    document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
    if(G.autoTime > 0) document.getElementById('auto-status-ui').innerText = `АВТО ${Math.floor(G.autoTime/60)}:${(G.autoTime%60<10?'0':'')+G.autoTime%60}`;
    
    document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
    if(G.bikeRentTime > 0) document.getElementById('bike-status-ui').innerText = `🚲 ${Math.floor(G.bikeRentTime/60)}:${(G.bikeRentTime%60<10?'0':'')+G.bikeRentTime%60}`;
    
    const buffUI = document.getElementById('buff-status-ui'); 
    buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
    if(G.buffTime > 0) buffUI.innerText = `⚡ BOOST ${Math.floor(G.buffTime/60)}:${(G.buffTime%60<10?'0':'')+G.buffTime%60}`;
    
    // Инвентарь
    const invDisp = document.getElementById('inventory-display'); 
    invDisp.innerHTML = ''; 
    UPGRADES.forEach(up => { 
        if(G[up.id]) { 
            const span = document.createElement('span'); 
            span.className = 'inv-item'; 
            span.innerText = `${up.icon} ${up.bonus}`; 
            invDisp.appendChild(span); 
        } 
    });
    
    // Магазин улучшений (скрываем купленное)
    const upgradeList = document.getElementById('upgrade-items'); 
    upgradeList.innerHTML = ''; 
    UPGRADES.forEach(up => { 
        if(!G[up.id]) { 
            const div = document.createElement('div'); 
            div.className = 'card'; 
            div.style.marginTop = '8px'; 
            div.innerHTML = `<b>${up.icon} ${up.name}</b><br><small style="color:#aaa;">${up.desc}</small><br><button class="btn-action" style="margin-top:8px;" onclick="buyInvest('${up.id}', ${up.price})">КУПИТЬ (${up.price} PLN)</button>`; 
            upgradeList.appendChild(div); 
        } 
    });
    
    // Квест бар
    const qBar = document.getElementById('quest-bar'); 
    if (order.visible && curView === 'main') { 
        qBar.style.display = 'block'; 
        if (order.active) { 
            document.getElementById('quest-actions-choice').style.display = 'none'; 
            document.getElementById('quest-active-ui').style.display = 'block'; 
            document.getElementById('quest-timer-ui').innerText = `${Math.floor(order.time/60)}:${(order.time%60<10?'0':'')+order.time%60}`; 
            document.getElementById('quest-progress-bar').style.width = (order.steps / order.target * 100) + "%"; 
        } else { 
            document.getElementById('quest-actions-choice').style.display = 'flex'; 
            document.getElementById('quest-active-ui').style.display = 'none'; 
            document.getElementById('quest-timer-ui').innerText = `0:${(order.offerTimer<10?'0':'')+order.offerTimer}`; 
            document.getElementById('quest-pay').innerText = order.reward.toFixed(2);
        } 
    } else { qBar.style.display = 'none'; }
    
    document.getElementById('buy-bike-rent').innerText = G.bikeRentTime > 0 ? "В АРЕНДЕ" : "АРЕНДОВАТЬ (30 PLN)";
    document.getElementById('click-rate-ui').innerText = (0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult).toFixed(2) + " PLN";

    // История
    document.getElementById('history-ui').innerHTML = G.history.map(h => `<div class="history-item"><span>${h.time} ${h.msg}</span><b style="color:${h.type==='plus'?'var(--success)':'var(--danger)'}">${h.type==='plus'?'+':'-'}${h.val}</b></div>`).join('');
    
    renderBank(); 
    renderMilestones();
}

function doWork() {
    if (isBroken) return;
    
    // Питье воды для энергии
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { 
        let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
        let drink = Math.min(G.waterStock, 50); 
        G.en = Math.min(G.maxEn, G.en + (drink * eff)); 
        G.waterStock -= drink; 
        save(); 
    }
    
    if (G.en < 1) return;
    
    if(order.active) { 
        consumeResources(true); 
        order.steps += (G.bikeRentTime > 0 ? 2 : 1); 
        if (G.bikeRentTime > 0 && Math.random() < 0.002) { triggerBreakdown(); return; } 
        if(order.steps >= order.target) finishOrder(true); 
        updateUI(); 
        return; 
    }
    
    if(!order.visible) { 
        if(Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); 
    }
    
    consumeResources(false);
    
    let gain = 0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult;
    G.money = parseFloat((G.money + gain).toFixed(2));
    G.lvl += 0.00025; 
    G.totalClicks++; 
    checkMilestones(); 
    updateUI(); 
    save();
}

// Потребление ресурсов (Важно: Энергетик не спасает от жажды!)
function consumeResources(isOrder) {
    if (G.buffTime > 0) { 
        // Если активен энергетик: энергия НЕ тратится, но вода ТРАТИТСЯ
        if (isOrder || Math.random() < 0.2) {
            G.waterStock = Math.max(0, G.waterStock - (isOrder ? 8 : 2)); 
        }
        return; 
    }
    
    let cost = (G.scooter ? 7 : 10); 
    if (G.bikeRentTime > 0) cost *= 0.5; 
    if (weather === "Дождь") cost *= 1.2; 
    if (isOrder) cost *= 1.5; 
    
    G.en = Math.max(0, G.en - cost); 
    G.waterStock = Math.max(0, G.waterStock - (isOrder ? 10 : 3));
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; 
    order.offerTimer = 15; 
    order.isCriminal = Math.random() < 0.12; 
    let d = 0.5 + Math.random() * 3.5; 
    let baseRew = (3.80 + d * 2.2) * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (G.bag ? 1.15 : 1) * (weather === "Дождь" ? 1.5 : 1); 
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; } 
    order.baseReward = baseRew;
    order.reward = baseRew;
    order.target = Math.floor(d * 160); 
    order.steps = 0; 
    order.time = Math.floor(order.target / 1.5 + 45); 
    updateUI(); 
}

function activateAutopilot() { 
    if(G.money >= 45 && G.lvl >= 0.15) { 
        G.money = parseFloat((G.money - 45).toFixed(2)); 
        G.lvl -= 0.15; 
        G.autoTime += 600; 
        addHistory('АВТОПИЛОТ', 45, 'minus'); 
        acceptOrder(); 
        save(); 
        updateUI(); 
    } 
}

function acceptOrder() { order.active = true; updateUI(); }

function finishOrder(win) { 
    if(!order.active) return;
    order.active = false; 
    if(win) { 
        let policeChance = order.isCriminal ? 0.35 : 0.02; 
        if(Math.random() < policeChance) { 
            G.lvl -= 1.2; G.money = parseFloat((G.money - 150).toFixed(2)); 
            addHistory('👮 ШТРАФ', 150, 'minus');
            log("🚔 ПОЛИЦИЯ! Штраф -150", "var(--danger)"); 
        } else { 
            G.money = parseFloat((G.money + order.reward).toFixed(2)); 
            addHistory(order.isCriminal ? '☠️ КРИМИНАЛ' : '📦 ЗАКАЗ', order.reward.toFixed(2), 'plus');
            G.lvl += (order.isCriminal ? 0.12 : 0.015); 
            G.totalOrders++; 
            if(Math.random() < 0.40) { 
                let tip = parseFloat((5 + Math.random()*15).toFixed(2)); 
                G.money = parseFloat((G.money + tip).toFixed(2)); 
                addHistory('💰 ЧАЕВЫЕ', tip, 'plus');
                log(`💰 Чаевые: +${tip.toFixed(2)}`, "var(--success)"); 
            } 
        } 
    } 
    order.visible = false; updateUI(); save(); 
}

function checkMilestones() { 
    G.activeMilestones.forEach((m, i) => { 
        let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; 
        if(cur >= m.goal) { 
            G.money = parseFloat((G.money + m.reward).toFixed(2)); 
            addHistory('🏆 ЦЕЛЬ', m.reward, 'plus'); 
            G.lvl += 0.01; 
            log(`🏆 ДОСТИЖЕНИЕ: ${m.name}`, "var(--gold)"); 
            G.activeMilestones[i] = { id: Date.now()+i, name: m.name, goal: cur + Math.floor(m.goal*0.6), type: m.type, reward: m.reward + 20 }; 
            save(); 
        } 
    }); 
}

function renderMilestones() { 
    document.getElementById('milestones-list').innerHTML = G.activeMilestones.map(m => { 
        let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; 
        return `<div class="card" style="margin-top:8px;"><b>${m.name}</b><br><small style="color:var(--gold);">Награда: ${m.reward} PLN</small><div class="career-progress"><div class="career-fill" style="width:${Math.min(100,(cur/m.goal*100))}%"></div></div><small>${cur}/${m.goal}</small></div>`; 
    }).join(''); 
}

function collectBottles() { 
    G.money = parseFloat((G.money + 0.02).toFixed(2)); 
    G.totalBottles++; 
    checkMilestones(); 
    save(); 
    updateUI(); 
}

function buyWater() { 
    if(G.money >= 1.50) { 
        G.money = parseFloat((G.money - 1.50).toFixed(2)); 
        G.waterStock += 1500; 
        addHistory('🧴 ВОДА', 1.50, 'minus'); 
        save(); 
        updateUI(); 
    } 
}

function buyDrink(type, p) { 
    if(G.money >= p) { 
        G.money = parseFloat((G.money - p).toFixed(2)); 
        addHistory(type.toUpperCase(), p, 'minus'); 
        if(type === 'coffee') G.en = Math.min(G.maxEn, G.en + 300); 
        else G.buffTime += 120; 
        save(); 
        updateUI(); 
    } 
}

function buyInvest(type, p) { 
    if(!G[type] && G.money >= p) { 
        G.money = parseFloat((G.money - p).toFixed(2)); 
        addHistory('ИНВЕСТ', p, 'minus'); 
        G[type] = true; 
        save(); 
        updateUI(); 
    } 
}

function rentBike() { 
    if (G.money >= 30) { 
        G.money = parseFloat((G.money - 30).toFixed(2)); 
        addHistory('🚲 ВЕЛИК', 30, 'minus'); 
        G.bikeRentTime += 600; 
        save(); 
        updateUI(); 
    } 
}

function exchangeLvl(l, m) { 
    if(G.lvl >= l) { 
        G.lvl -= l; 
        G.money = parseFloat((G.money + m).toFixed(2)); 
        addHistory('💎 ОБМЕН', m, 'plus'); 
        save(); 
        updateUI(); 
    } 
}

function switchTab(v, el) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active')); 
    el.classList.add('active'); 
    updateUI(); 
}

function moveDistrict(id) { 
    if (G.lvl >= DISTRICTS[id].minLvl && G.money >= DISTRICTS[id].price) { 
        G.money = parseFloat((G.money - DISTRICTS[id].price).toFixed(2)); 
        addHistory('🏙️ ПЕРЕЕЗД', DISTRICTS[id].price, 'minus'); 
        G.district = id; 
        save(); 
        updateUI(); 
    } 
}

function triggerBreakdown() { 
    isBroken = true; 
    log("🚲 ПОЛОМКА!", "var(--danger)"); 
    G.money = parseFloat((G.money - 7).toFixed(2)); 
    addHistory('🛠️ РЕМОНТ', 7, 'minus'); 
    setTimeout(() => { isBroken = false; updateUI(); }, 3000); 
}

function renderBank() { 
    const ui = document.getElementById('bank-actions-ui'); 
    ui.innerHTML = G.debt <= 0 ? 
        `<button class="btn-action" onclick="G.money=parseFloat((G.money+50).toFixed(2));G.debt=50;addHistory('🏦 КРЕДИТ', 50, 'plus');updateUI();save();">ВЗЯТЬ КРЕДИТ (50 PLN)</button>` : 
        `<button class="btn-action" style="background:var(--success)" onclick="if(G.money>=G.debt){G.money=parseFloat((G.money-G.debt).toFixed(2));addHistory('🏦 ДОЛГ', G.debt, 'minus');G.debt=0;updateUI();save();}">ВЕРНУТЬ ДОЛГ (${G.debt} PLN)</button>`; 
}

// Игровой цикл
setInterval(() => {
    G.tax--; 
    if(G.tax <= 0) { 
        let cost = parseFloat((G.money * 0.25).toFixed(2)); 
        G.money = parseFloat((G.money - cost).toFixed(2)); 
        addHistory('🏛️ НАЛОГ', cost, 'minus'); 
        G.tax = 300; 
        log("Налог 25%"); 
        save(); 
    }
    
    G.rent--; 
    if(G.rent <= 0) { 
        G.money = parseFloat((G.money - DISTRICTS[G.district].rent).toFixed(2)); 
        addHistory('🏠 АРЕНДА', DISTRICTS[G.district].rent, 'minus'); 
        G.rent = 600; 
        save(); 
    }

    if (Math.random() < 0.015) weather = Math.random() < 0.35 ? "Дождь" : "Ясно";
    
    if (G.bikeRentTime > 0) { 
        G.bikeRentTime--; 
        if (G.bikeRentTime <= 0 && G.money >= 30) { 
            G.money = parseFloat((G.money - 30).toFixed(2)); 
            addHistory('🚲 ВЕЛИК', 30, 'minus'); 
            G.bikeRentTime = 600; 
        } 
    }
    
    if (G.buffTime > 0) G.buffTime--;
    
    // Логика автопилота
    if (G.autoTime > 0) { 
        G.autoTime--;
        if (order.active && !isBroken) {
            for(let i=0; i<10; i++) {
                if(!order.active || isBroken) break;
                // Автопилот тоже пьет воду
                if (G.waterStock > 0 && G.en < 600) { 
                    let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); 
                    G.en = Math.min(G.maxEn, G.en + (15 * eff)); 
                    G.waterStock -= 15; 
                }
                if (G.en > 5) { 
                    consumeResources(true); 
                    order.steps += (G.bikeRentTime > 0 ? 3 : 2); 
                    if (order.steps >= order.target) { finishOrder(true); break; } 
                }
            }
        }
    }
    
    if(order.visible && !order.active) { 
        order.offerTimer--; 
        let decay = order.isCriminal ? 0.05 : 0.03;
        order.reward = parseFloat((order.reward * (1 - decay)).toFixed(2));
        if(order.offerTimer <= 0) { order.visible = false; G.lvl -= 0.02; } 
    }
    
    if(order.active) { 
        order.time--; 
        if(order.time <= 0) finishOrder(false); 
    }
    
    const taxTimer = document.getElementById('tax-timer');
    const rentTimer = document.getElementById('rent-timer');
    if(taxTimer) taxTimer.innerText = `Налог через: ${Math.floor(G.tax/60)}:${G.tax%60<10?'0':''}${G.tax%60}`;
    if(rentTimer) rentTimer.innerText = `Аренда через: ${Math.floor(G.rent/60)}:${G.rent%60<10?'0':''}${G.rent%60}`;
    
    updateUI();
}, 1000);

window.onload = load;
