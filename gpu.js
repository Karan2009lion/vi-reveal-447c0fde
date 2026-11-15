// The GPU page comes alive: a pop-up board rises from the far edge of the page with a 3D chip,
// bars comparing Vertex GPU with NVIDIA H200, and the status strip.
//
// Numbers
//   Vertex GPU (THEORETICAL, simulated in Vertex GPU Forge, design B8B87622):
//     256 GB GDDR7 · 8.19 TB/s · 12,283 TFLOPS FP16 · 14 chiplets · 714 compute units · maximum power 3,500 W
//   NVIDIA H200 SXM (NVIDIA published spec):
//     141 GB HBM3e · 4.8 TB/s · 1,979 TFLOPS FP16 (NVIDIA's headline figure, with sparsity) · up to 700 W
//   Efficiency = FP16 TFLOPS ÷ maximum power: 12,283 / 3,500 = 3.51 · 1,979 / 700 = 2.83

export const GROUPS = [
  { name: "Memory", unit: "GB", v: 256, h: 141, fv: "256", fh: "141", ratio: "1.8×" },
  { name: "Bandwidth", unit: "TB/s", v: 8.19, h: 4.8, fv: "8.19", fh: "4.8", ratio: "1.7×" },
  { name: "FP16 compute", unit: "TFLOPS", v: 12283, h: 1979, fv: "12,283", fh: "1,979", ratio: "6.2×" },
  { name: "Efficiency", unit: "TFLOPS per watt", v: 3.51, h: 2.83, fv: "3.51", fh: "2.83", ratio: "1.24×" },
];
const STATUS = [["y", "Design complete"], ["y", "Circuits built"], ["y", "PDK ready"], ["w", "Tests under way"]];

const C = { bg: "#FDF5E1", card: "#FFFBF1", ink: "#111111", ink2: "#34312B", mute: "#7C7462", gold: "#B47F12", gold2: "#E3B33E", ok: "#0E6B5E", theory: "#B4601A", grey: "#9A958A" };
const SERIF = '"Noto Serif Display", Georgia, serif', SANS = '"Poppins", system-ui, sans-serif';

// timeline (seconds after the page is found)
export const T = { found: 1.0, chip: 1.0, dies: 1.2, board: [2.7, 3.8], bars: 4.4, barGap: 0.6, barLen: 0.9, status: 7.2, statusGap: 0.45, done: 9.3 };

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function spaced(ctx, px) { try { ctx.letterSpacing = px + "px"; } catch (e) {} }

export function makeGpu(THREE, { buzz = () => {}, renderer } = {}) {
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  function texOf(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }
  function plane(w, h, canvas) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texOf(canvas), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    m.userData.canvas = canvas;
    return m;
  }
  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

  // ── page highlight (follows the printed page)
  const page = new THREE.Group();
  const glowC = cv(256, 384); { const g = glowC.getContext("2d"); g.strokeStyle = C.gold2; g.lineWidth = 10; g.shadowColor = C.gold2; g.shadowBlur = 18; rr(g, 14, 14, 228, 356, 14); g.stroke(); }
  const glow = plane(1.06, 1.06 * 1.5, glowC); glow.position.z = 0.004; page.add(glow);
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.016), new THREE.MeshBasicMaterial({ color: 0xe3b33e, transparent: true, opacity: 0, depthWrite: false }));
  sweep.position.z = 0.006; page.add(sweep);

  // ── the stage: base on the far edge of the page, standing up, facing the reader
  const stage = new THREE.Group();          // world pose set by the app
  const hinge = new THREE.Group();          // swings up from flat
  stage.add(hinge);
  const BW = 2.0, BH = 1.4, STAGE = 0.85;   // board size in page widths (scaled by STAGE)                 // board size, in page widths
  const PX = 1000;                          // canvas px per unit

  // board (a chart: four comparisons, big type)
  const boardC = cv(BW * PX, BH * PX);
  const board = plane(BW, BH, boardC);
  board.position.set(0, BH / 2, 0); board.renderOrder = 10;
  hinge.add(board);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.04, BH - 0.04, 0.025), new THREE.MeshStandardMaterial({ color: 0xb47f12, metalness: 0.4, roughness: 0.45, transparent: true, opacity: 0 }));
  edge.position.set(0, BH / 2, -0.016); hinge.add(edge);
  const bx = (px) => px / PX - BW / 2, by = (py) => BH - py / PX;   // canvas px → board units
  const GX = (i) => 260 + i * 493;                                   // group centres, canvas px

  function drawBoard() {
    const g = boardC.getContext("2d"), W = boardC.width, H = boardC.height;
    g.clearRect(0, 0, W, H);
    rr(g, 0, 0, W, H, 56); g.fillStyle = C.gold; g.fill();
    rr(g, 7, 7, W - 14, H - 14, 50); g.fillStyle = C.bg; g.fill();
    g.textBaseline = "alphabetic";
    g.fillStyle = C.gold; g.font = `700 32px ${SANS}`; spaced(g, 7); g.fillText("MY POV · 07 · IN 3D", 72, 86); spaced(g, 0);
    g.fillStyle = C.ink; g.font = `800 120px ${SERIF}`; g.fillText("Vertex GPU", 66, 200);
    const tw = g.measureText("Vertex GPU").width;
    g.fillStyle = C.mute; g.font = `500 58px ${SERIF}`; g.fillText("vs H200", 66 + tw + 26, 196);
    const leg = (y, col, a, b, bcol) => {
      g.font = `600 34px ${SANS}`; const wb = g.measureText(b).width;
      g.font = `700 40px ${SANS}`; const wa = g.measureText(a).width;
      const x = 1928 - wb - wa - 14;
      g.fillStyle = col; rr(g, x - 58, y - 34, 40, 40, 8); g.fill();
      g.fillStyle = C.ink; g.fillText(a, x, y);
      g.fillStyle = bcol; g.font = `600 34px ${SANS}`; g.fillText(b, x + wa + 14, y);
    };
    leg(104, C.gold2, "Vertex GPU", "· Theoretical", C.theory);
    leg(172, C.grey, "NVIDIA H200", "· Published spec", C.mute);
    g.fillStyle = C.ink; g.fillRect(70, 236, 1860, 5);
    g.fillStyle = C.ink2; g.fillRect(70, 1000, 1860, 5);
    g.textAlign = "center";
    GROUPS.forEach((G, i) => {
      g.fillStyle = C.ink; g.font = `700 52px ${SANS}`; g.fillText(G.name, GX(i), 1072);
      g.fillStyle = C.mute; g.font = `500 38px ${SANS}`; g.fillText(G.unit, GX(i), 1122);
    });
    g.textAlign = "left";
    board.material.map.needsUpdate = true;
  }

  // status strip (redrawn as each item ticks on)
  const statusC = cv(1860, 200);
  const status = plane(1.86, 0.2, statusC);
  status.position.set(0, by(1262), 0.004); status.renderOrder = 11;
  hinge.add(status);
  let statusN = -1;
  function drawStatus(n, pulse = 1) {
    const g = statusC.getContext("2d"), W = statusC.width, H = statusC.height;
    g.clearRect(0, 0, W, H);
    rr(g, 3, 3, W - 6, H - 6, 30); g.fillStyle = C.card; g.fill(); g.lineWidth = 5; g.strokeStyle = C.ink; g.stroke();
    g.fillStyle = C.mute; g.font = `700 28px ${SANS}`; spaced(g, 6); g.fillText(n >= 4 ? "STATUS · EVERYTHING IS READY" : "STATUS", 40, 62); spaced(g, 0);
    g.textAlign = "right";
    const pw = "3,500 W"; g.font = `800 58px ${SERIF}`; const wpw = g.measureText(pw).width;
    g.fillStyle = C.ink; g.fillText(pw, W - 40, 72);
    g.fillStyle = C.ink2; g.font = `600 32px ${SANS}`; g.fillText("Maximum power", W - 40 - wpw - 18, 66);
    g.textAlign = "left";
    let x = 40;
    STATUS.forEach(([k, txt], i) => {
      const on = i < n;
      g.globalAlpha = on ? 1 : 0.2;
      if (k === "y") { g.fillStyle = C.ok; g.font = `800 44px ${SANS}`; g.fillText("✓", x, 160); x += 48; g.fillStyle = C.ink; }
      else { g.fillStyle = C.theory; g.globalAlpha = on ? 0.35 + 0.65 * pulse : 0.2; g.beginPath(); g.arc(x + 12, 145, 12, 0, Math.PI * 2); g.fill(); g.globalAlpha = on ? 1 : 0.2; x += 38; g.fillStyle = C.theory; }
      g.font = `700 44px ${SANS}`; g.fillText(txt, x, 160);
      x += g.measureText(txt).width + 52;
    });
    g.globalAlpha = 1;
    status.material.map.needsUpdate = true;
  }

  // bars
  const BASE = by(1000), MAXH = 0.5, BAR = 0.12;
  const matV = new THREE.MeshStandardMaterial({ color: 0xe3b33e, metalness: 0.35, roughness: 0.32, emissive: 0x6b4a08, emissiveIntensity: 0.35 });
  const matH = new THREE.MeshStandardMaterial({ color: 0x9a958a, metalness: 0.15, roughness: 0.6 });
  const barGeo = new THREE.BoxGeometry(BAR, 1, BAR); barGeo.translate(0, 0.5, 0);
  const bars = GROUPS.map((G, i) => {
    const x = bx(GX(i));
    const mk = (mat, dx, val, txt, ink) => {
      const m = new THREE.Mesh(barGeo, mat); m.position.set(x + dx, BASE, BAR / 2 + 0.01); m.scale.y = 1e-3; hinge.add(m);
      const lc = cv(560, 160); const l = plane(0.28, 0.08, lc); l.position.set(x + dx, BASE, BAR + 0.03); l.renderOrder = 12; hinge.add(l);
      return { mesh: m, label: l, val, txt, ink, last: null };
    };
    const v = mk(matV, -0.085, G.v, G.fv, C.ink); v.h = MAXH;
    const h = mk(matH, 0.085, G.h, G.fh, "#5D5950"); h.h = MAXH * G.h / G.v;
    const rc = cv(440, 170); { const g = rc.getContext("2d"); rr(g, 8, 8, 424, 154, 77); g.fillStyle = C.ink; g.fill(); g.fillStyle = C.gold2; g.font = `800 104px ${SERIF}`; g.textAlign = "center"; g.fillText(G.ratio, 220, 122); }
    const ratio = plane(0.22, 0.085, rc); ratio.position.set(x, BASE + MAXH + 0.155, BAR + 0.04); ratio.renderOrder = 13; hinge.add(ratio);
    return { v, h, ratio, x, popped: false };
  });
  function drawLabel(b, frac) {
    const g = b.label.userData.canvas.getContext("2d");
    let s;
    if (frac >= 1) s = b.txt;
    else { const dec = (b.txt.split(".")[1] || "").length; const n = b.val * frac; s = dec ? n.toFixed(dec) : Math.round(n).toLocaleString("en-US"); }
    if (s === b.last) return; b.last = s;
    g.clearRect(0, 0, 560, 160); g.fillStyle = b.ink; g.font = `800 112px ${SERIF}`; g.textAlign = "center"; g.fillText(s, 280, 124);
    b.label.material.map.needsUpdate = true;
  }

  // the chip lifts off the printed chip on the page: substrate, interposer, 12 compute dies + 2 I/O dies = 14 chiplets
  const chipHome = new THREE.Vector3(0.315, 0.45, 0);     // where the chip is printed (page units)
  const chipLift = new THREE.Group(); page.add(chipLift);
  const chip = new THREE.Group(); chipLift.add(chip);
  const CHIP_PRINT = 0.195 / 0.585;                        // printed size ÷ model size
  const sub = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.03), new THREE.MeshStandardMaterial({ color: 0x1d2a22, metalness: 0.2, roughness: 0.7, transparent: true, opacity: 0 }));
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.585, 0.585, 0.022), new THREE.MeshStandardMaterial({ color: 0xb47f12, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0 }));
  rim.position.z = -0.006;
  const inter = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.012), new THREE.MeshStandardMaterial({ color: 0x3b3d40, metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0 }));
  inter.position.z = 0.021;
  chip.add(rim, sub, inter);
  // gold contact pads around the edge
  const padGeo = new THREE.BoxGeometry(0.018, 0.018, 0.004), padMat = new THREE.MeshStandardMaterial({ color: 0xe3b33e, metalness: 0.8, roughness: 0.25, transparent: true, opacity: 0 });
  const pads = new THREE.InstancedMesh(padGeo, padMat, 4 * 12);
  { const m = new THREE.Matrix4(); let k = 0; for (let s = 0; s < 4; s++) for (let i = 0; i < 12; i++) { const a = -0.235 + i * 0.0427, b = 0.255; const [x, y] = [[a, b], [a, -b], [b, a], [-b, a]][s]; m.makeTranslation(x, y, 0.017); pads.setMatrixAt(k++, m); } }
  chip.add(pads);
  const dies = [];
  const dieMat = () => new THREE.MeshStandardMaterial({ color: 0x17181b, metalness: 0.55, roughness: 0.28, emissive: 0xe3b33e, emissiveIntensity: 0, transparent: true, opacity: 0 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.08, 0.02), dieMat());
    d.userData.home = new THREE.Vector3(-0.15 + c * 0.1, -0.09 + r * 0.09, 0.037); dies.push(d);
  }
  for (const y of [-0.178, 0.178]) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.04, 0.018), dieMat()); d.userData.home = new THREE.Vector3(0, y, 0.036); dies.push(d); }
  dies.forEach((d) => { d.position.copy(d.userData.home); chip.add(d); });

  const lights = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xfffbf1, 0x3a3020, 1.5);
  const dir = new THREE.DirectionalLight(0xffffff, 2.2); dir.position.set(1.2, 2.4, 3);
  lights.add(hemi, dir, dir.target);

  let t0 = 0, ready = false, firedBars = [], firedDies = 0, firedStatus = 0, announced = false;
  async function prepare() {
    try { await Promise.all([`800 100px ${SERIF}`, `500 60px ${SERIF}`, `700 30px ${SANS}`, `600 30px ${SANS}`, `500 30px ${SANS}`].map((f) => document.fonts.load(f))); } catch (e) {}
    drawBoard(); drawStatus(0); ready = true;
  }
  const ready$ = prepare();

  function start(t) {
    t0 = t; firedBars = GROUPS.map(() => false); firedDies = 0; firedStatus = 0; statusN = -1; announced = false;
    bars.forEach((b) => { b.v.last = b.h.last = null; b.popped = false; });
  }

  /** returns events: { found, done } the first frame they happen */
  function update(t) {
    const a = t - t0, ev = {};
    // page highlight
    glow.material.opacity = 0.9 * ramp(a, 0, 0.3) * (1 - ramp(a, 1.4, 2.4));
    const sw = ramp(a, 0.1, 1.0);
    sweep.material.opacity = sw > 0 && sw < 1 ? 0.95 : 0;
    sweep.position.y = 0.75 - sw * 1.5;
    if (a >= T.found && !announced) { announced = true; ev.found = true; }
    // board swings up from flat, behind the page's far edge
    const bp = ramp(a, T.board[0], T.board[1]);
    hinge.rotation.x = (Math.PI / 2) * (1 - easeBack(bp));
    hinge.scale.setScalar(STAGE * (0.6 + 0.4 * easeOut(bp)));
    const vis = bp > 0;
    hinge.visible = vis;
    board.material.opacity = ready ? clamp01(bp * 3) : 0;
    edge.material.opacity = clamp01(bp * 3);
    status.material.opacity = ready ? ramp(a, T.status - 0.4, T.status) : 0;
    // chip: rises off the printed chip, grows, turns to face you and keeps turning slowly
    const cp = ramp(a, T.chip, T.chip + 0.35);
    for (const m of [sub, rim, inter, padMat]) (m.material || m).opacity = cp;
    const lift = easeIO(ramp(a, T.chip, T.chip + 1.6));
    chipLift.position.set(chipHome.x * (1 - lift) + 0.1 * lift, chipHome.y * (1 - lift) + 0.15 * lift, 0.01 + 0.42 * lift + 0.015 * Math.sin(a * 1.3));
    chip.scale.setScalar(CHIP_PRINT * (1 + 1.25 * lift));
    dies.forEach((d, i) => {
      const s0 = T.dies + i * 0.09, p = ramp(a, s0, s0 + 0.28);
      d.material.opacity = clamp01(p * 2.5);
      d.position.copy(d.userData.home); d.position.z += 0.35 * (1 - easeOut(p));
      const wave = a > T.bars - 0.3 ? Math.max(0, Math.sin((a - T.bars) * 2.2 - (d.userData.home.x + d.userData.home.y) * 7)) : 0;
      d.material.emissiveIntensity = 0.65 * (1 - ramp(a, s0 + 0.2, s0 + 0.7)) * (p > 0 ? 1 : 0) + 0.28 * wave;
      if (p >= 1 && i >= firedDies) { firedDies = i + 1; if (i % 2 === 1) buzz(7); }
    });
    // stands up from the page towards the reader, then turns slowly
    chip.rotation.set(1.05 * lift, 0.6 * Math.sin((a - T.chip - 1.6) * 0.55) * ramp(a, T.chip + 1.6, T.chip + 2.8), -0.14 * (1 - lift) + 0.05 * Math.sin(a * 0.7));
    // bars rise, numbers count up, the ratio pops
    bars.forEach((b, i) => {
      const s = T.bars + i * T.barGap, p = easeOut(ramp(a, s, s + T.barLen));
      for (const bb of [b.v, b.h]) {
        bb.mesh.scale.y = Math.max(1e-3, bb.h * p);
        bb.label.position.y = BASE + bb.h * p + 0.045;
        bb.label.material.opacity = ramp(a, s, s + 0.2);
        if (ready && a >= s) drawLabel(bb, p);
      }
      const rp = ramp(a, s + T.barLen - 0.1, s + T.barLen + 0.35);
      b.ratio.material.opacity = clamp01(rp * 2);
      b.ratio.scale.setScalar(0.4 + 0.6 * easeBack(rp));
      if (rp > 0 && !b.popped) { b.popped = true; buzz([18, 30, 18]); }
      if (a >= s && !firedBars[i]) { firedBars[i] = true; buzz(10); }
    });
    // status items tick on
    const n = a < T.status ? 0 : Math.min(4, 1 + Math.floor((a - T.status) / T.statusGap));
    frame++;
    if (ready && (n !== statusN || (n >= 4 && frame % 3 === 0))) {
      if (n > statusN && n > 0) buzz(n === 4 ? [20, 40, 60] : 12);
      statusN = n; drawStatus(n, n >= 4 ? 0.5 + 0.5 * Math.sin(a * 4) : 1);
    }
    if (a >= T.done && !done) { done = true; ev.done = true; }
    return ev;
  }
  let frame = 0, done = false;
  function replay(t) { done = false; start(t); }

  return { page, stage, lights, start, update, replay, ready: ready$, size: { BW, BH, STAGE } };
}
