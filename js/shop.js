// js/shop.js
// Магазин: еда, велосипеды, экипировка

window.state = window.state || {
  money: 500,
  reputation: 50,
  courier: {
    hunger: 60,
    mood: 70,
    energy: 80,
    speed: 12,
    bike: "basic",
    gear: []
  }
};

// ===== КАТАЛОГ =====
const SHOP = {
  food: [
    { id: "burger", name: "🍔 Бургер", price: 12, effect: () => addStats(20, 0, 0) },
    { id: "meal", name: "🍛 Обед", price: 20, effect: () => addStats(35, 0, 0) },
    { id: "energy", name: "⚡ Энергетик", price: 8, effect: () => addStats(0, 0, 15) },
    { id: "coffee", name: "☕ Кофе", price: 6, effect: () => addStats(0, 0, 10) },
    { id: "snack", name: "🥨 Снэк", price: 5, effect: () => addStats(10, 0, 0) }
  ],
  bikes: [
    { id: "basic", name: "🚲 Обычный велосипед", price: 0, speed: 12 },
    { id: "e250", name: "⚡ E-bike 250W", price: 800, speed: 16 },
    { id: "e500", name: "⚡ E-bike 500W", price: 1400, speed: 19 },
    { id: "e1000", name: "⚡ E-bike 1000W", price: 2300, speed: 23 },
    { id: "e1500", name: "⚡ E-bike 1500W", price: 3200, speed: 27 }
  ],
  gear: [
    { id: "bag", name: "🎒 Термосумка", price: 150 },
    { id: "jacket", name: "🧥 Куртка от дождя", price: 120 },
    { id: "gloves", name: "🧤 Перчатки", price: 60 }
  ]
};

// ===== UI =====
window.openShop = function () {
  let html = `<h2>🛒 Магазин</h2><p>Баланс: ${state.money} PLN</p>`;

  html += `<h3>🍔 Еда</h3>`;
  SHOP.food.forEach(i => {
    html += `<p>${i.name} — ${i.price} PLN 
      <button onclick="buyFood('${i.id}')">Купить</button></p>`;
  });

  html += `<h3>🚲 Велосипеды</h3>`;
  SHOP.bikes.forEach(i => {
    html += `<p>${i.name} — ${i.price} PLN 
      <button onclick="buyBike('${i.id}')">Выбрать</button></p>`;
  });

  html += `<h3>🎒 Экипировка</h3>`;
  SHOP.gear.forEach(i => {
    html += `<p>${i.name} — ${i.price} PLN 
      <button onclick="buyGear('${i.id}')">Купить</button></p>`;
  });

  document.querySelector(".bottom-card").innerHTML = html;
};

// ===== ПОКУПКИ =====
function canBuy(price) {
  return state.money >= price;
}

function spend(price) {
  state.money -= price;
}

function addStats(hunger, mood, energy) {
  state.courier.hunger = Math.min(100, state.courier.hunger + hunger);
  state.courier.mood = Math.min(100, state.courier.mood + mood);
  state.courier.energy = Math.min(100, state.courier.energy + energy);
}

window.buyFood = function (id) {
  const item = SHOP.food.find(i => i.id === id);
  if (!canBuy(item.price)) return alert("Недостаточно денег");
  spend(item.price);
  item.effect();
  openShop();
};

window.buyBike = function (id) {
  const item = SHOP.bikes.find(i => i.id === id);
  if (!canBuy(item.price)) return alert("Недостаточно денег");
  spend(item.price);
  state.courier.bike = id;
  state.courier.speed = item.speed;
  openShop();
};

window.buyGear = function (id) {
  const item = SHOP.gear.find(i => i.id === id);
  if (!canBuy(item.price)) return alert("Недостаточно денег");
  if (state.courier.gear.includes(id)) return alert("Уже куплено");
  spend(item.price);
  state.courier.gear.push(id);
  openShop();
};
