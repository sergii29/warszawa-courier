// js/map.js
export function initMap() {
  const map = L.map("map", {
    zoomControl: false
  }).setView([52.2297, 21.0122], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  L.marker([52.2297, 21.0122]).addTo(map);
}
