// Animations around the AR book: each page gets its own effect in the space beside it.
// Units: page pixels (the page is 768 × 1152, centred on the origin, y up). Everything sits
// outside the page (or behind it), so it shows above / below in portrait and beside it in landscape.
//
//   kernel     data streams in lanes speed up past the page (Ruppein)
//   optimizer  tangled dots snap into an ordered network, the right links appear (Ruppem)
//   training   energy sparks rise, then settle to a third (Vertex Training System)
//   auga       letters from many languages orbit the page and all stay (AUGA)
//   core       a steady network where one node changes and the rest stay put (AUGA Core)
//   models     blocks fly in and stack into models (B1 & Kilobyte)
//   gpu        circuit traces with pulses running out of the page (Vertex GPU)
//   memory     a memory graph that grows by itself (AG Database)
//   cover · list · impossible · eco · closing  calmer effects

const GOLD = [0.89, 0.70, 0.24], CREAM = [1.0, 0.96, 0.84], AMBER = [0.92, 0.48, 0.14], MUTE = [0.62, 0.58, 0.52], DEEP = [0.71, 0.50, 0.07];
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const ramp = (a, s, e) => clamp01((a - s) / (e - s));

// regions around the page that are on screen: above / below (portrait) and left / right (landscape)
const REG = { top: [-440, 440, 650, 940], bottom: [-440, 440, -940, -650], left: [-1300, -470, -520, 520], right: [470, 1300, -520, 520] };
const REGS = Object.values(REG);
function inReg(r, rnd) { return [r[0] + rnd() * (r[1] - r[0]), r[2] + rnd() * (r[3] - r[2])]; }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function makeAura(THREE) {
  const group = new THREE.Group();
  group.visible = false;

  // soft round dot
  const dc = document.createElement("canvas"); dc.width = dc.height = 64;
  { const g = dc.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const dotTex = new THREE.CanvasTexture(dc);

  const MAXP = 420, MAXL = 900, MAXS = 320, MAXC = 64;
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({ size: 16, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, opacity: 1 });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false;

  const lPos = new Float32Array(MAXL * 6), lCol = new Float32Array(MAXL * 6);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3)); lGeo.setAttribute("color", new THREE.BufferAttribute(lCol, 3));
  const lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, opacity: 0.8 });
  const lines = new THREE.LineSegments(lGeo, lMat); lines.frustumCulled = false;

  // streaks (motion-blurred dots)
  const sc = document.createElement("canvas"); sc.width = 128; sc.height = 8;
  { const g = sc.getContext("2d"); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.85, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 8); }
  const sMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 1 });
  const streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), sMat, MAXS);
  streaks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXS * 3), 3);
  streaks.frustumCulled = false;

  // blocks (for the models page)
  const cMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6b4c10, transparent: true, opacity: 1 });
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cMat, MAXC);
  cubes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXC * 3), 3);
  cubes.frustumCulled = false;
  const hemi = new THREE.HemisphereLight(0xfffbf1, 0x5a4a30, 1.6), dir = new THREE.DirectionalLight(0xffffff, 1.4); dir.position.set(0.4, 1, 1);

  // letters (for AUGA)
  const GLYPHS = ["A", "अ", "ಕ", "文", "ع", "Ж", "Ω", "ñ", "あ", "한", "ß", "த"];
  const glyphs = GLYPHS.map((ch) => {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    g.fillStyle = "rgba(255,251,241,.92)"; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = "#B47F12"; g.stroke();
    g.fillStyle = "#111"; g.font = "700 70px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 64, 70);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false; group.add(s); return s;
  });

  group.add(lines, points, streaks, cubes, hemi, dir);

  let kind = null, t0 = 0, st = null, fade = 0, lastT = 0;
  const P = (i, x, y, z, c, k = 1) => { pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pCol[i * 3] = c[0] * k; pCol[i * 3 + 1] = c[1] * k; pCol[i * 3 + 2] = c[2] * k; };
  const L = (i, a, b, c, k = 1) => { lPos.set([a[0], a[1], a[2] ?? -20, b[0], b[1], b[2] ?? -20], i * 6); for (let j = 0; j < 2; j++) { lCol[i * 6 + j * 3] = c[0] * k; lCol[i * 6 + j * 3 + 1] = c[1] * k; lCol[i * 6 + j * 3 + 2] = c[2] * k; } };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

  // ───────── the effects
  const FX = {
    // data streams speed up through lanes, like the film's kernel scene
    kernel: {
      init() {
        const r = rng(9), lanes = [];
        for (let i = 0; i < 9; i++) lanes.push(650 + i * 36), lanes.push(-650 - i * 36);
        for (let i = 0; i < 9; i++) lanes.push(-480 + i * 120);
        const pk = [];
        lanes.forEach((y, li) => { for (let k = 0; k < 9; k++) pk.push({ y, x: -1700 + r() * 3400, sp: 0.7 + r() * 0.6, gold: r() < 0.75, z: -30 - r() * 120 }); });
        return { lanes, pk };
      },
      step(s, a, dt) {
        // slow and jammed, then everything clears and races
        const v = 140 + 2300 * ease(ramp(a, 1.0, 2.4));
        s.pk.forEach((p, i) => {
          p.x += v * p.sp * dt; if (p.x > 1750) p.x -= 3500;
          const len = 14 + v * p.sp * 0.07, th = 5;
          _m.compose(_v.set(p.x - len / 2, p.y, p.z), _q.identity(), _s.set(len, th, 1)); streaks.setMatrixAt(i, _m);
          streaks.setColorAt(i, _c.setRGB(...(p.gold ? GOLD : CREAM)));
        });
        streaks.count = Math.min(MAXS, s.pk.length); streaks.instanceMatrix.needsUpdate = true; streaks.instanceColor.needsUpdate = true;
        s.lanes.forEach((y, i) => L(i, [-1750, y, -160], [1750, y, -160], MUTE, 0.35));
        return { lines: s.lanes.length };
      },
    },

    // tangled dots → ordered layers; wrong links fade, right links appear (the film's optimiser scene)
    optimizer: {
      init() {
        const r = rng(4), nets = [];
        for (const R of REGS) {
          const w = R[1] - R[0], h = R[3] - R[2], layers = [3, 4, 4, 3], nodes = [];
          layers.forEach((n, li) => { for (let k = 0; k < n; k++) { const [tx, ty] = inReg(R, r); nodes.push({ tx, ty, ox: R[0] + w * (0.12 + li * 0.253), oy: R[2] + h * ((k + 0.5) / n), li, ph: r() * 6 }); } });
          const good = [], bad = [];
          nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && b.li === a.li + 1 && r() < 0.7) good.push([i, j]); }));
          for (let k = 0; k < 10; k++) bad.push([Math.floor(r() * nodes.length), Math.floor(r() * nodes.length)]);
          nets.push({ nodes, good, bad });
        }
        return { nets };
      },
      step(s, a) {
        const k = ease(ramp(a, 1.0, 2.8)), jit = 18 * (1 - k);
        let pi = 0, li = 0;
        for (const n of s.nets) {
          const xy = n.nodes.map((p) => [p.tx + (p.ox - p.tx) * k + Math.sin(a * 7 + p.ph) * jit, p.ty + (p.oy - p.ty) * k + Math.cos(a * 6 + p.ph) * jit]);
          xy.forEach(([x, y], i) => P(pi++, x, y, -10, k > 0.98 ? GOLD : CREAM, 0.75 + 0.25 * k));
          const badA = 1 - ramp(a, 1.2, 2.2), goodA = ramp(a, 2.4, 3.4);
          if (badA > 0) n.bad.forEach(([i, j]) => L(li++, xy[i], xy[j], AMBER, 0.8 * badA));
          n.good.forEach(([i, j]) => L(li++, xy[i], xy[j], GOLD, goodA));
        }
        return { points: pi, lines: li, size: 22 };
      },
    },

    // energy sparks rise, then settle to about a third
    training: {
      init() { const r = rng(3); return { sp: Array.from({ length: 150 }, (_, i) => { const R = REGS[i % 4]; const [x, y] = inReg(R, r); return { x, y, R, v: 120 + r() * 160, keep: i % 3 === 0, ph: r() * 6 }; }) }; },
      step(s, a, dt) {
        const calm = ramp(a, 1.6, 3.0); let pi = 0;
        s.sp.forEach((p) => {
          p.y += p.v * (1 - 0.45 * calm) * dt; if (p.y > p.R[3]) p.y = p.R[2];
          const vis = p.keep ? 1 : 1 - calm; if (vis <= 0.02) return;
          const c = [AMBER[0] + (GOLD[0] - AMBER[0]) * calm, AMBER[1] + (GOLD[1] - AMBER[1]) * calm, AMBER[2] + (GOLD[2] - AMBER[2]) * calm];
          P(pi++, p.x + Math.sin(a * 3 + p.ph) * 8, p.y, -10, c, Math.min(1, vis * 1.2));
        });
        return { points: pi, size: 26 };
      },
    },

    // letters from many languages join the orbit one by one, and every one stays
    auga: {
      init() { return {}; },
      step(s, a) {
        GLYPHS.forEach((_, i) => {
          const sp = glyphs[i], on = ramp(a, 0.6 + i * 0.32, 0.9 + i * 0.32);
          sp.visible = on > 0; if (!on) return;
          const th = (i / GLYPHS.length) * Math.PI * 2 + a * 0.25;
          sp.position.set(Math.cos(th) * 720, Math.sin(th) * 880, 0);
          sp.material.opacity = on * fade; sp.scale.setScalar(110 * (0.4 + 0.6 * easeOut(on)));
        });
        let li = 0; const N = 96;
        for (let i = 0; i < N; i++) { const t1 = (i / N) * Math.PI * 2, t2 = ((i + 1) / N) * Math.PI * 2; L(li++, [Math.cos(t1) * 720, Math.sin(t1) * 880, -30], [Math.cos(t2) * 720, Math.sin(t2) * 880, -30], GOLD, 0.45); }
        return { lines: li };
      },
    },

    // a steady network: one node changes, the rest stay exactly as they were
    core: {
      init() {
        const r = rng(7), nodes = [];
        REGS.forEach((R) => { for (let k = 0; k < 11; k++) nodes.push(inReg(R, r)); });
        const edges = [];
        nodes.forEach((a, i) => { const d = nodes.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).sort((x, y) => x[0] - y[0]); for (const [, j] of d.slice(1, 3)) if (j > i) edges.push([i, j]); });
        return { nodes, edges, hot: [3, 25] };
      },
      step(s, a) {
        const on = ramp(a, 1.4, 2.0), pulse = 0.5 + 0.5 * Math.sin(a * 5);
        let pi = 0, li = 0;
        s.nodes.forEach(([x, y], i) => P(pi++, x, y, -10, s.hot.includes(i) ? GOLD : CREAM, s.hot.includes(i) ? 0.8 + 0.2 * pulse * on : 0.7));
        s.edges.forEach(([i, j]) => { const hot = s.hot.includes(i) || s.hot.includes(j); L(li++, s.nodes[i], s.nodes[j], hot ? GOLD : MUTE, hot ? 0.4 + 0.6 * on : 0.4); });
        // the changed node glows bigger
        s.hot.forEach((i) => { P(pi++, s.nodes[i][0], s.nodes[i][1], -12, GOLD, on * (0.4 + 0.4 * pulse)); });
        return { points: pi, lines: li, size: 20, big: s.hot.length };
      },
    },

    // blocks fly in and stack into models
    models: {
      init() {
        const r = rng(5), bl = [];
        REGS.forEach((R, ri) => {
          const cx = (R[0] + R[1]) / 2, by = R[2] + (ri < 2 ? 40 : 160);
          for (let k = 0; k < 14; k++) { const lay = Math.floor(k / 4), c = k % 4; bl.push({ x: cx + (c - 1.5) * 52 - lay * 0, y: by + lay * 52, sx: cx + (r() - 0.5) * 2600, sy: by + 900 + r() * 600, sz: 600 + r() * 600, d: 0.3 + k * 0.12 + r() * 0.1, gold: (k + ri) % 3 !== 0 }); }
        });
        return { bl };
      },
      step(s, a) {
        s.bl.forEach((b, i) => {
          const k = easeOut(ramp(a, b.d, b.d + 0.7));
          _m.compose(_v.set(b.sx + (b.x - b.sx) * k, b.sy + (b.y - b.sy) * k, b.sz * (1 - k) - 40), _q.setFromAxisAngle(_s.set(0.3, 1, 0.2).normalize(), (1 - k) * 4), _s.set(46, 46, 46).multiplyScalar(0.3 + 0.7 * k));
          cubes.setMatrixAt(i, _m); cubes.setColorAt(i, _c.setRGB(...(b.gold ? GOLD : CREAM)));
        });
        cubes.count = s.bl.length; cubes.instanceMatrix.needsUpdate = true; cubes.instanceColor.needsUpdate = true;
        return {};
      },
    },

    // circuit traces leave the page; pulses of light run along them
    gpu: {
      init() {
        const r = rng(11), tr = [];
        const add = (pts) => { const seg = []; let len = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); len += l; } tr.push({ pts, seg, len, ph: r() }); };
        for (let i = 0; i < 9; i++) { const x = -360 + i * 90, e = 140 + r() * 180, j = (r() - 0.5) * 160; add([[x, 576], [x, 576 + e], [x + j, 576 + e + 40], [x + j, 960]]); add([[x, -576], [x, -576 - e], [x - j, -576 - e - 40], [x - j, -960]]); }
        for (let i = 0; i < 8; i++) { const y = -480 + i * 137, e = 120 + r() * 220, j = (r() - 0.5) * 180; add([[384, y], [384 + e, y], [384 + e + 40, y + j], [1320, y + j]]); add([[-384, y], [-384 - e, y], [-384 - e - 40, y - j], [-1320, y - j]]); }
        return { tr };
      },
      step(s, a) {
        let li = 0, pi = 0; const grow = ease(ramp(a, 0.4, 1.8));
        s.tr.forEach((t) => {
          let left = t.len * grow;
          for (let i = 1; i < t.pts.length && left > 0; i++) {
            const k = Math.min(1, left / t.seg[i - 1]), A = t.pts[i - 1], B = t.pts[i];
            L(li++, A, [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k], GOLD, 0.7); left -= t.seg[i - 1];
          }
          if (a > 1.6) for (const off of [0, 0.5]) {
            let d = (((a - 1.6) * 0.55 + t.ph + off) % 1) * t.len;
            for (let i = 1; i < t.pts.length; i++) { if (d <= t.seg[i - 1]) { const k = d / t.seg[i - 1], A = t.pts[i - 1], B = t.pts[i]; P(pi++, A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, -8, CREAM, 1); break; } d -= t.seg[i - 1]; }
          }
          P(pi++, t.pts[0][0], t.pts[0][1], -8, GOLD, grow);
        });
        return { points: pi, lines: li, size: 18 };
      },
    },

    // memory that grows by itself: a graph branching outward, node by node
    memory: {
      init() {
        const r = rng(13), nodes = [], edges = [];
        const seeds = [[0, 600, 0, 1], [0, -600, 0, -1], [400, 0, 1, 0], [-400, 0, -1, 0]];
        seeds.forEach(([x, y, dx, dy]) => {
          const base = nodes.length; nodes.push({ x, y, t: 0.3 });
          for (let k = 1; k < 22; k++) {
            const par = base + Math.floor(r() * k), p = nodes[par];
            const ang = Math.atan2(dy, dx) + (r() - 0.5) * 1.9, d = 70 + r() * 70;
            let nx = p.x + Math.cos(ang) * d, ny = p.y + Math.sin(ang) * d;
            if (Math.abs(nx) < 420 && Math.abs(ny) < 620) { nx += dx * 120; ny += dy * 120; }
            nodes.push({ x: nx, y: ny, t: 0.3 + k * 0.16 + r() * 0.1 }); edges.push([par, nodes.length - 1]);
          }
        });
        return { nodes, edges };
      },
      step(s, a) {
        let pi = 0, li = 0;
        s.nodes.forEach((n) => { const k = ramp(a, n.t, n.t + 0.35); if (k > 0) P(pi++, n.x, n.y, -10, a - n.t < 0.6 ? CREAM : GOLD, k); });
        s.edges.forEach(([i, j]) => { const k = ramp(a, s.nodes[j].t - 0.1, s.nodes[j].t + 0.25); if (k > 0) { const A = s.nodes[i], B = s.nodes[j]; L(li++, [A.x, A.y], [A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k], GOLD, 0.75); } });
        return { points: pi, lines: li, size: 20 };
      },
    },

    // calmer pages
    dust: {
      init() { const r = rng(2); return { d: Array.from({ length: 70 }, (_, i) => { const [x, y] = inReg(REGS[i % 4], r); return { x, y, ph: r() * 6, s: 0.4 + r() * 0.6 }; }) }; },
      step(s, a) { let pi = 0; s.d.forEach((p) => P(pi++, p.x + Math.sin(a * 0.4 + p.ph) * 30, p.y + Math.cos(a * 0.3 + p.ph) * 24, -30, CREAM, 0.35 * p.s)); return { points: pi, size: 12 }; },
    },
    sparkle: {
      init() { const r = rng(6); return { d: Array.from({ length: 110 }, (_, i) => { const [x, y] = inReg(REGS[i % 4], r); return { x, y, ph: r() * 6, v: 30 + r() * 50, R: REGS[i % 4] }; }) }; },
      step(s, a, dt) { let pi = 0; s.d.forEach((p) => { p.y += p.v * dt; if (p.y > p.R[3]) p.y = p.R[2]; P(pi++, p.x, p.y, -20, GOLD, 0.45 + 0.55 * Math.abs(Math.sin(a * 2 + p.ph))); }); return { points: pi, size: 14 }; },
    },
    eco: {
      init() { return {}; },
      step(s, a) {
        let pi = 0, li = 0; const on = ramp(a, 0.5, 1.6), xy = [];
        for (let i = 0; i < 8; i++) { const th = (i / 8) * Math.PI * 2 + a * 0.15; xy.push([Math.cos(th) * 760, Math.sin(th) * 900]); }
        xy.forEach(([x, y], i) => { P(pi++, x, y, -10, GOLD, ramp(a, 0.3 + i * 0.15, 0.6 + i * 0.15)); });
        for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) L(li++, xy[i], xy[j], GOLD, 0.22 * on);
        return { points: pi, lines: li, size: 34 };
      },
    },
    closing: {
      init() {
        const r = rng(8), bursts = [];
        [[0, 820, 1.4], [-900, 200, 2.0], [900, -150, 2.5], [0, -820, 3.0]].forEach(([x, y, t]) => { for (let k = 0; k < 40; k++) { const ang = r() * Math.PI * 2, v = 160 + r() * 260; bursts.push({ x, y, t, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v }); } });
        return { bursts };
      },
      step(s, a) {
        let pi = 0;
        s.bursts.forEach((b) => { const e = a - b.t; if (e < 0 || e > 2.4) return; P(pi++, b.x + b.vx * e, b.y + b.vy * e - 160 * e * e, -10, e < 0.3 ? CREAM : GOLD, 1 - e / 2.4); });
        return { points: pi, size: 18 };
      },
    },
  };
  const ALIAS = { cover: "sparkle", list: "dust", impossible: "dust" };

  function set(k) {
    const name = ALIAS[k] || k;
    if (name === kind) return;
    kind = FX[name] ? name : null; st = kind ? FX[kind].init() : null; t0 = performance.now() / 1000; lastT = t0; fade = 0;
    streaks.count = 0; cubes.count = 0; pGeo.setDrawRange(0, 0); lGeo.setDrawRange(0, 0);
    glyphs.forEach((g) => (g.visible = false));
  }

  function update(scale) {
    const now = performance.now() / 1000, dt = Math.min(0.1, now - lastT); lastT = now;
    if (!kind) return;
    fade = Math.min(1, fade + dt / 0.6);
    const out = FX[kind].step(st, now - t0, dt) || {};
    pGeo.setDrawRange(0, out.points || 0); pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    lGeo.setDrawRange(0, (out.lines || 0) * 2); lGeo.attributes.position.needsUpdate = true; lGeo.attributes.color.needsUpdate = true;
    pMat.size = (out.size || 16) * scale; pMat.opacity = fade; lMat.opacity = 0.85 * fade; sMat.opacity = fade; cMat.opacity = fade;
    if (kind !== "kernel") streaks.count = 0;
    if (kind !== "models") cubes.count = 0;
  }

  return { group, set, update, get kind() { return kind; } };
}
