/* main-static.js — UI only, no Three.js */
(function() {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  var LOCAL_HTML_PAGES = {
    "index.html": true,
    "about.html": true,
    "gallery.html": true,
    "moringa-powder.html": true,
    "moringa-tea.html": true,
    "moringa-capsules.html": true,
    "trust-compliance.html": true
  };
  function getLanguageContext() {
    var filename = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    var match = filename.match(/-(ja|zh|ne)\.html$/);
    var lang = match ? match[1] : "en";
    var baseFile = match ? filename.replace(/-(ja|zh|ne)\.html$/, ".html") : filename;
    return { lang: lang, baseFile: baseFile };
  }
  function localizeFile(file, lang) {
    return lang === "en" ? file : file.replace(/\.html$/, "-" + lang + ".html");
  }
  function rewriteInternalLinksForLanguage(lang) {
    if (lang === "en") return;
    document.querySelectorAll("a[href]").forEach(function(a) {
      if (a.classList.contains("lang-item")) return;
      var href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http")) return;
      var m = href.match(/^\.\/([a-z0-9-]+\.html)(.*)$/i);
      if (!m) return;
      if (!LOCAL_HTML_PAGES[m[1].toLowerCase()]) return;
      a.setAttribute("href", "./" + localizeFile(m[1], lang) + (m[2] || ""));
    });
  }

  var heroEl = document.getElementById("hero");

  function initUI() {
    var nav = document.getElementById("nav");
    var toggle = document.getElementById("nav-toggle");
    var links = document.getElementById("nav-links");
    if (nav && !nav.classList.contains("scrolled")) {
      function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 60); }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    if (toggle && links) {
      toggle.addEventListener("click", function() {
        toggle.classList.toggle("open");
        links.classList.toggle("open");
      });
      links.querySelectorAll("a").forEach(function(a) {
        a.addEventListener("click", function() {
          toggle.classList.remove("open");
          links.classList.remove("open");
        });
      });
    }
    var btn = document.querySelector(".lang-toggle");
    var menu = document.querySelector(".lang-menu");
    if (btn && menu) {
      var ctx = getLanguageContext();
      rewriteInternalLinksForLanguage(ctx.lang);
      menu.querySelectorAll(".lang-item").forEach(function(item) {
        var code = item.dataset.lang;
        if (!code) return;
        item.setAttribute("href", "./" + localizeFile(ctx.baseFile, code));
        item.classList.toggle("active", code === ctx.lang);
      });
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        menu.classList.toggle("open");
        btn.setAttribute("aria-expanded", menu.classList.contains("open"));
      });
      document.addEventListener("click", function() {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
      menu.querySelectorAll(".lang-item").forEach(function(item) {
        item.addEventListener("click", function() {
          menu.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
        });
      });
    }
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add("revealed"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    document.querySelectorAll(".reveal").forEach(function(el) { obs.observe(el); });
    var counters = document.querySelectorAll("[data-count]");
    if (counters.length) {
      var cObs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (!e.isIntersecting) return;
          cObs.unobserve(e.target);
          var target = +e.target.dataset.count;
          var dur = 1800;
          var start = performance.now();
          function tick(now) {
            var t = Math.min((now - start) / dur, 1);
            var ease = 1 - Math.pow(1 - t, 3);
            e.target.textContent = Math.round(ease * target).toLocaleString();
            if (t < 1) requestAnimationFrame(tick);
            else e.target.textContent = target.toLocaleString() + "+";
          }
          tick(start);
        });
      }, { threshold: 0.5 });
      counters.forEach(function(c) { cObs.observe(c); });
    }
  }
  function setupHeroParallax() {
    var content = document.querySelector(".hero-content");
    var cue = document.querySelector(".scroll-cue");
    if (!content || !heroEl) return;
    window.addEventListener("scroll", function() {
      var p = clamp(window.scrollY / (heroEl.offsetHeight || 1), 0, 1);
      content.style.opacity = 1 - p * 1.6;
      content.style.transform = "translateY(" + (p * -50) + "px)";
      if (cue) cue.style.opacity = 1 - p * 4;
    }, { passive: true });
  }
  function initBackToTop() {
    var btn = document.querySelector(".back-to-top");
    if (!btn) return;
    window.addEventListener("scroll", function() {
      btn.classList.toggle("visible", window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener("click", function() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  function initVideoLazy() {
    var video = document.querySelector("video[data-autoplay]");
    if (!video) return;
    function loadVideoSources() {
      if (video.dataset.loaded === "true") return;
      video.querySelectorAll("source[data-src]").forEach(function(source) {
        source.src = source.dataset.src;
      });
      video.dataset.loaded = "true";
      video.load();
    }
    var obs = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        loadVideoSources();
        video.play().catch(function() {});
        obs.unobserve(video);
      }
    }, { threshold: 0.25 });
    obs.observe(video);
  }
  function initPageTransitions() {
    document.querySelectorAll("a[href]").forEach(function(link) {
      var href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") ||
          href.startsWith("tel:") || href.startsWith("https://wa.me") ||
          href.startsWith("http") || link.target === "_blank") return;
      link.addEventListener("click", function(e) {
        e.preventDefault();
        document.body.classList.add("page-leaving");
        setTimeout(function() { window.location.href = href; }, 250);
      });
    });
  }
  initUI();
  initBackToTop();
  initVideoLazy();
  initPageTransitions();
  setupHeroParallax();
})();
