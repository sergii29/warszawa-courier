/* ================== СОСТОЯНИЕ ИГРОКА ================== */
let player = JSON.parse(localStorage.getItem("courier_core")) || {
  xp: 0,
  level: 1,
  money: 0,
  debt: 0,

  energy: 100,
  stress: 10,
  mood: 60,
  burnout: 0,

  day: 1,
  onDay: false
};

/* ================== ГОРОД ================== */
let city = {
  hour: 8,
  weather: "clear", // clear / rain / night
  demand: 1,
  platformPressure: 1
};

/* ================== ФОРМУЛЫ ================== */
function calcLevel(xp) {
  return Math.min(150, Math.floor(Math.pow(xp, 0.45)));
}

function clampPlayer() {
  player.energy = Math.max(0, Math.min(100, player.energy));
  player.mood   = Math.max(0, Math.min(100, player.mood));
  player.stress = Math.max(0, Math.min(100, player.stress));
}

/* ================== ДЕНЬ ================== */
function startDay() {
  if (player.onDay) {
    log("Ты уже в работе.");
    return;
  }

  player.onDay = true;
  city.hour = 8;
  city.weather = Math.random() < 0.35 ? "rain" : "clear";

  log("Ты выходишь на смену. Погода: " + (city.weather === "rain" ? "дождь" : "ясно"));
  save(); updateUI();
}

/* ================== ДОСТАВКА ================== */
function doDelivery() {
  if (!player.onDay) {
    log("Сначала начни день.");
    return;
  }

  if (player.energy <= 0) {
    log("Ты выжат. Организм не слушается.");
    return;
  }

  city.hour++;
  city.demand = (city.hour >= 11 && city.hour <= 14) || city.hour >= 18 ? 1.6 : 1.0;

  let distance = rnd(1, 7);
  let fatigue  = (100 - player.energy) / 100;
  let moodMod  = player.mood / 100;

  let grossIncome = Math.floor(distance * 10 * city.demand * moodMod * (1 - fatigue));
  let tax  = Math.floor(grossIncome * 0.12);
  let fine = Math.random() < 0.15 ? rnd(20, 60) : 0;

  player.money += grossIncome - tax - fine;
  player.xp    += grossIncome;

  player.energy -= distance * 7;
  player.stress += rnd(3, 6);
  player.mood   -= fine > 0 ? 8 : 3;

  if (fine > 0) {
    log("⚠️ Конфликт с клиентом. Штраф " + fine + " zł.");
  } else {
    log("📦 Заказ доставлен. +" + (grossIncome - tax) + " zł после налогов.");
  }

  player.level = calcLevel(player.xp);
  clampPlayer();
  save(); updateUI();
}

/* ================== КОНЕЦ ДНЯ ================== */
function endDay() {
  if (!player.onDay) return;

  player.onDay = false;
  player.day++;

  player.energy += 40;
  player.stress -= 20;
  player.mood   += 10;

  clampPlayer();
  log("🌙 День закончен. Мысли не дают уснуть.");
  save(); updateUI();
}

/* ================== UI ================== */
function updateUI() {
  document.getElementById("level").innerText  = player.level;
  document.getElementById("xp").innerText     = player.xp;
  document.getElementById("money").innerText  = player.money;
  document.getElementById("debt").innerText   = player.debt;
  document.getElementById("energy").innerText = player.energy;
  document.getElementById("stress").innerText = player.stress;
  document.getElementById("mood").innerText   = player.mood;
}

function log(text) {
  document.getElementById("log").innerText = text;
}

/* ================== УТИЛИТЫ ================== */
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function save() {
  localStorage.setItem("courier_core", JSON.stringify(player));
}

updateUI();
