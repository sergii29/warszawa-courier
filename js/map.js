// js/map.js
// Карта, позиция курьера, движение, расход ресурсов

let map;
let courierMarker;
let courierPosition = [52.2297, 21.0122]; // центр Варшавы
let movingInterval = null;

// Инициализация карты
function initMap() {
  map = L.map("map", {
    zoomControl: false,
  }).setView(courierPosition, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  courierMarker = L.marker(courierPosition, {
    icon: L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),
  }).addTo(map);
}

// Движение курьера к точке
function moveCourierTo(targetLatLng, onArrive) {
  if (movingInterval) clearInterval(movingInterval);

  const speed = getCourierSpeed(); // зависит от бодрости
  movingInterval = setInterval(() => {
    const latDiff = targetLatLng[0] - courierPosition[0];
    const lngDiff = targetLatLng[1] - courierPosition[1];

    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    if (distance < 0.0003) {
      clearInterval(movingInterval);
      courierPosition = targetLatLng;
      courierMarker.setLatLng(courierPosition);
      if (onArrive) onArrive();
      return;
    }

    courierPosition[0] += latDiff * speed;
    courierPosition[1] += lngDiff * speed;

    courierMarker.setLatLng(courierPosition);
    map.panTo(courierPosition, { animate: true, duration: 0.25 });

    drainCourierStats();
  }, 1000);
}

// Скорость курьера (зависит от бодрости)
function getCourierSpeed() {
  const energy = state.courier.energy; // 0–100
  if (energy > 70) return 0.08;
  if (energy > 40) return 0.05;
  return 0.025;
}

// Расход ресурсов при движении
function drainCourierStats() {
  state.courier.energy = Math.max(0, state.courier.energy - 1);
  state.courier.hunger = Math.max(0, state.courier.hunger - 0.5);
  state.courier.mood = Math.max(0, state.courier.mood - 0.3);

  updateUI();
}

// Показать заказ на карте
function showOrderOnMap(order) {
  const restaurantMarker = L.marker(order.restaurant.coords).addTo(map);
  const clientMarker = L.marker(order.client.coords).addTo(map);

  moveCourierTo(order.restaurant.coords, () => {
    alert("🍔 Заказ готовится...");
    setTimeout(() => {
      alert("📦 Заказ получен. Едешь к клиенту!");
      moveCourierTo(order.client.coords, () => {
        completeOrder(order);
        map.removeLayer(restaurantMarker);
        map.removeLayer(clientMarker);
      });
    }, order.waitTime);
  });
}

// Завершение заказа
function completeOrder(order) {
  let payout = order.price;

  // штрафы за состояние
  if (state.courier.hunger < 30) payout *= 0.8;
  if (state.courier.mood < 30) payout *= 0.85;

  state.money += Math.round(payout);
  state.reputation = Math.min(100, state.reputation + 1);

  updateUI();
  alert(`✅ Доставка завершена +${Math.round(payout)} PLN`);
}

window.initMap = initMap;
window.showOrderOnMap = showOrderOnMap;
