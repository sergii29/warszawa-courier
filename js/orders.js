window.state = {
  money: 500,
  reputation: 50,
  courier: {
    hunger: 60,
    mood: 70,
    energy: 80
  },
  currentOrder: null,
  distance: 0
};

function goOnline() {
  if (state.currentOrder) return;

  const basePay = 3.5;
  const km = (Math.random() * 2 + 0.5).toFixed(2);
  const pay = (basePay + km * 1.2).toFixed(2);

  const target = [
    courierMarker.getLatLng().lat + (Math.random() - 0.5) * 0.02,
    courierMarker.getLatLng().lng + (Math.random() - 0.5) * 0.02
  ];

  state.currentOrder = { km, pay };
  state.distance = km;

  L.marker(target).addTo(map).bindPopup("Клиент");

  map.once("click", e => {
    moveTo(e.latlng);
  });

  alert(`Новый заказ: ${km} км | ${pay} PLN\nТапни на карту, чтобы ехать`);
}
