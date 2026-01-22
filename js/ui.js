// js/ui.js
export function initUI() {
  const menuBtn = document.getElementById("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");

  if (!menuBtn) return;

  menuBtn.onclick = () => {
    sideMenu.classList.add("open");
    overlay.classList.add("show");
  };

  overlay.onclick = () => {
    sideMenu.classList.remove("open");
    overlay.classList.remove("show");
  };
}
