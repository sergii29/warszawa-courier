// js/orders.js
// Генерация и управление заказами

let activeOrder = null;

function goOnline() {
  state.online = true;
  updateUI();
  scheduleNextOrder();
}

function goOffline() {
  state.online = false;
  updateUI();
}

function scheduleNextOrder() {
  if (!state.online) return;

  const baseDelay = 8000;
  const reputationFactor = (100 - state.reputation) * 100;
  const delay = baseDelay + reputationFactor;

  setTimeout(() => {
    if (!state.online) return;
    generateOrder();
  }, delay);
}

function generateOrder() {
  const restaurant = randomPointNearCourier(2);
  const client = randomPointNearCourier(4);

  const distance = calculateDistance(
    restaurant[0],
    restaurant[1],
    client[0],
    client[1]
  );

  let price = 15 + distance * 4;
  price *= 1 + state.reputation / 200;

  if (state.weather === "rain") price *= 1.2;

  activeOrder = {
    restaurant: {
      name: "Restaurant",
      coords: restaurant,
    },
    client: {
      coords: client,
    },
    distance: distance.toFixed(1),
    price: Math.round(price),
    waitTime: 3000 + Math.random() * 4000,
  };

  showOrderPopup(activeOrder);
}

function acceptOrder() {
  if (!activeOrder) return;
  showOrderOnMap(activeOrder);
  activeOrder = null;
  scheduleNextOrder();
}

// helpers
function randomPointNearCourier(radiusKm) {
  const latOffset = (Math.random() - 0.5) * radiusKm * 0.01;
  const lngOffset = (Math.random() - 0.5) * radiusKm * 0.02;
  return [
    courierPosition[0] + latOffset,
    courierPosition[1] + lngOffset,
  ];
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

window.goOnline = goOnline;
window.goOffline = goOffline;
window.acceptOrder = acceptOrder;
