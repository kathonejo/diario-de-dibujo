/** Pinceles tradicionales · instalación */
export const PAPER = '#F4EFE3';

export const HERRAMIENTAS = [
  { id: 'grafito', nom: 'Grafito',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M14.5 3.5l6 6L9 21H3v-6L14.5 3.5z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M13 5.5l5.5 5.5"/></svg>` },
  { id: 'tinta', nom: 'Tinta',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M7 21c2-6 4-10 5.5-12.5L16 5l3 3-3.5 3.5C13 13 9 17 7 21z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M14.5 6.5l3 3"/></svg>` },
  { id: 'acuarela', nom: 'Acuarela',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 3c2.5 4 7 8.2 7 12a7 7 0 11-14 0c0-3.8 4.5-8 7-12z"/></svg>` },
  { id: 'carbonilla', nom: 'Carbonilla',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 18l10-10 4 4L8 22H4v-4z"/><path fill="none" stroke="currentColor" stroke-width="1.3" d="M12 10l2.5-2.5M9 15l4-4M7 18l3-3"/></svg>` },
  { id: 'goma', nom: 'Goma',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M5 15l7-7 5 5-4 4H8l-3-2z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M8 18h11"/></svg>` },
];

let _paperPat = null;
function paperPattern(c2) {
  if (_paperPat) return _paperPat;
  const g = document.createElement('canvas');
  g.width = 96; g.height = 96;
  const x = g.getContext('2d');
  x.fillStyle = PAPER;
  x.fillRect(0, 0, 96, 96);
  for (let y = 0; y < 96; y += 2) {
    for (let xx = 0; xx < 96; xx += 2) {
      const n = Math.abs(Math.sin(xx * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (n > 0.62) continue;
      x.globalAlpha = 0.045;
      x.fillStyle = n > 0.35 ? '#c9c0a8' : '#fffdf6';
      x.fillRect(xx, y, 1.2, 1.2);
    }
  }
  _paperPat = c2.createPattern(g, 'repeat');
  return _paperPat;
}

export function fillPaper(c2, w, h) {
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.globalAlpha = 1;
  c2.fillStyle = paperPattern(c2) || PAPER;
  c2.fillRect(0, 0, w, h);
  c2.restore();
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function normPts(stroke) {
  const raw = stroke.points || stroke.p || [];
  return raw.map(pt => {
    if (Array.isArray(pt)) return { x: +pt[0], y: +pt[1], pr: +(pt[2] ?? 0.55) };
    return { x: +pt.x, y: +pt.y, pr: +(pt.pr ?? pt.p ?? 0.55) };
  });
}

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function hash(x, y) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

/** Smooth polyline with mid-point quadratics (no extra endpoint dabs). */
function smoothPoly(pts) {
  if (pts.length < 3) return pts.slice();
  const out = [{ ...pts[0] }];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2, pr: (p0.pr + p1.pr) / 2 };
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, pr: (p1.pr + p2.pr) / 2 };
    const steps = Math.max(2, Math.ceil(dist(m1, m2) / 3));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      out.push({
        x: u * u * m1.x + 2 * u * t * p1.x + t * t * m2.x,
        y: u * u * m1.y + 2 * u * t * p1.y + t * t * m2.y,
        pr: u * u * m1.pr + 2 * u * t * p1.pr + t * t * m2.pr,
      });
    }
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}

/** Evenly space samples by arc length. Caps pressure spikes from slow corners. */
function resampleByDistance(pts, spacing) {
  if (!pts.length) return [];
  const smooth = smoothPoly(pts);
  for (let i = 1; i < smooth.length; i++) {
    smooth[i].pr = smooth[i - 1].pr * 0.55 + Math.min(0.85, smooth[i].pr) * 0.45;
  }
  if (smooth.length === 1) {
    return [{ ...smooth[0], s: 0, taper: 0.2, total: 0 }];
  }
  const lens = [0];
  let length = 0;
  for (let i = 1; i < smooth.length; i++) {
    length += dist(smooth[i - 1], smooth[i]);
    lens.push(length);
  }
  if (length < 0.5) {
    return [{ ...smooth[0], s: 0, taper: 0.2, total: 0 }];
  }
  const n = Math.max(1, Math.floor(length / spacing));
  const samples = [];
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * length;
    let j = 1;
    while (j < lens.length && lens[j] < target) j++;
    const a = smooth[j - 1], b = smooth[Math.min(j, smooth.length - 1)];
    const segStart = lens[j - 1];
    const segLen = Math.max(1e-6, lens[Math.min(j, lens.length - 1)] - segStart);
    const tt = Math.min(1, Math.max(0, (target - segStart) / segLen));
    const u = i / n;
    let taper = 1;
    if (u < 0.12) taper = Math.max(0.15, u / 0.12);
    else if (u > 0.88) taper = Math.max(0.15, (1 - u) / 0.12);
    samples.push({
      x: a.x + (b.x - a.x) * tt,
      y: a.y + (b.y - a.y) * tt,
      pr: Math.min(0.85, a.pr + (b.pr - a.pr) * tt),
      s: target,
      taper,
      total: length,
    });
  }
  return samples;
}

export function paintStroke(c2, stroke) {
  const tool = stroke.tool || stroke.t || 'grafito';
  const color = stroke.color || stroke.c || '#0A0A0A';
  const pts = normPts(stroke);
  if (!pts.length) return;
  if (tool === 'goma') return paintEraser(c2, pts);
  if (tool === 'tinta') return paintTinta(c2, pts, color);
  if (tool === 'acuarela') return paintAcuarela(c2, pts, color);
  if (tool === 'carbonilla') return paintCarbonilla(c2, pts, color);
  return paintGrafito(c2, pts, color);
}

export function paintLive(c2, tool, color, pts) {
  if (!pts.length) return;
  paintStroke(c2, { tool, color, points: pts });
}

function strokePath(c2, samples) {
  if (!samples.length) return;
  c2.beginPath();
  c2.moveTo(samples[0].x, samples[0].y);
  for (let i = 1; i < samples.length; i++) c2.lineTo(samples[i].x, samples[i].y);
}

function paintGrafito(c2, pts, color) {
  const samples = resampleByDistance(pts, 1.6);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  // continuous soft core
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const pr = b.pr;
    const w = (1.0 + pr * 2.2) * b.taper;
    c2.strokeStyle = rgba(color, 0.22 + pr * 0.4);
    c2.lineWidth = Math.max(0.6, w);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }
  // grain flecks spaced by distance (skip first/last to avoid endpoint blobs)
  for (let i = 1; i < samples.length - 1; i++) {
    const p = samples[i];
    if (i % 2) continue;
    const x = p.x + (hash(p.x, p.y) - 0.5) * 2;
    const y = p.y + (hash(p.y, p.x) - 0.5) * 2;
    c2.fillStyle = rgba(color, 0.1 + p.pr * 0.18);
    c2.fillRect(x, y, 1, 1);
  }
  c2.restore();
}

function paintTinta(c2, pts, color) {
  const samples = resampleByDistance(pts, 2.0);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.strokeStyle = color;
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  c2.globalAlpha = 1;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const w = (0.6 + b.pr * 5.2) * b.taper;
    c2.lineWidth = Math.max(0.5, w);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }
  c2.restore();
}

/** Continuous wet wash — no radial dabs. Soft body + slightly darker edge. */
function paintAcuarela(c2, pts, color) {
  const samples = resampleByDistance(pts, 3.5);
  if (samples.length < 2) return;
  c2.save();
  c2.lineCap = 'round';
  c2.lineJoin = 'round';

  // outer soft bloom (very light)
  c2.globalCompositeOperation = 'multiply';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const w = (14 + b.pr * 10) * b.taper;
    c2.strokeStyle = rgba(color, 0.06);
    c2.lineWidth = Math.max(4, w);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }

  // main wash body
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const w = (8 + b.pr * 8) * b.taper;
    c2.strokeStyle = rgba(color, 0.14);
    c2.lineWidth = Math.max(3, w);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }

  // slightly darker wet edge (narrower, low alpha — continuous)
  c2.globalCompositeOperation = 'source-over';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const w = (9 + b.pr * 7) * b.taper;
    c2.strokeStyle = rgba(color, 0.1);
    c2.lineWidth = Math.max(2.5, w);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
    // inner pool a bit darker
    c2.strokeStyle = rgba(color, 0.08);
    c2.lineWidth = Math.max(1.5, w * 0.45);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }
  c2.restore();
}

/** Continuous grainy band — body stroke + sparse grain along path, no round blobs. */
function paintCarbonilla(c2, pts, color) {
  const samples = resampleByDistance(pts, 2.2);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';

  // soft wide body (one continuous feel via short segments, even alpha)
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const w = (10 + b.pr * 10) * b.taper;
    c2.strokeStyle = rgba(color, 0.16);
    c2.lineWidth = Math.max(4, w);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
    c2.strokeStyle = rgba(color, 0.2);
    c2.lineWidth = Math.max(2, w * 0.55);
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }

  // grain as tiny squares along band (distance-spaced, skip ends)
  for (let i = 2; i < samples.length - 2; i++) {
    const p = samples[i];
    const w = (10 + p.pr * 10) * p.taper;
    const flecks = 3;
    for (let k = 0; k < flecks; k++) {
      const ox = (hash(p.x + k, p.y) - 0.5) * w * 0.7;
      const oy = (hash(p.y + k * 2, p.x) - 0.5) * w * 0.7;
      c2.fillStyle = rgba(color, 0.1 + p.pr * 0.12);
      c2.fillRect(p.x + ox, p.y + oy, 1.2 + hash(p.x, k) * 1.8, 1.2);
    }
  }
  c2.restore();
}

function paintEraser(c2, pts) {
  const samples = resampleByDistance(pts, 2.5);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'destination-out';
  c2.strokeStyle = 'rgba(0,0,0,1)';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    c2.lineWidth = 26 * b.taper + 8;
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }
  c2.restore();
  c2.save();
  c2.globalCompositeOperation = 'destination-over';
  c2.fillStyle = paperPattern(c2) || PAPER;
  c2.fillRect(0, 0, c2.canvas.width, c2.canvas.height);
  c2.restore();
}

/** Derive pressure 0..1 from pointer event + speed. Cap so slow corners don't blob. */
export function pressureFrom(e, last) {
  let pr = 0.5;
  if (e && typeof e.pressure === 'number' && e.pointerType === 'pen' && e.pressure > 0) {
    pr = Math.max(0.12, Math.min(0.85, e.pressure));
  } else if (last && e) {
    const dx = (e.clientX ?? 0) - (last._cx ?? e.clientX ?? 0);
    const dy = (e.clientY ?? 0) - (last._cy ?? e.clientY ?? 0);
    const dt = Math.max(12, (e.timeStamp || Date.now()) - (last._t || 0));
    const speed = Math.hypot(dx, dy) / dt;
    // slow → heavier, but capped; near-stationary barely increases
    const moved = Math.hypot(dx, dy);
    if (moved < 1.5) pr = last.pr ?? 0.45;
    else pr = Math.max(0.2, Math.min(0.8, 0.85 - Math.min(0.65, speed * 1.6)));
    // ease toward previous
    pr = (last.pr ?? pr) * 0.35 + pr * 0.65;
  }
  return pr;
}
