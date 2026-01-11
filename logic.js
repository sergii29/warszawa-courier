import { db, ref, onValue, update, set } from './database.js';

const tg = window.Telegram.WebApp; tg.expand(); tg.ready();
const userId = tg.initDataUnsafe?.user?.id || "local_user";
const userRef = ref(db, 'users/' + userId);

// Инициализация G из твоего оригинала
let G = { money: 10, debt: 0, lvl: 1.0, en: 2000, maxEn: 2000, tax: 300, rent: 600, waterStock: 0, totalOrders: 0, totalClicks: 0, totalBottles: 0, autoTime: 0, scooter: false, bag: false, phone: false, district: 0, bikeRentTime: 0, buffTime: 0, history: [], usedPromos: [], activeMilestones: [{ id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }] };
let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0 };
let curView = 'main', weather = "Ясно", isBroken = false;

const DISTRICTS = [{ name: "Praga", minLvl: 0, rent: 50, mult: 1, price: 0 }, { name: "Mokotów", minLvl: 2.5, rent: 120, mult: 1.5, price: 150 }, { name: "Śródmieście", minLvl: 5.0, rent: 300, mult: 2.5, price: 500 }];
const UPGRADES = [{ id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам за каждый заказ.', price: 350, bonus: '+15% PLN' }, { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы прилетают на 40% чаще.', price: 1200, bonus: 'Заказы x1.4' }, { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Снижает расход энергии на 30% навсегда.', price: 500, bonus: '⚡ -30%' }];

// Загрузка из Бельгии
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { G = { ...G, ...data }; updateUI(); }
    else { set(userRef, G); }
});

function log(msg, color = "#eee") {
    const logEl = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = "log-entry"; entry.style.color = color;
    entry.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
    logEl.appendChild(entry);
    if (logEl.childNodes.length > 5) logEl.removeChild(logEl.firstChild);
}

function updateUI() {
    document.getElementById('money-val').innerText = G.money.toFixed(2) + " PLN";
    document.getElementById('money-val').style.color = G.money < 0 ? "var(--danger)" : "var(--success)";
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('district-ui').innerText = "Район: " + DISTRICTS[G.district].name;
    document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️" : "☀️");
    
    // Состояние кнопок/плашек
    document.getElementById('auto-status-ui').style.display = G.autoTime > 0 ? 'block' : 'none';
    if(G.autoTime > 0) document.getElementById('auto-status-ui').innerText = `АВТО ${Math.floor(G.autoTime/60)}:${(G.autoTime%60<10?'0':'')+G.autoTime%60}`;
    document.getElementById('bike-status-ui').style.display = G.bikeRentTime > 0 ? 'block' : 'none';
    if(G.bikeRentTime > 0) document.getElementById('bike-status-ui').innerText = `🚲 ${Math.floor(G.bikeRentTime/60)}:${(G.bikeRentTime%60<10?'0':'')+G.bikeRentTime%60}`;
    const buffUI = document.getElementById('buff-status-ui'); buffUI.style.display = G.buffTime > 0 ? 'block' : 'none';
    if(G.buffTime > 0) buffUI.innerText = `⚡ ${Math.floor(G.buffTime/60)}:${(G.buffTime%60<10?'0':'')+G.buffTime%60}`;
    
    // Инвентарь
    const invDisp = document.getElementById('inventory-display'); invDisp.innerHTML = ''; 
    UPGRADES.forEach(up => { if(G[up.id]) { const span = document.createElement('span'); span.className = 'inv-item'; span.innerText = `${up.icon} ${up.bonus}`; invDisp.appendChild(span); } });

    // Окно заказа
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

    document.getElementById('click-rate-ui').innerText = (0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult).toFixed(2) + " PLN";
    document.getElementById('history-ui').innerHTML = G.history.map(h => `<div class="history-item"><span>${h.time} ${h.msg}</span><b style="color:${h.type==='plus'?'var(--success)':'var(--danger)'}">${h.type==='plus'?'+':'-'}${h.val}</b></div>`).join('');
    
    renderShop(); renderBank(); renderMilestones(); renderInvest(); renderDistricts();
}

function doWork() {
    if (isBroken) return;
    if (G.waterStock > 0 && G.en < (G.maxEn - 10)) { let eff = 1 + (Math.max(0.1, G.lvl) * 0.1); let drink = Math.min(G.waterStock, 50); G.en = Math.min(G.maxEn, G.en + (drink * eff)); G.waterStock -= drink; update(userRef, {en: G.en, waterStock: G.waterStock}); }
    if (G.en < 1) return;
    if(order.active) { consumeResources(true); order.steps += (G.bikeRentTime > 0 ? 2 : 1); if (G.bikeRentTime > 0 && Math.random() < 0.002) { triggerBreakdown(); return; } if(order.steps >= order.target) finishOrder(true); updateUI(); return; }
    if(!order.visible) { if(Math.random() < (G.phone ? 0.35 : 0.18)) generateOrder(); }
    consumeResources(false);
    let gain = 0.10 * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult;
    G.money = parseFloat((G.money + gain).toFixed(2));
    G.lvl += 0.00025; G.totalClicks++; checkMilestones(); updateUI(); update(userRef, G);
}

function consumeResources(isOrder) {
    if (G.buffTime > 0) { if (isOrder || Math.random() < 0.2) G.waterStock = Math.max(0, G.waterStock - (isOrder ? 8 : 2)); return; }
    let cost = (G.scooter ? 7 : 10); if (G.bikeRentTime > 0) cost *= 0.5; if (weather === "Дождь") cost *= 1.2; if (isOrder) cost *= 1.5; 
    G.en = Math.max(0, G.en - cost); G.waterStock = Math.max(0, G.waterStock - (isOrder ? 10 : 3));
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; order.offerTimer = 15; order.isCriminal = Math.random() < 0.12; 
    let d = 0.5 + Math.random() * 3.5; 
    let baseRew = (3.80 + d * 2.2) * Math.max(0.1, G.lvl) * DISTRICTS[G.district].mult * (G.bag ? 1.15 : 1) * (weather === "Дождь" ? 1.5 : 1); 
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; } 
    order.baseReward = baseRew; order.reward = baseRew; order.target = Math.floor(d * 160); order.steps = 0; order.time = Math.floor(order.target / 1.5 + 45); 
    updateUI(); 
}

function finishOrder(win) { 
    if(!order.active) return; order.active = false; 
    if(win) { 
        let policeChance = order.isCriminal ? 0.35 : 0.02; 
        if(Math.random() < policeChance) { G.lvl -= 1.2; G.money = parseFloat((G.money - 150).toFixed(2)); addHistory('👮 ШТРАФ', 150, 'minus'); log("🚔 ПОЛИЦИЯ! Штраф -150", "var(--danger)"); } 
        else { G.money = parseFloat((G.money + order.reward).toFixed(2)); addHistory(order.isCriminal ? '☠️ КРИМИНАЛ' : '📦 ЗАКАЗ', order.reward.toFixed(2), 'plus'); G.lvl += (order.isCriminal ? 0.12 : 0.015); G.totalOrders++; 
            if(Math.random() < 0.40) { let tip = parseFloat((5 + Math.random()*15).toFixed(2)); G.money = parseFloat((G.money + tip).toFixed(2)); addHistory('💰 ЧАЕВЫЕ', tip, 'plus'); log(`💰 Чаевые: +${tip.toFixed(2)}`, "var(--success)"); } 
        } 
    } order.visible = false; updateUI(); update(userRef, G); 
}

// Рендеры вкладок
function renderShop() {
    const shopEl = document.getElementById('view-shop');
    shopEl.innerHTML = `
        <div class="card"><b>🧴 Вода (1.5л)</b><br><small>Восполняет энергию при кликах. 1500 мл.</small><button class="btn-action" style="margin-top:8px;" id="buy-water">1.50 PLN</button></div>
        <div class="card" style="border:1px solid #ffcc00"><b>☕ Кофе</b><br><small>Мгновенно восстанавливает +300 энергии.</small><button class="btn-action" style="background:#6f4e37; margin-top:8px;" id="buy-coffee">5.00 PLN</button></div>
        <div class="card" style="border:1px solid #34c759"><b>🔋 Энергетик (2 мин)</b><br><small>Замораживает расход энергии. Вода продолжает тратиться.</small><button class="btn-action" style="background:#34c759; margin-top:8px;" id="buy-energy">12.00 PLN</button></div>
    `;
    document.getElementById('buy-water').onclick = () => { if(G.money >= 1.5) { G.money -= 1.5; G.waterStock += 1500; addHistory('🧴 ВОДА', 1.5, 'minus'); update(userRef, G); } };
    document.getElementById('buy-coffee').onclick = () => { if(G.money >= 5) { G.money -= 5; G.en = Math.min(2000, G.en + 300); addHistory('☕ КОФЕ', 5, 'minus'); update(userRef, G); } };
    document.getElementById('buy-energy').onclick = () => { if(G.money >= 12) { G.money -= 12; G.buffTime += 120; addHistory('🔋 ЭНЕРГЕТИК', 12, 'minus'); update(userRef, G); } };
}

function renderBank() {
    const ui = document.getElementById('bank-actions-ui');
    ui.innerHTML = G.debt <= 0 ? `<button class="btn-action" id="take-credit">ВЗЯТЬ КРЕДИТ (50 PLN)</button>` : `<button class="btn-action" style="background:var(--success)" id="pay-credit">ВЕРНУТЬ ДОЛГ (${G.debt} PLN)</button>`;
    if(document.getElementById('take-credit')) document.getElementById('take-credit').onclick = () => { G.money += 50; G.debt = 50; addHistory('🏦 КРЕДИТ', 50, 'plus'); update(userRef, G); };
    if(document.getElementById('pay-credit')) document.getElementById('pay-credit').onclick = () => { if(G.money >= G.debt) { G.money -= G.debt; addHistory('🏦 ДОЛГ', G.debt, 'minus'); G.debt = 0; update(userRef, G); } };
}

function renderInvest() {
    const upgradeList = document.getElementById('upgrade-items'); upgradeList.innerHTML = ''; 
    UPGRADES.forEach(up => { if(!G[up.id]) { 
        const div = document.createElement('div'); div.className = 'card'; div.style.marginTop = '8px'; 
        div.innerHTML = `<b>${up.icon} ${up.name}</b><br><small style="color:#aaa;">${up.desc}</small><br><button class="btn-action" style="margin-top:8px;" id="buy-${up.id}">КУПИТЬ (${up.price} PLN)</button>`; 
        upgradeList.appendChild(div);
        document.getElementById(`buy-${up.id}`).onclick = () => { if(G.money >= up.price) { G.money -= up.price; G[up.id] = true; addHistory('ИНВЕСТ', up.price, 'minus'); update(userRef, G); } };
    } });
    document.getElementById('buy-bike-rent').onclick = () => { if(G.money >= 30) { G.money -= 30; G.bikeRentTime += 600; addHistory('🚲 ВЕЛИК', 30, 'minus'); update(userRef, G); } };
}

function renderDistricts() {
    const distEl = document.getElementById('view-districts');
    distEl.innerHTML = `<h3 style="margin:0; color:var(--gold)">🏙️ Выбор района</h3>` + DISTRICTS.map((d, i) => `
        <div class="card"><b>${d.name}</b><br><small>Аренда: ${d.rent} PLN. ${i===0?'Стартовый доход.':`Доход: +${(d.mult-1)*100}%`}</small><br>
        <button class="btn-action" style="margin-top:5px; background:${G.district===i?'var(--success)':'var(--accent)'};" id="move-dist-${i}">${G.district===i?'ТЕКУЩИЙ':`ПЕРЕЕХАТЬ (${d.price} PLN)`}</button></div>
    `).join('');
    DISTRICTS.forEach((d, i) => { document.getElementById(`move-dist-${i}`).onclick = () => { if(G.district !== i && G.lvl >= d.minLvl && G.money >= d.price) { G.money -= d.price; G.district = i; addHistory('🏙️ ПЕРЕЕЗД', d.price, 'minus'); update(userRef, G); } } });
}

function renderMilestones() {
    document.getElementById('milestones-list').innerHTML = G.activeMilestones.map(m => { 
        let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; 
        return `<div class="card" style="margin-top:8px;"><b>${m.name}</b><div style="height:4px; background:#222; margin:5px 0;"><div style="width:${Math.min(100,(cur/m.goal*100))}%; height:100%; background:var(--success)"></div></div><small>${cur}/${m.goal}</small></div>`; 
    }).join('');
}

// Привязка кнопок главного экрана
document.getElementById('work-sphere').onclick = doWork;
document.getElementById('collect-bottles-btn').onclick = () => { G.money += 0.02; G.totalBottles++; checkMilestones(); update(userRef, G); };
document.getElementById('switch-dist-btn').onclick = () => { switchTab('districts'); };
document.getElementById('accept-order-btn').onclick = () => { order.active = true; updateUI(); };
document.getElementById('autopilot-btn').onclick = () => { if(G.money >= 45 && G.lvl >= 0.15) { G.money -= 45; G.lvl -= 0.15; G.autoTime += 600; addHistory('АВТОПИЛОТ', 45, 'minus'); order.active = true; update(userRef, G); } };
document.getElementById('exch-05').onclick = () => { if(G.lvl >= 1.05) { G.lvl -= 0.05; G.money += 10; addHistory('💎 ОБМЕН', 10, 'plus'); update(userRef, G); } };
document.getElementById('exch-10').onclick = () => { if(G.lvl >= 2.0) { G.lvl -= 1.0; G.money += 300; addHistory('💎 ОБМЕН', 300, 'plus'); update(userRef, G); } };

// Навигация
function switchTab(v) { 
    curView = v; 
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active')); 
    document.getElementById('view-'+v).classList.add('active'); 
    document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active'));
    document.getElementById('tab-'+v).classList.add('active');
    updateUI(); 
}
document.getElementById('tab-main').onclick = () => switchTab('main');
document.getElementById('tab-quests').onclick = () => switchTab('quests');
document.getElementById('tab-shop').onclick = () => switchTab('shop');
document.getElementById('tab-invest').onclick = () => switchTab('invest');
document.getElementById('tab-bank').onclick = () => switchTab('bank');

function addHistory(msg, val, type) { const time = new Date().toLocaleTimeString().split(' ')[0]; G.history.unshift({ time, msg, val, type }); if (G.history.length > 20) G.history.pop(); }
function checkMilestones() { G.activeMilestones.forEach((m, i) => { let cur = m.type === 'orders' ? G.totalOrders : m.type === 'clicks' ? G.totalClicks : G.totalBottles; if(cur >= m.goal) { G.money += m.reward; addHistory('🏆 ЦЕЛЬ', m.reward, 'plus'); G.lvl += 0.01; log(`🏆 ДОСТИЖЕНИЕ: ${m.name}`, "var(--gold)"); G.activeMilestones[i] = { id: Date.now()+i, name: m.name, goal: cur + Math.floor(m.goal*0.6), type: m.type, reward: m.reward + 20 }; } }); }
function triggerBreakdown() { isBroken = true; log("🚲 ПОЛОМКА!", "var(--danger)"); G.money -= 7; addHistory('🛠️ РЕМОНТ', 7, 'minus'); setTimeout(() => { isBroken = false; updateUI(); }, 3000); }

// Ежесекундный цикл
setInterval(() => {
    G.tax--; if(G.tax <= 0) { let cost = parseFloat((G.money * 0.25).toFixed(2)); G.money -= cost; addHistory('🏛️ НАЛОГ', cost, 'minus'); G.tax = 300; log("Налог 25%"); }
    G.rent--; if(G.rent <= 0) { G.money -= DISTRICTS[G.district].rent; addHistory('🏠 Аренда', DISTRICTS[G.district].rent, 'minus'); G.rent = 600; }
    
    if (Math.random() < 0.015) weather = Math.random() < 0.35 ? "Дождь" : "Ясно";
    if (G.bikeRentTime > 0) G.bikeRentTime--;
    if (G.buffTime > 0) G.buffTime--;
    
    if (G.autoTime > 0) {
        G.autoTime--;
        if (order.active && !isBroken) {
            for(let i=0; i<10; i++) {
                if(!order.active || isBroken) break;
                if (G.waterStock > 0 && G.en < 600) { G.en = Math.min(2000, G.en + (15 * (1 + G.lvl * 0.1))); G.waterStock -= 15; }
                if (G.en > 5) { consumeResources(true); order.steps += (G.bikeRentTime > 0 ? 3 : 2); if (order.steps >= order.target) { finishOrder(true); break; } }
            }
        }
    }
    
    if(order.visible && !order.active) { order.offerTimer--; order.reward *= 0.97; if(order.offerTimer <= 0) { order.visible = false; G.lvl -= 0.02; } }
    if(order.active) { order.time--; if(order.time <= 0) finishOrder(false); }

    document.getElementById('tax-timer').innerText = `Налог через: ${Math.floor(G.tax/60)}:${G.tax%60<10?'0':''}${G.tax%60}`;
    document.getElementById('rent-timer').innerText = `Аренда через: ${Math.floor(G.rent/60)}:${G.rent%60<10?'0':''}${G.rent%60}`;
    updateUI();
}, 1000);
