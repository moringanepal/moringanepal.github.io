(() => {
  function closeAll() {
    document.querySelectorAll(".lang-menu.is-open").forEach((m) => {
      m.classList.remove("is-open");
      const toggle = m.closest("nav")?.querySelector(".lang-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  }

  function setupNav(nav) {
    const toggle = nav.querySelector(".lang-toggle");
    const menu = nav.querySelector(".lang-menu");
    if (!toggle || !menu) return;

    const isOpen = () => menu.classList.contains("is-open");
    const open = () => {
      closeAll();
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    const toggleMenu = () => (isOpen() ? close() : open());

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });

    menu.addEventListener("click", () => close());

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target)) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("nav").forEach(setupNav);
    });
  } else {
    document.querySelectorAll("nav").forEach(setupNav);
  }
})();

