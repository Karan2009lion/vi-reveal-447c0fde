// The last page of the AR book: the book stays in the middle, and two floating windows join it.
//   left   Point One, as an avatar in the film's style (ivory chip face, gold rings, a point of light):
//          it floats, smiles, blinks, glances around and talks in speech bubbles
//   right  the founder's card: an emoji-style avatar (smiling, blinking), name, company, email, website
// Both are CSS3D objects, children of the book, so they float in AR beside it.

const CSS = `
.fin { width: 520px; box-sizing: border-box; font-family: "Poppins", system-ui, sans-serif; color: #111; opacity: 0; transform: translateX(var(--from)) scale(.92);
  transition: opacity .7s ease, transform .9s cubic-bezier(.2,1.2,.3,1); pointer-events: none; }
.fin.show { opacity: 1; transform: none; pointer-events: auto; }
.fin .bob { animation: finBob 4.2s ease-in-out infinite; }
@keyframes finBob { 0%, 100% { transform: translateY(-10px); } 50% { transform: translateY(10px); } }
.fin .panel { border-radius: 30px; background: rgba(253,245,225,.97); box-shadow: 0 0 0 2px rgba(180,127,18,.55), 0 30px 70px rgba(0,0,0,.45), 0 0 90px rgba(227,179,62,.25); padding: 34px 34px 30px; }
.fin .kick { font-size: 15px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #B47F12; }
.fin .serif { font-family: "Noto Serif Display", Georgia, serif; }

/* founder card */
#finMe .av { width: 190px; height: 190px; margin: -110px auto 8px; border-radius: 50%; background: #FDF5E1; box-shadow: 0 0 0 6px #E3B33E, 0 18px 40px rgba(0,0,0,.35); overflow: hidden; }
#finMe .hi { text-align: center; font-size: 17px; font-weight: 600; color: #7C7462; margin-top: 6px; }
#finMe .nm { text-align: center; font-size: 50px; font-weight: 800; line-height: 1.02; margin-top: 10px; font-stretch: 68%; }
#finMe .role { text-align: center; font-size: 19px; font-weight: 700; margin-top: 8px; color: #34312B; }
#finMe hr { border: none; height: 2px; background: #111; margin: 22px 0 18px; }
#finMe .co { font-size: 26px; font-weight: 800; font-stretch: 68%; }
#finMe .co small { display: block; font-family: "Poppins", sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #B47F12; margin-top: 4px; }
#finMe a.row { display: flex; align-items: center; gap: 14px; min-height: 56px; border-top: 1.5px solid #EADFC4; color: #111; text-decoration: none; font-size: 19px; font-weight: 600; overflow-wrap: anywhere; }
#finMe a.row:first-of-type { margin-top: 14px; }
#finMe a.row svg { flex: none; width: 26px; height: 26px; color: #B47F12; }
#finMe a.save { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; height: 62px; border-radius: 40px; background: #111; color: #fff; font-size: 19px; font-weight: 700; text-decoration: none; }
#finMe a.save i { width: 11px; height: 11px; border-radius: 11px; background: #E3B33E; box-shadow: 0 0 0 5px rgba(227,179,62,.25); }

/* Point One */
#finP1 { text-align: center; }
#finP1 .say { position: relative; display: inline-block; min-width: 260px; max-width: 470px; padding: 18px 26px; border-radius: 26px; background: #FFFBF1; box-shadow: 0 0 0 2px rgba(180,127,18,.5), 0 18px 40px rgba(0,0,0,.35);
  font-size: 25px; font-weight: 700; line-height: 1.25; min-height: 30px; transition: transform .3s cubic-bezier(.2,1.5,.4,1); }
#finP1 .say::after { content: ""; position: absolute; left: 50%; bottom: -16px; margin-left: -14px; border: 14px solid transparent; border-bottom: 0; border-top-color: #FFFBF1; filter: drop-shadow(0 2px 0 rgba(180,127,18,.5)); }
#finP1 .say.pop { transform: scale(1.06); }
#finP1 .bot { width: 400px; height: 400px; margin: 14px auto 0; }
#finP1 .plate { display: inline-block; margin-top: 6px; padding: 14px 30px 16px; border-radius: 26px; background: rgba(17,17,17,.72); box-shadow: 0 0 0 2px rgba(227,179,62,.55); }
#finP1 .name { font-family: "Noto Serif Display", Georgia, serif; font-size: 50px; font-weight: 500; line-height: 1; color: #FFFBF1; }
#finP1 .tag { font-size: 15px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #F2C94C; margin-top: 10px; }

/* faces: blink, glance, rings turn */
.fin .lids { transform-box: fill-box; transform-origin: center; animation: finBlink 4.6s infinite; }
@keyframes finBlink { 0%, 91%, 100% { transform: scaleY(1); } 93.5% { transform: scaleY(.08); } 96% { transform: scaleY(1); } }
.fin .look { animation: finLook 7s ease-in-out infinite; }
@keyframes finLook { 0%, 18%, 100% { transform: translate(0, 0); } 25%, 40% { transform: translate(-5px, -1px); } 50%, 64% { transform: translate(5px, 1px); } 72% { transform: translate(0, 0); } }
.fin .ring { transform-box: view-box; transform-origin: 150px 150px; animation: finSpin 9s linear infinite; }
.fin .ring.r2 { animation-duration: 7s; animation-direction: reverse; }
.fin .ring.r3 { animation-duration: 12s; }
@keyframes finSpin { to { transform: rotate(360deg); } }
.fin .glow { transform-box: fill-box; transform-origin: center; animation: finGlow 2.2s ease-in-out infinite; }
@keyframes finGlow { 0%, 100% { opacity: .65; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.15); } }
.fin .smile { transform-box: fill-box; transform-origin: center; animation: finSmile 5s ease-in-out infinite; }
@keyframes finSmile { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.08) translateY(1px); } }
.fin .tilt { transform-box: view-box; transform-origin: 150px 160px; animation: finTilt 6s ease-in-out infinite; }
@keyframes finTilt { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
`;

// an emoji-style face for the founder (no photo): warm, smiling, blinking, glancing
const ME_SVG = `<svg viewBox="0 0 200 200" width="190" height="190" aria-hidden="true">
  <defs><radialGradient id="mf" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFE38A"/><stop offset=".65" stop-color="#F7C443"/><stop offset="1" stop-color="#E0A21E"/></radialGradient></defs>
  <rect width="200" height="200" fill="#FDF5E1"/>
  <g class="tilt" style="transform-origin:100px 105px">
    <circle cx="100" cy="106" r="74" fill="url(#mf)"/>
    <ellipse cx="62" cy="128" rx="13" ry="8" fill="#F08A6B" opacity=".45"/><ellipse cx="138" cy="128" rx="13" ry="8" fill="#F08A6B" opacity=".45"/>
    <g class="lids"><g class="look">
      <ellipse cx="74" cy="96" rx="10" ry="13" fill="#3A2A12"/><ellipse cx="126" cy="96" rx="10" ry="13" fill="#3A2A12"/>
      <circle cx="77" cy="91" r="3.5" fill="#fff"/><circle cx="129" cy="91" r="3.5" fill="#fff"/>
    </g></g>
    <path d="M62 78 q12 -9 24 -2" stroke="#3A2A12" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M114 76 q12 -7 24 2" stroke="#3A2A12" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path class="smile" d="M68 124 Q100 156 132 124 Q100 142 68 124 Z" fill="#7A3B12"/>
  </g>
</svg>`;

// Point One in the film's style: brushed-gold rings around an ivory chip, a point of light above; the chip is its face
const P1_SVG = `<svg viewBox="0 0 300 300" width="400" height="400" aria-hidden="true">
  <defs>
    <linearGradient id="pc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EDE6DA"/></linearGradient>
    <radialGradient id="pg"><stop offset="0" stop-color="#FFF6DD"/><stop offset=".4" stop-color="#F2D58A"/><stop offset=".75" stop-color="#D9A441"/><stop offset="1" stop-color="#D9A441" stop-opacity="0"/></radialGradient>
  </defs>
  <g class="ring"><circle cx="150" cy="150" r="140" fill="none" stroke="rgba(190,140,60,.3)" stroke-width="2"/><path d="M150 10 A140 140 0 0 1 280 100" fill="none" stroke="#C99A3E" stroke-width="3.5" stroke-linecap="round"/></g>
  <g class="ring r2"><circle cx="150" cy="150" r="112" fill="none" stroke="rgba(190,140,60,.25)" stroke-width="2"/><path d="M38 150 A112 112 0 0 1 120 41" fill="none" stroke="#D9A441" stroke-width="3.5" stroke-linecap="round"/></g>
  <g class="ring r3"><circle cx="150" cy="150" r="86" fill="none" stroke="rgba(190,140,60,.22)" stroke-width="2"/><path d="M236 150 A86 86 0 0 1 180 231" fill="none" stroke="#E3B33E" stroke-width="3.5" stroke-linecap="round"/></g>
  <g class="tilt">
    <rect x="96" y="102" width="108" height="108" rx="16" transform="rotate(45 150 156)" fill="url(#pc)" stroke="#B47F12" stroke-width="2.5"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${118 + i * 17}" y="196" width="10" height="5" rx="1.5" fill="#E07B24" opacity="${0.3 + 0.15 * i}"/>`).join("")}
    <g class="lids"><g class="look">
      <rect x="124" y="132" width="15" height="24" rx="7.5" fill="#1D1A14"/><rect x="161" y="132" width="15" height="24" rx="7.5" fill="#1D1A14"/>
      <circle cx="134" cy="138" r="3" fill="#fff"/><circle cx="171" cy="138" r="3" fill="#fff"/>
    </g></g>
    <path class="smile" d="M128 170 Q150 190 172 170" stroke="#E07B24" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <circle class="glow" cx="150" cy="66" r="22" fill="url(#pg)"/><circle cx="150" cy="66" r="6.5" fill="#FFF6DD"/>
    <line x1="150" y1="74" x2="150" y2="98" stroke="#C99A3E" stroke-width="2.5"/>
  </g>
</svg>`;

const LINES = ["Hi! I'm Point One 👋", "Intelligence. Locally.", "Thanks for reading!", "Everyone said impossible…", "…we said I-M-Possible.", "Say hi to Karan →"];

export function makeFinale(CSS3DObject, { email, site, siteLabel, vcf }) {
  if (!document.getElementById("finCSS")) { const st = document.createElement("style"); st.id = "finCSS"; st.textContent = CSS; document.head.appendChild(st); }

  const me = document.createElement("div"); me.className = "fin"; me.id = "finMe"; me.style.setProperty("--from", "80px");
  me.innerHTML = `<div class="bob"><div class="panel" style="margin-top:110px">
    <div class="av">${ME_SVG}</div>
    <div class="hi">Thank you for reading</div>
    <div class="nm serif">Karan Gowda N</div>
    <div class="role">(Leo) · Founder, age 17</div>
    <hr>
    <div class="co serif">Vertex Interactive<small>Building India's AI future</small></div>
    <a class="row" href="mailto:${email}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>${email}</a>
    <a class="row" href="${site}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>${siteLabel}</a>
    <a class="save" href="${vcf}" target="_blank" rel="noopener"><i></i>Save contact</a>
  </div></div>`;

  const p1 = document.createElement("div"); p1.className = "fin"; p1.id = "finP1"; p1.style.setProperty("--from", "-80px");
  p1.innerHTML = `<div class="bob" style="animation-delay:-2s"><div class="say">&nbsp;</div><div class="bot">${P1_SVG}</div><div class="plate"><div class="name">Point One</div><div class="tag">Intelligence. Locally.</div></div></div>`;

  const left = new CSS3DObject(p1), right = new CSS3DObject(me);
  left.position.set(-760, 40, 0); right.position.set(760, 0, 0);

  // Point One talks: a line at a time, typed out
  const say = p1.querySelector(".say");
  let on = false, li = 0, typing = 0, nextT = 0;
  function speak() {
    if (!on) return;
    const text = LINES[li % LINES.length]; li++;
    let k = 0; clearInterval(typing);
    say.classList.add("pop"); setTimeout(() => say.classList.remove("pop"), 250);
    typing = setInterval(() => { k++; say.textContent = text.slice(0, k) || " "; if (k >= text.length) clearInterval(typing); }, 38);
    nextT = setTimeout(speak, 2600);
  }
  function show(v) {
    if (v === on) return;
    on = v;
    me.classList.toggle("show", v); p1.classList.toggle("show", v);
    clearTimeout(nextT); clearInterval(typing);
    if (v) { li = 0; say.textContent = " "; nextT = setTimeout(speak, 700); }
  }
  return { left, right, show, get on() { return on; }, WIDE: 2 * (760 + 260) };
}
