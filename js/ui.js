const menu = document.getElementById("sideMenu");
const btn = document.getElementById("menuBtn");

btn.onclick = e => {
  e.stopPropagation();
  menu.classList.toggle("open");
};

document.addEventListener("click", () => {
  menu.classList.remove("open");
});

menu.onclick = e => e.stopPropagation();

function openShop() {
  menu.classList.remove("open");
  alert("Магазин (в разработке)");
}
