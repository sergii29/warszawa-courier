let moving = false;
let moveInterval = null;

function moveTo(targetLatLng) {
  if (moving) return;
  moving = true;

  const speed = 0.00015; // скорость движения
  let current = courierMarker.getLatLng();

  moveInterval = setInterval(() => {
    const latDiff = targetLatLng.lat - current.lat;
    const lngDiff = targetLatLng.lng - current.lng;

    const dist = Math.sqrt(latDiff ** 2 + lngDiff ** 2);

    if (dist < speed) {
      courierMarker.setLatLng(targetLatLng);
      clearInterval(moveInterval);
      moving = false;
      finishMove();
      return;
    }

    current = {
      lat: current.lat + latDiff * speed / dist,
      lng: current.lng + lngDiff * speed / dist
    };

    courierMarker.setLatLng(current);
    window.state.distance -= 0.02;
    if (window.state.distance < 0) window.state.distance = 0;
  }, 50);
}

function finishMove() {
  if (window.state.distance <= 0) {
    alert("Заказ выполнен!");
    state.money += state.currentOrder.pay;
    state.reputation += 1;
    state.currentOrder = null;
  }
}
