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
    if (u < 0.14) taper = Math.max(0.05, u / 0.14);
    else if (u > 0.86) taper = Math.max(0.05, (1 - u) / 0.14);
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
  const size = Math.max(0.35, Math.min(3, +(stroke.size ?? stroke.sz ?? 1) || 1));
  const pts = normPts(stroke);
  if (!pts.length) return;
  if (tool === 'goma') return paintEraser(c2, pts, size);
  if (tool === 'tinta') return paintTinta(c2, pts, color, size);
  if (tool === 'acuarela') return paintAcuarela(c2, pts, color, size);
  if (tool === 'carbonilla') return paintCarbonilla(c2, pts, color, size);
  return paintGrafito(c2, pts, color, size);
}

export function paintLive(c2, tool, color, pts, size = 1) {
  if (!pts.length) return;
  paintStroke(c2, { tool, color, size, points: pts });
}

/** Continuous ribbon. No end-cap stamps (taper handles tips). Normals smoothed. */
function ribbonEdges(samples, widthAt) {
  const norms = [];
  for (let i = 0; i < samples.length; i++) {
    const p0 = samples[Math.max(0, i - 1)];
    const p1 = samples[Math.min(samples.length - 1, i + 1)];
    let dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    norms.push({ nx: -dy / len, ny: dx / len });
  }
  const smoothN = norms.map((n, i) => {
    const a = norms[Math.max(0, i - 1)];
    const b = norms[Math.min(norms.length - 1, i + 1)];
    let nx = a.nx * 0.25 + n.nx * 0.5 + b.nx * 0.25;
    let ny = a.ny * 0.25 + n.ny * 0.5 + b.ny * 0.25;
    const l = Math.hypot(nx, ny) || 1;
    return { nx: nx / l, ny: ny / l };
  });
  const left = [];
  const right = [];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const { nx, ny } = smoothN[i];
    const w = Math.max(0.2, widthAt(p)) / 2;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  return { left, right };
}

function fillRibbonSimple(c2, samples, widthAt, fillStyle) {
  if (samples.length < 2) return;
  const { left, right } = ribbonEdges(samples, widthAt);
  c2.beginPath();
  c2.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) c2.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) c2.lineTo(right[i].x, right[i].y);
  c2.closePath();
  c2.fillStyle = fillStyle;
  c2.fill();
}

function strokeRibbonEdge(c2, samples, widthAt, strokeStyle, lineWidth) {
  if (samples.length < 2) return;
  const { left, right } = ribbonEdges(samples, widthAt);
  c2.strokeStyle = strokeStyle;
  c2.lineWidth = lineWidth;
  c2.lineJoin = 'round';
  c2.lineCap = 'butt';
  // one closed outline — avoids double-darkening where left/right meet at tips
  c2.beginPath();
  c2.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) c2.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) c2.lineTo(right[i].x, right[i].y);
  c2.closePath();
  c2.stroke();
}

function paintGrafito(c2, pts, color, size = 1) {
  const samples = resampleByDistance(pts, 1.8);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  fillRibbonSimple(c2, samples, p => (1.1 + p.pr * 2.4) * p.taper * size, rgba(color, 0.38));
  fillRibbonSimple(c2, samples, p => (0.5 + p.pr * 1.1) * p.taper * size, rgba(color, 0.28));
  for (let i = 1; i < samples.length - 1; i += 2) {
    const p = samples[i];
    c2.fillStyle = rgba(color, 0.12 + p.pr * 0.15);
    c2.fillRect(p.x + (hash(p.x, p.y) - 0.5) * 2, p.y + (hash(p.y, p.x) - 0.5) * 2, 1, 1);
  }
  c2.restore();
}

function paintTinta(c2, pts, color, size = 1) {
  const samples = resampleByDistance(pts, 2.0);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  fillRibbonSimple(c2, samples, p => (0.7 + p.pr * 5.0) * p.taper * size, color);
  c2.restore();
}

/** Soft continuous wash + slightly darker wet edge. No dabs. */
function paintAcuarela(c2, pts, color, size = 1) {
  const samples = resampleByDistance(pts, 2.8);
  if (samples.length < 2) return;
  const wide = p => (16 + p.pr * 8) * p.taper * size;
  const body = p => (10 + p.pr * 6) * p.taper * size;
  c2.save();
  c2.globalCompositeOperation = 'multiply';
  fillRibbonSimple(c2, samples, wide, rgba(color, 0.09));
  fillRibbonSimple(c2, samples, body, rgba(color, 0.13));
  // wet edge: stroke the outer ribbon outline only (even alpha, no join stamps)
  strokeRibbonEdge(c2, samples, wide, rgba(color, 0.16), 1.25);
  c2.restore();
}

/** Continuous grainy charcoal band. */
function paintCarbonilla(c2, pts, color, size = 1) {
  const samples = resampleByDistance(pts, 2.0);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'source-over';

  fillRibbonSimple(c2, samples, p => (11 + p.pr * 9) * p.taper * size, rgba(color, 0.28));

  // grain flecks along the band only (distance-spaced, skip ends)
  for (let i = 2; i < samples.length - 2; i++) {
    const p = samples[i];
    const w = (11 + p.pr * 9) * p.taper * size;
    for (let k = 0; k < 3; k++) {
      const ox = (hash(p.x + k * 3, p.y) - 0.5) * w * 0.8;
      const oy = (hash(p.y + k * 5, p.x) - 0.5) * w * 0.8;
      c2.fillStyle = rgba(color, 0.14 + p.pr * 0.12);
      c2.fillRect(p.x + ox, p.y + oy, 1 + hash(p.x, k) * 1.8, 1 + hash(k, p.y) * 1.4);
    }
  }
  c2.restore();
}

function paintEraser(c2, pts, size = 1) {
  const samples = resampleByDistance(pts, 2.5);
  if (samples.length < 2) return;
  c2.save();
  c2.globalCompositeOperation = 'destination-out';
  fillRibbonSimple(c2, samples, p => (26 * p.taper + 10) * size, 'rgba(0,0,0,1)');
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
