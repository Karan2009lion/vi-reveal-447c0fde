// Hand-gesture recogniser for the AR screen.
// Input: MediaPipe's 21 hand landmarks (normalised image coordinates, x right, y down).
//
//   pinch pose (thumb + index, other fingers folded) → spread / close to resize
//   double pinch (touch thumb and index twice quickly) → play / pause
//   fist                                             → grab and drag the screen
//   open hand (all five fingers) held briefly        → full view on / off

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function features(lm) {
  const s = dist(lm[0], lm[9]) || 1e-3;                        // hand size: wrist → middle knuckle
  const ext = (tip, pip) => dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]) * 1.12;
  const index = ext(8, 6), middle = ext(12, 10), ring = ext(16, 14), pinky = ext(20, 18);
  const thumb = dist(lm[4], lm[9]) > dist(lm[3], lm[9]) * 1.04 && dist(lm[4], lm[5]) / s > 0.45;
  const indexOut = dist(lm[8], lm[0]) > dist(lm[5], lm[0]) * 1.2;  // index reaches out past its knuckle
  const pinch = dist(lm[4], lm[8]) / s;
  const others = (middle ? 1 : 0) + (ring ? 1 : 0) + (pinky ? 1 : 0);
  let pose = "none";
  if (index && middle && ring && pinky && thumb && pinch > 0.55) pose = "open";
  else if (others === 0 && indexOut) pose = "pinch";
  else if (others === 0 && !index && !indexOut) pose = "fist";
  return { pose, pinch, s, palm: { x: lm[9].x, y: lm[9].y } };
}

export class Gestures {
  /** on: { hand(pose|null), zoomStart(), zoom(factor), toggle(), dragStart(), drag(dx, dy), dragEnd(), open() } */
  constructor(on) {
    this.on = on;
    this.pose = "none";
    this.cand = "none";
    this.candN = 0;
    this.lastSeen = -1;
    this.closed = false;
    this.closedAt = 0;
    this.taps = [];
    this.r0 = 1;
    this.hist = [];
    this.p0 = null;
    this.openSince = 0;
    this.openFired = false;
    this.lastOpen = -10;
  }

  _enter(pose, f, t) {
    const prev = this.pose;
    if (prev === "fist") this.on.dragEnd?.();
    this.pose = pose;
    this.on.hand?.(pose === "none" ? null : pose);
    if (pose === "pinch") { this.closed = f.pinch < 0.25; this.r0 = Math.max(f.pinch, 0.3); this.hist = []; this.on.zoomStart?.(); }
    if (pose === "fist") { this.p0 = { ...f.palm }; this.on.dragStart?.(); }
    if (pose === "open") { this.openSince = t; this.openFired = false; }
  }

  /** lm: landmarks or null when no hand is seen; t: seconds */
  update(lm, t) {
    if (!lm) {
      if (this.pose !== "none" && t - this.lastSeen > 0.3) { this._enter("none", null, t); this.on.hand?.(null); }
      return;
    }
    this.lastSeen = t;
    const f = features(lm);

    // a pose must hold for 3 frames before it counts (removes flicker)
    if (f.pose === this.cand) this.candN++; else { this.cand = f.pose; this.candN = 1; }
    if (this.cand !== this.pose && this.candN >= 3) this._enter(this.cand, f, t);

    if (this.pose === "pinch") {
      if (!this.closed && f.pinch < 0.25) {
        // fingers touched: a tap, not a resize — undo the last moment of resizing
        this.closed = true; this.closedAt = t;
        const back = this.hist.find((h) => h[0] >= t - 0.35);
        if (back) this.on.zoom?.(back[1]);
      } else if (this.closed && f.pinch > 0.4) {
        this.closed = false;
        if (t - this.closedAt < 0.5) {
          this.taps = this.taps.filter((x) => t - x < 0.9);
          this.taps.push(t);
          if (this.taps.length >= 2) { this.taps = []; this.on.toggle?.(); }
        }
        this.r0 = f.pinch; this.hist = []; this.on.zoomStart?.();
      } else if (!this.closed) {
        const k = f.pinch / this.r0;
        const factor = Math.abs(k - 1) < 0.1 ? 1 : k;                  // small dead zone
        this.hist.push([t, factor]);
        if (this.hist.length > 30) this.hist.shift();
        this.on.zoom?.(factor);
      }
    } else if (this.pose === "fist" && this.p0) {
      this.on.drag?.(f.palm.x - this.p0.x, f.palm.y - this.p0.y);
    } else if (this.pose === "open") {
      if (!this.openFired && t - this.openSince > 0.6 && t - this.lastOpen > 1.5) {
        this.openFired = true; this.lastOpen = t; this.on.open?.();
      }
    }
  }
}
