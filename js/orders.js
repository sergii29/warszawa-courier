// js/orders.js
// Реалистичная логика заказов + движение + уменьшающееся расстояние

// ===== НАСТРОЙКИ =====
const SPEED_KMH = 12;               // скорость курьера
const TICK_MS = 1000;               // обновление раз в секунду
const MIN_PAYOUT = 8.99;            // минималка (можно менять потом)
const BASE_MIN = 3.5;
const BASE_MAX = 4.5;
const KM_RATE_MIN = 2.0;
const KM_RATE_MAX = 2.6;

// ===== СОСТОЯНИЕ =====
let online = false;
let activeOrder = null;
let phase = "idle"; // idle | to_restaurant | waiting | to_client

// Текущая позиция курьера (берём из map.js, если есть)
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

  const ratio = kmPerTick / dist;
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio
  ];
}

// ===== UI ХЕЛПЕРЫ =====
function setBottom(text, buttonsHtml = "") {
  const card = document.querySelector(".bottom-card");
  if (!card) return;
  card.innerHTML = `
    <h2>Warsaw</h2>
    <p>${text}</p>
    ${buttonsHtml}
  `;
}

function setButtons(html) {
  const card = document.querySelector(".bottom-card");
  if (!card) return;
  card.insertAdjacentHTML("beforeend", html);
}

// ===== ВЫХОД НА ЛИНИЮ =====
window.goOnline = function () {
  if (online) return;
  online = true;
  setBottom("🔄 Ищем заказ…");
  setTimeout(spawnOrder, rand(3000, 6000));
};

window.goOffline = function () {
  online = false;
  activeOrder = null;
  phase = "idle";
  setBottom("Вы не на линии");
};

// ===== ГЕНЕРАЦИЯ ЗАКАЗА =====
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

  // модификаторы состояния (если есть state)
  if (window.state && window.state.courier) {
    const c = window.state.courier;
    if (c.hunger < 40) payout *= 0.9;
    if (c.mood < 40) payout *= 0.9;
    if (c.energy < 40) payout *= 0.85;
  }

  if (payout < MIN_PAYOUT) payout = MIN_PAYOUT;

  activeOrder = {
    restaurant,
    client,
    dToRest,
    dToClient,
    payout: payout.toFixed(2),
    waitMs: rand(120000, 360000) // 2–6 мин ожидание
  };

  setBottom(
    `🍔 Street Food Point<br>
     📍 До ресторана: ${dToRest.toFixed(2)} км<br>
     📦 До клиента: ${dToClient.toFixed(2)} км<br>
     💰 Оплата: ${activeOrder.payout} PLN`,
    `
    <div style="display:flex; gap:10px; margin-top:12px">
      <button class="online-btn" onclick="acceptOrder()">Принять</button>
      <button class="online-btn" onclick="skipOrder()" style="background:#ddd;color:#111">Пропустить</button>
    </div>`
  );
}

window.skipOrder = function () {
  setBottom("🔄 Ищем заказ…");
  setTimeout(spawnOrder, rand(3000, 6000));
};

// ===== ПРИНЯТИЕ И ДВИЖЕНИЕ =====
window.acceptOrder = function () {
  if (!activeOrder) return;
  phase = "to_restaurant";
  setBottom(`🚴 Едешь к ресторану…<br>📍 ${activeOrder.dToRest.toFixed(2)} км`);
  startMove(activeOrder.restaurant, () => {
    phase = "waiting";
    setBottom("⏳ Ожидание заказа…");
    setTimeout(() => {
      phase = "to_client";
      setBottom(`🚴 Едешь к клиенту…<br>📦 ${activeOrder.dToClient.toFixed(2)} км`);
      startMove(activeOrder.client, finishOrder);
    }, activeOrder.waitMs);
  });
};

function startMove(target, onArrive) {
  const kmPerTick = SPEED_KMH / 3600; // км за секунду
  const timer = setInterval(() => {
    const next = moveTowards(courierPos, target, kmPerTick);
    courierPos = next;

    // если есть карта — двигаем маркер
    if (window.courierMarker) {
      window.courierMarker.setLatLng(courierPos);
    }

    const remaining = haversine(courierPos, target);
    if (phase === "to_restaurant") {
      setBottom(`🚴 Едешь к ресторану…<br>📍 ${remaining.toFixed(2)} км`);
    } else if (phase === "to_client") {
      setBottom(`🚴 Едешь к клиенту…<br>📦 ${remaining.toFixed(2)} км`);
    }

    if (remaining <= kmPerTick) {
      clearInterval(timer);
      onArrive && onArrive();
    }
  }, TICK_MS);
}

function finishOrder() {
  setBottom(`✅ Доставка завершена<br>💰 +${activeOrder.payout} PLN`);
  // тут позже: деньги, репутация
  activeOrder = null;
  phase = "idle";
  setTimeout(() => online && spawnOrder(), 3000);
}
