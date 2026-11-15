// The PDF as a book in AR. Runs inside book.html (an iframe in the AR page).
// Parent → book:  { cmd: "next" } · { cmd: "prev" } · { cmd: "go", i }
// Book → parent:  { type: "page", i, n } · { type: "turn" } · { type: "thump" } · { type: "clink" } · { type: "ready", n }

const pages = [...document.querySelectorAll("#book > .page")];
const N = pages.length;
let cur = -1, busy = false;
const post = (m) => { try { parent.postMessage(m, "*"); } catch (e) {} };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// ───────── prepare every page once
const NESTED = ".no, .list-item, .card, .checks > span, .pair, .bar, .nda-clause, .field, .ready .rr > span, .legend > span, .grid > div, .stats2 > div";
const NUMBERS = ".big, .bar .v, .pair .b span";
const MONEY = /\$\s?([\d.,]+)\s*(million|billion|trillion)/i;

function splitWords(el, cls) {
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          if (cls === "ch") { for (const c of w) { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; frag.appendChild(s); } }
          else { const s = document.createElement("span"); s.className = "wd"; s.textContent = w; frag.appendChild(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    }
  };
  walk(el);
}

pages.forEach((p) => {
  const shade = document.createElement("div"); shade.className = "shade"; p.appendChild(shade);
  if (p.classList.contains("cover")) { const s = document.createElement("div"); s.className = "sheen"; p.appendChild(s); }
  p.querySelectorAll(".imp-h, .plain, .imp-why").forEach((el) => splitWords(el, "wd"));
  // what the page is about: picks the animation beside the page
  const name = (p.querySelector(".tname")?.textContent || "").trim();
  p.dataset.kind = p.classList.contains("cover") ? "cover"
    : p.querySelector(".imp-h") ? "impossible"
    : { "Ruppein": "kernel", "Ruppem": "optimizer", "Vertex Training System": "training", "AUGA": "auga", "AUGA Core": "core", "B1 & Kilobyte": "models", "Vertex GPU": "gpu", "AG Database": "memory" }[name]
    || (/Eight things/.test(p.textContent) ? "list" : /Not one breakthrough/.test(p.textContent) ? "eco" : /Built at/.test(p.textContent) ? "closing" : "dust");
  p.querySelectorAll(":scope > .cond").forEach((el) => { if (!/line-through/.test(el.getAttribute("style") || "")) splitWords(el, "wd"); });
  p.querySelectorAll(".tname").forEach((el) => splitWords(el, "ch"));
  // strike-throughs that draw: the old claim, and the big IMPOSSIBLE on the closing page
  p.querySelectorAll(".was .txt").forEach((el) => el.classList.add("strike"));
  p.querySelectorAll('[style*="line-through"]').forEach((el) => {
    const span = document.createElement("span"); span.className = "strike"; span.style.setProperty("--sw", "6px");
    while (el.firstChild) span.appendChild(el.firstChild); el.appendChild(span);
  });
  // numbers that count up: remember their final text
  p.querySelectorAll(NUMBERS).forEach((el) => { if (/\d/.test(el.textContent)) el.dataset.final = el.innerHTML; });
  p.querySelectorAll(".cond").forEach((el) => { if (/^\s*\d+\s*$/.test(el.textContent)) el.dataset.final = el.innerHTML; });
});

// ───────── the timeline for one page
let timers = [], raf = 0, coins = [];
function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

function reset(p) {
  p.classList.remove("play");
  p.querySelectorAll(".portal, .coin").forEach((e) => e.remove());
  p.querySelectorAll("[data-final]").forEach((el) => (el.innerHTML = el.dataset.final));
  p.querySelectorAll("[style]").forEach((el) => { if (el.dataset.delayed) { el.style.animationDelay = ""; delete el.dataset.delayed; } });
}

function delay(el, ms) { el.style.animationDelay = ms + "ms"; el.dataset.delayed = "1"; }

function play(p) {
  timers.forEach(clearTimeout); timers = []; coins = [];
  reset(p);
  let t = 200;
  const kids = [...p.children].filter((c) => !c.classList.contains("shade") && !c.classList.contains("sheen"));
  const beats = [];
  kids.forEach((c) => {
    if (!c.classList.contains("ghost")) c.classList.add("rv");
    beats.push([c, "rv"]);
    c.querySelectorAll(NESTED).forEach((n) => { n.classList.add("it"); beats.push([n, "it"]); });
  });
  // spread the beats so a page finishes in about 3.5 s
  const step = Math.min(1, 3200 / Math.max(1, beats.length * 100));
  const at = new Map();
  beats.forEach(([el, k]) => { at.set(el, t); delay(el, t); t += (k === "rv" ? 120 : 85) * step; });
  const when = (el) => { for (let e = el; e && e !== p; e = e.parentElement) if (at.has(e)) return at.get(e); return 200; };

  p.querySelectorAll(".ghost").forEach((el) => delay(el, 0));
  p.querySelectorAll(".stamp").forEach((el) => { const ms = when(el) + 140; delay(el, ms); later(ms + 180, () => post({ type: "thump" })); });
  p.querySelectorAll(".wd, .ch").forEach((el) => {
    const host = el.closest(".imp-h, .tname, .cond, .plain, .imp-why"); const list = [...host.querySelectorAll(".wd, .ch")];
    const gap = el.classList.contains("ch") ? 40 : host.matches(".plain, .imp-why") ? 22 : 70;
    delay(el, when(host) + list.indexOf(el) * gap);
  });
  p.querySelectorAll(".rule").forEach((el) => delay(el, when(el) + 80));
  p.querySelectorAll(".tag").forEach((el) => delay(el, when(el) + 250));
  p.querySelectorAll(".fill, .pair .b").forEach((el) => delay(el, when(el) + 120));
  p.querySelectorAll(".now .w").forEach((el) => delay(el, when(el)));
  p.querySelectorAll(".strike").forEach((el) => delay(el, when(el) + 350));
  p.querySelectorAll("[data-final]").forEach((el) => {
    const start = when(el) + 100;
    countUp(el, start, el.matches(".pair .b span, .bar .v") ? 1000 : 1300);
    const m = el.textContent.match(MONEY);
    if (m) later(start + 200, () => moneyRain(p, el, m));
  });
  post({ type: "kind", kind: p.dataset.kind });
  void p.offsetWidth;                           // restart the CSS animations
  p.classList.add("play");
}

// numbers count up from zero, keeping their format (commas, decimals, signs, units)
function countUp(el, startMs, dur) {
  const html = el.dataset.final;
  const nums = []; html.replace(/(<[^>]*>)|\d[\d,]*(?:\.\d+)?/g, (s, tag) => { if (!tag) nums.push(s); return s; });
  const fmt = (s, k) => {
    const dec = (s.split(".")[1] || "").length, v = parseFloat(s.replace(/,/g, "")) * k;
    return s.includes(",") || v >= 10000 ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
  };
  const render = (k) => { let i = 0; el.innerHTML = html.replace(/(<[^>]*>)|\d[\d,]*(?:\.\d+)?/g, (s, tag) => (tag ? tag : fmt(nums[i++], k))); };
  render(0);
  later(startMs, () => {
    const t0 = performance.now();
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / dur); if (k < 1) { render(easeOut(k)); requestAnimationFrame(tick); } else el.innerHTML = html; };
    tick();
  });
}

// ───────── coins: a portal opens above the money figure; coins flip out and pile up on the card
function moneyRain(p, el, m) {
  const usd = parseFloat(m[1].replace(/,/g, "")) * { million: 1e6, billion: 1e9, trillion: 1e12 }[m[2].toLowerCase()];
  const count = Math.round(Math.max(12, Math.min(40, 6 * Math.log10(usd) - 34)));
  const pr = p.getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = pr.width / p.offsetWidth || 1;                        // page px per screen px (the page may be scaled)
  const box = (el.closest(".stats2 > div") || el).getBoundingClientRect();
  const cx = (r.left + r.width / 2 - pr.left) / k;
  const surface = (box.top - pr.top) / k + 2;                     // coins land on the top edge of the card
  const span = [(box.left - pr.left) / k + 24, (box.right - pr.left) / k - 24];
  const py = Math.max(110, surface - 230);
  const portal = document.createElement("div"); portal.className = "portal";
  portal.innerHTML = '<i class="r1"></i><i class="r2"></i><i class="r3"></i>';
  portal.style.left = cx + "px"; portal.style.top = py + "px";
  p.appendChild(portal);
  requestAnimationFrame(() => portal.classList.add("open"));
  const heights = new Map();                                      // pile height per 12 px column
  const pileAt = (x) => heights.get(Math.round(x / 16)) || 0;
  let made = 0;
  const emit = () => {
    if (!p.classList.contains("play")) return;
    const c = document.createElement("div"); c.className = "coin"; c.textContent = "$"; p.appendChild(c);
    coins.push({ el: c, x: cx + (Math.random() - 0.5) * 30, y: py, vx: (Math.random() - 0.5) * 170, vy: -170 - Math.random() * 200, a: Math.random() * 6, va: 9 + Math.random() * 8, z: (Math.random() - 0.5) * 40, landed: false, surface, span, pileAt, heights });
    startCoins();
    if (++made < count) later(55 + Math.random() * 45, emit);
    else later(450, () => { portal.classList.add("closing"); later(600, () => portal.remove()); });
  };
  later(380, emit);
}
function startCoins() {
  if (raf) return;
  let last = performance.now();
  const loop = (now) => { const dt = Math.min(0.08, (now - last) / 1000); last = now; stepCoins(dt); raf = coins.some((c) => !c.done) ? requestAnimationFrame(loop) : 0; };
  raf = requestAnimationFrame(loop);
}
let lastClink = 0;
function stepCoins(dt) {
  for (const c of coins) {
    if (c.done) continue;
    if (!c.landed) {
      c.vy += 1500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt;
      if (c.x < c.span[0]) { c.x = c.span[0]; c.vx = Math.abs(c.vx) * 0.5; }
      if (c.x > c.span[1]) { c.x = c.span[1]; c.vx = -Math.abs(c.vx) * 0.5; }
      const floor = c.surface - 12 - c.pileAt(c.x) * 7;
      if (c.vy > 0 && c.y >= floor) {
        c.y = floor; c.landed = true; c.t = 0; c.a0 = c.a;
        const key = Math.round(c.x / 16); c.heights.set(key, (c.heights.get(key) || 0) + 1);
        c.heights.set(key - 1, Math.max(c.heights.get(key - 1) || 0, (c.heights.get(key) || 0) - 1));
        c.heights.set(key + 1, Math.max(c.heights.get(key + 1) || 0, (c.heights.get(key) || 0) - 1));
        const now = performance.now(); if (now - lastClink > 55) { lastClink = now; post({ type: "clink" }); }
      }
      c.el.style.transform = `translate(${c.x}px, ${c.y}px) rotateZ(${c.z}deg) rotateX(${(c.a * 57.3) % 360}deg)`;
    } else {
      // settles flat with a little bounce
      c.t += dt; const k = Math.min(1, c.t / 0.25);
      const b = Math.sin(k * Math.PI) * 6 * (1 - k);
      c.el.style.transform = `translate(${c.x}px, ${c.y - b}px) rotateZ(${c.z}deg) rotateX(${72}deg)`;
      if (k >= 1) c.done = true;
    }
  }
}

// ───────── turning pages
function show(i) {
  pages.forEach((p, j) => { p.classList.toggle("on", j === i); p.classList.remove("top", "turn-out", "turn-in"); p.style.zIndex = j === i ? 2 : ""; });
  cur = i; play(pages[i]); post({ type: "page", i, n: N });
}
let pending = null, dest = -1;
function done() { busy = false; if (pending != null) { const j = pending; pending = null; go(j); } }
function go(i) {
  if (i < 0 || i >= N || i === cur) return;
  if (busy) { pending = i; return; }
  if (cur < 0) return show(i);
  busy = true; dest = i; post({ type: "turn" });
  const a = pages[cur], b = pages[i], fwd = i > cur;
  if (fwd) {
    // the current page swings away; the next one is underneath and starts its own animation
    b.classList.add("on"); b.style.zIndex = 1; play(b);
    a.style.zIndex = 3; a.classList.add("turn-out");
    setTimeout(() => { a.classList.remove("on", "turn-out"); a.style.zIndex = ""; reset(a); b.style.zIndex = 2; cur = i; post({ type: "page", i, n: N }); done(); }, 920);
  } else {
    // the previous page swings back over the current one
    b.classList.add("on", "turn-in"); b.style.zIndex = 3;
    setTimeout(() => play(b), 350);
    setTimeout(() => { a.classList.remove("on"); reset(a); b.classList.remove("turn-in"); b.style.zIndex = 2; cur = i; post({ type: "page", i, n: N }); done(); }, 920);
  }
}

addEventListener("message", (e) => {
  const m = e.data || {};
  const from = busy ? (pending ?? dest) : cur;          // a turn asked for mid-turn continues from where that turn lands
  if (m.cmd === "next") go(from + 1);
  else if (m.cmd === "prev") go(from - 1);
  else if (m.cmd === "go") { if (cur < 0 || m.restart) { busy = false; show(m.i | 0); } else go(m.i | 0); }
});
document.fonts.ready.then(() => post({ type: "ready", n: N }));
window.__book = { go, show, get cur() { return cur; }, N };
