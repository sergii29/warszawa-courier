// js/orders.js
// Заказы + движение + уменьшающееся расстояние + дедлайны + жёсткие штрафы

// ===== НАСТРОЙКИ =====
const SPEED_KMH = 12;        // скорость курьера
const TICK_MS = 1000;        // обновление раз в секунду
const MIN_PAYOUT = 8.99;     // минималка
const BASE_MIN = 3.5;
const BASE_MAX = 4.5;
const KM_RATE_MIN = 2.0;
const KM_RATE_MAX = 2.6;

// Дедлайн: базовое время + на км (мин)
const BASE_MINUTES = 6;      // базовое время
const MIN_PER_KM = 6;        // минут на км

// Штрафы
const LATE_FINE = 10;        // PLN
const LATE_REP_PENALTY = 3;  // репутация
const SUCCESS_REP_BONUS = 1; // репутация

// ===== СОСТОЯНИЕ =====
let online = false;
let activeOrder = null;
let phase = "idle"; // idle | to_restaurant | waiting | to_client
let deadlineAt = null;
let timerDeadline = null;

// Текущая позиция курьера (если map.js выставляет — подхватится)
window.courierPos = window.courierPos || [52.2297, 21.0122];

// ===== УТИЛИТЫ =====
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function haversine(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;

  const h =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function moveTowards(from, to, kmPerTick) {
  const dist = haversine(from, to);
  if (dist <= kmPerTick) return to.slice();
  const r = kmPerTick / dist;
  return [
    from[0] + (to[0] - from[0]) * r,
    from[1] + (to[1] - from[1]) * r
  ];
}

function minutesLeft() {
  if (!deadlineAt) return null;
  const ms = deadlineAt - Date.now();
  return Math.max(0, Math.ceil(ms / 60000));
}

// ===== UI =====
function setBottom(html) {
  const card = document.querySelector(".bottom-card");
  if (!card) return;
  card.innerHTML = html;
}

function searching() {
  setBottom(`
    <h2>Warsaw</h2>
    <p>🔄 Ищем заказ…</p>
  `);
}

function showOrderCard(o) {
  setBottom(`
    <h2>Street Food Point</h2>
    <p>
      📍 До ресторана: ${o.dToRest.toFixed(2)} км<br>
      📦 До клиента: ${o.dToClient.toFixed(2)} км<br>
      ⏱ Дедлайн: ${o.deadlineMin} мин<br>
      💰 Оплата: ${o.payout} PLN
    </p>
    <div style="display:flex; gap:10px; margin-top:12px">
      <button class="online-btn" onclick="acceptOrder()">Принять</button>
      <button class="online-btn" onclick="skipOrder()" style="background:#ddd;color:#111">Пропустить</button>
    </div>
  `);
}

function showTravel(text, km) {
  setBottom(`
    <h2>Warsaw</h2>
    <p>${text}<br>Осталось: ${km.toFixed(2)} км<br>⏱ До дедлайна: ${minutesLeft()} мин</p>
  `);
}

function showWaiting(ms) {
  const min = Math.ceil(ms / 60000);
  setBottom(`
    <h2>Warsaw</h2>
    <p>⏳ Ожидание заказа (${min} мин)</p>
  `);
}

function showSuccess(payout) {
  setBottom(`
    <h2>Готово</h2>
    <p>✅ Доставка выполнена<br>💰 +${payout} PLN<br>⭐ Репутация +${SUCCESS_REP_BONUS}</p>
  `);
}

function showLate() {
  setBottom(`
    <h2>Отмена</h2>
    <p>❌ Опоздание<br>💸 Штраф −${LATE_FINE} PLN<br>⭐ Репутация −${LATE_REP_PENALTY}</p>
  `);
}

// ===== ВЫХОД НА ЛИНИЮ =====
window.goOnline = function () {
  if (online) return;
  online = true;
  searching();
  setTimeout(spawnOrder, rand(3000, 6000));
};

window.goOffline = function () {
  online = false;
  cleanupTimers();
  activeOrder = null;
  phase = "idle";
  setBottom(`<h2>Warsaw</h2><p>Вы не на линии</p>`);
};

// ===== ЗАКАЗ =====
function spawnOrder() {
  if (!online) return;

  const restaurant = [
    courierPos[0] + rand(-0.01, 0.01),
    courierPos[1] + rand(-0.02, 0.02)
  ];
  const client = [
    restaurant[0] + rand(-0.02, 0.02),
    restaurant[1] + rand(-0.03, 0.03)
  ];

  const dToRest = haversine(courierPos, restaurant);
  const dToClient = haversine(restaurant, client);
  const totalKm = dToRest + dToClient;

  const base = rand(BASE_MIN, BASE_MAX);
  const kmRate = rand(KM_RATE_MIN, KM_RATE_MAX);
  let payout = base + totalKm * kmRate;

  if (payout < MIN_PAYOUT) payout = MIN_PAYOUT;

  const deadlineMin = Math.ceil(BASE_MINUTES + totalKm * MIN_PER_KM);

  activeOrder = {
    restaurant,
    client,
    dToRest,
    dToClient,
    totalKm,
    payout: payout.toFixed(2),
    waitMs: rand(120000, 360000), // 2–6 мин
    deadlineMin
  };

  showOrderCard(activeOrder);
}

window.skipOrder = function () {
  searching();
  setTimeout(spawnOrder, rand(3000, 6000));
};

// ===== ПРИНЯТИЕ =====
window.acceptOrder = function () {
  if (!activeOrder) return;

  phase = "to_restaurant";
  deadlineAt = Date.now() + activeOrder.deadlineMin * 60000;
  startDeadlineWatcher();

  showTravel("🚴 Едешь к ресторану…", activeOrder.dToRest);
  startMove(activeOrder.restaurant, () => {
    phase = "waiting";
    showWaiting(activeOrder.waitMs);
    setTimeout(() => {
      phase = "to_client";
      showTravel("🚴 Едешь к клиенту…", activeOrder.dToClient);
      startMove(activeOrder.client, finishOrder);
    }, activeOrder.waitMs);
  });
};

// ===== ДВИЖЕНИЕ =====
function startMove(target, onArrive) {
  const kmPerTick = SPEED_KMH / 3600;
  const mover = setInterval(() => {
    const next = moveTowards(courierPos, target, kmPerTick);
    courierPos = next;

    if (window.courierMarker) {
      window.courierMarker.setLatLng(courierPos);
    }

    const remaining = haversine(courierPos, target);
    if (phase === "to_restaurant") showTravel("🚴 Едешь к ресторану…", remaining);
    if (phase === "to_client") showTravel("🚴 Едешь к клиенту…", remaining);

    if (remaining <= kmPerTick) {
      clearInterval(mover);
      onArrive && onArrive();
    }
  }, TICK_MS);
}

// ===== ДЕДЛАЙН =====
function startDeadlineWatcher() {
  cleanupTimers();
  timerDeadline = setInterval(() => {
    if (!deadlineAt) return;
    if (Date.now() > deadlineAt) {
      // опоздал
      cleanupTimers();
      phase = "idle";
      activeOrder = null;
      applyLatePenalty();
      showLate();
      setTimeout(() => online && spawnOrder(), 3000);
    }
  }, 1000);
}

function cleanupTimers() {
  if (timerDeadline) {
    clearInterval(timerDeadline);
    timerDeadline = null;
  }
}

// ===== ФИНИШ =====
function finishOrder() {
  cleanupTimers();
  phase = "idle";
  const payout = activeOrder.payout;

  // Деньги/репутация — если есть state, применим
  if (window.state) {
    window.state.money = (window.state.money || 0) + Number(payout);
    window.state.reputation = (window.state.reputation || 0) + SUCCESS_REP_BONUS;
  }

  showSuccess(payout);
  activeOrder = null;
  setTimeout(() => online && spawnOrder(), 3000);
}

function applyLatePenalty() {
  if (window.state) {
    window.state.money = Math.max(0, (window.state.money || 0) - LATE_FINE);
    window.state.reputation = Math.max(0, (window.state.reputation || 0) - LATE_REP_PENALTY);
  }
}
