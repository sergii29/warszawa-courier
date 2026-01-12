const tg = window.Telegram.WebApp; 
tg.expand(); 
tg.ready();

const SAVE_KEY = "WARSZAWA_FOREVER";

// Флаг блокировки сохранения (чтобы не перезаписать сброс админа)
let isResetting = false;

// Основные данные
let G = { 
    money: 10, 
    debt: 0, 
    lvl: 1.0, 
    en: 2000, 
    maxEn: 2000, 
    tax: 300, 
    rent: 300, 
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
    forceReset: false, 
    activeMilestones: [
        { id: 1, name: "📦 Первые шаги", goal: 10, type: 'orders', reward: 30 }, 
        { id: 2, name: "🧴 Эко-активист", goal: 50, type: 'bottles', reward: 20 }, 
        { id: 3, name: "⚡ Энерджайзер", goal: 1000, type: 'clicks', reward: 40 }
    ] 
};

let order = { visible: false, active: false, steps: 0, target: 100, time: 0, reward: 0, offerTimer: 0, isCriminal: false, baseReward: 0 };
let curView = 'main', weather = "Ясно", isBroken = false;
let lastClickTime = 0; 
let clicksSinceBonus = 0;
let bonusActive = false;

const DISTRICTS = [
    { name: "Praga", minLvl: 0, rentPct: 0.05, mult: 1, price: 0 },       
    { name: "Mokotów", minLvl: 2.5, rentPct: 0.10, mult: 1.5, price: 150 }, 
    { name: "Śródmieście", minLvl: 5.0, rentPct: 0.15, mult: 1.55, price: 500 } 
];

const UPGRADES = [
    { id: 'bag', name: 'Термосумка', icon: '🎒', desc: '+15% к выплатам за каждый заказ.', price: 350, bonus: '+15% PLN' }, 
    { id: 'phone', name: 'Смартфон Pro', icon: '📱', desc: 'Заказы прилетают на 40% чаще.', price: 1200, bonus: 'Заказы x1.4' }, 
    { id: 'scooter', name: 'Электросамокат', icon: '🛴', desc: 'Снижает расход энергии на 30% навсегда.', price: 500, bonus: '⚡ -30%' }
];

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

// === УЛУЧШЕННЫЙ СЛУШАТЕЛЬ СБРОСА ===
function listenToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";

    if(typeof db !== 'undefined') {
        db.ref('users/' + userId).on('value', (snapshot) => {
            const remoteData = snapshot.val();
            
            // Если пришел приказ на сброс
            if(remoteData && remoteData.forceReset === true) {
                console.log("⚠️ АВАРИЙНЫЙ СБРОС ОБНАРУЖЕН!");
                
                // 1. БЛОКИРУЕМ любые сохранения
                isResetting = true; 
                
                // 2. Чистим память браузера
                localStorage.clear();
                localStorage.removeItem(SAVE_KEY);
                
                // 3. Сообщаем базе, что приняли сброс (и отключаем флаг)
                db.ref('users/' + userId).update({ forceReset: false }).then(() => {
                    // 4. Перезагружаем страницу ТОЛЬКО после обновления базы
                    window.location.reload(true);
                });
            }
        });
    }
}

function saveToCloud() {
    // ЕЩЕ ОДНА ЗАЩИТА: Не сохранять, если идет сброс
    if (isResetting) return;

    const tg = window.Telegram.WebApp.initDataUnsafe;
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";
    let firstName = (tg && tg.user) ? tg.user.first_name : "Browser Player";
    let userName = (tg && tg.user && tg.user.username) ? "@" + tg.user.username : "No Username";

    let dataToSave = { ...G, name: firstName, user: userName, lastActive: Date.now() };
    
    // Удаляем технический флаг перед сохранением
    if (dataToSave.forceReset) delete dataToSave.forceReset;

    if(typeof db !== 'undefined') db.ref('users/' + userId).set(dataToSave);
}

function save() { 
    // ЕЩЕ ОДНА ЗАЩИТА: Не сохранять в LocalStorage, если идет сброс
    if (isResetting) return;
    
    localStorage.setItem(SAVE_KEY, JSON.stringify(G)); 
    if(typeof saveToCloud === 'function') saveToCloud(); 
}

function load() { 
    let d = localStorage.getItem(SAVE_KEY); 
    if(d) { G = {...G, ...JSON.parse(d)}; } 
    G.maxEn = 2000; 
    listenToCloud(); // <-- Запуск слушателя
    updateUI(); 
}

// ОСТАЛЬНЫЕ ФУНКЦИИ (Сокращены для удобства, логика прежняя)
function addHistory(msg, val, type = 'plus') { const time = new Date().toLocaleTimeString().split(' ')[0]; G.history.unshift({ time, msg, val, type }); if (G.history.length > 20) G.history.pop(); }
async function usePromo() { const i = document.getElementById('promo-input'); const c = i.value.trim().toUpperCase(); if (!G.usedPromos) G.usedPromos = []; if (G.usedPromos.includes(c)) { log("Использовано!", "red"); return; } try { const r = await fetch('promos.json?t=' + Date.now()); const d = await r.json(); if (d[c]) { G.money+=d[c].reward; G.usedPromos.push(c); addHistory('🎁', d[c].reward); log(d[c].msg, "gold"); i.value=""; save(); updateUI(); } } catch(e){} }

const sphere = document.getElementById('work-sphere');
if(sphere) {
    sphere.addEventListener('touchstart', (e) => { e.preventDefault(); tg.HapticFeedback.impactOccurred('medium'); doWork(); }, {passive: false});
    sphere.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) doWork(); });
}

function showBonus() { const o = document.getElementById('bonus-overlay'); const b = document.getElementById('bonus-btn'); b.style.left = Math.random()*(window.innerWidth-150)+'px'; b.style.top = Math.random()*(window.innerHeight-100)+'px'; o.style.display = 'flex'; bonusActive = true; log("🎁 БОНУС!", "gold"); tg.HapticFeedback.notificationOccurred('warning'); }
function claimBonus() { document.getElementById('bonus-overlay').style.display='none'; bonusActive=false; clicksSinceBonus=0; G.money+=50; addHistory('🎁', 50); log("Бонус взят!", "green"); tg.HapticFeedback.notificationOccurred('success'); save(); updateUI(); }

function updateUI() {
    // Если идет сброс - ничего не отрисовываем, ждем релоада
    if (isResetting) return;

    const moneyEl = document.getElementById('money-val');
    if(moneyEl) { moneyEl.innerText = G.money.toFixed(2) + " PLN"; moneyEl.style.color = G.money < 0 ? "#ef4444" : "#22c55e"; }
    document.getElementById('lvl-val').innerText = "LVL " + G.lvl.toFixed(6);
    document.getElementById('en-text').innerText = Math.floor(G.en) + "/" + G.maxEn;
    document.getElementById('en-fill').style.width = (G.en/G.maxEn*100) + "%";
    document.getElementById('water-val').innerText = Math.floor(G.waterStock);
    document.getElementById('district-ui').innerText = "📍 " + DISTRICTS[G.district].name;
    document.getElementById('weather-ui').innerText = (weather === "Дождь" ? "🌧️ Дождь" : "☀️ Ясно");
    
    // Индикаторы
    const setStatus = (id, val, icon) => { 
        const el = document.getElementById(id); 
        el.style.display = val > 0 ? 'block' : 'none'; 
        if(val>0) el.innerText = `${icon} ${Math.floor(val/60)}:${(val%60<10?'0':'')+val%60}`; 
    };
    setStatus('auto-status-ui', G.autoTime, '🤖');
    setStatus('bike-status-ui', G.bikeRentTime, '🚲');
    setStatus('buff-status-ui', G.buffTime, '⚡');

    // Инвентарь (Кнопки / Куплено)
    const invDiv = document.getElementById('inventory-display'); invDiv.innerHTML='';
    const shopDiv = document.getElementById('upgrade-items'); shopDiv.innerHTML='';
    
    UPGRADES.forEach(u => {
        if(G[u.id]) { const s=document.createElement('span'); s.className='inv-item'; s.innerText=`${u.icon} ${u.bonus}`; invDiv.appendChild(s); }
        
        const card = document.createElement('div'); card.className='card'; card.style.marginTop='8px';
        if(G[u.id]) {
            card.style.border="1px solid #22c55e"; card.style.background="rgba(34,197,94,0.1)";
            card.innerHTML=`<div style="display:flex;justify-content:space-between;"><b>${u.icon} ${u.name}</b><span style="font-size:10px;color:#22c55e;border:1px solid;padding:2px 6px;border-radius:8px;">✅ КУПЛЕНО</span></div><small style="color:#aaa;">${u.desc}</small>`;
        } else {
            card.innerHTML=`<b>${u.icon} ${u.name}</b><br><small style="color:#aaa;">${u.desc}</small><br><button class="btn-action" style="margin-top:8px;" onclick="buyInvest('${u.id}', ${u.price})">КУПИТЬ (${u.price} PLN)</button>`;
        }
        shopDiv.appendChild(card);
    });

    // Заказ
    const qBar = document.getElementById('quest-bar');
    if(order.visible && curView==='main') {
        qBar.style.display='block';
        if(order.active) {
            document.getElementById('quest-actions-choice').style.display='none';
            document.getElementById('quest-active-ui').style.display='block';
            document.getElementById('quest-timer-ui').innerText=`${Math.floor(order.time/60)}:${(order.time%60<10?'0':'')+order.time%60}`;
            document.getElementById('quest-progress-bar').style.width=(order.steps/order.target*100)+"%";
        } else {
            document.getElementById('quest-actions-choice').style.display='flex';
            document.getElementById('quest-active-ui').style.display='none';
            document.getElementById('quest-timer-ui').innerText=`0:${(order.offerTimer<10?'0':'')+order.offerTimer}`;
            document.getElementById('quest-pay').innerText=order.reward.toFixed(2);
        }
    } else { qBar.style.display='none'; }

    document.getElementById('buy-bike-rent').innerText = G.bikeRentTime > 0 ? "В АРЕНДЕ" : "АРЕНДОВАТЬ (30 PLN)";
    
    let clickRate = (0.10 * (1 + G.lvl*0.1) * DISTRICTS[G.district].mult).toFixed(2);
    if(order.visible && !order.active) clickRate = "0.00 (ПРИМИ ЗАКАЗ!)";
    document.getElementById('click-rate-ui').innerText = clickRate + " PLN";

    document.getElementById('history-ui').innerHTML = G.history.map(h => `<div class="history-item"><span>${h.time} ${h.msg}</span><b style="color:${h.type==='plus'?'#22c55e':'#ef4444'}">${h.type==='plus'?'+':'-'}${h.val}</b></div>`).join('');
    
    renderBank(); renderMilestones(); updateDistrictButtons();
    
    const taxT = document.getElementById('tax-timer'); if(taxT) taxT.innerText=`Налог (37%) через: ${Math.floor(G.tax/60)}:${(G.tax%60<10?'0':'')+G.tax%60}`;
    const rentT = document.getElementById('rent-timer'); if(rentT) rentT.innerText=`Аренда (${(DISTRICTS[G.district].rentPct*100).toFixed(0)}%) через: ${Math.floor(G.rent/60)}:${(G.rent%60<10?'0':'')+G.rent%60}`;
}

function updateDistrictButtons() {
    DISTRICTS.forEach((d, i) => {
        const b = document.getElementById(`btn-dist-${i}`); if(!b) return;
        if(G.district===i) {
            b.innerText="✅ ТЕКУЩИЙ"; b.style.background="rgba(34,197,94,0.2)"; b.style.color="#22c55e"; b.onclick=null;
        } else {
            let ok = G.money>=d.price && G.lvl>=d.minLvl;
            if(ok) { b.innerText=`ПЕРЕЕХАТЬ (${d.price} PLN)`; b.style.background="#3b82f6"; b.style.color="white"; b.onclick=()=>moveDistrict(i); }
            else { b.innerText=G.lvl<d.minLvl ? `НУЖЕН LVL ${d.minLvl}` : `НЕТ ДЕНЕГ (${d.price} PLN)`; b.style.background="rgba(255,255,255,0.1)"; b.style.color="#777"; b.onclick=null; }
        }
    });
}

function triggerPoliceCheck() {
    log("🚔 ПРОВЕРКА!", "gold"); tg.HapticFeedback.notificationOccurred('warning');
    if(Math.random()<0.4) { G.money-=100; addHistory('👮 ШТРАФ', 100, 'minus'); log("Штраф -100", "red"); tg.HapticFeedback.notificationOccurred('error'); }
    else { log("Чисто.", "green"); } save(); updateUI();
}

function doWork() {
    if(isBroken || isResetting) return;
    if(bonusActive) { G.en=Math.max(0,G.en-50); tg.HapticFeedback.notificationOccurred('error'); return; }
    let now=Date.now(); if(now-lastClickTime<80) return; lastClickTime=now;
    if(order.visible && !order.active) { G.en=Math.max(0,G.en-25); updateUI(); tg.HapticFeedback.notificationOccurred('error'); return; }
    if(Math.random()<0.008) { triggerPoliceCheck(); return; }
    if(G.waterStock>0 && G.en<G.maxEn-10) { let eff=1+(G.lvl*0.1); let d=Math.min(G.waterStock,50); G.en+=d*eff; G.waterStock-=d; save(); }
    if(G.en<1) return;
    clicksSinceBonus++; if(clicksSinceBonus>300+Math.random()*100) { showBonus(); clicksSinceBonus=0; }
    if(order.active) { consumeResources(true); order.steps+=(G.bikeRentTime>0?2:1); if(G.bikeRentTime>0 && Math.random()<0.002) triggerBreakdown(); if(order.steps>=order.target) finishOrder(true); updateUI(); return; }
    if(!order.visible && Math.random()<(G.phone?0.35:0.18)) generateOrder();
    consumeResources(false);
    let gain = 0.10 * (1 + G.lvl*0.1) * DISTRICTS[G.district].mult;
    G.money+=gain; G.lvl+=0.00025; G.totalClicks++; checkMilestones(); updateUI(); save();
}

function consumeResources(isO) {
    if(G.buffTime>0) { if(isO || Math.random()<0.2) G.waterStock=Math.max(0,G.waterStock-(isO?8:2)); return; }
    let c=(G.scooter?7:10); if(G.bikeRentTime>0) c*=0.5; if(weather==="Дождь") c*=1.2; if(isO) c*=1.5;
    G.en=Math.max(0,G.en-c); G.waterStock=Math.max(0,G.waterStock-(isO?10:3));
}

function generateOrder() { 
    if (order.visible || order.active) return; 
    order.visible = true; order.offerTimer = 15; order.isCriminal = Math.random() < 0.12; 
    let d = 0.5 + Math.random() * 3.5; 
    let levelMult = 1 + (G.lvl * 0.15); 
    let baseRew = (3.80 + d * 2.2) * levelMult * DISTRICTS[G.district].mult * (G.bag ? 1.15 : 1) * (weather === "Дождь" ? 1.5 : 1); 
    if(order.isCriminal) { baseRew *= 6.5; order.offerTimer = 12; log("👀 Мутный заказ...", "#3b82f6"); } 
    order.baseReward = baseRew; order.reward = baseRew; order.target = Math.floor(d * 160); order.steps = 0; order.time = Math.floor(order.target / 1.5 + 45); updateUI(); 
}

function activateAutopilot() { if(G.money>=45 && G.lvl>=0.15) { G.money-=45; G.lvl-=0.15; G.autoTime+=600; addHistory('АВТО', 45, 'minus'); acceptOrder(); save(); updateUI(); } }
function acceptOrder() { order.active=true; updateUI(); }
function finishOrder(w) { 
    if(!order.active) return; order.active=false; 
    if(w) { 
        let pC = order.isCriminal?0.40:0.02; 
        if(Math.random()<pC) { 
            let f=200; 
            if(order.isCriminal) { f=Math.max(300, Math.floor(G.money*0.25)); G.lvl-=0.5; log("АРЕСТ! Конфискация!", "red"); addHistory('АРЕСТ', f, 'minus'); }
            else { G.lvl-=0.05; log("Штраф за нарушение.", "orange"); addHistory('ШТРАФ', f, 'minus'); }
            G.money-=f; tg.HapticFeedback.notificationOccurred('error');
        } else {
            G.money+=order.reward; addHistory('ДОХОД', order.reward.toFixed(2)); G.lvl+=(order.isCriminal?0.15:0.015); G.totalOrders++;
            if(Math.random()<0.4) { let t=5+Math.random()*15; G.money+=t; addHistory('ЧАЕВЫЕ', t.toFixed(2)); }
        }
    }
    order.visible=false; updateUI(); save(); 
}

function checkMilestones() { G.activeMilestones.forEach((m,i)=>{ let c=m.type==='orders'?G.totalOrders:m.type==='clicks'?G.totalClicks:G.totalBottles; if(c>=m.goal){ G.money+=m.reward; addHistory('ЦЕЛЬ', m.reward); G.lvl+=0.01; log(`🏆 ${m.name}`, "gold"); G.activeMilestones[i]={...m, goal:Math.floor(m.goal*1.6), reward:m.reward+20}; save(); } }); }
function renderMilestones() { document.getElementById('milestones-list').innerHTML=G.activeMilestones.map(m=>`<div class="card" style="margin-top:8px;"><b>${m.name}</b><br><small style="color:gold;">+${m.reward} PLN</small><div class="career-progress"><div class="career-fill" style="width:${Math.min(100,( (m.type==='orders'?G.totalOrders:m.type==='clicks'?G.totalClicks:G.totalBottles)/m.goal*100 ))}%"></div></div></div>`).join(''); }
function collectBottles() { G.money+=0.02; G.totalBottles++; checkMilestones(); save(); updateUI(); }
function buyWater() { if(G.money>=1.5) { G.money-=1.5; G.waterStock+=1500; addHistory('ВОДА', 1.5, 'minus'); save(); updateUI(); } }
function buyDrink(t,p) { if(G.money>=p) { G.money-=p; if(t==='coffee') G.en+=300; else G.buffTime+=120; addHistory(t.toUpperCase(), p, 'minus'); save(); updateUI(); } }
function buyInvest(t,p) { if(!G[t] && G.money>=p) { G.money-=p; G[t]=true; addHistory('ИНВЕСТ', p, 'minus'); save(); updateUI(); } }
function rentBike() { if(G.money>=30) { G.money-=30; G.bikeRentTime+=600; addHistory('ВЕЛИК', 30, 'minus'); save(); updateUI(); } }
function exchangeLvl(l,m) { if(G.lvl>=l) { G.lvl-=l; G.money+=m; addHistory('ОБМЕН', m); save(); updateUI(); } }
function switchTab(v,e) { curView=v; document.querySelectorAll('.view').forEach(x=>x.classList.remove('active')); document.getElementById('view-'+v).classList.add('active'); document.querySelectorAll('.tab-item').forEach(x=>x.classList.remove('active')); e.classList.add('active'); updateUI(); }
function moveDistrict(i) { if(G.district===i) return; if(G.money<DISTRICTS[i].price || G.lvl<DISTRICTS[i].minLvl) { log("Нет доступа!", "red"); return; } G.money-=DISTRICTS[i].price; addHistory('ПЕРЕЕЗД', DISTRICTS[i].price, 'minus'); G.district=i; save(); updateUI(); }
function triggerBreakdown() { isBroken=true; log("ПОЛОМКА!", "red"); G.money-=7; addHistory('РЕМОНТ', 7, 'minus'); setTimeout(()=>{isBroken=false;updateUI();}, 3000); }
function renderBank() { const u=document.getElementById('bank-actions-ui'); u.innerHTML=G.debt<=0?`<button class="btn-action" onclick="G.money+=50;G.debt=50;addHistory('КРЕДИТ',50);save();updateUI();">ВЗЯТЬ КРЕДИТ (50 PLN)</button>`:`<button class="btn-action" style="background:#22c55e" onclick="if(G.money>=G.debt){G.money-=G.debt;addHistory('ДОЛГ',G.debt,'minus');G.debt=0;save();updateUI();}">ВЕРНУТЬ (${G.debt} PLN)</button>`; }

setInterval(() => {
    if(isResetting) return;
    G.tax--; if(G.tax<=0) { let c=G.money*0.37; G.money-=c; addHistory('НАЛОГ', c.toFixed(2), 'minus'); G.tax=300; save(); }
    G.rent--; if(G.rent<=0) { let c=G.money*DISTRICTS[G.district].rentPct; G.money-=c; addHistory('АРЕНДА', c.toFixed(2), 'minus'); G.rent=300; save(); }
    if(Math.random()<0.015) weather=Math.random()<0.35?"Дождь":"Ясно";
    if(G.bikeRentTime>0) { G.bikeRentTime--; if(G.bikeRentTime<=0 && G.money>=30) { G.money-=30; G.bikeRentTime=600; addHistory('ВЕЛИК', 30, 'minus'); } }
    if(G.buffTime>0) G.buffTime--;
    if(G.autoTime>0) { G.autoTime--; if(order.active && !isBroken) { for(let i=0;i<10;i++) { if(!order.active||isBroken)break; if(G.waterStock>0&&G.en<600){G.en+=15*(1+G.lvl*0.1);G.waterStock-=15;} if(G.en>5){consumeResources(true);order.steps+=(G.bikeRentTime>0?3:2);if(order.steps>=order.target){finishOrder(true);break;}}}} }
    if(order.visible && !order.active) { order.offerTimer--; order.reward*=(1-(order.isCriminal?0.05:0.03)); if(order.offerTimer<=0) { order.visible=false; G.lvl-=0.05; log("Заказ упущен!", "red"); } }
    if(order.active) { order.time--; if(order.time<=0) finishOrder(false); }
    updateUI();
}, 1000);

window.onload = load;
