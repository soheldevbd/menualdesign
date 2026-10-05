// Particle engine (canvas). Binds to the control ids rendered by components/Studio.js
export function initStudio() {
  const origRandom = Math.random;

  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;
  let W, H, s, D, h, S;
  const cr = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let U = [], CUR = '';
  let HIST = [];
  try { HIST = JSON.parse(localStorage.getItem('ps_hist') || '[]'); } catch (e) {}
  const saveHist = () => { try { localStorage.setItem('ps_hist', JSON.stringify(HIST.slice(-200))); } catch (e) {} };
  const vec = seed => { const r = mulberry(seed); return Array.from({ length: 20 }, () => r()); };
  /* Visual fingerprint: a 16x16 colour thumbnail of the actual render. New designs are chosen to look
     different from everything made before (any style), not just to have different random numbers. */
  const FPS = 16;
  function fingerprint() {
    let src = cv;
    for (const sz of [128, 32, FPS]) {
      const c = document.createElement('canvas'); c.width = c.height = sz;
      const t = c.getContext('2d'); t.imageSmoothingQuality = 'high'; t.drawImage(src, 0, 0, sz, sz); src = c;
    }
    const d = src.getContext('2d').getImageData(0, 0, FPS, FPS).data, out = [];
    for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
    return out;
  }
  const fpEnc = a => btoa(String.fromCharCode(...a));
  const fpDec = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const fpDist = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length / 255; };
  function applyLook(sd, auto) {
    $('seed').value = sd;
    if (auto) {
      const u = vec(sd), st = STYLES[$('style').value], themed = st && st[5];
      $('hue').value = Math.round((((themed ? st[1] + (u[0] - .5) * 50 : u[0] * 360) % 360) + 360) % 360);
      $('sat').value = themed ? st[2] : (u[1] < .1 ? 8 : Math.round(65 + 35 * u[1]));
      $('density').value = (.7 + u[2] * .7).toFixed(1);
    }
  }
  async function freshLook(auto) {
    let quota;
    try {
      const response = await fetch('/api/designs/consume', { method: 'POST' });
      quota = await response.json();
      if (!response.ok || !quota.allowed) {
        $('info').textContent = quota.error || 'Could not verify design limit. Please try again.';
        if ($('regen')) $('regen').disabled = true;
        if ($('bzip')) $('bzip').disabled = true;
        return false;
      }
      if (!quota.isAdmin) $('info').textContent = `Designs used today: ${quota.used}/${quota.limit} · ${quota.remaining} remaining`;
      else $('info').textContent = 'Admin account · unlimited designs';
      if ($('regen')) $('regen').disabled = false;
      if ($('bzip')) $('bzip').disabled = false;
    } catch {
      $('info').textContent = 'Cannot verify your design limit. Check your connection and try again.';
      return false;
    }
    const past = HIST.filter(e => e.fp).map(e => fpDec(e.fp)), tries = 10;
    let best = 0, bd = -1, bfp = null;
    for (let c = 0; c < tries; c++) {
      $('info').textContent = `Finding a unique design… ${c + 1}/${tries}`;
      await new Promise(r => setTimeout(r, 0));
      const sd = Math.floor(cr() * 1e9); applyLook(sd, auto); draw(960);
      const fp = fingerprint(), md = past.length ? Math.min(...past.map(p => fpDist(fp, p))) : 1;
      if (md > bd) { bd = md; best = sd; bfp = fp; }
    }
    applyLook(best, auto);
    HIST.push({ k: $('style').value, fp: fpEnc(bfp) }); saveHist();
    return true;
  }
  function gauss() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  const col = (dh, l, a) => `hsla(${h + dh},${S}%,${l}%,${a})`;
  function dot(x, y, r, dh, l, a) { ctx.fillStyle = col(dh, l, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function glow(x, y, R, dh, l, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, col(dh, l, a)); g.addColorStop(.4, col(dh, l - 8, a * .35)); g.addColorStop(1, col(dh, l - 15, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  }
  function disc(x, y, R, dh, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, col(dh, 52, a * .7)); g.addColorStop(.75, col(dh, 54, a)); g.addColorStop(1, col(dh, 50, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  }

  /* U = 14 design genes derived from the seed; every style reads its layout from them */
  const m = (i, a, b) => a + U[i] * (b - a);

  function dust() {
    const mode = Math.floor(U[3] * 5), bw = m(4, .05, .15), nc = m(5, 90, 220) * D, nb = m(6, 80, 380) * D;
    const bs = m(7, .6, 1.6), wv = m(8, 0, .06), cs = m(9, .6, 1.5), ph = rnd(0, TAU);
    const wt = x => { const e = Math.abs(2 * x / W - 1), l = 1 - x / W;
      return mode === 0 ? .12 + .88 * Math.pow(e, 1.6) : mode === 1 ? .12 + .88 * Math.pow(1 - e, 1.6)
        : mode === 2 ? .1 + .9 * Math.pow(l, 1.5) : mode === 3 ? .1 + .9 * Math.pow(1 - l, 1.5) : .6; };
    const px = () => { let x; do { x = Math.random() * W; } while (Math.random() > wt(x)); return x; };
    const py = x => H / 2 + Math.sin(x / W * 6.28 + ph) * H * wv + gauss() * H * bw * (.6 + .8 * wt(x));
    for (let i = 0; i < nb; i++) { const x = Math.random() < .35 ? Math.random() * W : px();
      disc(x, py(x), (6 + Math.pow(Math.random(), 2) * 30) * s * bs, rnd(-5, 5), rnd(.05, .22) * (.5 + wt(x))); }
    for (let c = 0; c < nc; c++) {
      const cx = px(), cy = py(cx), r = rnd(15, 70) * s * cs, b = rnd(.5, 1);
      const k = Math.round(rnd(60, 260) * D * (.4 + wt(cx)) * s * s);
      for (let i = 0; i < k; i++) dot(cx + gauss() * r, cy + gauss() * r * .8, rnd(.5, 1.7) * s, rnd(-4, 8), rnd(50, 68), rnd(.35, 1) * b);
    }
    for (let i = 0, n = 120 * D; i < n; i++) { const x = px(); glow(x, py(x), rnd(4, 14) * s, 3, 62, .9); }
  }

  function bead(x, y) { glow(x, y, rnd(5, 8) * s, 0, 70, .55); dot(x, y, rnd(1.2, 2) * s, 0, 92, .95); }
  function lights() {
    const sw = Math.floor(m(3, 2, 7)), st = Math.floor(m(4, 1, 5.99)), sg = m(5, .07, .16), top = H * m(6, .05, .18);
    const rows = Math.floor(m(7, 0, 3.99)), am = m(8, 0, .04), bd = m(9, .6, 1.4);
    for (let k = 0; k < sw; k++) {
      const x0 = W * k / sw, x1 = W * (k + 1) / sw;
      for (let j = 0; j < st; j++) {
        const sag = H * (sg + .035 * j) * rnd(.9, 1.1), n = Math.round(240 * D * bd / sw);
        const pos = t => [x0 + (x1 - x0) * t, top + sag * 4 * t * (1 - t)];
        ctx.strokeStyle = col(0, 60, .12); ctx.lineWidth = s; ctx.beginPath();
        for (let i = 0; i <= n; i++) { const [x, y] = pos(i / n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        for (let i = 0; i <= n; i++) { const [x, y] = pos(i / n); bead(x + rnd(-1, 1) * s, y); }
      }
    }
    for (let r = 0; r < rows; r++) {
      const y0 = H * (.62 + .11 * r), amp = r % 2 ? 0 : H * am, f = rnd(1, 3), ph = rnd(0, TAU);
      const n = Math.round(70 * D * bd), xa = W * rnd(.03, .1), xb = W * rnd(.9, .97);
      for (let i = 0; i <= n; i++) { const x = xa + (xb - xa) * i / n; bead(x, y0 + Math.sin(x / W * f * TAU + ph) * amp); }
    }
  }

  function sparkle() {
    const cy = H * m(3, .35, .65), th = m(4, .02, .09), wv = m(5, 0, .05), fs = m(6, .6, 1.5), th2 = m(8, 2, 4) * s;
    const n = Math.round((420 * s * s * .6 + 300) * D * m(7, .5, 1.5)), ph = rnd(0, TAU);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = cy + gauss() * H * th + Math.sin(x / W * 9 + ph) * H * wv;
      const r = Math.pow(Math.random(), 2) * 4.5 * s + 1.2 * s;
      glow(x, y, r * 3, 0, 68, .6); dot(x, y, r * .5, 0, 94, 1);
      if (r > th2) {
        const L = r * rnd(5, 9) * fs;
        ctx.strokeStyle = col(0, 80, .55); ctx.lineWidth = Math.max(1, s * .9); ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
      }
    }
  }

  function fire() {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * m(3, .16, .3), wisp = m(4, .2, .45), lob = Math.round(m(5, 2, 9));
    const am = m(6, .02, .09), sm = m(7, 10, 60) * D, p1 = rnd(0, TAU), p2 = rnd(0, TAU);
    const rr = a => R * (1 + am * Math.sin(a * lob + p1) + am * .6 * Math.sin(a * (lob + 4) + p2));
    for (let i = 0; i < sm; i++) {
      const a = rnd(0, TAU), r = rr(a) + gauss() * R * .15;
      glow(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rnd(30, 90) * s, -8, 40, .05);
    }
    for (let i = 0, n = Math.round(70000 * D * s * s); i < n; i++) {
      const a = rnd(0, TAU), core = Math.random() < .4;
      const d = core ? gauss() * R * .05 : Math.abs(gauss()) * R * wisp * (Math.random() < .7 ? 1 : -.4);
      const r = rr(a) + d, t = Math.min(1, Math.abs(d) / (R * wisp * 1.1));
      dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rnd(.6, 1.8) * s, -t * 30 + 10, 68 - t * 28, (1 - t * .7) * rnd(.3, 1));
    }
  }

  function glitter() {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * m(3, .2, .36), sp = m(4, .08, .3), cs = m(5, 0, .95), al = m(6, .5, 2.5), a0 = m(7, 0, TAU);
    const wt = a => 1 - cs + cs * (.5 + .5 * Math.cos(a - a0));
    for (let i = 0, n = Math.round(35000 * D * s * s); i < n; i++) {
      let a; do { a = rnd(0, TAU); } while (Math.random() > wt(a));
      const out = Math.random() < .7 ? Math.abs(gauss()) * R * sp : gauss() * R * .03;
      const r = R + out * (.4 + wt(a));
      dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rnd(.5, 1.6) * s, rnd(-8, 12), rnd(55, 88), rnd(.3, 1) * wt(a));
    }
    ctx.shadowColor = col(0, 60, 1); ctx.shadowBlur = 25 * s; ctx.lineCap = 'round';
    for (let w = 0; w < 3; w++) {
      ctx.strokeStyle = col(0, w ? 70 : 90, w ? .35 : .9); ctx.lineWidth = (w ? 8 - w * 2 : 2.5) * s;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0 - al, a0 + al); ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function field() {
    const ang = m(3, -1.2, -.2), wid = m(4, .1, .3), ds = m(5, .5, 1.5), nb = m(6, 60, 320) * D, bs = m(7, .6, 1.8);
    const ca = Math.cos(ang), sa = Math.sin(ang), L = W * .9;
    const pt = () => { const t = rnd(-.5, .5) * L, o = gauss() * H * wid;
      return [W / 2 + t * ca - o * sa, H / 2 + t * sa + o * ca, Math.abs(o) / (H * wid)]; };
    for (let i = 0; i < nb; i++) { const [x, y, d] = pt(); disc(x, y, rnd(10, 45) * s * bs, rnd(-8, 8), rnd(.02, .09) / (.5 + d * .3)); }
    for (let i = 0, n = Math.round(20000 * D * s * s * ds); i < n; i++) {
      const [x, y, d] = pt();
      dot(x, y, rnd(.5, 1.7) * s, rnd(-6, 6), rnd(68, 92), Math.max(.05, 1 - d * .6) * rnd(.2, 1));
      if (Math.random() < .004) glow(x, y, rnd(4, 9) * s, 0, 80, .7);
    }
  }

  const cross = (x, y, L, a) => { ctx.strokeStyle = col(0, 82, a); ctx.lineWidth = Math.max(1, s); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke(); };
  const RX = () => Math.random() * W, RY = () => Math.random() * H;

  function snow() {
    const n = Math.round(m(3, 300, 900) * D * s * s * 1.5), bs = m(4, .6, 1.6);
    for (let i = 0; i < n; i++) { const z = Math.random(), x = RX(), y = RY();
      z < .12 ? disc(x, y, rnd(8, 34) * s * bs, rnd(-6, 6), rnd(.04, .16)) : dot(x, y, (.6 + z * 2) * s, rnd(-6, 6), rnd(75, 95), rnd(.3, 1)); }
  }
  function fireflies() {
    const n = Math.round(m(3, 40, 160) * D), sz = m(4, .6, 1.6);
    for (let i = 0; i < n * 8; i++) dot(RX(), RY(), rnd(.5, 1.2) * s, rnd(-5, 5), rnd(60, 80), rnd(.1, .4));
    for (let i = 0; i < n; i++) { const x = RX(), y = RY(); glow(x, y, rnd(14, 46) * s * sz, rnd(-8, 8), 60, rnd(.3, .8)); dot(x, y, rnd(1.5, 3) * s, 0, 90, 1); }
  }
  function stars() {
    const ang = m(3, -.8, .8), wid = m(4, .08, .2), ca = Math.cos(ang), sa = Math.sin(ang);
    const pt = b => { const t = rnd(-.6, .6) * W, o = b ? gauss() * H * wid : rnd(-.5, .5) * H; return [W / 2 + t * ca - o * sa, H / 2 + t * sa + o * ca]; };
    for (let i = 0, n = Math.round(4500 * D * s * s); i < n; i++) { const [x, y] = pt(i % 3 > 0); dot(x, y, rnd(.4, 1.2) * s, rnd(-10, 10), rnd(70, 95), rnd(.2, 1)); }
    for (let i = 0, n = 60 * D; i < n; i++) { const [x, y] = pt(Math.random() < .5), r = rnd(1.5, 3.5) * s;
      glow(x, y, r * 4, 0, 70, .5); dot(x, y, r * .5, 0, 95, 1); cross(x, y, r * rnd(6, 12), .5); }
  }
  function spiral() {
    const cx = W / 2, cy = H / 2, Rm = Math.min(W, H) * m(4, .35, .5), arms = Math.floor(m(3, 2, 6)), tw = m(5, 2, 6);
    glow(cx, cy, Rm * .3, 0, 70, .5);
    for (let i = 0, n = Math.round(15000 * D * s * s); i < n; i++) {
      const u = Math.pow(Math.random(), .7), r = u * Rm, a = Math.floor(Math.random() * arms) * TAU / arms + u * tw + gauss() * .18 * (1.2 - u);
      dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rnd(.5, 1.6) * s, rnd(-8, 10), rnd(55, 90), rnd(.2, 1) * (1 - u * .5));
    }
  }
  function burst() {
    for (let b = 0, nb = Math.floor(m(3, 1, 4.99)); b < nb; b++) {
      const cx = W * rnd(.2, .8), cy = H * rnd(.25, .7), R = Math.min(W, H) * rnd(.15, .32), n = Math.round(m(4, 120, 300) * D), dh = rnd(-30, 30);
      glow(cx, cy, R * .4, dh, 75, .35);
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), L = R * rnd(.4, 1);
        for (let k = 0; k < 14; k++) { const t = k / 14, r = L * t; dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r + t * t * R * .15, rnd(.8, 2.2) * s * (1 - t * .5), dh, rnd(60, 85), (1 - t) * .9); } }
    }
  }
  function aurora() {
    const cn = Math.floor(m(3, 2, 5)), top = m(4, .2, .45), ln = m(5, .25, .45), f = rnd(1, 2.5);
    for (let c = 0; c < cn; c++) {
      const ph = rnd(0, TAU), p2 = rnd(0, TAU), dh = c * 28 - 28;
      for (let x = 0; x < W; x += 3 * s) {
        const yT = H * (top + .08 * Math.sin(x / W * TAU * f + ph) + .04 * Math.sin(x / W * TAU * f * 2.3 + p2)) + c * H * .04;
        const len = H * ln * (.6 + .4 * Math.sin(x / W * TAU * 3 + p2)), g = ctx.createLinearGradient(0, yT, 0, yT + len);
        g.addColorStop(0, col(dh, 55, 0)); g.addColorStop(.15, col(dh, 55, rnd(.12, .3))); g.addColorStop(1, col(dh, 40, 0));
        ctx.fillStyle = g; ctx.fillRect(x, yT, 3 * s, len);
      }
    }
    for (let i = 0, n = 700 * D; i < n; i++) dot(RX(), RY() * .6, rnd(.4, 1.1) * s, 0, 90, rnd(.2, .9));
  }
  function rays() {
    const cx = W * rnd(.3, .7), cy = H * rnd(.15, .5), n = Math.floor(m(3, 20, 80));
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), w = rnd(.005, .03), L = W, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * .7);
      g.addColorStop(0, col(0, 70, rnd(.08, .3))); g.addColorStop(1, col(0, 60, 0)); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - w) * L, cy + Math.sin(a - w) * L); ctx.lineTo(cx + Math.cos(a + w) * L, cy + Math.sin(a + w) * L); ctx.fill();
    }
    glow(cx, cy, H * m(4, .15, .4), 0, 80, .7); glow(cx, cy, H * .05, 0, 95, 1);
    for (let i = 0, k = 1500 * D; i < k; i++) dot(RX(), RY(), rnd(.4, 1.2) * s, 0, 85, rnd(.1, .6));
  }
  function network() {
    const n = Math.floor(m(3, 60, 160) * D), md = W * m(4, .07, .15), P = [];
    for (let i = 0; i < n; i++) P.push([RX(), RY()]);
    ctx.lineWidth = s;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
      if (d < md) { ctx.strokeStyle = col(0, 65, (1 - d / md) * .45); ctx.beginPath(); ctx.moveTo(...P[i]); ctx.lineTo(...P[j]); ctx.stroke(); } }
    P.forEach(([x, y]) => { glow(x, y, rnd(6, 14) * s, 0, 65, .6); dot(x, y, rnd(1.5, 3) * s, 0, 92, 1); });
  }
  function waves() {
    const nr = Math.floor(m(3, 3, 9)), sp = m(4, .004, .02);
    for (let r = 0; r < nr; r++) {
      const base = H * rnd(.3, .7), amp = H * rnd(.04, .16), f = rnd(1, 3.5) * TAU / W, ph = rnd(0, TAU), n = Math.round(2500 * D * s), dh = rnd(-10, 10);
      for (let i = 0; i < n; i++) { const x = RX(), y = base + amp * Math.sin(x * f + ph) + gauss() * H * sp;
        dot(x, y, rnd(.5, 1.5) * s, dh, rnd(55, 85), rnd(.3, 1)); if (Math.random() < .01) glow(x, y, rnd(5, 12) * s, dh, 70, .6); }
    }
  }
  function streaks() {
    const n = Math.floor(m(3, 60, 200) * D), ang = m(4, .3, 1.2);
    for (let i = 0; i < n; i++) {
      const x = RX(), y = RY(), L = rnd(.04, .22) * W, x2 = x + Math.cos(ang) * L, y2 = y + Math.sin(ang) * L;
      const g = ctx.createLinearGradient(x, y, x2, y2); g.addColorStop(0, col(0, 60, 0)); g.addColorStop(1, col(0, 80, rnd(.4, 1)));
      ctx.strokeStyle = g; ctx.lineWidth = rnd(1, 3) * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      glow(x2, y2, rnd(4, 10) * s, 0, 75, .7);
    }
  }
  function confetti() {
    const n = Math.round(m(3, 300, 800) * D * s * s), sp = m(4, 30, 360);
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.translate(RX(), RY()); ctx.rotate(rnd(0, TAU));
      ctx.fillStyle = `hsla(${h + rnd(-sp / 2, sp / 2)},${S}%,${rnd(50, 70)}%,.85)`;
      const w = rnd(4, 11) * s; ctx.fillRect(-w / 2, -w / 4, w, w / 2); ctx.restore();
    }
  }
  function bubbles() {
    for (let i = 0, n = Math.floor(m(3, 40, 140) * D); i < n; i++) {
      const x = RX(), y = RY(), r = rnd(8, 60) * s * m(4, .7, 1.5);
      const g = ctx.createRadialGradient(x, y, r * .6, x, y, r); g.addColorStop(0, col(0, 60, 0)); g.addColorStop(.9, col(0, 65, .18)); g.addColorStop(1, col(0, 80, .5));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = col(0, 90, .7); ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(x, y, r * .72, -2.3, -1.4); ctx.stroke();
    }
  }

  /* light-effect overlays: flares, sunrays, spotlights, bulbs, starbursts */
  function streak(cx, cy, len, k = 1) {
    [[.03, .9], [.08, .45], [.22, .2]].forEach(([sy, a]) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(1, sy); glow(0, 0, len, 0, 68, a * k); ctx.restore(); });
    const g = ctx.createLinearGradient(cx - len, 0, cx + len, 0);
    g.addColorStop(0, col(0, 70, 0)); g.addColorStop(.5, col(0, 92, k)); g.addColorStop(1, col(0, 70, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - len, cy - s * 1.2, len * 2, s * 2.4);
  }
  function flare() {
    const cx = W * m(3, .35, .65), cy = H * m(4, .4, .6), len = Math.max(W, H) * m(5, .22, .4);
    streak(cx, cy, len, 1); streak(cx, cy, len * .5, .6);
    for (let i = 0, n = m(7, 15, 40) * D; i < n; i++) {
      const x = cx + gauss() * len * .35, y = cy + gauss() * H * .06, R = rnd(3, 16) * s, dh = rnd(-30, 30);
      Math.random() < .3 ? glow(x, y, R * 1.6, dh, 65, .5) : disc(x, y, R, dh, rnd(.08, .35));
    }
    for (let i = 0, n = 500 * D; i < n; i++) dot(cx + gauss() * len * .4, cy + gauss() * H * .05, rnd(.4, 1.2) * s, 0, 85, rnd(.2, .8));
  }
  function sunrays() {
    const left = U[3] < .5, ox = W * (left ? rnd(-.05, .12) : rnd(.88, 1.05)), oy = H * rnd(-.08, .12);
    const base = Math.atan2(H * .6 - oy, W / 2 - ox), n = Math.floor(m(4, 25, 60));
    glow(ox, oy, Math.max(W, H) * .9, 0, 55, .22);
    for (let i = 0; i < n; i++) {
      const a = base + rnd(-.9, .9), L = Math.hypot(W, H) * 1.2, x2 = ox + Math.cos(a) * L, y2 = oy + Math.sin(a) * L;
      const g = ctx.createLinearGradient(ox, oy, x2, y2); g.addColorStop(0, col(0, 75, rnd(.15, .5))); g.addColorStop(.7, col(0, 60, .05)); g.addColorStop(1, col(0, 55, 0));
      ctx.strokeStyle = g; ctx.lineWidth = rnd(2, 18) * s; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x2, y2); ctx.stroke();
    }
    glow(ox, oy, H * .45, 0, 80, .85); glow(ox, oy, H * .12, 0, 96, 1);
  }
  function spotlights() {
    const n = Math.floor(m(3, 3, 8)), ty = H * .86;
    for (let i = 0; i < n; i++) {
      const q = n > 1 ? i / (n - 1) : .5, sx = W * (.2 + .6 * q), sy = H * (.32 - .18 * Math.sin(Math.PI * q)), w = H * .05;
      const tx = W / 2 + (sx - W / 2) * .12, dh = i % 2 ? -80 : 0;
      const g = ctx.createLinearGradient(sx, sy, tx, ty); g.addColorStop(0, col(dh, 62, .65)); g.addColorStop(1, col(dh, 50, .12));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - w, sy); ctx.lineTo(sx + w, sy); ctx.lineTo(tx + w * .2, ty); ctx.lineTo(tx - w * .2, ty); ctx.fill();
      ctx.fillStyle = col(dh, 88, .95); ctx.beginPath(); ctx.ellipse(sx, sy, w, w * .28, 0, 0, TAU); ctx.fill();
    }
    streak(W / 2, ty, Math.max(W, H) * .1, .9);
  }
  function bulb(x, y, dh) {
    glow(x, y + 7 * s, rnd(15, 22) * s, dh, 60, .5);
    ctx.fillStyle = col(dh, 68, .95); ctx.beginPath(); ctx.ellipse(x, y + 8 * s, 4.5 * s, 7.5 * s, 0, 0, TAU); ctx.fill();
    dot(x - s, y + 5 * s, 1.4 * s, 0, 95, .9);
  }
  function strings(multi) {
    const ns = Math.floor(m(3, 4, 9)), sp = m(4, .8, 1.4), cols = [-45, 85, 170, 0];
    for (let k = 0; k < ns; k++) {
      const x0 = rnd(-.05, .6) * W, x1 = x0 + rnd(.35, .75) * W, y0 = rnd(-.04, .18) * H, y1 = rnd(-.02, .3) * H;
      const cx = (x0 + x1) / 2, cy = Math.max(y0, y1) + H * rnd(.2, .45);
      const P = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
      ctx.strokeStyle = multi ? 'rgba(110,110,110,.55)' : col(0, 60, .18); ctx.lineWidth = 1.2 * s; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const [x, y] = P(i / 60); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      for (let i = 0, n = Math.round((multi ? 16 : 30) * D * sp); i <= n; i++) {
        const [x, y] = P((i + rnd(-.2, .2)) / n);
        multi ? bulb(x, y, cols[Math.floor(Math.random() * 4)]) : bead(x, y);
      }
    }
  }
  function starburst() {
    const n = Math.floor(m(3, 3, 6)), R0 = Math.min(W, H) * .2;
    for (let i = 0; i < n; i++) {
      const x = W * (i + .5) / n + rnd(-.03, .03) * W, y = H * rnd(.42, .58), R = R0 * rnd(.5, 1.1);
      glow(x, y, R * .5, 0, 80, .5); glow(x, y, R * .15, 0, 96, 1);
      for (let r = 0, k = Math.round(rnd(10, 20)); r < k; r++) {
        const a = rnd(0, TAU), L = R * rnd(.4, 1.3), g = ctx.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
        g.addColorStop(0, col(0, 92, .9)); g.addColorStop(1, col(0, 70, 0));
        ctx.strokeStyle = g; ctx.lineWidth = rnd(.8, 2.2) * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
      }
    }
  }
  function hflares() {
    const cn = Math.floor(m(3, 2, 4.99)), rn = Math.floor(m(4, 2, 4.99));
    for (let r = 0; r < rn; r++) for (let c = 0; c < cn; c++)
      streak(W * (c + .5) / cn + rnd(-.03, .03) * W, H * (r + .5) / rn + rnd(-.03, .03) * H, W / cn * rnd(.25, .42), rnd(.5, 1));
  }

  /* ---- niche / seasonal engines ---- */
  function lanterns() {
    const n = Math.floor(m(3, 8, 22) * D), sz = m(4, .8, 1.3);
    for (let i = 0; i < n; i++) {
      const z = Math.pow(Math.random(), 1.5), x = RX(), y = H * (.05 + Math.random() * .9), w = (14 + z * 50) * s * sz, hh = w * 1.25, dh = rnd(-8, 8);
      glow(x, y, w * 3, dh, 55, .28);
      ctx.strokeStyle = col(dh, 40, .5); ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(x, y - hh - w * 1.6); ctx.lineTo(x, y - hh); ctx.moveTo(x, y + hh); ctx.lineTo(x, y + hh + w * .7); ctx.stroke();
      const g = ctx.createLinearGradient(x, y - hh, x, y + hh); g.addColorStop(0, col(dh, 40, .9)); g.addColorStop(.5, col(dh, 66, 1)); g.addColorStop(1, col(dh, 38, .9));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w, hh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col(dh, 30, .9); ctx.fillRect(x - w * .45, y - hh - w * .1, w * .9, w * .18); ctx.fillRect(x - w * .45, y + hh - w * .08, w * .9, w * .16);
      ctx.strokeStyle = col(dh, 85, .35); [.35, .7].forEach(k => { ctx.beginPath(); ctx.ellipse(x, y, w * k, hh, 0, 0, TAU); ctx.stroke(); });
    }
    for (let i = 0, k = 700 * D; i < k; i++) dot(RX(), RY(), rnd(.4, 1.2) * s, rnd(-6, 6), rnd(65, 90), rnd(.15, .6));
  }
  function heartPath(x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x - r * 1.3, y + r * .1, x - r * .9, y - r, x, y - r * .35);
    ctx.bezierCurveTo(x + r * .9, y - r, x + r * 1.3, y + r * .1, x, y + r);
  }
  function hearts() {
    const n = Math.round(m(3, 25, 70) * D), sz = m(4, .8, 1.3);
    for (let i = 0; i < n; i++) {
      const z = Math.pow(Math.random(), 1.6), r = (8 + z * 60) * s * sz, x = RX(), y = RY(), dh = rnd(-12, 12), soft = z > .6;
      glow(x, y, r * 2.6, dh, 55, .22); heartPath(x, y, r);
      const g = ctx.createRadialGradient(x, y - r * .2, 0, x, y, r * 1.2); g.addColorStop(0, col(dh, 75, soft ? .4 : .95)); g.addColorStop(1, col(dh, 48, soft ? .2 : .6));
      ctx.fillStyle = g; ctx.fill();
    }
    for (let i = 0, k = 600 * D; i < k; i++) dot(RX(), RY(), rnd(.4, 1.2) * s, rnd(-8, 8), rnd(70, 92), rnd(.15, .6));
  }
  function moon(cres) {
    const cx = W * rnd(.3, .7), cy = H * rnd(.25, .45), R = Math.min(W, H) * m(3, .12, .22);
    glow(cx, cy, R * 4, 0, 55, .3); glow(cx, cy, R * 2, 0, 70, cres ? .06 : .35);
    for (let i = 0, n = 900 * D * s * s; i < n; i++) dot(RX(), H * Math.random() * .85, rnd(.4, 1.3) * s, 0, 88, rnd(.2, .9));
    for (let i = 0; i < 14 * D; i++) glow(RX(), RY() * .9, rnd(4, 9) * s, 0, 80, .6);
    if (cres) {
      ctx.fillStyle = col(0, 82, .96); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.arc(cx + R * .24, cy - R * .06, R * .78, 0, TAU); ctx.fill('evenodd');
      glow(cx + R * 1.15, cy - R * .1, R * .18, 0, 85, .9); cross(cx + R * 1.15, cy - R * .1, R * .28, .8);
    } else {
      const g = ctx.createRadialGradient(cx - R * .25, cy - R * .25, R * .1, cx, cy, R); g.addColorStop(0, col(0, 94, 1)); g.addColorStop(1, col(0, 62, 1));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(RX(), H * rnd(.6, .95)); ctx.scale(1, .25); glow(0, 0, rnd(.15, .35) * W, rnd(-10, 10), 40, .08); ctx.restore(); }
  }
  function frame() {
    const wd = m(3, .04, .12) * Math.min(W, H), n = Math.round(7000 * D * s * s);
    const pt = () => { const sd = Math.floor(Math.random() * 4), a = Math.random(), ins = Math.abs(gauss()) * wd;
      return [[a * W, ins], [a * W, H - ins], [ins, a * H], [W - ins, a * H]][sd].concat(ins); };
    for (let i = 0; i < n; i++) { const [x, y, ins] = pt(); dot(x, y, rnd(.5, 1.7) * s, rnd(-6, 8), rnd(55, 88), Math.max(.1, 1 - ins / (wd * 2.5)) * rnd(.3, 1)); }
    for (let i = 0, k = 90 * D; i < k; i++) { const [x, y] = pt(); disc(x, y, rnd(8, 30) * s, rnd(-6, 6), rnd(.06, .25)); }
    for (let i = 0, k = 40 * D; i < k; i++) { const [x, y] = pt(); glow(x, y, rnd(4, 12) * s, 3, 65, .9); }
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => glow(x, y, wd * 3, 0, 60, .4));
  }
  function snowflakes() {
    for (let i = 0, n = m(3, 25, 70) * D; i < n; i++) {
      const z = Math.pow(Math.random(), 1.3), r = (10 + z * 40) * s, x = RX(), y = RY(), rot = rnd(0, TAU);
      glow(x, y, r * 1.8, 0, 70, .2); ctx.strokeStyle = col(0, 88, rnd(.4, .9)); ctx.lineWidth = Math.max(1, r * .07); ctx.lineCap = 'round'; ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const t = rot + a * TAU / 6; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r);
        [.45, .7].forEach(b => { const bx = x + Math.cos(t) * r * b, by = y + Math.sin(t) * r * b, l = r * .28;
          [.8, -.8].forEach(o => { ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(t + o) * l, by + Math.sin(t + o) * l); }); });
      }
      ctx.stroke();
    }
    for (let i = 0, k = 500 * D * s * s; i < k; i++) dot(RX(), RY(), rnd(.5, 1.6) * s, 0, 92, rnd(.2, .8));
  }

  /* ---- more engines: falling petals/leaves, rain, mist ---- */
  function fall(leaf) {
    const n = Math.round(m(3, 40, 110) * D), sz = m(4, .8, 1.3);
    for (let i = 0; i < n; i++) {
      const z = Math.pow(Math.random(), 1.4), r = (9 + z * 34) * s * sz, x = RX(), y = RY(), dh = leaf ? rnd(-18, 14) : rnd(-14, 14), soft = z > .65;
      glow(x, y, r * 2.2, dh, 55, .15);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd(0, TAU));
      const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, col(dh, 78, soft ? .35 : .9)); g.addColorStop(1, col(dh, 48, soft ? .2 : .6));
      ctx.fillStyle = g; ctx.beginPath();
      if (leaf) { ctx.moveTo(0, -r); ctx.bezierCurveTo(r * .9, -r * .4, r * .7, r * .6, 0, r); ctx.bezierCurveTo(-r * .7, r * .6, -r * .9, -r * .4, 0, -r); }
      else { ctx.moveTo(0, r); ctx.bezierCurveTo(r * 1.1, r * .2, r * .8, -r * .9, 0, -r * .7); ctx.bezierCurveTo(-r * .8, -r * .9, -r * 1.1, r * .2, 0, r); }
      ctx.fill();
      if (leaf && !soft) { ctx.strokeStyle = col(dh, 30, .5); ctx.lineWidth = Math.max(1, s * .8); ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); }
      ctx.restore();
    }
    for (let i = 0, k = 500 * D * s * s; i < k; i++) dot(RX(), RY(), rnd(.4, 1.2) * s, 0, 85, rnd(.15, .5));
  }
  function rain() {
    const n = Math.round(m(3, 250, 800) * D * s), tilt = m(4, -.25, .25);
    for (let i = 0; i < n; i++) {
      const x = RX(), y = RY(), L = rnd(25, 110) * s, x2 = x + tilt * L, y2 = y + L;
      const g = ctx.createLinearGradient(x, y, x2, y2); g.addColorStop(0, col(0, 75, 0)); g.addColorStop(1, col(0, 80, rnd(.15, .6)));
      ctx.strokeStyle = g; ctx.lineWidth = rnd(.8, 2.2) * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (let i = 0, k = 70 * D; i < k; i++) disc(RX(), RY(), rnd(8, 34) * s, rnd(-10, 10), rnd(.04, .16));
    for (let i = 0, k = 600 * D * s * s; i < k; i++) dot(RX(), RY(), rnd(.4, 1.2) * s, 0, 90, rnd(.2, .7));
  }
  function mist() {
    for (let i = 0, n = Math.round(m(3, 10, 28)); i < n; i++) {
      ctx.save(); ctx.translate(RX(), H * rnd(.1, .95)); ctx.scale(1, rnd(.15, .4)); glow(0, 0, rnd(.15, .45) * W, rnd(-15, 15), 45, rnd(.06, .16)); ctx.restore();
    }
    for (let i = 0, k = 1200 * D * s * s; i < k; i++) dot(RX(), RY(), rnd(.4, 1.4) * s, rnd(-10, 10), rnd(70, 92), rnd(.15, .7));
    for (let i = 0, k = 40 * D; i < k; i++) disc(RX(), RY(), rnd(8, 30) * s, rnd(-10, 10), rnd(.04, .14));
  }

  const ENG = { dust, lights, sparkle, fire, glitter, field, snow, fireflies, stars, spiral, burst, aurora, rays, network, waves, streaks, confetti, bubbles,
    flare, sunrays, spotlights, xmas: () => strings(true), net: () => strings(false), starburst, hflares,
    lanterns, hearts, moon: () => moon(false), crescent: () => moon(true), frame, snowflakes,
    sale: () => { rays(); streaks(); }, lux: () => { dust(); flare(); }, party: () => { confetti(); burst(); },
    tech: () => { network(); waves(); }, wedding: () => { strings(false); field(); },
    petals: () => fall(false), leaves: () => fall(true), rain, mist };
  const BAND = ['dust', 'sparkle', 'waves'], RING = ['fire', 'glitter', 'spiral', 'burst'];
  const PRESETS = `dust1|Golden dust|dust|45|95|0
  dust2|Silver dust|dust|215|8|0
  dust3|Rose-gold dust|dust|12|65|0
  dust4|Ice-blue dust|dust|195|85|0
  lights1|Warm fairy lights|lights|44|70|0
  lights2|Cool fairy lights|lights|200|55|0
  lights3|Pink fairy lights|lights|330|65|0
  sparkle1|Champagne sparkle|sparkle|40|65|0
  sparkle2|Ice sparkle|sparkle|195|45|0
  sparkle3|Red sparkle|sparkle|0|85|0
  sparkle4|Green sparkle|sparkle|135|70|0
  fire1|Fire ring|fire|20|100|0
  fire2|Blue flame ring|fire|205|100|0
  fire3|Green flame ring|fire|130|95|0
  fire4|Purple flame ring|fire|285|90|0
  glitter1|Blue glitter ring|glitter|205|90|0
  glitter2|Gold glitter ring|glitter|45|95|0
  glitter3|Pink glitter ring|glitter|325|85|0
  glitter4|Green glitter ring|glitter|145|85|0
  glitter5|Silver glitter ring|glitter|220|6|0
  field1|Blue bokeh field|field|200|55|1
  field2|Teal bokeh field|field|170|65|1
  field3|Purple bokeh field|field|275|60|1
  field4|Gold bokeh field|field|42|75|1
  snow1|White snow bokeh|snow|210|8|0
  snow2|Golden snow bokeh|snow|45|80|0
  snow3|Blue snow bokeh|snow|205|60|1
  fireflies1|Green fireflies|fireflies|110|85|0
  fireflies2|Yellow fireflies|fireflies|58|90|0
  fireflies3|Pink fireflies|fireflies|320|75|0
  stars1|Milky way|stars|215|20|1
  stars2|Violet starfield|stars|265|45|1
  spiral1|Blue galaxy|spiral|210|75|0
  spiral2|Gold galaxy|spiral|42|85|0
  spiral3|Magenta galaxy|spiral|310|80|0
  burst1|Gold fireworks|burst|45|95|0
  burst2|Red fireworks|burst|355|95|0
  burst3|Blue fireworks|burst|215|90|0
  burst4|Green fireworks|burst|140|90|0
  aurora1|Green aurora|aurora|140|80|1
  aurora2|Purple aurora|aurora|285|75|1
  aurora3|Teal aurora|aurora|175|80|1
  rays1|Golden light rays|rays|45|75|0
  rays2|White light rays|rays|210|10|0
  network1|Cyan network|network|190|85|0
  network2|Gold network|network|45|85|0
  waves1|Blue light waves|waves|205|85|0
  waves2|Gold light waves|waves|45|90|0
  streaks1|Gold light streaks|streaks|45|90|0
  streaks2|Cyan light streaks|streaks|190|90|0
  streaks3|Red light streaks|streaks|5|95|0
  confetti1|Party confetti|confetti|45|90|0
  confetti2|Gold confetti|confetti|45|90|0
  bubbles1|Blue bubbles|bubbles|200|70|1
  bubbles2|Pink bubbles|bubbles|330|60|1
  bubbles3|Golden bubbles|bubbles|45|75|0
  flare1|Blue lens flare|flare|205|70|0
  flare2|Gold lens flare|flare|42|75|0
  flare3|Red lens flare|flare|355|85|0
  sunrays1|Golden sunrays|sunrays|45|65|0
  sunrays2|White sunrays|sunrays|210|8|0
  spot1|Purple-blue spotlights|spotlights|285|60|0
  spot2|Warm spotlights|spotlights|45|70|0
  xmas1|Multicolor bulb lights|xmas|45|70|0
  net1|Warm string-light net|net|44|60|0
  star1|White starbursts|starburst|210|6|0
  star2|Gold starbursts|starburst|45|55|0
  hflare1|Red light streak grid|hflares|355|60|0
  hflare2|Blue light streak grid|hflares|205|70|0
  hflare3|Gold light streak grid|hflares|42|70|0
  diwali1|Diwali lanterns|lanterns|28|95|0|Diwali|diwali,deepavali,festival of lights,hindu festival,india,diya
  diwali2|Diwali sparks|burst|35|100|0|Diwali|diwali,deepavali,festival of lights,hindu festival,india,diya
  diwali3|Diwali string lights|net|32|85|0|Diwali|diwali,deepavali,festival of lights,hindu festival,india,diya
  ramadan1|Ramadan crescent night|crescent|48|70|1|Ramadan & Eid|ramadan,ramadan kareem,eid mubarak,islamic,muslim,holy month,eid
  eid2|Eid lanterns|lanterns|45|85|1|Ramadan & Eid|eid,eid mubarak,eid al fitr,islamic,muslim,celebration,arabic
  eid3|Eid gold sparkle frame|frame|45|85|0|Ramadan & Eid|eid,eid mubarak,eid al fitr,islamic,muslim,celebration,arabic
  xmas2|Christmas snowflakes|snowflakes|205|40|1|Christmas|christmas,xmas,merry christmas,winter,holiday season,december,new year
  xmas3|Christmas red-gold bokeh|field|5|80|1|Christmas|christmas,xmas,merry christmas,winter,holiday season,december,new year
  xmas4|Christmas lights frame|frame|355|80|0|Christmas|christmas,xmas,merry christmas,winter,holiday season,december,new year
  ny1|New Year gold fireworks party|party|45|90|0|New Year|new year,happy new year,new year eve,countdown,2027,celebration,nye
  ny2|New Year blue countdown|party|215|85|0|New Year|new year,happy new year,new year eve,countdown,2027,celebration,nye
  hal1|Halloween full moon|moon|28|90|1|Halloween|halloween,spooky,october,horror,scary,haunted,trick or treat
  hal2|Halloween orange fireflies|fireflies|28|100|1|Halloween|halloween,spooky,october,horror,scary,haunted,trick or treat
  hal3|Halloween purple fog|aurora|275|70|1|Halloween|halloween,spooky,october,horror,scary,haunted,trick or treat
  val1|Valentine floating hearts|hearts|345|85|1|Valentine|valentine,valentines day,love,romantic,february,heart,romance
  val2|Valentine rose-gold sparkle|dust|350|55|0|Valentine|valentine,valentines day,love,romantic,february,heart,romance
  sale1|Black Friday red rays|sale|355|95|0|Sale & Promo|sale,black friday,cyber monday,discount,promotion,offer,shopping
  sale2|Gold sale streaks|sale|45|90|0|Sale & Promo|sale,black friday,cyber monday,discount,promotion,offer,shopping
  wed1|Wedding fairy-light bokeh|wedding|42|55|0|Wedding|wedding,romantic,bride,engagement,love,celebration,reception
  wed2|Wedding silver sparkle frame|frame|215|10|0|Wedding|wedding,romantic,bride,engagement,love,celebration,reception
  party1|Pink party confetti burst|party|330|90|0|Party|party,birthday,celebration,event,confetti,festive,anniversary
  lux1|Luxury gold flare|lux|45|85|0|Luxury|luxury,premium,vip,elegant,exclusive,gold,glamour
  lux2|Platinum luxury glow|lux|215|8|0|Luxury|luxury,premium,vip,elegant,exclusive,gold,glamour
  tech1|AI blue network|tech|205|90|0|Tech & AI|technology,ai,artificial intelligence,network,cyber,digital,data
  tech2|Cyber purple network|tech|280|85|0|Tech & AI|technology,ai,artificial intelligence,network,cyber,digital,data
  fall1|Autumn warm bokeh|field|28|85|1|Autumn|autumn,fall,thanksgiving,harvest,october,november,warm
  lny1|Lunar New Year red lanterns|lanterns|0|90|1|Lunar New Year|lunar new year,chinese new year,red lanterns,spring festival,asian,celebration,china
  frame1|Gold glitter frame|frame|45|95|0|Frames (copy space)|frame,border,copy space,template,glitter frame,empty space,background
  frame2|Blue glitter frame|frame|205|90|0|Frames (copy space)|frame,border,copy space,template,glitter frame,empty space,background
  n1_1|Easter pastel bokeh|field|330|45|1|Easter|easter,easter sunday,spring,pastel,april,egg hunt
  n1_2|Easter spring sparkle|dust|60|50|0|Easter|easter,easter sunday,spring,pastel,april,egg hunt
  n1_3|Easter egg bubbles|bubbles|300|60|1|Easter|easter,easter sunday,spring,pastel,april,egg hunt
  n2_1|Thanksgiving golden leaves|leaves|30|90|1|Thanksgiving|thanksgiving,harvest,november,fall,gratitude,autumn
  n2_2|Thanksgiving warm lights|net|32|80|0|Thanksgiving|thanksgiving,harvest,november,fall,gratitude,autumn
  n3_1|Mother's Day hearts|hearts|335|60|1|Mother's Day|mothers day,mom,love,family,may,flowers
  n3_2|Mother's Day petals|petals|340|55|1|Mother's Day|mothers day,mom,love,family,may,flowers
  n3_3|Mother's Day rose sparkle|dust|350|50|0|Mother's Day|mothers day,mom,love,family,may,flowers
  n4_1|Father's Day navy luxury|lux|215|40|0|Father's Day|fathers day,dad,family,june,gift,celebration
  n4_2|Father's Day blue flare|flare|205|45|0|Father's Day|fathers day,dad,family,june,gift,celebration
  n5_1|Women's Day petals|petals|320|70|1|Women's Day|womens day,march 8,women empowerment,feminine,pink,international womens day
  n5_2|Women's Day pink sparkle|sparkle|300|50|0|Women's Day|womens day,march 8,women empowerment,feminine,pink,international womens day
  n6_1|4th of July red fireworks|burst|355|95|0|Independence Day USA|independence day,4th of july,fourth of july,usa,fireworks,patriotic,american
  n6_2|4th of July blue fireworks|burst|215|90|0|Independence Day USA|independence day,4th of july,fourth of july,usa,fireworks,patriotic,american
  n6_3|Patriotic party burst|party|355|85|0|Independence Day USA|independence day,4th of july,fourth of july,usa,fireworks,patriotic,american
  n7_1|Hanukkah blue stars|stars|215|70|1|Hanukkah|hanukkah,chanukah,jewish,festival of lights,menorah,blue and white
  n7_2|Hanukkah silver glitter|glitter|215|30|0|Hanukkah|hanukkah,chanukah,jewish,festival of lights,menorah,blue and white
  n8_1|Holi color confetti|confetti|320|95|0|Holi|holi,festival of colors,colorful powder,india,gulal,spring festival
  n8_2|Holi pink bursts|burst|300|95|0|Holi|holi,festival of colors,colorful powder,india,gulal,spring festival
  n8_3|Holi color mist|mist|330|90|1|Holi|holi,festival of colors,colorful powder,india,gulal,spring festival
  n9_1|Durga Puja lanterns|lanterns|20|95|1|Durga Puja & Navratri|durga puja,navratri,dussehra,bengali festival,india,bangladesh,goddess
  n9_2|Durga Puja gold sparkle|sparkle|45|90|0|Durga Puja & Navratri|durga puja,navratri,dussehra,bengali festival,india,bangladesh,goddess
  n9_3|Navratri red fireworks|burst|355|95|0|Durga Puja & Navratri|durga puja,navratri,dussehra,bengali festival,india,bangladesh,goddess
  n10_1|Pohela Boishakh red lanterns|lanterns|5|90|1|Pohela Boishakh|pohela boishakh,bengali new year,boishakh,bangladesh,bengal,festival
  n10_2|Boishakh golden dust|dust|40|80|0|Pohela Boishakh|pohela boishakh,bengali new year,boishakh,bangladesh,bengal,festival
  n11_1|Bangladesh green sparkle|sparkle|140|80|0|Bangladesh National Days|bangladesh,victory day,independence day,december 16,march 26,red and green
  n11_2|Bangladesh red fireworks|burst|355|95|0|Bangladesh National Days|bangladesh,victory day,independence day,december 16,march 26,red and green
  n12_1|St Patrick green dust|dust|135|85|0|St Patrick's Day|st patricks day,irish,march 17,green,shamrock,lucky
  n12_2|St Patrick green fireflies|fireflies|130|90|1|St Patrick's Day|st patricks day,irish,march 17,green,shamrock,lucky
  n13_1|Carnival confetti|confetti|45|90|0|Carnival & Festival|carnival,mardi gras,festival,parade,party,masquerade
  n13_2|Festival party burst|party|30|90|0|Carnival & Festival|carnival,mardi gras,festival,parade,party,masquerade
  n14_1|Mid-Autumn full moon|moon|48|70|1|Mid-Autumn Festival|mid autumn festival,moon festival,lunar,chinese,lantern festival,full moon
  n14_2|Mid-Autumn lanterns|lanterns|40|85|1|Mid-Autumn Festival|mid autumn festival,moon festival,lunar,chinese,lantern festival,full moon
  n15_1|Graduation gold confetti|confetti|45|90|0|Graduation & School|graduation,school,education,back to school,class of 2027,achievement,student
  n15_2|Graduation night stars|stars|215|60|1|Graduation & School|graduation,school,education,back to school,class of 2027,achievement,student
  n16_1|Summer sun rays|rays|45|85|0|Summer|summer,sunshine,vacation,holiday,beach,sunny
  n16_2|Summer ocean bubbles|bubbles|190|70|1|Summer|summer,sunshine,vacation,holiday,beach,sunny
  n16_3|Summer golden sunrays|sunrays|35|80|0|Summer|summer,sunshine,vacation,holiday,beach,sunny
  n17_1|Spring blossom petals|petals|330|60|1|Spring|spring,flowers,blossom,fresh,garden,nature
  n17_2|Spring green fireflies|fireflies|95|85|1|Spring|spring,flowers,blossom,fresh,garden,nature
  n17_3|Spring fresh bokeh|field|100|60|1|Spring|spring,flowers,blossom,fresh,garden,nature
  n18_1|Winter frost snow|snow|205|50|1|Winter|winter,cold,ice,frost,snowy,season
  n18_2|Winter aurora night|aurora|190|70|1|Winter|winter,cold,ice,frost,snowy,season
  n19_1|Pride rainbow bubbles|bubbles|300|80|1|Pride|pride,lgbtq,rainbow,diversity,equality,love,june
  n19_2|Pride rainbow confetti|confetti|0|100|0|Pride|pride,lgbtq,rainbow,diversity,equality,love,june
  n20_1|Eco green fireflies|fireflies|130|70|1|Eco & Green Energy|eco,earth day,environment,green energy,sustainability,nature,climate
  n20_2|Eco green bubbles|bubbles|150|60|1|Eco & Green Energy|eco,earth day,environment,green energy,sustainability,nature,climate
  n20_3|Green energy aurora|aurora|150|70|1|Eco & Green Energy|eco,earth day,environment,green energy,sustainability,nature,climate
  n21_1|Crypto gold network|tech|45|85|0|Finance & Crypto|finance,crypto,bitcoin,blockchain,trading,stock market,investment,fintech
  n21_2|Fintech blue waves|waves|190|80|0|Finance & Crypto|finance,crypto,bitcoin,blockchain,trading,stock market,investment,fintech
  n21_3|Stock market green network|tech|140|85|0|Finance & Crypto|finance,crypto,bitcoin,blockchain,trading,stock market,investment,fintech
  n22_1|Real estate gold flare|lux|42|60|0|Real Estate|real estate,property,home,luxury home,investment,architecture
  n22_2|Real estate warm rays|rays|45|60|0|Real Estate|real estate,property,home,luxury home,investment,architecture
  n23_1|Medical blue network|network|200|70|0|Healthcare & Medical|healthcare,medical,health,doctor,hospital,medicine,science,clean
  n23_2|Clean health bubbles|bubbles|190|50|1|Healthcare & Medical|healthcare,medical,health,doctor,hospital,medicine,science,clean
  n23_3|Healthcare light rays|rays|195|40|0|Healthcare & Medical|healthcare,medical,health,doctor,hospital,medicine,science,clean
  n24_1|Science blue network|network|205|80|0|Education & Science|education,science,learning,research,school,knowledge,laboratory
  n24_2|Education night stars|stars|215|50|1|Education & Science|education,science,learning,research,school,knowledge,laboratory
  n25_1|Fitness fire energy|fire|12|95|0|Fitness & Sport|fitness,sport,gym,energy,workout,training,power,athletic
  n25_2|Sport red streaks|streaks|355|90|0|Fitness & Sport|fitness,sport,gym,energy,workout,training,power,athletic
  n25_3|Gym power rays|sale|20|95|0|Fitness & Sport|fitness,sport,gym,energy,workout,training,power,athletic
  n26_1|Restaurant warm lights|net|30|80|0|Food & Restaurant|food,restaurant,cafe,dining,menu,cooking,kitchen,warm
  n26_2|Cafe warm bokeh|field|28|80|1|Food & Restaurant|food,restaurant,cafe,dining,menu,cooking,kitchen,warm
  n27_1|Travel golden rays|sunrays|40|70|0|Travel|travel,tourism,vacation,adventure,journey,trip,holiday
  n27_2|Travel night sky|stars|215|45|1|Travel|travel,tourism,vacation,adventure,journey,trip,holiday
  n28_1|Concert purple spotlights|spotlights|285|70|0|Music & Concert|music,concert,dj,party,nightclub,festival,stage,entertainment
  n28_2|Music color waves|waves|300|85|0|Music & Concert|music,concert,dj,party,nightclub,festival,stage,entertainment
  n28_3|DJ neon streaks|streaks|320|95|0|Music & Concert|music,concert,dj,party,nightclub,festival,stage,entertainment
  n29_1|Esports purple network|tech|280|90|0|Gaming & Esports|gaming,esports,gamer,neon,cyber,futuristic,video game,stream
  n29_2|Gaming green streaks|streaks|150|95|0|Gaming & Esports|gaming,esports,gamer,neon,cyber,futuristic,video game,stream
  n29_3|Gamer purple fire|fire|280|95|0|Gaming & Esports|gaming,esports,gamer,neon,cyber,futuristic,video game,stream
  n30_1|Beauty rose petals|petals|345|50|1|Beauty & Cosmetics|beauty,cosmetics,makeup,skincare,glamour,elegant,fashion
  n30_2|Rose-gold glamour dust|dust|35|55|0|Beauty & Cosmetics|beauty,cosmetics,makeup,skincare,glamour,elegant,fashion
  n30_3|Beauty pink flare|flare|330|50|0|Beauty & Cosmetics|beauty,cosmetics,makeup,skincare,glamour,elegant,fashion
  n31_1|Diamond starbursts|starburst|215|10|0|Fashion & Jewelry|fashion,jewelry,diamond,glamour,luxury,jewellery,shine,sparkle
  n31_2|Gold jewelry shine|lux|45|80|0|Fashion & Jewelry|fashion,jewelry,diamond,glamour,luxury,jewellery,shine,sparkle
  n32_1|Spa teal mist|mist|170|50|1|Wellness & Spa|wellness,spa,meditation,yoga,relax,calm,zen,mindfulness
  n32_2|Wellness calm bubbles|bubbles|175|50|1|Wellness & Spa|wellness,spa,meditation,yoga,relax,calm,zen,mindfulness
  n32_3|Meditation aurora|aurora|160|60|1|Wellness & Spa|wellness,spa,meditation,yoga,relax,calm,zen,mindfulness
  n33_1|Violet galaxy spiral|spiral|260|70|0|Space & Sci-Fi|space,galaxy,sci-fi,cosmos,universe,astronomy,futuristic
  n33_2|Deep space stars|stars|220|40|1|Space & Sci-Fi|space,galaxy,sci-fi,cosmos,universe,astronomy,futuristic
  n33_3|Sci-fi blue flare|flare|190|80|0|Space & Sci-Fi|space,galaxy,sci-fi,cosmos,universe,astronomy,futuristic
  n34_1|Cyber security green network|network|135|90|0|Cyber Security & Cloud|cybersecurity,security,cloud,data,hacker,network,digital,technology
  n34_2|Cloud tech blue|tech|190|85|0|Cyber Security & Cloud|cybersecurity,security,cloud,data,hacker,network,digital,technology
  n34_3|Data streams|streaks|140|95|0|Cyber Security & Cloud|cybersecurity,security,cloud,data,hacker,network,digital,technology
  n35_1|Social media hearts|hearts|340|90|1|Social Media & Streaming|social media,streaming,influencer,live,likes,content creator,podcast,youtube
  n35_2|Live stream party|party|280|90|0|Social Media & Streaming|social media,streaming,influencer,live,likes,content creator,podcast,youtube
  n36_1|Gold award starbursts|starburst|45|60|0|Awards & Success|awards,success,winner,achievement,trophy,victory,celebration,gold
  n36_2|Winner gold burst|burst|45|90|0|Awards & Success|awards,success,winner,achievement,trophy,victory,celebration,gold
  n36_3|Award sparkle band|sparkle|45|70|0|Awards & Success|awards,success,winner,achievement,trophy,victory,celebration,gold
  n37_1|Nightclub magenta spotlights|spotlights|300|80|0|Nightlife|nightclub,nightlife,club,party,dance,disco,neon
  n37_2|Disco purple flare|flare|280|80|0|Nightlife|nightclub,nightlife,club,party,dance,disco,neon
  n38_1|Baby blue bubbles|bubbles|200|55|1|Kids & Baby|kids,baby,children,birthday,cute,playful,nursery,pastel
  n38_2|Pastel kids confetti|confetti|330|50|0|Kids & Baby|kids,baby,children,birthday,cute,playful,nursery,pastel
  n38_3|Kids yellow fireflies|fireflies|60|80|1|Kids & Baby|kids,baby,children,birthday,cute,playful,nursery,pastel
  n39_1|Blue rain night|rain|205|60|1|Rain & Mood|rain,rainy,mood,moody,stormy,water,drops,atmosphere
  n39_2|Purple neon rain|rain|280|70|1|Rain & Mood|rain,rainy,mood,moody,stormy,water,drops,atmosphere
  n39_3|Moody blue mist|mist|210|40|1|Rain & Mood|rain,rainy,mood,moody,stormy,water,drops,atmosphere
  n40_1|Sunset orange rays|sunrays|25|85|0|Sunset & Golden Hour|sunset,golden hour,evening,warm,sunlight,sunrise,dusk
  n40_2|Golden hour flare|flare|20|80|0|Sunset & Golden Hour|sunset,golden hour,evening,warm,sunlight,sunrise,dusk`.split('\n').map(r => r.split('|').map(x => x.trim()));
  const STYLES = {};
  $('style').innerHTML = '';
  const GROUPS = {};
  PRESETS.forEach(([id, label, e, hh, ss, bg, grp, extra]) => {
    STYLES[id] = [ENG[e], +hh, +ss, bg === '1', e, grp || '', extra || '', extra ? label : ''];
    let target = $('style');
    if (grp) { if (!GROUPS[grp]) { GROUPS[grp] = document.createElement('optgroup'); GROUPS[grp].label = grp; $('style').appendChild(GROUPS[grp]); } target = GROUPS[grp]; }
    target.appendChild(new Option(label, id));
  });

  /* ---- Adobe Stock metadata: title + keywords ---- */
  const ENGDATA = {
    dust: 'glitter dust particles;glitter,dust,particles,sparkle,bokeh,shimmer,magic,festive,luxury,holiday,confetti,stardust',
    lights: 'fairy lights garland;fairy lights,string lights,garland,christmas lights,holiday,festive,celebration,decoration,lamp,bulbs,new year,christmas',
    sparkle: 'sparkling stars glitter band;sparkle,stars,glitter,shine,twinkle,star flare,magic,festive,celebration,shimmer,glint,christmas',
    fire: 'fire ring flame frame;fire,flame,ring,circle,frame,burning,energy,heat,portal,eclipse,smoke,fantasy',
    glitter: 'glitter ring circle frame;glitter,ring,circle,frame,sparkle,particles,eclipse,portal,magic,shimmer,halo,energy',
    field: 'bokeh dust particles;bokeh,dust,particles,defocused,blurred,depth of field,sparkle,magic,floating,cinematic,atmosphere,glitter',
    snow: 'snow bokeh particles;snow,snowfall,bokeh,winter,christmas,defocused,blizzard,falling,particles,cold,holiday,season',
    fireflies: 'glowing fireflies lights;fireflies,glowing,lights,magic,night,fairy,sparks,fantasy,forest,floating,bokeh,glow',
    stars: 'starfield milky way space;stars,starfield,space,milky way,galaxy,night sky,universe,cosmos,astronomy,twinkle,sky,nebula',
    spiral: 'spiral galaxy particles;galaxy,spiral,space,stars,cosmos,universe,vortex,particles,swirl,nebula,astronomy,whirlpool',
    burst: 'fireworks explosion burst;fireworks,explosion,burst,celebration,new year,festival,sparks,party,night,pyrotechnics,holiday,anniversary',
    aurora: 'aurora borealis northern lights;aurora,borealis,northern lights,sky,night,polar,lights,nature,glow,waves,arctic,fantasy',
    rays: 'light rays beams;light rays,beams,sunbeams,shine,glow,radiance,divine,heaven,flare,illumination,spotlight,sun',
    network: 'network connection constellation;network,connection,constellation,nodes,technology,data,digital,web,links,science,cyber,communication',
    waves: 'flowing light waves particles;waves,flow,light trails,particles,curves,wave lines,motion,energy,digital,dynamic,sound,smooth',
    streaks: 'light streaks speed lines;light streaks,speed,motion,meteor,trails,lines,fast,energy,rays,dynamic,hyperspace,glow',
    confetti: 'colorful confetti;confetti,party,celebration,birthday,festive,carnival,holiday,anniversary,fun,colorful,joy,falling',
    bubbles: 'glowing bubbles;bubbles,soap bubbles,transparent,spheres,water,floating,glass,balls,bokeh,underwater,clean,fresh',
    flare: 'lens flare light effect;lens flare,light effect,flash,streak,optical flare,anamorphic,glow,beam,shine,cinematic,highlight,horizontal',
    sunrays: 'sunrays light beams;sunrays,sunlight,sun,beams,light rays,shine,sunshine,flare,warm,morning,glow,radiant',
    spotlights: 'stage spotlights beams;spotlights,stage,beams,concert,show,lights,projector,theater,party,club,entertainment,illumination',
    xmas: 'multicolor christmas bulb lights;christmas lights,bulbs,string lights,colorful,garland,holiday,festive,xmas,decoration,new year,celebration,multicolor',
    net: 'warm string lights;string lights,fairy lights,warm lights,garland,christmas,holiday,festive,decoration,glowing,bulbs,wedding,celebration',
    starburst: 'starburst light glints;starburst,star,glint,flare,shine,glitter,light effect,sparkle,twinkle,flash,bright,rays',
    hflares: 'horizontal light flares;light flares,streaks,horizontal,lens flare,glow,light effect,lines,beams,neon,flash,overlay,shine',
    lanterns: 'glowing paper lanterns;lanterns,paper lanterns,floating lanterns,glowing,festival,celebration,night,lights,traditional,hanging lanterns,decoration,warm',
    hearts: 'glowing hearts;hearts,love,romantic,valentine,heart shape,romance,glowing,bokeh,floating hearts,affection,wedding,february',
    moon: 'full moon night sky;moon,full moon,night,sky,moonlight,stars,mist,fog,dark,mystery,lunar,night sky',
    crescent: 'crescent moon and stars;crescent,crescent moon,moon,stars,night sky,islamic,arabic,religious,night,lunar,sky,glowing',
    frame: 'glitter border frame;frame,border,glitter,sparkle,copy space,empty space,template,edge,decoration,shiny,festive,glow',
    snowflakes: 'glowing snowflakes;snowflakes,snow,winter,christmas,frost,ice,cold,crystal,falling,holiday,season,sparkle',
    sale: 'sale promotion light rays;sale,promotion,discount,black friday,offer,rays,shopping,banner,advertising,beams,retail,marketing',
    lux: 'luxury light flare;luxury,premium,elegant,flare,shine,glamour,rich,vip,exclusive,glow,sophisticated,golden',
    party: 'party celebration confetti fireworks;party,celebration,confetti,fireworks,festive,birthday,new year,event,joy,fun,carnival,anniversary',
    tech: 'technology network connection;technology,network,connection,digital,ai,artificial intelligence,data,cyber,futuristic,science,web,blockchain',
    wedding: 'wedding fairy lights bokeh;wedding,fairy lights,bokeh,romantic,string lights,elegant,celebration,love,soft,glow,party,reception',
    petals: 'floating flower petals;petals,flower petals,blossom,floral,spring,falling petals,romantic,soft,nature,delicate,floral background,botanical',
    leaves: 'falling autumn leaves;leaves,autumn leaves,falling leaves,fall,foliage,autumn,seasonal,nature,golden leaves,maple,harvest,orange',
    rain: 'rain drops light streaks;rain,raindrops,rainy,water,droplets,storm,weather,moody,wet,night rain,drizzle,atmosphere',
    mist: 'soft mist glow;mist,fog,haze,glow,soft light,atmosphere,smoke,ethereal,dreamy,calm,mystical,cloud'
  };
  function colorName() {
    const hh = ((+$('hue').value % 360) + 360) % 360, ss = +$('sat').value;
    if (ss < 15) return ['silver', ['silver', 'white', 'grey']];
    const T = [[15, 'red', ['red', 'crimson']], [40, 'orange', ['orange', 'amber']], [68, 'gold', ['gold', 'golden', 'yellow']],
      [95, 'lime', ['lime', 'yellow green']], [170, 'green', ['green', 'emerald']], [200, 'cyan', ['cyan', 'teal', 'turquoise']],
      [255, 'blue', ['blue', 'navy']], [290, 'purple', ['purple', 'violet']], [345, 'pink', ['pink', 'magenta']], [361, 'red', ['red', 'crimson']]];
    const t = T.find(x => hh < x[0]); return [t[1], t[2]];
  }
  function updateMeta() {
    const st = STYLES[$('style').value], [name, syn] = colorName(), [noun, kw] = ENGDATA[st[4]].split(';');
    const cw = name === 'gold' ? 'Golden' : name[0].toUpperCase() + name.slice(1), bgw = st[3] ? 'dark background' : 'black background';
    const ex = st[6] ? st[6].split(',') : [];
    $('mtitle').value = st[7] ? `${st[7]} background, ${noun} on ${bgw}` : `${cw} ${noun} on ${bgw}, abstract glowing overlay`;
    const keys = [...ex, ...syn, ...kw.split(','), bgw, 'abstract', 'background', 'overlay', 'glowing', 'light', 'bright', 'texture', 'wallpaper', 'decoration', 'design', 'elegant', 'copy space'];
    $('mkeys').value = [...new Set(keys)].slice(0, 49).join(', ');
  }
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function pngChunk(type, data) {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8); dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
  }
  function itxt(kw, text) {
    const e = new TextEncoder(), k = e.encode(kw), t = e.encode(text), d = new Uint8Array(k.length + 5 + t.length);
    d.set(k, 0); d.set(t, k.length + 5); return pngChunk('iTXt', d);   // keyword\0 flag method lang\0 translated\0 text
  }
  function xmpXml(title, keys) {
    const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const kws = keys.split(',').map(k => k.trim()).filter(Boolean), alt = t => `<rdf:Alt><rdf:li xml:lang="x-default">${esc(t)}</rdf:li></rdf:Alt>`;
    return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${alt(title)}</dc:title><dc:description>${alt(title)}</dc:description><dc:subject><rdf:Bag>${kws.map(k => `<rdf:li>${esc(k)}</rdf:li>`).join('')}</rdf:Bag></dc:subject></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  }
  function iptc(title, keys) {   // classic IPTC-IIM (what many stock sites read), wrapped in a Photoshop 8BIM block
    const e = new TextEncoder(), rec = [];
    const add = (ds, txt, max) => { const b = e.encode(txt).slice(0, max); rec.push(Uint8Array.of(0x1C, 2, ds, b.length >> 8, b.length & 255), b); };
    rec.push(Uint8Array.of(0x1C, 1, 0x5A, 0, 3, 0x1B, 0x25, 0x47));   // UTF-8
    add(5, title, 200);
    keys.split(',').map(k => k.trim()).filter(Boolean).slice(0, 64).forEach(k => add(25, k, 64));
    add(120, title, 2000);
    const n = rec.reduce((s, r) => s + r.length, 0), pad = n & 1, head = e.encode('Photoshop 3.0\0'), tag = e.encode('8BIM');
    const out = new Uint8Array(head.length + 4 + 2 + 2 + 4 + n + pad), dv = new DataView(out.buffer);
    out.set(head, 0); out.set(tag, head.length); dv.setUint16(head.length + 4, 0x0404); dv.setUint32(head.length + 8, n);
    let p = head.length + 12; rec.forEach(r => { out.set(r, p); p += r.length; });
    return out;
  }
  async function addMeta(blob, title, keys, jpg) {   // writes title + keywords INTO the image file
    const orig = new Uint8Array(await blob.arrayBuffer()), xml = xmpXml(title, keys), e = new TextEncoder();
    if (jpg) {
      const head = e.encode('http://ns.adobe.com/xap/1.0/\0'), body = e.encode(xml), xmp = new Uint8Array(head.length + body.length);
      xmp.set(head); xmp.set(body, head.length);
      const seg = (mk, p) => { const s = new Uint8Array(4 + p.length); s.set([0xFF, mk, (p.length + 2) >> 8, (p.length + 2) & 255]); s.set(p, 4); return s; };
      const parts = []; if (xmp.length < 65500) parts.push(seg(0xE1, xmp));
      const ip = iptc(title, keys); if (ip.length < 65500) parts.push(seg(0xED, ip));
      let pos = 2; if (orig[2] === 0xFF && orig[3] === 0xE0) pos = 4 + ((orig[4] << 8) | orig[5]);   // keep JFIF first
      return new Blob([orig.slice(0, pos), ...parts, orig.slice(pos)], { type: 'image/jpeg' });
    }
    const chunks = [itxt('XML:com.adobe.xmp', xml), itxt('Title', title), itxt('Description', title)];
    return new Blob([orig.slice(0, 33), ...chunks, orig.slice(33)], { type: 'image/png' });   // after the IHDR chunk
  }
  const saveBlob = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const FLIPY = ['field', 'stars', 'fireflies', 'bubbles', 'mist', 'hearts', 'confetti', 'network', 'waves', 'starburst', 'hflares', 'flare', 'snow', 'petals'];
  const NOMIX = ['confetti', 'xmas'];
  function extraLayer() {   // a random secondary layer so two designs of one style rarely share a structure
    const c = Math.floor(U[14] * 6), st = .4 + U[15] * .9;
    if (c === 1) for (let i = 0, n = 40 * D * st; i < n; i++) disc(RX(), RY(), rnd(8, 34) * s, rnd(-10, 10), rnd(.04, .14));
    else if (c === 2) for (let i = 0, n = 900 * D * st * s * s; i < n; i++) dot(RX(), RY(), rnd(.4, 1.3) * s, rnd(-8, 8), rnd(65, 92), rnd(.15, .7));
    else if (c === 3) for (let i = 0, n = 14 * D * st; i < n; i++) { const x = RX(), y = RY(), r = rnd(1.5, 3.5) * s; glow(x, y, r * 4, 0, 70, .5); dot(x, y, r * .5, 0, 95, 1); cross(x, y, r * rnd(5, 10), .5); }
    else if (c === 4) for (let i = 0, n = 8 * st; i < n; i++) { ctx.save(); ctx.translate(RX(), RY()); ctx.scale(1, rnd(.2, .5)); glow(0, 0, rnd(.1, .3) * W, rnd(-12, 12), 45, rnd(.05, .13)); ctx.restore(); }
    else if (c === 5) streak(W * rnd(.2, .8), H * rnd(.2, .8), W * rnd(.08, .2), .5 * st);
  }

  /* post-processing: multi-scale bloom + vignette */
  function post() {
    const B = +$('bloom').value, V = +$('vig').value, X = +$('mix').value;
    if (X > 0 && S > 20 && !NOMIX.includes(CUR)) {   // two-tone colour grade; black stays black
      const ang = U[19] * TAU, dx = Math.cos(ang) * W / 2, dy = Math.sin(ang) * H / 2, sp = (U[17] - .5) * 140;
      const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
      g.addColorStop(0, `hsl(${h - sp / 2},${S}%,50%)`); g.addColorStop(1, `hsl(${h + sp / 2},${S}%,50%)`);
      ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = X; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (B > 0) {
      let src = cv, d = 1; const lv = [];
      for (let i = 0; i < 5; i++) {
        d *= 2; const c = document.createElement('canvas');
        c.width = Math.ceil(W / d); c.height = Math.ceil(H / d);
        const t = c.getContext('2d'); t.imageSmoothingQuality = 'high'; t.drawImage(src, 0, 0, c.width, c.height);
        lv.push(c); src = c;
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      [[1, .5], [2, .45], [3, .4], [4, .35]].forEach(([i, a]) => { ctx.globalAlpha = Math.min(1, a * B); ctx.drawImage(lv[i], 0, 0, W, H); });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (V > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, Math.hypot(W, H) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${V})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  function draw(quick) {
    const L = typeof quick === 'number' ? quick : +$('res').value, [rw, rh] = $('ratio').value.split(':').map(Number);
    if (rw >= rh) { W = L; H = Math.round(L * rh / rw); } else { H = L; W = Math.round(L * rw / rh); }
    cv.width = W; cv.height = H; s = Math.max(W, H) / 1920; D = +$('density').value; h = +$('hue').value; S = +$('sat').value;
    if (!$('seed').value) $('seed').value = Math.floor(cr() * 1e9);
    h = +$('hue').value; S = +$('sat').value; D = +$('density').value;
    const seed = +$('seed').value;
    U = vec(seed); Math.random = mulberry(seed + 7);
    const pid = $('style').value, [fn, , , bg, k] = STYLES[pid], band = BAND.includes(k), ring = RING.includes(k);
    CUR = k;
    ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (bg) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `hsl(${h},45%,20%)`); g.addColorStop(.5, `hsl(${h},55%,8%)`); g.addColorStop(1, `hsl(${h},60%,3%)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (!bg && !$('tr').checked && U[16] > .3) {   // faint coloured ambience instead of flat black
      const g = ctx.createRadialGradient(W * (.3 + .4 * U[15]), H * (.3 + .4 * U[14]), 0, W / 2, H / 2, Math.max(W, H) * .8);
      g.addColorStop(0, `hsl(${h + U[17] * 60},45%,${(U[16] * 5).toFixed(1)}%)`); g.addColorStop(1, '#000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    if (band || ring) {
      ctx.translate(W / 2 + m(11, -.05, .05) * W, H / 2 + m(12, -.06, .06) * H);
      ctx.rotate(band ? m(10, -.2, .2) : U[10] * TAU);
      ctx.scale((band ? 1.18 : 1) * (U[13] < .5 ? -1 : 1), band ? 1.1 : .75 + .25 * U[12]);
      ctx.translate(-W / 2, -H / 2);
    } else if (k !== 'frame') {   // zoom + mirror for every other style
      const z = 1 + .22 * U[18];
      ctx.translate(W / 2, H / 2); ctx.scale(z * (U[13] < .5 ? -1 : 1), z * (FLIPY.includes(k) && U[19] < .5 ? -1 : 1)); ctx.translate(-W / 2, -H / 2);
    }
    fn();
    extraLayer();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    post();
    updateMeta();
    Math.random = origRandom;   // don't leave the seeded RNG installed globally
    $('info').textContent = `${W} × ${H}px · seed ${seed}`;
  }

  function zipBlob(files) {   // minimal ZIP writer (stored, no compression: PNG/JPG are already compressed)
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    const now = new Date(), dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    for (const f of files) {
      const nm = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, n, true); lh.setUint32(22, n, true); lh.setUint16(26, nm.length, true);
      parts.push(lh.buffer, nm, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, n, true); ch.setUint32(24, n, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cd.push(ch.buffer, nm); off += 30 + nm.length + n;
    }
    const cdSize = cd.reduce((s, x) => s + x.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cd, end.buffer], { type: 'application/zip' });
  }
  async function makeFile() {   // current canvas -> image file with title + keywords embedded
    const tr = $('tr').checked, jpg = $('fmt').value === 'jpg' && !tr;
    let src = cv;
    if (tr) {   // brightness becomes alpha, so the glow stays natural on any dark background
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const id = ctx.getImageData(0, 0, W, H), d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const a = Math.max(d[i], d[i + 1], d[i + 2]);
        if (a) { const k = 255 / a; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
        d[i + 3] = a;
      }
      c.getContext('2d').putImageData(id, 0, 0); src = c;
    }
    const file = $('style').value + '-' + W + 'x' + H + '-' + $('seed').value + (jpg ? '.jpg' : '.png');
    let blob = await new Promise(r => src.toBlob(r, jpg ? 'image/jpeg' : 'image/png', 1.0));
    blob = await addMeta(blob, $('mtitle').value, $('mkeys').value, jpg);
    return { file, blob };
  }
  async function download() { const { file, blob } = await makeFile(); saveBlob(blob, file); }
  async function batchZip() {   // N unique designs -> one ZIP
    const res = +$('res').value, cap = res >= 7680 ? 10 : res >= 3840 ? 30 : 50;
    const n = Math.max(1, Math.min(cap, Math.floor(+$('bcount').value) || 10)), mode = $('bmode').value, auto = $('auto').checked;
    const ids = Object.keys(STYLES), orig = $('style').value, btn = $('bzip'), files = [];
    btn.disabled = true; $('bcount').value = n;
    try {
      for (let i = 0; i < n; i++) {
        if (mode === 'random') { const id = ids[Math.floor(cr() * ids.length)]; $('style').value = id; $('hue').value = STYLES[id][1]; $('sat').value = STYLES[id][2]; }
        const allowed = await freshLook(auto);
        if (!allowed) break;
        draw();
        $('info').textContent = `Batch ${i + 1}/${n}: encoding…`;
        const { file, blob } = await makeFile();
        files.push({ name: String(i + 1).padStart(2, '0') + '-' + file, data: new Uint8Array(await blob.arrayBuffer()) });
        await new Promise(r => setTimeout(r, 0));
      }
      if (files.length) { saveBlob(zipBlob(files), `adoveautoimage-${files.length}-designs.zip`); $('info').textContent = `ZIP ready: ${files.length} images`; }
    } finally { btn.disabled = false; if (mode === 'random') $('style').value = orig; }
  }

  $('style').addEventListener('change', async () => {
    const [, hh, ss] = STYLES[$('style').value];
    $('hue').value = hh; $('sat').value = ss;
    const allowed = await freshLook($('auto').checked); if (allowed) draw();
  });
  ['res', 'ratio', 'density', 'hue', 'sat', 'seed', 'bloom', 'vig', 'mix', 'tr'].forEach(id => $(id).addEventListener('change', async () => { const allowed = await freshLook($('auto').checked); if (allowed) draw(); }));
  $('regen').onclick = async () => { const allowed = await freshLook($('auto').checked); if (allowed) draw(); };
  $('reset').onclick = () => { HIST = []; saveHist(); $('info').textContent = 'History cleared'; };
  const downloadButton = $('dl');
  if (downloadButton) downloadButton.onclick = download;
  const mobileDownloadButton = $('dl-mobile');
  if (mobileDownloadButton) mobileDownloadButton.onclick = download;
  const batchDownloadButton = $('bzip');
  if (batchDownloadButton) batchDownloadButton.onclick = batchZip;
  freshLook($('auto').checked).then(allowed => { if (allowed) draw(); });

  return () => {};
}
