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

/** Paper fill + subtle grain (pattern tiled). */
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
    if (Array.isArray(pt)) return { x: pt[0], y: pt[1], pr: pt[2] ?? 0.55 };
    return { x: pt.x, y: pt.y, pr: pt.pr ?? pt.p ?? 0.55 };
  });
}

function dist(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/** Mid-point quadratic smooth polyline → sample points */
function sampleCurve(pts, spacing = 2.2) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2, pr: (p0.pr + p1.pr) / 2 };
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, pr: (p1.pr + p2.pr) / 2 };
    const steps = Math.max(1, Math.ceil(dist(m1, m2) / spacing));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      out.push({
        x: u * u * m1.x + 2 * u * t * p1.x + t * t * m2.x,
        y: u * u * m1.y + 2 * u * t * p1.y + t * t * m2.y,
        pr: u * u * m1.pr + 2 * u * t * p1.pr + t * t * m2.pr,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function hash(x, y) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

/** Paint a full stroke (replay or undo rebuild). */
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

/** Incremental live segment using only the newest points (avoids overdraw). */
export function paintLive(c2, tool, color, pts) {
  if (!pts.length) return;
  if (pts.length === 1) {
    paintStroke(c2, { tool, color, points: [pts[0], { ...pts[0], x: pts[0].x + 0.01, y: pts[0].y + 0.01 }] });
    return;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  paintStroke(c2, { tool, color, points: [a, b] });
}

function paintGrafito(c2, pts, color) {
  const samples = sampleCurve(pts, 1.8);
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const pr = Math.max(0.15, Math.min(1, b.pr));
    const w = 1.1 + pr * 2.4;
    c2.strokeStyle = rgba(color, 0.18 + pr * 0.45);
    c2.lineWidth = w;
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
    // grain flecks
    const n = Math.ceil(dist(a, b) / 2.5);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = a.x + (b.x - a.x) * t + (hash(a.x + k, a.y) - 0.5) * 2.2;
      const y = a.y + (b.y - a.y) * t + (hash(a.y + k, a.x) - 0.5) * 2.2;
      c2.fillStyle = rgba(color, 0.08 + pr * 0.22);
      c2.fillRect(x, y, 1.1, 1.1);
    }
  }
  c2.restore();
}

function paintTinta(c2, pts, color) {
  const samples = sampleCurve(pts, 2.4);
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.strokeStyle = color;
  c2.fillStyle = color;
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  c2.globalAlpha = 1;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const pr = Math.max(0.12, Math.min(1, b.pr));
    // slow/heavy pressure → thicker nib; fast → hairline
    const w = 0.7 + pr * 5.5;
    c2.lineWidth = w;
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
  }
  // crisp tip dab
  const last = samples[samples.length - 1];
  c2.beginPath();
  c2.arc(last.x, last.y, 0.6 + last.pr * 1.4, 0, Math.PI * 2);
  c2.fill();
  c2.restore();
}

function paintAcuarela(c2, pts, color) {
  const samples = sampleCurve(pts, 3.2);
  c2.save();
  c2.globalCompositeOperation = 'multiply';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const pr = Math.max(0.2, Math.min(1, p.pr));
    const r = 6 + pr * 16;
    const g = c2.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, rgba(color, 0.22 * pr));
    g.addColorStop(0.55, rgba(color, 0.1 * pr));
    g.addColorStop(1, rgba(color, 0));
    c2.fillStyle = g;
    c2.beginPath();
    c2.arc(p.x, p.y, r, 0, Math.PI * 2);
    c2.fill();
  }
  // soft wet edge trail
  c2.globalCompositeOperation = 'source-over';
  c2.strokeStyle = rgba(color, 0.08);
  c2.lineWidth = 10;
  c2.beginPath();
  samples.forEach((p, i) => (i ? c2.lineTo(p.x, p.y) : c2.moveTo(p.x, p.y)));
  c2.stroke();
  c2.restore();
}

function paintCarbonilla(c2, pts, color) {
  const samples = sampleCurve(pts, 2.6);
  c2.save();
  c2.globalCompositeOperation = 'source-over';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const pr = Math.max(0.2, Math.min(1, b.pr));
    const w = 8 + pr * 14;
    // soft body
    c2.strokeStyle = rgba(color, 0.12 + pr * 0.18);
    c2.lineWidth = w;
    c2.beginPath();
    c2.moveTo(a.x, a.y);
    c2.lineTo(b.x, b.y);
    c2.stroke();
    // rough dust
    const n = Math.ceil(dist(a, b) / 1.8);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const ox = (hash(a.x + k * 3, b.y) - 0.5) * w * 0.9;
      const oy = (hash(b.x, a.y + k * 5) - 0.5) * w * 0.9;
      const x = a.x + (b.x - a.x) * t + ox;
      const y = a.y + (b.y - a.y) * t + oy;
      const s = 1.2 + hash(x, y) * 3.5;
      c2.fillStyle = rgba(color, 0.08 + pr * 0.2);
      c2.beginPath();
      c2.arc(x, y, s, 0, Math.PI * 2);
      c2.fill();
    }
  }
  c2.restore();
}

function paintEraser(c2, pts) {
  const samples = sampleCurve(pts, 2.5);
  c2.save();
  c2.globalCompositeOperation = 'destination-out';
  c2.strokeStyle = 'rgba(0,0,0,1)';
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
  c2.lineWidth = 28;
  c2.beginPath();
  samples.forEach((p, i) => (i ? c2.lineTo(p.x, p.y) : c2.moveTo(p.x, p.y)));
  c2.stroke();
  // soft fringe
  c2.globalAlpha = 0.35;
  c2.lineWidth = 36;
  c2.stroke();
  c2.restore();
  // restore paper grain lightly in erased area by redrawing paper only where erased is hard;
  // destination-out leaves transparent — refill paper underneath
  c2.save();
  c2.globalCompositeOperation = 'destination-over';
  c2.fillStyle = PAPER;
  // only need local — fill whole is ok for small canvases
  c2.fillRect(0, 0, c2.canvas.width, c2.canvas.height);
  c2.restore();
}

/** Derive pressure 0..1 from pointer event + speed. */
export function pressureFrom(e, last) {
  let pr = 0.55;
  if (e && typeof e.pressure === 'number' && e.pointerType === 'pen' && e.pressure > 0) {
    pr = Math.max(0.08, Math.min(1, e.pressure));
  } else if (last && e) {
    const r = e.target?.getBoundingClientRect?.();
    // speed from last point in canvas space approx via client
    const dx = (e.clientX ?? 0) - (last._cx ?? e.clientX ?? 0);
    const dy = (e.clientY ?? 0) - (last._cy ?? e.clientY ?? 0);
    const dt = Math.max(8, (e.timeStamp || Date.now()) - (last._t || 0));
    const speed = Math.hypot(dx, dy) / dt; // px/ms
    // slow → high pressure, fast → light
    pr = Math.max(0.15, Math.min(1, 1 - Math.min(1, speed * 1.8)));
  }
  return pr;
}
