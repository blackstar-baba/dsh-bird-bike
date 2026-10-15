/**
 * Client half of dsh-bird-bike — Minecraft pixel edition, day/night + mobs.
 *
 * A little helmeted pixel chicken rides a bicycle along a full-width strip
 * docked at the bottom of the app frame. The strip mounts into `shell.bottom`,
 * a root-scoped slot whose owner (ui-layout's AppFrame) already allocates the
 * space, so no overlay or motion path crosses host controls.
 *
 * Rendering: the whole scene is drawn on a low-resolution offscreen canvas
 * (one canvas pixel = P CSS pixels) with hard-edged pixel primitives — rects,
 * Bresenham lines, scanline ellipses — then upscaled with smoothing disabled.
 * The palette follows the Minecraft visual language: blocky stepped terrain,
 * grass/dirt ground with scrolling speckle texture, square sun and clouds,
 * oak-style trees, flowers, and note particles on the bell. The bird is a
 * pixel chicken that keeps its teal helmet. Jumping quantizes to whole art
 * pixels for a chunky hop.
 *
 * Day/night cycle: an ~80s clock drifts from day through dusk into a starry
 * night (square moon, twinkling stars, headlight beam, moonlit palette) and
 * back. Transitions are quantized to eight steps so the world shifts in
 * discrete pixel-art color steps. The 🌙/☀️ button jumps to the other phase;
 * the cycle continues from there.
 *
 * Mobs (hostile life, one at a time, spawned ahead of the rider):
 * - Day creepers shuffle closer; entering the 2m trigger range starts the fuse —
 *   the body flashes faster and faster — and the blast knocks the
 *   bird into a forced super jump (no fail state, pure spectacle), with smoke
 *   debris and a one-pixel screen shake.
 * - Night zombies shuffle toward the rider with a two-frame walk; on contact
 *   they are knocked flying: they tumble forward, spinning, and despawn
 *   off-screen with a dust puff.
 * Mobs live in rider-relative gap space (art px ahead), so the rider's world
 * wrap never moves them. `prefers-reduced-motion` parks the ride: the world
 * stops scrolling, mobs never spawn, one-shot interactions still animate.
 *
 * Stats chip: distance, speed, and accumulated riding time (⏱) — time counts
 * only while the ride actually moves.
 *
 * Chrome colors come from the host theme tokens (square corners for the pixel
 * look); the canvas artwork uses its own literal palette by design (the
 * artwork exception, as in composer-globe). The strip collapses to a mini
 * rail; the choice persists in localStorage.
 */
window.__ModuleLoader__.load({
  id: 'dsh-bird-bike',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // `styles` is a documented Client builtin. Fall back to a component-local
    // <style> element (removed on unmount) when it is not reachable here.
    const styleService =
      typeof styles !== 'undefined' && styles && typeof styles.insert === 'function'
        ? styles
        : null;

    const STORE_KEY = 'dsh-plugin-bird-bike-mini';

    const CSS =
      '.bb-strip{position:relative;width:100%;height:96px;min-height:0;overflow:hidden;' +
      'border-top:2px solid var(--dsw-alias-border-l2)}' +
      '.bb-strip--mini{height:40px}' +
      '.bb-canvas{display:block;width:100%;height:100%;cursor:pointer;image-rendering:pixelated}' +
      '.bb-chip{position:absolute;top:6px;left:10px;padding:2px 10px;border-radius:0;' +
      'border:2px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);' +
      'font-size:11px;line-height:16px;color:inherit;pointer-events:none;white-space:nowrap;opacity:.92;' +
      'display:flex;align-items:center;gap:9px}' +
      /* Fixed-width tabular slots: digit changes never resize the chip. */
      '.bb-num{display:inline-block;font-variant-numeric:tabular-nums;text-align:right}' +
      '.bb-w6{min-width:6ch}.bb-w5{min-width:5ch}.bb-w2{min-width:2ch}' +
      '.bb-controls{position:absolute;right:8px;bottom:8px;display:flex;gap:6px}' +
      '.bb-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;' +
      'padding:0;border-radius:0;border-width:2px;border-style:solid;' +
      'border-color:var(--dsw-alias-border-l1) var(--dsw-alias-border-l3) var(--dsw-alias-border-l3) var(--dsw-alias-border-l1);' +
      'background:var(--dsw-alias-bg-layer-1);color:inherit;font-size:14px;line-height:1;cursor:pointer}' +
      '.bb-btn:hover{background:var(--dsw-alias-bg-layer-2)}' +
      '.bb-btn:active{border-color:var(--dsw-alias-border-l3) var(--dsw-alias-border-l1) var(--dsw-alias-border-l1) var(--dsw-alias-border-l3)}';

    /* Minecraft-flavored artwork palettes (artwork exception: literal colors).
     * Day and night variants are mixed in eight quantized steps so dusk reads
     * as discrete pixel-color shifts. */
    const PAL_DAY = {
      sky: '#78a7ff', skyLow: '#8fbcff',
      sun: '#fceb9c', sunCore: '#fff9db',
      cloud: '#ffffff',
      grassFar: '#86b959', grassNear: '#6fa33c', grassTop: '#7cbd51', grassDark: '#68a53f',
      dirt: '#79553a', dirtDark: '#5d4230',
      leaf: '#4c7f2e', leafLight: '#5a9138', trunk: '#6b4f2e',
      flowerStem: '#4c7f2e', flowerA: '#e8e337', flowerB: '#d65050',
      tire: '#1e1e1e', spoke: '#8a8a8a', hub: '#c9c9c9',
      frame: '#b02e26', seat: '#4a3a2c', metal: '#2a2a2a',
      feather: '#ffffff', featherShade: '#e2e2e2', beak: '#e8992e', wattle: '#c43c3c',
      leg: '#e8992e', eye: '#1a1a1a',
      helmet: '#2a9d8f', helmetRim: '#1f7a70',
      dust: '#9c8a72',
      creeper: '#52a04e', creeperShade: '#3f7f3c', creeperDark: '#2e5f2c', creeperLeg: '#1d3d1d', mobFace: '#161a16',
      zombieSkin: '#4f8f4f', zombieShade: '#3a6f3a', zombieShirt: '#2e7d8a', zombiePants: '#35507f',
      smoke: '#a8a8a0', smokeLight: '#d0d0c8',
    };
    const PAL_NIGHT = {
      sky: '#101636', skyLow: '#1a2150',
      sun: '#fceb9c', sunCore: '#fff9db', // unused while the moon is up
      cloud: '#39406e',
      grassFar: '#3f6b33', grassNear: '#315427', grassTop: '#41703a', grassDark: '#365e2c',
      dirt: '#4c3726', dirtDark: '#3a2a1c',
      leaf: '#2c4a1e', leafLight: '#3a5c2a', trunk: '#4a3a24',
      flowerStem: '#31501f', flowerA: '#b8a92e', flowerB: '#964040',
      tire: '#141414', spoke: '#565656', hub: '#8f8f8f',
      frame: '#7e201c', seat: '#33281e', metal: '#1c1c1c',
      feather: '#e8eaf2', featherShade: '#c5c9da', beak: '#c9842a', wattle: '#9e3535',
      leg: '#c9842a', eye: '#1a1a1a',
      helmet: '#1f7a70', helmetRim: '#175c55',
      dust: '#6b6154',
      creeper: '#3a6f3a', creeperShade: '#2c5629', creeperDark: '#1f4020', creeperLeg: '#0f230f', mobFace: '#0d0f0d',
      zombieSkin: '#3a6f3a', zombieShade: '#2c5329', zombieShirt: '#1f5a66', zombiePants: '#27395c',
      smoke: '#5c5c58', smokeLight: '#82827c',
    };
    const NOTE_COLORS = ['#e84ae8', '#4ae84a', '#e8e84a', '#4ae8e8', '#ffffff', '#e8992e'];

    const CYCLE = 80; // seconds per full day/night loop
    const FUSE = 1.5; // seconds from hiss to boom (MC creeper fuse)
    const TRIGGER_M = 2; // meters: range at which the creeper starts its fuse
    const MOB_CAP = 3; // mobs allowed on stage at once (flung ones do not count)

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function hash(n) {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    }
    function mixHex(a, b, t) {
      const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16);
      const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
      const g2 = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
      const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
      return 'rgb(' + r + ',' + g2 + ',' + bl + ')';
    }

    /* Trapezoid over one cycle: day, dusk ramp, starry night, dawn ramp. */
    function rawNight(p) {
      if (p < 0.40) return 0;
      if (p < 0.50) return (p - 0.40) / 0.10;
      if (p < 0.88) return 1;
      if (p < 0.98) return 1 - (p - 0.88) / 0.10;
      return 0;
    }
    function fmtTime(sec) {
      sec = Math.floor(sec);
      const hh = Math.floor(sec / 3600);
      const mm = Math.floor((sec % 3600) / 60);
      const ss = sec % 60;
      const two = (v) => (v < 10 ? '0' : '') + v;
      return hh > 0 ? hh + ':' + two(mm) + ':' + two(ss) : mm + ':' + two(ss);
    }

    /* ---------------- audio (unlocked by the first click) ---------------- */
    let actx = null;
    function audio() {
      try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        return actx;
      } catch { return null; }
    }
    function tone(freq, at, dur, type, vol) {
      const ac = audio(); if (!ac) return;
      const t0 = ac.currentTime + at;
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }
    // Slightly chip-tune flavored bell and chirp.
    function bellSound() { tone(1319, 0, 0.12); tone(1760, 0.1, 0.16); tone(2093, 0.2, 0.22); }
    function chirp() { tone(1046, 0, 0.07, 'square', 0.1); tone(1568, 0.07, 0.1, 'square', 0.1); }

    /* ---------------- two-bone leg IK, knee forward ---------------- */
    function legIK(hx, hy, fx, fy, l1, l2) {
      const dx = fx - hx; const dy = fy - hy;
      const raw = Math.hypot(dx, dy) || 0.001;
      const d = clamp(Math.abs(l1 - l2) + 0.5, raw, l1 + l2 - 0.5);
      const fx2 = hx + dx / raw * d; const fy2 = hy + dy / raw * d;
      const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
      const a = Math.acos(cosA);
      const base = Math.atan2(fy2 - hy, fx2 - hx);
      const k1 = { x: hx + Math.cos(base + a) * l1, y: hy + Math.sin(base + a) * l1 };
      const k2 = { x: hx + Math.cos(base - a) * l1, y: hy + Math.sin(base - a) * l1 };
      return { knee: k1.x > k2.x ? k1 : k2, foot: { x: fx2, y: fy2 } };
    }

    /* ---------------- the ride engine ---------------- */
    function createScene(canvas, onStats, onPhase) {
      const vctx = canvas.getContext('2d');
      const art = document.createElement('canvas');
      const g = art.getContext('2d');
      const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

      const st = {
        t: 0, dist: 0, boost: 0, speed: 0, rideTime: 0,
        wheelAng: 0, crankAng: 0, jumpStart: -10, airborne: false,
        blinkAge: 99, blinkTimer: 2,
        cycleT: 0, k: 0, phaseReported: false,
        blastStart: -10, shake: 0,
      };
      let w = 1; let h = 1; let P = 3; let artW = 1; let artH = 1;
      let groundY = 0; let A = 4.5; let pad = 40;
      let raf = 0; let last = performance.now(); let statTick = 0;
      const dust = []; const notes = []; const clouds = []; const stars = [];
      let activeK = -1; let active = null;
      const mobs = [];     // live mobs, up to MOB_CAP
      let mobTimer = 10;   // seconds until the next spawn attempt

      /* Active palette, memoized per quantized night step. */
      function palette(k) {
        if (k === activeK) return active;
        activeK = k;
        const out = {};
        for (const key of Object.keys(PAL_DAY)) {
          const night = PAL_NIGHT[key];
          out[key] = night === undefined ? PAL_DAY[key] : mixHex(PAL_DAY[key], night, k);
        }
        active = out;
        return out;
      }

      /* ---- hard-edged pixel primitives on the offscreen canvas ---- */
      function px(x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      function rect(x, y, wd, ht, c) {
        g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(wd)), Math.max(1, Math.round(ht)));
      }
      function line(x0, y0, x1, y1, c, wd) {
        const pen = Math.max(1, wd || 1); const o = (pen - 1) / 2;
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0); const sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0); const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          g.fillStyle = c; g.fillRect(x0 - o, y0 - o, pen, pen);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }
      function ellipse(x, y, rx, ry, c) {
        rx = Math.max(1, rx); ry = Math.max(1, ry);
        for (let yy = -ry; yy <= ry; yy++) {
          const half = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
          if (half < 0.5) continue;
          g.fillStyle = c;
          g.fillRect(Math.round(x - half), Math.round(y + yy), Math.max(1, Math.round(half * 2)), 1);
        }
      }
      function ring(cx, cy, r, c, double) {
        const n = Math.max(16, Math.round(r * 7));
        for (let i = 0; i < n; i++) {
          const t = i / n * Math.PI * 2;
          px(cx + Math.cos(t) * r, cy + Math.sin(t) * r, c);
          if (double) px(cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), c);
        }
      }

      function resize() {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.max(1, r.width); h = Math.max(1, r.height);
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        vctx.imageSmoothingEnabled = false;
        P = clamp(Math.round(h / 30), 2, 6);
        artW = Math.ceil(w / P); artH = Math.ceil(h / P);
        art.width = artW; art.height = artH;
        g.imageSmoothingEnabled = false;
        groundY = artH - Math.max(3, Math.round(artH * 0.12));
        A = Math.max(3.5, artH * 0.16);
        pad = 6 * A + 8;
        seedClouds();
        seedStars();
      }

      function seedClouds() {
        clouds.length = 0;
        const n = artH >= 24 ? 4 : 2;
        for (let i = 0; i < n; i++) {
          clouds.push({ x: hash(i * 7 + 1) * artW, y: 2 + hash(i * 7 + 2) * groundY * 0.35, wd: 9 + hash(i * 7 + 3) * 12, v: 0.08 + hash(i * 7 + 4) * 0.1 });
        }
      }

      function seedStars() {
        stars.length = 0;
        const n = Math.min(90, Math.floor(artW * Math.max(4, groundY - 6) / 55));
        for (let i = 0; i < n; i++) {
          stars.push({
            x: Math.floor(hash(i * 13 + 2) * artW),
            y: 1 + Math.floor(hash(i * 13 + 5) * Math.max(1, groundY - 7)),
            ph: hash(i * 13 + 9) * Math.PI * 2,
            bright: hash(i * 13 + 11) < 0.3,
          });
        }
      }

      function steppedHillY(x, factor, amp, freq, base) {
        const wx = x + st.dist * factor;
        const y = groundY - base - amp * (0.55 + 0.45 * Math.sin(wx * freq) + 0.25 * Math.sin(wx * freq * 2.3 + 1.3));
        return Math.round(y / 2) * 2; // quantize to 2px terraces: blocky Minecraft hills
      }

      function jumpOffset() {
        const p = (st.t - st.jumpStart) / 0.62;
        if (p <= 0 || p >= 1) return 0;
        return -Math.round(Math.min(10, 1.4 * A) * 4 * p * (1 - p));
      }

      /* Creeper blast knock: taller and longer than a normal hop. */
      function blastOffset() {
        const p = (st.t - st.blastStart) / 0.9;
        if (p <= 0 || p >= 1) return 0;
        return -Math.round(Math.min(14, 2.4 * A) * 4 * p * (1 - p));
      }

      function riderScreenX() {
        return ((st.dist % (artW + 2 * pad)) + artW + 2 * pad) % (artW + 2 * pad) - pad;
      }

      /* ---------------- mobs ---------------- */
      function spawnMob() {
        const day = st.k < 0.5;
        let gap = day
          ? (TRIGGER_M + 0.6) * 14 * A
          : (5 + Math.random() * 3) * 14 * A;
        for (let t = 0; t < 4; t++) { // stagger: keep 1.2m clear of every live mob
          if (!mobs.some((m) => Math.abs(m.gap - gap) < 1.2 * 14 * A)) break;
          gap += 1.5 * 14 * A;
        }
        mobs.push(day
          ? { kind: 'creeper', gap, fuse: -1, walk: 0 }
          : { kind: 'zombie', gap, walk: 0, flung: null });
        mobTimer = 4 + Math.random() * 4;
      }

      function explodeCreeper(x) {
        for (let i = 0; i < 14; i++) {
          dust.push({
            x: x + (Math.random() - 0.5) * 5, y: groundY - 1 - Math.random() * 5,
            vx: (Math.random() - 0.5) * 70, vy: -15 - Math.random() * 45,
            age: 0, life: 0.5 + Math.random() * 0.4,
            c: i % 3 === 0 ? active.smokeLight : active.smoke,
          });
        }
        st.blastStart = st.t;
        st.shake = 0.35;
      }

      function flingZombie(m, x) {
        m.flung = {
          x, y: groundY - 5,
          vx: st.speed * 0.55 + 55, vy: -95,
          rot: 0, vr: 9 + Math.random() * 4,
        };
        for (let i = 0; i < 6; i++) {
          dust.push({
            x: x + (Math.random() - 0.5) * 3, y: groundY - 1,
            vx: (Math.random() - 0.5) * 40, vy: -8 - Math.random() * 28,
            age: 0, life: 0.4, c: active.dust,
          });
        }
      }

      function updateMobs(dt, speed, riderX) {
        st.shake = Math.max(0, st.shake - dt);
        if (!reduced) {
          const live = mobs.filter((m) => !(m.kind === 'zombie' && m.flung)).length;
          if (live < MOB_CAP) {
            mobTimer -= dt;
            if (mobTimer <= 0) spawnMob();
          }
        }
        for (let i = mobs.length - 1; i >= 0; i--) {
          const m = mobs[i];
          if (m.kind === 'creeper') {
            if (m.fuse < 0 && m.gap <= TRIGGER_M * 14 * A) m.fuse = 0;
            if (m.fuse >= 0) m.fuse += dt;
            m.gap -= (speed + 10) * dt; // shambles toward the rider
            m.walk += dt;
            if (m.fuse >= FUSE || m.gap <= 0.4 * 14 * A) {
              explodeCreeper(riderX + Math.max(0, m.gap));
              mobs.splice(i, 1);
            }
          } else if (m.flung) {
            const f = m.flung;
            f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 320 * dt; f.rot += f.vr * dt;
            if (f.y > groundY + 12 || f.x > artW + 16) mobs.splice(i, 1);
          } else {
            m.gap -= (speed + 9) * dt; // shuffles toward the rider
            m.walk += dt;
            if (m.gap <= 0.4 * 14 * A) flingZombie(m, riderX + Math.max(0, m.gap));
          }
        }
      }

      function drawZombieBody(x, y, C, frame, ms) {
        // legs alternate with the walk cycle
        if (frame) { rect(x - 4 * ms, y - 4 * ms, 2 * ms, 4 * ms, C.zombiePants); rect(x + 2 * ms, y - 4 * ms, 2 * ms, 4 * ms, C.zombieShade); }
        else { rect(x - 4 * ms, y - 4 * ms, 2 * ms, 4 * ms, C.zombieShade); rect(x + 2 * ms, y - 4 * ms, 2 * ms, 4 * ms, C.zombiePants); }
        rect(x - 4 * ms, y - 12 * ms, 8 * ms, 8 * ms, C.zombieShirt);  // torso
        rect(x - 10 * ms, y - 12 * ms, 6 * ms, 2 * ms, C.zombieSkin);  // arms reaching toward the rider
        rect(x - 4 * ms, y - 19 * ms, 8 * ms, 7 * ms, C.zombieSkin);   // head
        rect(x - 4 * ms, y - 17 * ms, 2 * ms, 2 * ms, C.mobFace);      // eyes on the rider side
        rect(x + 2 * ms, y - 17 * ms, 2 * ms, 2 * ms, C.mobFace);
        rect(x - 1 * ms, y - 15 * ms, 2 * ms, 1 * ms, C.mobFace);      // mouth
      }

      function drawMob(C, riderX) {
        if (!mobs.length) return;
        const ms = clamp(artH / 32, 0.55, 1.3); // mobs scale with the strip like the bike does
        for (const m of mobs) {
        if (m.kind === 'creeper') {
          const x = Math.round(riderX + m.gap);
          if (x < -12 * ms || x > artW + 12 * ms) return;
          let body = C.creeper; let shade = C.creeperShade;
          if (m.fuse >= 0) {
            const rate = 0.08 + m.fuse * 0.1; // flash quickens near the boom
            if (Math.floor(m.fuse / rate) % 2 === 0) { body = '#e9f2e7'; shade = '#c3d6bf'; }
          }
          const step = Math.floor((m.walk || 0) * 2.5) % 2;
          rect(x - 6 * ms, groundY - 3 * ms, 3 * ms, 3 * ms, step ? shade : C.creeperLeg);   // back legs
          rect(x + 3 * ms, groundY - 3 * ms, 3 * ms, 3 * ms, step ? C.creeperLeg : shade);   // front legs
          rect(x - 7 * ms, groundY - 1 * ms, 4 * ms, 1 * ms, C.creeperLeg);                  // soles
          rect(x + 3 * ms, groundY - 1 * ms, 4 * ms, 1 * ms, C.creeperLeg);
          rect(x - 6 * ms, groundY - 20 * ms, 12 * ms, 16 * ms, body);   // body + head block
          rect(x - 6 * ms, groundY - 7 * ms, 12 * ms, 2 * ms, shade);
          rect(x - 6 * ms, groundY - 18 * ms, 4 * ms, 2 * ms, C.mobFace); // eyes
          rect(x + 2 * ms, groundY - 18 * ms, 4 * ms, 2 * ms, C.mobFace);
          rect(x - 2 * ms, groundY - 16 * ms, 4 * ms, 4 * ms, C.mobFace); // mouth drop
          rect(x - 4 * ms, groundY - 14 * ms, 2 * ms, 2 * ms, C.mobFace); // jaw sides
          rect(x + 2 * ms, groundY - 14 * ms, 2 * ms, 2 * ms, C.mobFace);
        } else {
          if (m.flung) {
            const f = m.flung;
            g.save();
            g.translate(f.x, f.y);
            g.rotate(f.rot);
            drawZombieBody(-2 * ms, 10 * ms, C, 0, ms);
            g.restore();
            continue;
          }
          const x = Math.round(riderX + m.gap);
          if (x < -12 * ms || x > artW + 12 * ms) continue;
          drawZombieBody(x, groundY, C, Math.floor(m.walk * 2.5) % 2, ms);
        }
        }
      }

      function update(dt) {
        st.t += dt; st.blinkAge += dt;
        st.boost = Math.max(0, st.boost - dt * 0.5);
        const speed = reduced ? 0 : (50 + st.boost * 95) * (A / 4.5); // art px / s
        st.speed = speed;
        st.dist += speed * dt;
        st.rideTime += speed > 0 ? dt : 0; // riding time only accumulates while moving
        st.wheelAng += speed * dt / A;
        st.crankAng += speed * dt / (A * 1.85);

        st.cycleT = (st.cycleT + dt) % CYCLE;
        st.k = Math.round(rawNight(st.cycleT / CYCLE) * 8) / 8;
        const isNight = st.k >= 0.5;
        if (isNight !== st.phaseReported && onPhase) {
          st.phaseReported = isNight;
          onPhase(isNight);
        }

        st.blinkTimer -= dt;
        if (st.blinkTimer <= 0) { st.blinkAge = 0; st.blinkTimer = 1.8 + Math.random() * 3; }

        const riderX = riderScreenX();
        const off = Math.min(jumpOffset(), blastOffset());
        if (st.airborne && off === 0) {
          st.airborne = false;
          for (let i = 0; i < 8; i++) {
            dust.push({ x: riderX + 1.6 * A + (Math.random() - 0.5) * 3 * A, y: groundY - 1,
                        vx: -8 - Math.random() * 14, vy: -3 - Math.random() * 7,
                        age: 0, life: 0.45 + Math.random() * 0.3,
                        c: Math.random() < 0.5 ? active.dust : active.featherShade });
          }
        } else if (off < 0) st.airborne = true;

        if (speed > 18 && Math.random() < 0.45) {
          dust.push({ x: riderX + 0.3 * A + (Math.random() - 0.5) * 2 * A, y: groundY - 1 - Math.random() * 2,
                      vx: -speed * 0.25 - Math.random() * 8, vy: -1 - Math.random() * 4,
                      age: 0, life: 0.4 + Math.random() * 0.3, c: active.dust });
        }
        for (const p of dust) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 22 * dt; p.age += dt; }
        for (let i = dust.length - 1; i >= 0; i--) if (dust[i].age >= dust[i].life) dust.splice(i, 1);

        for (const nt of notes) nt.age += dt;
        for (let i = notes.length - 1; i >= 0; i--) if (notes[i].age > 1) notes.splice(i, 1);

        if (!reduced) {
          for (const c of clouds) {
            c.x -= speed * c.v * dt * 0.4;
            if (c.x < -c.wd - 4) { c.x = artW + 6; c.y = 2 + Math.random() * groundY * 0.35; }
          }
        }

        updateMobs(dt, speed, riderX);

        if (onStats && ++statTick >= 20) {
          statTick = 0;
          onStats({
            m: (st.dist / (14 * A)).toFixed(1),
            kmh: Math.round(speed / (14 * A) * 3.6),
            time: fmtTime(st.rideTime),
          });
        }
      }

      /* ---------------- scene painting ---------------- */
      function drawBackground(C) {
        rect(0, 0, artW, Math.max(1, groundY - 6), C.sky);
        rect(0, Math.max(0, groundY - 6), artW, 6, C.skyLow);
        if (st.k < 0.5 && artH >= 24) { // square sun by day
          rect(3, 2, 4, 4, C.sun);
          rect(4, 3, 2, 2, C.sunCore);
        }
        if (st.k >= 0.5) { // square moon + craters by night
          const mx = Math.max(4, artW - 9); const my = 2;
          rect(mx, my, 4, 4, '#f4f6ff');
          px(mx + 1, my + 1, '#c9d1e8');
          px(mx + 2, my + 2, '#c9d1e8');
        }
        if (st.k >= 0.5) { // twinkling stars
          for (const s of stars) {
            if (!s.bright && Math.sin(st.t * 1.6 + s.ph) < -0.2) continue;
            px(s.x, s.y, s.bright ? '#ffffff' : '#c9d4f2');
          }
        }
        for (const c of clouds) {
          rect(c.x, c.y, c.wd, 2, C.cloud);
          rect(c.x + 2, c.y - 1, Math.max(3, c.wd - 6), 1, C.cloud);
        }
        // far terraced hills
        for (let x = 0; x < artW; x++) {
          const y = steppedHillY(x, 0.3, 3.5, 0.045, 1);
          rect(x, y, 1, groundY - y, C.grassFar);
        }
        // near terraced hills
        for (let x = 0; x < artW; x++) {
          const y = steppedHillY(x, 0.55, 4.5, 0.07, 1.5);
          rect(x, y, 1, groundY - y, C.grassNear);
        }
        // oak-style trees on the near hill line
        const factor = 0.55; const sp = 46;
        const scrolled = st.dist * factor;
        const n0 = Math.floor(scrolled / sp) - 1;
        const count = Math.ceil((artW + 2 * sp) / sp);
        for (let i = 0; i < count; i++) {
          const n = n0 + i;
          const wx = n * sp + hash(n) * sp * 0.6;      // true world position
          const xs = wx - scrolled;                    // exact screen x
          if (xs < -8 || xs > artW + 8) continue;
          const y = steppedHillY(xs, factor, 4.5, 0.07, 1.5) + 1;  // sample the terrace at the exact world spot: no jitter
          const x = Math.round(xs);
          rect(x - 1, y - 4, 2, 4, C.trunk);
          rect(x - 3, y - 8, 7, 4, C.leaf);
          rect(x - 2, y - 9, 5, 1, C.leaf);
          for (let k2 = 0; k2 < 4; k2++) {
            px(x - 3 + Math.floor(hash(n * 9 + k2) * 7), y - 8 + Math.floor(hash(n * 9 + k2 + 5) * 4), C.leafLight);
          }
        }
      }

      function drawGround(C) {
        rect(0, groundY, artW, artH - groundY, C.dirt);
        const band = artH - groundY;
        for (let x = 0; x < artW; x++) {
          const world = x + Math.floor(st.dist);
          px(x, groundY, hash(world * 3 + 11) < 0.22 ? C.grassDark : C.grassTop);
          if (band > 1 && hash(world * 7 + 13) < 0.2) {
            px(x, groundY + 1 + Math.floor(hash(world * 5 + 7) * (band - 1)), C.dirtDark);
          }
        }
        // flowers scrolling with the world
        const sp = 60;
        const f0 = Math.floor(st.dist / sp) - 1;
        const fcount = Math.ceil((artW + 2 * sp) / sp);
        for (let i = 0; i < fcount; i++) {
          const n = f0 + i;
          const x = Math.round(n * sp + hash(n + 40) * sp * 0.7 - st.dist);
          if (x < 0 || x > artW - 1) continue;
          px(x, groundY - 1, C.flowerStem);
          px(x, groundY - 2, hash(n + 41) < 0.5 ? C.flowerA : C.flowerB);
          if (hash(n + 42) < 0.4) px(x - 1, groundY - 1, C.grassDark);
        }
      }

      function drawWheel(cx, cy, r, ang, C) {
        ring(cx, cy, r, C.tire, r >= 4.5);
        const rr = Math.max(1, r - 1.5);
        line(cx - Math.cos(ang) * rr, cy - Math.sin(ang) * rr, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, C.spoke, 1);
        line(cx - Math.cos(ang + Math.PI / 2) * rr, cy - Math.sin(ang + Math.PI / 2) * rr, cx + Math.cos(ang + Math.PI / 2) * rr, cy + Math.sin(ang + Math.PI / 2) * rr, C.spoke, 1);
        px(cx, cy, C.hub);
      }

      function drawLeg(hx, hy, fx, fy, c) {
        const l1 = 1.17 * A; const l2 = 1.28 * A;
        const ik = legIK(hx, hy, fx, fy, l1, l2);
        line(hx, hy, ik.knee.x, ik.knee.y, c, 1);
        line(ik.knee.x, ik.knee.y, ik.foot.x, ik.foot.y - 1, c, 1);
        rect(ik.foot.x - 0.5, ik.foot.y - 1.5, 2, 1, c);
      }

      function drawCrankAndLeg(C, pedal, seat, legColor, near) {
        line(C.x, C.y, pedal.x, pedal.y, C.metal, 1);
        rect(pedal.x - 1, pedal.y - 0.5, 2, 1, C.tire);
        const hip = near
          ? { x: seat.x + 0.1 * A, y: seat.y + 0.5 * A }
          : { x: seat.x - 0.15 * A, y: seat.y + 0.42 * A };
        drawLeg(hip.x, hip.y, pedal.x, pedal.y - 1, legColor);
      }

      function drawRider(x, C) {
        const a = A; const hubY = groundY - a; const off = Math.min(jumpOffset(), blastOffset());
        const lift = Math.min(1, Math.abs(off) / (1.4 * a + 1));
        g.globalAlpha = 0.2 * (1 - lift * 0.6);
        g.fillStyle = '#000';
        g.fillRect(Math.round(x + 0.2 * a), groundY, Math.max(4, Math.round(3 * a)), 1);
        g.globalAlpha = 1;

        g.save();
        g.translate(0, off);

        const frontX = x + 3.2 * a;
        if (st.k >= 0.5) { // headlight beam + lamp by night
          g.fillStyle = 'rgba(255,236,150,0.30)';
          g.fillRect(Math.round(frontX + 1.5 * a), Math.round(hubY - 1.5 * a), 4, 2);
          g.fillRect(Math.round(frontX + 1.5 * a + 4), Math.round(hubY - 1.2 * a), 5, 3);
          g.fillStyle = 'rgba(255,236,150,0.16)';
          g.fillRect(Math.round(frontX + 1.5 * a + 9), Math.round(hubY - 0.9 * a), 6, 3);
          px(headLampX(x, a), Math.round(hubY - 1.3 * a), '#ffe796');
        }
        drawWheel(x, hubY, a, st.wheelAng, C);
        drawWheel(frontX, hubY, a, st.wheelAng, C);

        const Cx = x + 1.6 * a; const Cy = hubY + 0.17 * a;
        const crankLen = 0.55 * a;
        const ca = st.crankAng;
        const p1 = { x: Cx + Math.cos(ca) * crankLen, y: Cy + Math.sin(ca) * crankLen };
        const p2 = { x: Cx - Math.cos(ca) * crankLen, y: Cy - Math.sin(ca) * crankLen };
        const seat = { x: x + a, y: hubY - 1.44 * a };
        const headTop = { x: x + 3.0 * a, y: hubY - 1.62 * a };
        const headBot = { x: x + 2.9 * a, y: hubY - 0.72 * a };
        const stemTop = { x: x + 2.9 * a, y: hubY - 2.1 * a };
        const grip = { x: x + 2.5 * a, y: hubY - 2.0 * a };
        const CC = { x: Cx, y: Cy };

        if (a >= 4) ring(Cx, Cy, 0.36 * a, C.metal, false); // chainring
        ring(x, hubY, 0.24 * a, C.metal, false); // rear gear
        if (a >= 4.5) {
          line(Cx, Cy - 0.36 * a, x, hubY - 0.24 * a, C.metal, 1);
          line(Cx, Cy + 0.36 * a, x, hubY + 0.24 * a, C.metal, 1);
        }

        drawCrankAndLeg(CC, p2, seat, '#b56a1e', false);

        // frame: chunky 2px lines
        line(x, hubY, CC.x, CC.y, C.frame, 2);
        line(x, hubY, seat.x, seat.y, C.frame, 1);
        line(CC.x, CC.y, seat.x, seat.y, C.frame, 2);
        line(seat.x, seat.y, headTop.x, headTop.y, C.frame, 2);
        line(CC.x, CC.y, headBot.x, headBot.y, C.frame, 2);
        line(headTop.x, headTop.y, headBot.x, headBot.y, C.frame, 2);
        line(headBot.x, headBot.y, frontX, hubY, C.frame, 1);
        line(headTop.x, headTop.y, stemTop.x, stemTop.y, C.metal, 1);
        line(stemTop.x, stemTop.y, grip.x, grip.y, C.metal, 1);
        px(grip.x, grip.y, C.metal);
        rect(seat.x - 2, seat.y - 1.5, 4, 1, C.seat);

        /* ---- pixel chicken ---- */
        const bob = Math.sin(ca * 2) >= 0 ? 0 : -1; // 1px pecking bob, 2-frame
        const Bx = seat.x + 0.15 * a; const By = Math.round(seat.y - 0.72 * a) + bob;
        const rx = 0.9 * a; const ry = 0.62 * a;
        rect(Bx - rx - 1.5, By - 1, 2, 2, C.feather); // tail block
        ellipse(Bx, By, rx, ry, C.feather);
        ellipse(Bx + rx * 0.2, By + ry * 0.35, rx * 0.6, ry * 0.4, C.featherShade);
        // 2-frame wing flap
        const flap = st.boost > 0.2 || off < 0 ? 9 : 3;
        const wingUp = Math.sin(st.t * flap) > 0;
        rect(Bx - 1, By + (wingUp ? -3 : -1), 4, 2, C.featherShade);

        const Hx = Bx + 0.72 * a; const Hy = By - 0.62 * a;
        const hr = Math.max(2, 0.42 * a);
        ellipse(Hx, Hy, hr, hr, C.feather);
        px(Hx + 1, Hy - 1, st.blinkAge < 0.12 ? C.feather : C.eye);
        rect(Hx + hr, Hy - 1, 2, 1, C.beak); // beak
        px(Hx + hr, Hy + 1, C.wattle);       // wattle
        // chunky helmet dome
        rect(Hx - 2, Hy - hr - 2, 4, 1, C.helmet);
        rect(Hx - 1, Hy - hr - 3, 2, 1, C.helmet);
        rect(Hx - 3, Hy - hr - 1, 6, 1, C.helmetRim);

        drawCrankAndLeg(CC, p1, seat, C.leg, true);

        // Minecraft-style note particles (also the bell feedback)
        for (const nt of notes) {
          if (nt.age < 0) continue;
          const nx = Bx + 2 + Math.sin(nt.age * 9 + nt.seed * 6) * 3;
          const ny = By - 2.2 * a - nt.age * 9;
          const c = NOTE_COLORS[Math.floor(nt.age * 7 + nt.seed * 5) % NOTE_COLORS.length];
          rect(nx, ny, 2, 1, c);
          rect(nx + 1, ny - 3, 1, 3, c);
        }

        g.restore();
      }

      /* Lamp pixel sits on the head tube, facing forward. */
      function headLampX(x, a) { return Math.round(x + 3.1 * a); }

      function draw() {
        const C = palette(st.k);
        drawBackground(C);
        drawGround(C);
        const riderX = riderScreenX();
        drawMob(C, riderX);
        drawRider(riderX, C);
        for (const p of dust) {
          const a2 = Math.max(0, 1 - p.age / p.life);
          if (a2 < 0.4 && Math.floor(st.t * 20) % 2 === 0) continue; // flicker out
          px(p.x, p.y, p.c);
        }
        // upscale: one art pixel = P CSS pixels, nearest-neighbor; a blast adds
        // a one-pixel jitter (scaled up slightly so no gap shows at the edges)
        vctx.imageSmoothingEnabled = false;
        const jx = st.shake > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
        const jy = st.shake > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
        vctx.drawImage(art, 0, 0, artW, artH,
          jx, jy, artW * P + Math.abs(jx) * 2, artH * P + Math.abs(jy) * 2);
      }

      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        raf = requestAnimationFrame(frame);
      }

      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null;
      if (observer) observer.observe(canvas);
      resize();
      palette(0);
      raf = requestAnimationFrame(frame);

      return {
        bell() {
          st.boost = 1;
          bellSound();
          for (let i = 0; i < 4; i++) notes.push({ age: -i * 0.14, seed: Math.random() });
        },
        jump() {
          if (st.t - st.jumpStart < 0.62) return;
          st.jumpStart = st.t;
          chirp();
        },
        toggleNight() {
          const p = st.cycleT / CYCLE;
          st.cycleT = rawNight(p) >= 0.5 ? 0 : 0.56 * CYCLE; // jump to morning or full night
        },
        destroy() {
          cancelAnimationFrame(raf);
          if (observer) observer.disconnect();
        },
      };
    }

    /* ---------------- component ---------------- */
    function BirdRide() {
      const canvasRef = React.useRef(null);
      const sceneRef = React.useRef(null);
      const statRefs = React.useRef({});
      const [mini, setMini] = React.useState(() => {
        try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
      });
      const [night, setNight] = React.useState(false);

      React.useEffect(() => {
        const scene = createScene(canvasRef.current, (stats) => {
          const refs = statRefs.current;
          if (refs.dist) refs.dist.textContent = stats.m;
          if (refs.speed) refs.speed.textContent = String(stats.kmh);
          if (refs.time) refs.time.textContent = stats.time;
        }, setNight);
        sceneRef.current = scene;
        return () => { scene.destroy(); sceneRef.current = null; };
      }, [mini]);

      const toggle = () => setMini((v) => {
        try { localStorage.setItem(STORE_KEY, v ? '0' : '1'); } catch { /* storage may be unavailable */ }
        return !v;
      });
      const bell = () => { if (sceneRef.current) sceneRef.current.bell(); };
      const jump = () => { if (sceneRef.current) sceneRef.current.jump(); };
      const toggleNight = () => { if (sceneRef.current) sceneRef.current.toggleNight(); };

      return h('div', { className: 'bb-strip' + (mini ? ' bb-strip--mini' : ''), 'data-bird-bike': true },
        h('canvas', {
          ref: canvasRef, className: 'bb-canvas', title: '点一下:按铃',
          'aria-label': '像素小鸟骑行带,点击按铃', onClick: bell,
        }),
        !mini && h('span', { className: 'bb-chip' },
          h('span', null, '🚴 ', h('span', {
            className: 'bb-num bb-w6', ref: (el) => { statRefs.current.dist = el; },
          }, '0.0'), ' m'),
          h('span', null, '⚡ ', h('span', {
            className: 'bb-num bb-w2', ref: (el) => { statRefs.current.speed = el; },
          }, '0'), ' km/h'),
          h('span', null, '⏱ ', h('span', {
            className: 'bb-num bb-w5', ref: (el) => { statRefs.current.time = el; },
          }, '0:00')),
        ),
        h('div', { className: 'bb-controls' },
          !mini && h('button', {
            className: 'bb-btn', title: '按铃(叮铃+加速)', 'aria-label': '按铃', onClick: bell,
          }, '🔔'),
          !mini && h('button', {
            className: 'bb-btn', title: '跳一下', 'aria-label': '跳一下', onClick: jump,
          }, '🦘'),
          h('button', {
            className: 'bb-btn', title: night ? '切换到白天' : '切换到夜晚',
            'aria-label': night ? '切换到白天' : '切换到夜晚', onClick: toggleNight,
          }, night ? '☀️' : '🌙'),
          h('button', {
            className: 'bb-btn', title: mini ? '展开骑行带' : '收起骑行带',
            'aria-label': mini ? '展开骑行带' : '收起骑行带', onClick: toggle,
          }, mini ? '▴' : '▾'),
        ),
        styleService ? null : h('style', null, CSS),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        if (styleService) ctx.effect(() => styleService.insert(CSS), 'bird-bike-styles');
        ctx.slots.inject('shell.bottom', () => ctx.slots.register({
          name: 'shell.bottom',
          id: 'bird-bike',
          priority: 10,
        }, BirdRide));
      },
    };
  },
});
