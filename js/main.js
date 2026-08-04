// Magija Mila — main.js (Lenis + canvas scrub hero + galerija + obrazec)

// Leto v footerju
document.getElementById('leto').textContent = new Date().getFullYear();

/* ---------- Canvas frame-scrub engine ---------- */
// AVIF podpora: 1x1 avif proba — starejši brskalniki dobijo jpg fallback
const avifOk = new Promise((res) => {
  const probe = new Image();
  probe.onload = () => res(true);
  probe.onerror = () => res(false);
  probe.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
});

function initScrub(cfg, ext) {
  const section = document.querySelector(cfg.section);
  const canvas = section.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const lines = [...section.querySelectorAll('.reveal-line')];
  const bgFill = cfg.bg || '#fdf1f5';
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dir = portrait && cfg.baseMobile ? cfg.baseMobile : cfg.base;
  const images = [];
  let firstDrawn = false;

  for (let i = 0; i < cfg.frameCount; i++) {
    const img = new Image();
    img.src = `${dir}/frame_${String(i + 1).padStart(4, '0')}.${ext}`;
    img.onload = () => { if (!firstDrawn) { firstDrawn = true; draw(0); } };
    images[i] = img;
  }

  let current = -1;

  function draw(index) {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = bgFill; ctx.fillRect(0, 0, cw, ch);
      return;
    }
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.fillStyle = bgFill; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(current < 0 ? 0 : current);
  }

  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight) return;
    const scrollable = Math.max(rect.height - window.innerHeight, 1);
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const idx = Math.min(cfg.frameCount - 1, Math.floor(p * (cfg.frameCount - 1)));
    if (idx !== current) { current = idx; draw(idx); }
    if (reduced) return;
    for (const el of lines) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const mid = (a + b) / 2, half = (b - a) / 2;
      let o = 1 - Math.abs(p - mid) / half;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${(1 - o) * 30}px)`;
    }
  }

  window.addEventListener('resize', resize);
  resize();
  return { update };
}

/* ---------- Lenis + rAF ---------- */
const scrubs = [];
avifOk.then((ok) => {
  const ext = ok ? 'avif' : 'jpg';
  (window.SCRUB_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .forEach((c) => scrubs.push(initScrub(c, ext)));
});

const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });

function raf(t) {
  lenis.raf(t);
  scrubs.forEach((s) => s.update());
  checkReveals();
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

lenis.on('scroll', ({ scroll }) => {
  document.querySelectorAll('.scroll-hint').forEach((h) => { h.style.opacity = scroll > 80 ? '0' : '0.85'; });
});

// Sidra prek Lenisa (smooth tudi za dolge skoke čez scrub sekcijo)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute('href');
  if (id.length <= 1) return;
  a.addEventListener('click', (e) => {
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: id === '#vrh' ? -100 : -56, duration: 1.4 });
  });
});

/* ---------- Reveal ob scrollu ---------- */
const revealEls = [...document.querySelectorAll('.reveal')];

function checkReveals() {
  if (!revealEls.length) return;
  const limit = window.innerHeight * 0.92;
  for (let i = revealEls.length - 1; i >= 0; i--) {
    if (revealEls[i].getBoundingClientRect().top < limit) {
      revealEls[i].classList.add('visible');
      revealEls.splice(i, 1);
    }
  }
}

/* ---------- Mobilni meni ---------- */
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

links.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- Galerija (vseh 70 fotk, kuriran vrstni red) ---------- */
// šopki najprej (rdeči → pastelni → vijolični → beli), potem tulipani, sončnice,
// posamezni cvetovi, skodelice, jagode/tortice, figurice na koncu
const VRSTNI_RED = [
  33, 18, 3, 70, 32, 16, 17, 6,
  37, 38, 34, 36, 29, 26, 24, 25, 10, 2, 1,
  35, 51, 50, 57, 11, 9, 49, 48, 27,
  61, 60, 8, 22, 23, 7, 64, 65,
  47, 46, 31, 30, 52, 53,
  13, 14, 15, 39, 40, 41,
  42, 43, 44, 45,
  4, 5, 12, 28, 54, 55, 56,
  20, 21, 19, 58, 59, 62, 63,
  66, 67, 68, 69,
];
const N = VRSTNI_RED.length;
const overlay = document.getElementById('galerija-overlay');
const grid = document.getElementById('galerija-grid');
let gridBuilt = false;

function pad(n) { return String(n).padStart(2, '0'); }

function buildGrid() {
  if (gridBuilt) return;
  gridBuilt = true;
  const frag = document.createDocumentFragment();
  VRSTNI_RED.forEach((foto, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Fotografija ${idx + 1} od ${N}`);
    const img = document.createElement('img');
    img.src = `img/galerija/thumb/${pad(foto)}.jpg`;
    img.alt = `Izdelek Magija Mila — fotografija ${idx + 1}`;
    img.loading = 'lazy';
    b.appendChild(img);
    b.addEventListener('click', () => openLightbox(idx + 1));
    frag.appendChild(b);
  });
  grid.appendChild(frag);
}

function lockScroll(on) {
  document.documentElement.style.overflow = on ? 'hidden' : '';
  if (on) lenis.stop(); else lenis.start();
}

function openGallery(e) {
  if (e) e.preventDefault();
  buildGrid();
  overlay.classList.add('odprta');
  overlay.setAttribute('aria-hidden', 'false');
  lockScroll(true);
  links.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}

function closeGallery() {
  overlay.classList.remove('odprta');
  overlay.setAttribute('aria-hidden', 'true');
  if (!lightbox.classList.contains('odprta')) lockScroll(false);
}

document.getElementById('odpri-galerijo').addEventListener('click', openGallery);
document.getElementById('odpri-galerijo-2').addEventListener('click', openGallery);
document.getElementById('galerija-zapri').addEventListener('click', closeGallery);

/* ---------- Lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCounter = document.getElementById('lb-counter');
let lbIndex = 1;

function openLightbox(i) {
  lbIndex = i;
  showLb();
  lightbox.classList.add('odprta');
  lightbox.setAttribute('aria-hidden', 'false');
  lockScroll(true);
}

function showLb() {
  lbImg.src = `img/galerija/full/${pad(VRSTNI_RED[lbIndex - 1])}.jpg`;
  lbCounter.textContent = `${lbIndex} / ${N}`;
}

function closeLightbox() {
  lightbox.classList.remove('odprta');
  lightbox.setAttribute('aria-hidden', 'true');
  if (!overlay.classList.contains('odprta')) lockScroll(false);
}

function lbStep(d) {
  lbIndex = ((lbIndex - 1 + d + N) % N) + 1;
  showLb();
}

document.getElementById('lb-zapri').addEventListener('click', closeLightbox);
document.getElementById('lb-prev').addEventListener('click', () => lbStep(-1));
document.getElementById('lb-next').addEventListener('click', () => lbStep(1));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', (e) => {
  if (lightbox.classList.contains('odprta')) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  } else if (overlay.classList.contains('odprta') && e.key === 'Escape') {
    closeGallery();
  }
});

/* ---------- Kontaktni obrazec (FormSubmit AJAX) ---------- */
const form = document.getElementById('povprasevanje');
const status = form.querySelector('.form-status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  status.classList.remove('error');
  status.textContent = 'Pošiljam …';

  try {
    const res = await fetch('https://formsubmit.co/ajax/love171982@gmail.com', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (String(data.success) !== 'true') throw new Error(data.message || 'FormSubmit error');
    form.reset();
    status.textContent = 'Hvala! Vaše povpraševanje je poslano — odgovorimo v najkrajšem možnem času.';
  } catch (err) {
    status.classList.add('error');
    status.textContent = 'Ups, sporočila ni bilo mogoče poslati. Pišite nam na love171982@gmail.com ali WhatsApp.';
  } finally {
    btn.disabled = false;
  }
});
