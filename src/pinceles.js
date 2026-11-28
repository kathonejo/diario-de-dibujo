/**
 * Materiales del estudio del día (dibujar en pantalla).
 * Reutiliza el motor de la Instalación (src/brushes.js) y suma los materiales de las clases:
 * sanguina, tiza blanca, lápiz acuarelable, pincel con tinta, pincel seco, aguada húmedo sobre húmedo,
 * goma moldeable (abrir luces) y difumino. Todo es determinista: el mismo trazo pinta igual al rehacer.
 */
import { paintStroke, fillPaper, PAPER, resampleByDistance, fillRibbonSimple, strokeRibbonEdge, rgba, hash } from './brushes.js';

export const PAPELES = { blanco: PAPER, entonado: '#C9B99B' };

const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</g></svg>`;

/** Materiales en el orden en que aparecen. `motor` = pincel reutilizado de la Instalación. `pig` = pigmento sugerido. */
export const MATERIALES = [
  { id: 'grafito', pig: '#2B2B30', icon: ic('<path d="M15 3.5l5.5 5.5L9 20.5H3.5V15z"/><path d="M13.3 5.2l5.5 5.5M3.5 15l5.5 5.5"/>') },
  { id: 'carbon', pig: '#161414', icon: ic('<path d="M4 17.5L14.5 7l3.5 3.5L7.5 21H4z"/><path d="M9 16l5-5M6.5 19l3-3" stroke-dasharray="1 2"/>') },
  { id: 'sanguina', pig: '#A4462E', icon: ic('<rect x="8" y="2.5" width="7" height="15" rx="1" transform="rotate(35 11.5 10)"/><path d="M4 21c3-1 6-1.5 9-1" stroke-dasharray="1.5 1.5"/>') },
  { id: 'tiza', pig: '#FFFFFF', icon: ic('<rect x="8" y="2.5" width="7" height="15" rx="3.5" transform="rotate(35 11.5 10)"/><path d="M4 21h9" stroke-dasharray="1 1.5"/>') },
  { id: 'acuarelable', pig: '#4E72B6', icon: ic('<path d="M15 3.5l5.5 5.5L9 20.5H3.5V15z"/><path d="M3 21.5c1.5.3 3 .2 4.5-.3"/><circle cx="18.5" cy="18.5" r="2"/>') },
  { id: 'pluma', motor: 'tinta', pig: '#111111', icon: ic('<path d="M12 21l-3-7 9-9 3 3-9 9z"/><path d="M12 21l1.5-4.5M9 14l-5 1"/>') },
  { id: 'pincel', pig: '#111111', icon: ic('<path d="M20 4l-8.5 9.5"/><path d="M11.5 13.5c-2 0-3.5 1.2-3.8 3.2-.3 2-1.4 3-3.7 3.3 3.5 1.5 8.5.5 8.8-3.6"/>') },
  { id: 'seco', pig: '#2A2A2A', icon: ic('<path d="M3 8h13M3 12h16M3 16h11" stroke-dasharray="3 2"/><path d="M19 5v4M21 13v4"/>') },
  { id: 'aguada', pig: '#4E72B6', icon: ic('<path d="M12 3c2.5 4 7 8.2 7 12a7 7 0 11-14 0c0-3.8 4.5-8 7-12z"/>') },
  { id: 'humedo', pig: '#4E72B6', icon: ic('<path d="M12 3c2.5 4 7 8.2 7 12a7 7 0 11-14 0c0-3.8 4.5-8 7-12z" stroke-dasharray="2 2"/><path d="M9 15.5a3 3 0 003 3"/>') },
  { id: 'goma', borra: true, icon: ic('<path d="M5 15l7-7 5 5-4 4H8l-3-2z"/><path d="M8 18h11"/>') },
  { id: 'moldeable', borra: true, icon: ic('<path d="M6 9c2-4 9-5 12-1 2.5 3.3 0 8-4 8.5-3 .4-5-1.5-7.5-1C4.5 15.6 4 11 6 9z"/><path d="M9 11.5c1.5-1 3-1 4.5 0"/>') },
  { id: 'difumino', borra: true, icon: ic('<path d="M17.5 3.5l3 3L9 18l-4.5 1.5L6 15z"/><path d="M3 21.5c3-.5 5-1 8-2.5" stroke-dasharray="1 2.5"/>') },
];
export const material = id => MATERIALES.find(m => m.id === id) || MATERIALES[0];

/** Presión 0..1: lápiz óptico (Apple Pencil, stylus) usa la presión real; mouse y dedo, la velocidad. */
export function presion(e, last) {
  if (e && e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
    const p = Math.max(0.04, Math.min(1, e.pressure));
    return last?.pr != null ? last.pr * 0.3 + p * 0.7 : p;
  }
  if (!last) return 0.5;
  const dx = (e.clientX ?? 0) - (last._cx ?? e.clientX ?? 0), dy = (e.clientY ?? 0) - (last._cy ?? e.clientY ?? 0);
  const dt = Math.max(8, (e.timeStamp || 0) - (last._t || 0));
  const moved = Math.hypot(dx, dy);
  if (moved < 1.5) return last.pr ?? 0.5;
  const v = Math.max(0.2, Math.min(0.8, 0.85 - Math.min(0.65, (moved / dt) * 1.6)));
  return (last.pr ?? v) * 0.4 + v * 0.6;
}

/** Fondo de papel: blanco (crema, el de la Instalación) o entonado, con grano. */
export function pintarPapel(c2, tono = 'blanco') {
  const w = c2.canvas.width, h = c2.canvas.height;
  if (tono !== 'entonado') return fillPaper(c2, w, h);
  c2.save();
  c2.globalCompositeOperation = 'source-over'; c2.globalAlpha = 1;
  c2.fillStyle = PAPELES.entonado; c2.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
    const n = hash(x * 0.37, y * 0.71);
    if (n > 0.5) continue;
    c2.fillStyle = n < 0.18 ? 'rgba(90,72,48,.07)' : 'rgba(255,248,232,.08)';
    c2.fillRect(x, y, 1.6, 1.6);
  }
  c2.restore();
}

/** Grano del papel en (x,y): 0 = valle (no agarra pigmento seco), 1 = cresta. */
const grano = (x, y) => hash(Math.floor(x / 2) * 2.1, Math.floor(y / 2) * 1.7);

/** Barra seca (sanguina, tiza, carbón entonado): pigmento que se agarra a las crestas del papel. */
function barra(c2, s, color, size, { ancho = 9, cuerpo = 0.22, dens = 0.55 } = {}) {
  const smp = resampleByDistance(s, 1.6); if (smp.length < 2) return;
  const wAt = p => (ancho * 0.45 + p.pr * ancho) * Math.max(0.35, p.taper) * size;
  fillRibbonSimple(c2, smp, p => wAt(p) * 0.82, rgba(color, cuerpo * 0.75));
  for (let i = 0; i < smp.length; i++) {
    const p = smp[i], w = wAt(p), n = Math.ceil(w * dens * 1.6);
    for (let k = 0; k < n; k++) {
      const off = (hash(p.x + k * 7.1, p.y - k * 3.3) - 0.5) * w;
      const ang = Math.atan2((smp[Math.min(i + 1, smp.length - 1)].y - p.y), (smp[Math.min(i + 1, smp.length - 1)].x - p.x));
      const x = p.x - Math.sin(ang) * off, y = p.y + Math.cos(ang) * off;
      const g = grano(x, y);
      if (g < 0.42 - p.pr * 0.25) continue; // más presión, más llena el grano
      c2.fillStyle = rgba(color, 0.18 + p.pr * 0.32 * g);
      c2.fillRect(x, y, 1.3 + g, 1.3 + hash(y, x));
    }
  }
}

/** Lápiz acuarelable: línea de color con grano y un leve halo de agua donde se aprieta. */
function acuarelable(c2, s, color, size) {
  const smp = resampleByDistance(s, 1.6); if (smp.length < 2) return;
  c2.globalCompositeOperation = 'multiply';
  fillRibbonSimple(c2, smp, p => (5 + p.pr * 9) * p.taper * size, rgba(color, 0.08));
  c2.globalCompositeOperation = 'source-over';
  fillRibbonSimple(c2, smp, p => (1.6 + p.pr * 3.4) * p.taper * size, rgba(color, 0.5));
  for (let i = 1; i < smp.length; i++) {
    const p = smp[i], w = (2 + p.pr * 4) * size;
    for (let k = 0; k < 3; k++) {
      const x = p.x + (hash(p.x + k, p.y) - 0.5) * w, y = p.y + (hash(p.y, p.x + k) - 0.5) * w;
      if (grano(x, y) < 0.35) continue;
      c2.fillStyle = rgba(color, 0.35); c2.fillRect(x, y, 1.1, 1.1);
    }
  }
}

/** Pincel con tinta: mucha variación de ancho con la presión, punta afilada, borde apenas irregular. */
function pincel(c2, s, color, size) {
  const smp = resampleByDistance(s, 1.4); if (smp.length < 2) return;
  const w = p => (0.6 + Math.pow(p.pr, 1.4) * 15) * Math.pow(p.taper, 0.7) * size;
  fillRibbonSimple(c2, smp, p => w(p) * (0.94 + hash(p.s, 1) * 0.12), rgba(color, 0.9));
  fillRibbonSimple(c2, smp, p => w(p) * 0.6, rgba(color, 0.25));
}

/** Pincel seco: cerdas que se cortan; deja ver el papel, sobre todo cuando el trazo es rápido o liviano. */
function seco(c2, s, color, size) {
  const smp = resampleByDistance(s, 1.5); if (smp.length < 2) return;
  const cerdas = Math.round(9 + 5 * size);
  for (let b = 0; b < cerdas; b++) {
    const lado = (b / (cerdas - 1) - 0.5), carga = hash(b * 3.7, 11.3);
    c2.beginPath(); let on = false;
    for (let i = 0; i < smp.length; i++) {
      const p = smp[i], q = smp[Math.min(i + 1, smp.length - 1)], a = Math.atan2(q.y - p.y, q.x - p.x);
      const w = (10 + p.pr * 12) * size * Math.max(0.5, p.taper);
      const x = p.x - Math.sin(a) * lado * w, y = p.y + Math.cos(a) * lado * w;
      const seca = p.s / Math.max(1, p.total); // la pintura se agota hacia el final
      const pinta = hash(Math.floor(p.s / 3) + b * 13.7, b) > 0.18 + seca * 0.55 - p.pr * 0.25 - carga * 0.2;
      if (pinta && !on) { c2.moveTo(x, y); on = true; } else if (pinta) c2.lineTo(x, y); else on = false;
    }
    c2.strokeStyle = rgba(color, 0.45 + carga * 0.4); c2.lineWidth = (0.8 + carga * 1.4) * Math.max(0.7, size * 0.8);
    c2.lineCap = 'round'; c2.stroke();
  }
}

/** Húmedo sobre húmedo: la mancha se abre en el papel mojado; bordes blandos y floraciones. */
function humedo(c2, s, color, size) {
  const smp = resampleByDistance(s, 3); if (smp.length < 2) return;
  c2.globalCompositeOperation = 'multiply';
  const base = p => (18 + p.pr * 14) * Math.max(0.45, p.taper) * size;
  for (let k = 6; k >= 1; k--) fillRibbonSimple(c2, smp, p => base(p) * (0.55 + k * 0.22), rgba(color, 0.045 + p0(k)));
  for (let i = 0; i < smp.length; i += 9) {
    const p = smp[i], r = base(p) * (0.7 + hash(p.x, p.y) * 0.9);
    const x = p.x + (hash(i, p.y) - 0.5) * r * 0.8, y = p.y + (hash(p.x, i) - 0.5) * r * 0.8;
    const g = c2.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, 0.1)); g.addColorStop(0.7, rgba(color, 0.05)); g.addColorStop(1, rgba(color, 0));
    c2.fillStyle = g; c2.beginPath(); c2.arc(x, y, r, 0, Math.PI * 2); c2.fill();
  }
  function p0(k) { return k <= 2 ? 0.04 : 0; }
}

/** Devuelve el papel donde se borró (la goma no deja agujeros). */
let _papelCache = { k: '', c: null };
function papelCanvas(w, h, tono) {
  const k = `${w}x${h}:${tono}`;
  if (_papelCache.k !== k) { const c = document.createElement('canvas'); c.width = w; c.height = h; pintarPapel(c.getContext('2d'), tono); _papelCache = { k, c }; }
  return _papelCache.c;
}
function devolverPapel(c2, tono) {
  c2.save(); c2.globalCompositeOperation = 'destination-over'; c2.globalAlpha = 1;
  c2.drawImage(papelCanvas(c2.canvas.width, c2.canvas.height, tono), 0, 0); c2.restore();
}

function goma(c2, s, size, tono, alpha) {
  const smp = resampleByDistance(s, 2.2); if (smp.length < 2) return;
  c2.globalCompositeOperation = 'destination-out'; c2.globalAlpha = alpha;
  fillRibbonSimple(c2, smp, p => (12 + p.pr * 16) * Math.max(0.4, p.taper) * size, '#000');
  devolverPapel(c2, tono);
}

/** Goma moldeable: levanta pigmento de a poco, con borde blando (abrir luces). */
function moldeable(c2, s, size, tono, alpha) {
  const smp = resampleByDistance(s, 2.5); if (smp.length < 2) return;
  c2.globalCompositeOperation = 'destination-out';
  for (let k = 4; k >= 1; k--) { c2.globalAlpha = alpha * (0.12 + p1(k)); fillRibbonSimple(c2, smp, p => (10 + p.pr * 14) * size * (0.5 + k * 0.25), '#000'); }
  devolverPapel(c2, tono);
  function p1(k) { return k === 1 ? 0.22 : 0.05; }
}

/** Difumino: arrastra el pigmento que ya está en el papel en la dirección del trazo, con borde blando. */
let _parche = null;
function difumino(c2, s, size, alpha) {
  const smp = resampleByDistance(s, 1.2); if (smp.length < 2) return;
  const cv = c2.canvas;
  if (!_parche) _parche = document.createElement('canvas');
  for (let i = 1; i < smp.length; i++) {
    const a = smp[i - 1], p = smp[i], r = Math.max(4, Math.round((7 + p.pr * 11) * size)), d = r * 2;
    if (_parche.width !== d) { _parche.width = d; _parche.height = d; }
    const x2 = _parche.getContext('2d');
    x2.globalCompositeOperation = 'copy'; x2.drawImage(cv, a.x - r, a.y - r, d, d, 0, 0, d, d);
    x2.globalCompositeOperation = 'destination-in';
    const g = x2.createRadialGradient(r, r, 0, r, r, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x2.fillStyle = g; x2.fillRect(0, 0, d, d);
    c2.globalCompositeOperation = 'source-over'; c2.globalAlpha = (0.35 + p.pr * 0.3) * alpha;
    c2.drawImage(_parche, p.x - r, p.y - r);
  }
}

/** Grafito: el lápiz de la Instalación con un núcleo que se oscurece al apretar. */
function grafito(c2, s, color, size) {
  paintStroke(c2, { tool: 'grafito', color, size, points: s });
  const smp = resampleByDistance(s, 1.6); if (smp.length < 2) return;
  fillRibbonSimple(c2, smp, p => (0.5 + p.pr * 1.4) * p.taper * size, rgba(color, 0.12 + 0.0));
  for (let i = 1; i < smp.length - 1; i++) {
    const p = smp[i]; if (p.pr < 0.45) continue;
    fillRibbonSimple(c2, smp.slice(i - 1, i + 2), q => (0.4 + q.pr * 1.2) * size, rgba(color, (p.pr - 0.45) * 0.35));
  }
}

/** Carbón: más negro que la carbonilla de la Instalación; núcleo denso, grano en los bordes. */
function carbon(c2, s, color, size) {
  paintStroke(c2, { tool: 'carbonilla', color, size, points: s });
  barra(c2, s, color, size, { ancho: 12, cuerpo: 0.32, dens: 0.8 });
}

/** Aguada húmedo sobre seco: capa transparente con borde duro (se puede velar por capas). */
function aguada(c2, s, color, size) {
  const smp = resampleByDistance(s, 2.4); if (smp.length < 2) return;
  const w = p => (14 + p.pr * 16) * Math.max(0.35, p.taper) * size;
  c2.globalCompositeOperation = 'multiply';
  fillRibbonSimple(c2, smp, w, rgba(color, 0.2));
  fillRibbonSimple(c2, smp, p => w(p) * 0.7, rgba(color, 0.07));
  strokeRibbonEdge(c2, smp, w, rgba(color, 0.32), 1.6);
}

/** Pinta un trazo del estudio: { tool, color, size, alpha, points:[{x,y,pr}] }. */
export function pintar(c2, st, tono = 'blanco') {
  const m = material(st.tool), size = Math.max(0.3, Math.min(4, +st.size || 1)), alpha = Math.max(0.05, Math.min(1, st.alpha ?? 1));
  const pts = (st.points || []).map(p => ({ x: +p.x, y: +p.y, pr: Math.max(0.04, Math.min(1, +(p.pr ?? 0.5))) }));
  if (!pts.length) return;
  if (pts.length === 1) pts.push({ ...pts[0], x: pts[0].x + 0.8, y: pts[0].y + 0.4 }); // un toque deja marca
  c2.save();
  c2.globalAlpha = alpha;
  if (m.motor) paintStroke(c2, { tool: m.motor, color: st.color, size, points: pts });
  else if (m.id === 'grafito') grafito(c2, pts, st.color, size);
  else if (m.id === 'carbon') carbon(c2, pts, st.color, size);
  else if (m.id === 'aguada') aguada(c2, pts, st.color, size);
  else if (m.id === 'sanguina') barra(c2, pts, st.color, size, { ancho: 10, cuerpo: 0.2, dens: 0.6 });
  else if (m.id === 'tiza') barra(c2, pts, st.color, size, { ancho: 11, cuerpo: 0.3, dens: 0.75 });
  else if (m.id === 'acuarelable') acuarelable(c2, pts, st.color, size);
  else if (m.id === 'pincel') pincel(c2, pts, st.color, size);
  else if (m.id === 'seco') seco(c2, pts, st.color, size);
  else if (m.id === 'humedo') humedo(c2, pts, st.color, size);
  else if (m.id === 'goma') goma(c2, pts, size, tono, alpha);
  else if (m.id === 'moldeable') moldeable(c2, pts, size, tono, alpha);
  else if (m.id === 'difumino') difumino(c2, pts, size, alpha);
  c2.restore();
}

/** Herramientas viejas de la Instalación: se siguen pintando con el motor original para no cambiar el mural. */
const LEGACY_INSTALACION = new Set(['tinta', 'acuarela', 'carbonilla']);

/** «Pintar fondo» de la Instalación usa las texturas clásicas; cada material nuevo se apoya en la más cercana. */
const FONDO_DE = {
  tinta: 'tinta', pluma: 'tinta', pincel: 'tinta',
  acuarela: 'acuarela', aguada: 'acuarela', humedo: 'acuarela', acuarelable: 'acuarela',
  carbonilla: 'carbonilla', carbon: 'carbonilla', seco: 'carbonilla', sanguina: 'carbonilla', tiza: 'carbonilla',
  goma: 'goma', moldeable: 'goma', difumino: 'goma',
};

export function motorFondo(tool) {
  return FONDO_DE[tool] || 'grafito';
}

/** Pinta un trazo de la Instalación (formato largo o el compacto t/c/sz/p/f). Materiales del estudio + trazos viejos. */
export function pintarTrazo(c2, stroke, tono = 'blanco') {
  const tool = stroke.tool || stroke.t || 'grafito';
  if (stroke.fill || stroke.f || stroke.kind === 'fill') {
    const fondo = motorFondo(tool);
    return paintStroke(c2, { ...stroke, tool: fondo, t: fondo });
  }
  if (LEGACY_INSTALACION.has(tool)) return paintStroke(c2, stroke);
  const color = stroke.color || stroke.c || '#0A0A0A';
  const size = stroke.size ?? stroke.sz ?? 1;
  const alpha = stroke.alpha ?? stroke.a ?? 1;
  const raw = stroke.points || stroke.p || [];
  const points = raw.map(pt => Array.isArray(pt) ? { x: +pt[0], y: +pt[1], pr: +(pt[2] ?? 0.55) } : pt);
  return pintar(c2, { tool, color, size, alpha, points }, tono);
}

/** Historial con deshacer/rehacer. Guarda trazos; las fotos del lienzo son solo un atajo. */
export function crearHistorial(limiteFotos = 12) {
  const h = { trazos: [], rehacer: [], fotos: new Map() };
  return {
    get trazos() { return h.trazos; },
    get puedeDeshacer() { return h.trazos.length > 0; },
    get puedeRehacer() { return h.rehacer.length > 0; },
    agregar(tr, fotoAntes) {
      if (fotoAntes) { h.fotos.set(h.trazos.length, fotoAntes); for (const k of [...h.fotos.keys()]) if (k <= h.trazos.length - limiteFotos) h.fotos.delete(k); }
      h.trazos.push(tr); h.rehacer = [];
    },
    /** Devuelve { trazo, foto } — foto = estado anterior si está guardado; si no, hay que repintar todo. */
    deshacer() {
      if (!h.trazos.length) return null;
      const trazo = h.trazos.pop(); h.rehacer.push(trazo);
      const foto = h.fotos.get(h.trazos.length) || null; h.fotos.delete(h.trazos.length);
      return { trazo, foto };
    },
    rehacer(fotoAntes) {
      if (!h.rehacer.length) return null;
      const trazo = h.rehacer.pop();
      if (fotoAntes) h.fotos.set(h.trazos.length, fotoAntes);
      h.trazos.push(trazo); return trazo;
    },
    vaciarFotos() { h.fotos.clear(); },
  };
}

/** Repinta todo: papel + trazos (un trazo { tool:'limpiar' } vuelve al papel). */
export function repintar(c2, trazos, tono) {
  pintarPapel(c2, tono);
  for (const s of trazos) s.tool === 'limpiar' ? pintarPapel(c2, tono) : pintar(c2, s, tono);
}

/** Tamaño del lienzo según el formato del día. */
export function formatoLienzo(formato = '') {
  const f = String(formato).toLowerCase();
  if (/vertical|retrato|2:3|3:4/.test(f)) return { w: 1125, h: 1500 };
  if (/cuadrad|1:1/.test(f)) return { w: 1350, h: 1350 };
  return { w: 1500, h: 1125 };
}
