/* ═══════════════════════════════════════════════════
   PAGE.JS — Shared UI for about.html & gallery.html
   ═══════════════════════════════════════════════════ */

const toggle = document.getElementById("nav-toggle");
const links = document.getElementById("nav-links");

toggle?.addEventListener("click", () => {
  toggle.classList.toggle("open");
  links.classList.toggle("open");
});
links?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    toggle.classList.remove("open");
    links.classList.remove("open");
  })
);

/* Reveal on scroll */
const obs = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("revealed"); obs.unobserve(e.target); }
  }),
  { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

/* Animated counters (about page) */
const counters = document.querySelectorAll("[data-count]");
if (counters.length) {
  const cObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cObs.unobserve(e.target);
      const target = +e.target.dataset.count;
      const dur = 1800;
      const start = performance.now();
      (function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        e.target.textContent = Math.round(ease * target).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
        else e.target.textContent = target.toLocaleString() + "+";
      })(start);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => cObs.observe(c));
}

const LOCAL_HTML_PAGES = new Set([
  "index.html",
  "about.html",
  "gallery.html",
  "moringa-powder.html",
  "moringa-tea.html",
  "moringa-capsules.html",
  "trust-compliance.html",
]);

function getLanguageContext() {
  const filename = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const match = filename.match(/-(ja|zh|ne)\.html$/);
  const lang = match ? match[1] : "en";
  const baseFile = match ? filename.replace(/-(ja|zh|ne)\.html$/, ".html") : filename;
  return { lang, baseFile };
}

function localizeFile(file, lang) {
  return lang === "en" ? file : file.replace(/\.html$/, `-${lang}.html`);
}

function rewriteInternalLinksForLanguage(lang) {
  if (lang === "en") return;
  document.querySelectorAll("a[href]").forEach((a) => {
    if (a.classList.contains("lang-item")) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http")) return;
    const m = href.match(/^\.\/([a-z0-9-]+\.html)(.*)$/i);
    if (!m) return;
    if (!LOCAL_HTML_PAGES.has(m[1].toLowerCase())) return;
    a.setAttribute("href", `./${localizeFile(m[1], lang)}${m[2] || ""}`);
  });
}

/* Language switcher */
(function initLangSwitcher() {
  const btn = document.querySelector(".lang-toggle");
  const menu = document.querySelector(".lang-menu");
  if (!btn || !menu) return;
  const { lang, baseFile } = getLanguageContext();

  rewriteInternalLinksForLanguage(lang);

  menu.querySelectorAll(".lang-item").forEach((item) => {
    const code = item.dataset.lang;
    if (!code) return;
    item.setAttribute("href", `./${localizeFile(baseFile, code)}`);
    item.classList.toggle("active", code === lang);
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  });
  document.addEventListener("click", () => {
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  });
  menu.querySelectorAll(".lang-item").forEach((item) => {
    item.addEventListener("click", () => {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  });
})();

/* Back to top */
(function initBackToTop() {
  const btn = document.querySelector(".back-to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 600);
  }, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

/* Page transitions */
(function initPageTransitions() {
  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") ||
        href.startsWith("tel:") || href.startsWith("https://wa.me") ||
        href.startsWith("http") || link.target === "_blank") return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.add("page-leaving");
      setTimeout(() => { window.location.href = href; }, 250);
    });
  });
})();

/* Video lazy load */
(function initVideoLazy() {
  const video = document.querySelector("video[data-autoplay]");
  if (!video) return;

  const loadVideoSources = () => {
    if (video.dataset.loaded === "true") return;
    video.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.dataset.src;
    });
    video.dataset.loaded = "true";
    video.load();
  };

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadVideoSources();
      video.play().catch(() => {});
      obs.unobserve(video);
    }
  }, { threshold: 0.25 });

  obs.observe(video);
})();

/* Gallery lightbox */
(function initLightbox() {
  const grid = document.getElementById("gal-grid");
  const lightbox = document.getElementById("lightbox");
  if (!grid || !lightbox) return;

  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");
  const items = [...grid.querySelectorAll(".gal-item img")];
  let current = 0;

  function open(idx) {
    current = idx;
    lbImg.src = items[current].src;
    lbImg.alt = items[current].alt;
    lbCaption.textContent = items[current].alt;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }

  function prev() {
    current = (current - 1 + items.length) % items.length;
    lbImg.src = items[current].src;
    lbImg.alt = items[current].alt;
    lbCaption.textContent = items[current].alt;
  }

  function next() {
    current = (current + 1) % items.length;
    lbImg.src = items[current].src;
    lbImg.alt = items[current].alt;
    lbCaption.textContent = items[current].alt;
  }

  items.forEach((img, i) => {
    img.closest(".gal-item").addEventListener("click", () => open(i));
  });

  lightbox.querySelector(".lightbox-close").addEventListener("click", close);
  lightbox.querySelector(".lightbox-prev").addEventListener("click", prev);
  lightbox.querySelector(".lightbox-next").addEventListener("click", next);

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });
})();
