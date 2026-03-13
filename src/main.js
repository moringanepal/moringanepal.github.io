import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ═══════════════════════════════════════════════════
   TERRAIN CONFIG — swap your heightmap here
   ═══════════════════════════════════════════════════ */
const HEIGHTMAP_URL = "./assets/heightmap.png";
const PLANE_WIDTH = 2000;
const PLANE_DEPTH = 2000;
const SEGMENTS = 512;
const HEIGHT_SCALE = 350;
const SMOOTH_PASSES = 3;
const DESPIKE_PASSES = 3;
const DESPIKE_THRESHOLD = 0.08;
const COLOR_SPREAD_LIMIT = 30;

/* ═══════════════════════════════════════════════════
   THREE.JS SCENE
   ═══════════════════════════════════════════════════ */
const canvas = document.getElementById("terrain-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2e17);
scene.fog = new THREE.FogExp2(0x1a2e17, 0.00020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, 450, 950);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.maxPolarAngle = Math.PI / 2.15;
controls.minDistance = 200;
controls.maxDistance = 2500;
controls.target.set(0, 60, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.enablePan = false;
controls.enableZoom = false;
controls.update();

/* Lights */
const sun = new THREE.DirectionalLight(0xfff8ee, 1.2);
sun.position.set(500, 800, 500);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -1200;
sun.shadow.camera.right = 1200;
sun.shadow.camera.top = 1200;
sun.shadow.camera.bottom = -1200;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 2500;
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(new THREE.DirectionalLight(0xaaccbb, 0.4).translateX(-300).translateY(300).translateZ(-200));
scene.add(new THREE.AmbientLight(0x405040, 0.8));

/* ═══════════════════════════════════════════════════
   TERRAIN BUILDER
   ═══════════════════════════════════════════════════ */
loadImage(HEIGHTMAP_URL)
  .then((img) => {
    const pixels = readPixels(img);
    const imgW = img.width, imgH = img.height;
    const cols = SEGMENTS + 1, rows = SEGMENTS + 1;
    const total = cols * rows;

    const raw = new Float32Array(total);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = clamp(Math.floor((c / SEGMENTS) * (imgW - 1)), 0, imgW - 1);
        const py = clamp(Math.floor((r / SEGMENTS) * (imgH - 1)), 0, imgH - 1);
        const i = (py * imgW + px) * 4;
        const R = pixels[i], G = pixels[i + 1], B = pixels[i + 2];
        raw[r * cols + c] = (Math.max(R, G, B) - Math.min(R, G, B)) > COLOR_SPREAD_LIMIT
          ? NaN : (R + G + B) / 3;
      }
    }
    fillNaN(raw, cols, rows);

    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < total; i++) { if (raw[i] < mn) mn = raw[i]; if (raw[i] > mx) mx = raw[i]; }
    const rng = mx - mn || 1;
    const hg = new Float32Array(total);
    for (let i = 0; i < total; i++) hg[i] = ((raw[i] - mn) / rng) * HEIGHT_SCALE;

    const thr = DESPIKE_THRESHOLD * HEIGHT_SCALE;
    for (let p = 0; p < DESPIKE_PASSES; p++) despike(hg, cols, rows, thr);
    for (let p = 0; p < SMOOTH_PASSES; p++) boxBlur(hg, cols, rows);

    const geo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_DEPTH, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position.array;
    for (let v = 0; v < total; v++) pos[v * 3 + 1] = hg[v];
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: 0x7a9a6a, flatShading: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  })
  .catch((e) => console.error("[terrain]", e));

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function loadImage(u) {
  return new Promise((ok, no) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => ok(img); img.onerror = () => no(new Error("load fail: " + u));
    img.src = u;
  });
}
function readPixels(img) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data;
}
function fillNaN(g, cols, rows) {
  let rem = 1;
  while (rem > 0) {
    rem = 0; const s = Float32Array.from(g);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c; if (!isNaN(s[i])) continue;
      let sum = 0, cnt = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !isNaN(s[nr * cols + nc])) {
          sum += s[nr * cols + nc]; cnt++;
        }
      }
      g[i] = cnt ? sum / cnt : (rem++, NaN);
    }
  }
}
function despike(g, cols, rows, t) {
  const s = Float32Array.from(g);
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const i = r * cols + c;
    const a = (s[i-cols-1]+s[i-cols]+s[i-cols+1]+s[i-1]+s[i+1]+s[i+cols-1]+s[i+cols]+s[i+cols+1]) / 8;
    if (Math.abs(s[i] - a) > t) g[i] = a;
  }
}
function boxBlur(g, cols, rows) {
  const s = Float32Array.from(g);
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const i = r * cols + c;
    g[i] = (s[i-cols-1]+s[i-cols]+s[i-cols+1]+s[i-1]+s[i]+s[i+1]+s[i+cols-1]+s[i+cols]+s[i+cols+1]) / 9;
  }
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ═══════════════════════════════════════════════════
   UI
   ═══════════════════════════════════════════════════ */
initUI();
initBackToTop();
initVideoLazy();
initPageTransitions();
setupHeroParallax();

/* Pause rendering when hero out of view */
const heroEl = document.getElementById("hero");
let heroVis = true;
new IntersectionObserver(([e]) => { heroVis = e.isIntersecting; }, { threshold: 0 }).observe(heroEl);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(function animate() {
  requestAnimationFrame(animate);
  if (!heroVis) return;
  controls.update();
  renderer.render(scene, camera);
})();

/* ═══════════════════════════════════════════════════
   SHARED UI (duplicated in page.js for subpages)
   ═══════════════════════════════════════════════════ */
function initUI() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");

  if (nav && !nav.classList.contains("scrolled")) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

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

  initLangSwitcher();

  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("revealed"); obs.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

  animateCounters();
}

function setupHeroParallax() {
  const content = document.querySelector(".hero-content");
  const cue = document.querySelector(".scroll-cue");
  if (!content) return;
  window.addEventListener("scroll", () => {
    const p = clamp(window.scrollY / (heroEl?.offsetHeight || 1), 0, 1);
    content.style.opacity = 1 - p * 1.6;
    content.style.transform = `translateY(${p * -50}px)`;
    if (cue) cue.style.opacity = 1 - p * 4;
  }, { passive: true });
}

function animateCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
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
  counters.forEach((c) => obs.observe(c));
}

function initLangSwitcher() {
  const btn = document.querySelector(".lang-toggle");
  const menu = document.querySelector(".lang-menu");
  if (!btn || !menu) return;
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
    item.addEventListener("click", (e) => {
      if (item.getAttribute("href") === "#") {
        e.preventDefault();
        alert("Translation coming soon!");
      }
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

function initBackToTop() {
  const btn = document.querySelector(".back-to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 600);
  }, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initVideoLazy() {
  const video = document.querySelector("video[data-autoplay]");
  if (!video) return;
  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      video.play().catch(() => {});
      obs.unobserve(video);
    }
  }, { threshold: 0.25 });
  obs.observe(video);
}

function initPageTransitions() {
  document.querySelectorAll('a[href]').forEach((link) => {
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
}
