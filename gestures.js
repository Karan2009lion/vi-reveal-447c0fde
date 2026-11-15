// Hand-gesture recogniser for the AR screen.
// Input: MediaPipe's 21 hand landmarks (normalised image coordinates, x right, y down).
//
// Each gesture has its own hand shape, so they do not overlap:
//   ✌  two fingers (index + middle) ............ pause / play
//   ☝  point with the index finger (or ✌) and move it right / left ... next / previous page (AR book)
//   👌 double pinch (thumb + index, twice) ...... enter zoom mode
//        in zoom mode: spread / close the pinch .. resize
//        open hand ............................... confirm the size, leave zoom mode
//   ✊ fist, then move ........................... drag the screen
//   🖐 open hand, held until the ring fills ...... full view on / off
//   👍 thumbs up, held briefly .................... hide / show all pop-ups

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const OPEN_HOLD = 1.2;    // seconds to fill the full-view ring
export const TWO_HOLD = 0.3;     // seconds two fingers must be shown to pause / play
export const THUMB_HOLD = 0.4;   // seconds a thumbs up must be held to hide / show pop-ups
export const SWIPE = 0.10;       // how far (fraction of the camera image) the fingertip moves to count as a swipe
export const SWIPE_TIME = 0.7;   // … within this many seconds

export function features(lm) {
  const s = dist(lm[0], lm[9]) || 1e-3;                        // hand size: wrist → middle knuckle
  const ext = (tip, pip) => dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]) * 1.12;
  const index = ext(8, 6), middle = ext(12, 10), ring = ext(16, 14), pinky = ext(20, 18);
  const thumb = dist(lm[4], lm[9]) > dist(lm[3], lm[9]) * 1.04 && dist(lm[4], lm[5]) / s > 0.45;
  const indexOut = dist(lm[8], lm[0]) > dist(lm[5], lm[0]) * 1.2;  // index reaches out past its knuckle
  const pinch = dist(lm[4], lm[8]) / s;
  const folded = !index && !middle && !ring && !pinky;
  const thumbUp = folded && lm[4].y < lm[5].y - 0.35 * s && lm[4].y < lm[3].y && dist(lm[4], lm[5]) / s > 0.6;
  let pose = "none";
  if (thumbUp) pose = "thumb";
  else if (index && middle && ring && pinky && thumb && pinch > 0.55) pose = "open";
  else if (index && middle && !ring && !pinky) pose = "two";
  else if (!middle && !ring && !pinky && indexOut) pose = "pinch";
  else if (folded && !indexOut) pose = "fist";
  return { pose, pinch, s, palm: { x: lm[9].x, y: lm[9].y } };
}

export class Gestures {
  /** on: { hand(pose|null), zoomMode(on), zoomStart(), zoom(factor), zoomConfirm(), toggle(),
   *        dragStart(), drag(dx, dy), dragEnd(), openProgress(p, palm), open(), thumbsUp(), swipe("left"|"right") } */
  constructor(on) {
    this.on = on;
    this.pose = "none";
    this.cand = "none";
    this.candN = 0;
    this.lastSeen = -1;
    this.zoomMode = false;
    this.closed = false;
    this.closedAt = 0;
    this.taps = [];
    this.r0 = 1;
    this.hist = [];
    this.p0 = null;
    this.since = 0;          // when the current pose started
    this.fired = false;      // the current pose already did its action
    this.lastToggle = -10;
    this.trail = [];         // fingertip x while pointing, for swipes
    this.lastSwipe = -10;
  }

  // pointing (index alone, or index + middle) and moving sideways = a swipe.
  // Uses every frame's own hand shape, not the settled pose, so a fast move still counts.
  _swipe(lm, f, t) {
    if (f.pose === "pinch" || f.pose === "two") this.trail.push([t, lm[8].x]);
    else this.trail = [];
    while (this.trail.length && t - this.trail[0][0] > SWIPE_TIME) this.trail.shift();
    if (this.trail.length < 3 || t - this.lastSwipe < 0.9) return;
    const x = this.trail[this.trail.length - 1][1];
    const lo = Math.min(...this.trail.map((p) => p[1])), hi = Math.max(...this.trail.map((p) => p[1]));
    let dir = null;
    if (x - lo > SWIPE && x >= hi - 0.01) dir = "right";
    else if (hi - x > SWIPE && x <= lo + 0.01) dir = "left";
    if (!dir) return;
    this.lastSwipe = t; this.trail = [];
    if (this.pose === "two") this.fired = true;             // a swipe never also pauses
    this.on.swipe?.(dir);
  }

  _leave(prev) {
    if (prev === "fist") this.on.dragEnd?.();
    if (prev === "open") this.on.openProgress?.(0, null);
  }

  _enter(pose, f, t) {
    this._leave(this.pose);
    this.pose = pose;
    this.since = t;
    this.fired = false;
    this.on.hand?.(pose === "none" ? null : pose);
    if (pose === "pinch") { this.closed = f.pinch < 0.25; this.r0 = Math.max(f.pinch, 0.3); this.hist = []; this.on.zoomStart?.(); }
    if (pose === "fist") { this.p0 = { ...f.palm }; this.on.dragStart?.(); }

    if (pose === "open" && this.zoomMode) {
      // open hand confirms the size (as it was just before the hand opened);
      // it must be lowered before it can start the full-view ring
      const back = this.hist.find((h) => h[0] >= t - 0.2);
      if (back) this.on.zoom?.(back[1]);
      this.zoomMode = false; this.fired = true;
      this.on.zoomMode?.(false); this.on.zoomConfirm?.();
    }
  }

  /** lm: landmarks or null when no hand is seen; t: seconds */
  update(lm, t) {
    if (!lm) {
      if (t - this.lastSeen > 0.3) this.trail = [];
      if (this.pose !== "none" && t - this.lastSeen > 0.3) { this._enter("none", null, t); }
      return;
    }
    this.lastSeen = t;
    const f = features(lm);
    this._swipe(lm, f, t);

    // a pose must hold for 3 frames before it counts (removes flicker)
    if (f.pose === this.cand) this.candN++; else { this.cand = f.pose; this.candN = 1; }
    if (this.cand !== this.pose && this.candN >= 3) this._enter(this.cand, f, t);

    if (this.pose === "pinch" && f.pose === "pinch") this._pinch(f, t);
    else if (this.pose === "fist" && this.p0) this.on.drag?.(f.palm.x - this.p0.x, f.palm.y - this.p0.y);
    else if (this.pose === "two") {
      if (!this.fired && t - this.since >= TWO_HOLD && t - this.lastToggle > 0.8) {
        this.fired = true; this.lastToggle = t; this.on.toggle?.();
      }
    } else if (this.pose === "thumb") {
      if (!this.fired && t - this.since >= THUMB_HOLD) { this.fired = true; this.on.thumbsUp?.(); }
    } else if (this.pose === "open" && !this.fired) {
      const p = Math.min(1, (t - this.since) / OPEN_HOLD);
      this.on.openProgress?.(p, f.palm);
      if (p >= 1) { this.fired = true; this.on.openProgress?.(0, null); this.on.open?.(); }
    }
  }

  _pinch(f, t) {
    if (!this.closed && f.pinch < 0.25) {
      // fingers touched: a tap — in zoom mode, undo the last moment of resizing
      this.closed = true; this.closedAt = t;
      if (this.zoomMode) { const back = this.hist.find((h) => h[0] >= t - 0.35); if (back) this.on.zoom?.(back[1]); }
    } else if (this.closed && f.pinch > 0.4) {
      this.closed = false;
      if (t - this.closedAt < 0.5) {
        this.taps = this.taps.filter((x) => t - x < 0.9);
        this.taps.push(t);
        if (this.taps.length >= 2) {
          this.taps = [];
          if (!this.zoomMode) { this.zoomMode = true; this.on.zoomMode?.(true); }
        }
      }
      this.r0 = f.pinch; this.hist = []; this.on.zoomStart?.();
    } else if (!this.closed && this.zoomMode) {
      const k = f.pinch / this.r0;
      const factor = Math.abs(k - 1) < 0.1 ? 1 : k;                  // small dead zone
      this.hist.push([t, factor]);
      if (this.hist.length > 30) this.hist.shift();
      this.on.zoom?.(factor);
    }
  }
}
