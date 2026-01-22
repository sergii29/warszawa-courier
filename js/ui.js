document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.querySelector(".menu");

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      menu.classList.toggle("open");
    });
  }
});
