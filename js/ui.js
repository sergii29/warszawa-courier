document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("sideMenu");

  // создаём overlay программно (чтоб не лезть в index)
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  document.body.appendChild(overlay);

  function openMenu() {
    menu.classList.add("open");
    overlay.classList.add("show");
  }

  function closeMenu() {
    menu.classList.remove("open");
    overlay.classList.remove("show");
  }

  menuBtn.addEventListener("click", () => {
    if (menu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener("click", closeMenu);
});
