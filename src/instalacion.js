/** Modo instalación · kiosco táctil */
import { HERRAMIENTAS, PAPER, fillPaper, paintStroke, paintLive, pressureFrom } from './brushes.js';
import { loadDrawingStrokes, muralGrid, prefersReducedMotion } from './timelapse.js';
import { createMuralTimelapse } from './muralTimelapse.js';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const parse = f => { const [y,m,d] = f.split('-').map(Number); return new Date(y, m-1, d); };
const largo = f => { const d = parse(f); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const img = (f, n) => `/content/${f}/${n}`;

const COLORES_FALLBACK = [
  { hex: '#1A1A1A', nom: 'Negro' },
  { hex: '#3D2B1F', nom: 'Siena' },
  { hex: '#1159CC', nom: 'Azul' },
  { hex: '#B33A3A', nom: 'Rojo' },
  { hex: '#2F6B4F', nom: 'Verde' },
  { hex: '#6B4C9A', nom: 'Violeta' },
];

const TAMANOS = [
  { id: 'xs', sz: 0.55, px: 8, nom: 'Fino' },
  { id: 's', sz: 0.8, px: 12, nom: 'Chico' },
  { id: 'm', sz: 1, px: 18, nom: 'Medio' },
  { id: 'l', sz: 1.55, px: 26, nom: 'Grande' },
  { id: 'xl', sz: 2.2, px: 34, nom: 'Grueso' },
];

function hexOk(h) {
  const m = String(h || '').trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? '#' + m[1].toUpperCase() : null;
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function normalizePaleta(arr) {
  const out = [];
  const seen = new Set();
  for (const c of arr || []) {
    const hex = hexOk(c.hex || c.color || c);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    out.push({ hex, nom: c.nombre || c.nom || hex });
    if (out.length >= 6) break;
  }
  if (!out.some(c => lum(c.hex) < 55)) {
    out.unshift({ hex: '#1A1A1A', nom: 'Negro' });
  }
  while (out.length > 6) out.pop();
  return out.length ? out : COLORES_FALLBACK.slice();
}

function seedFrom(fecha) {
  let h = 2166136261;
  for (let i = 0; i < String(fecha).length; i++) {
    h ^= String(fecha).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function extractPaletaFromMood(src, fecha) {
  const imgEl = await new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
  const tw = 64, th = 64;
  const cv = document.createElement('canvas');
  cv.width = tw; cv.height = th;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(imgEl, 0, 0, tw, th);
  const data = g.getImageData(0, 0, tw, th).data;
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 200) continue;
    // quantize
    const r = data[i] >> 4, gg = data[i + 1] >> 4, b = data[i + 2] >> 4;
    const key = (r << 8) | (gg << 4) | b;
    const L = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    // skip near-paper / near-white
    if (L > 230) continue;
    const prev = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    prev.n += 1; prev.r += data[i]; prev.g += data[i + 1]; prev.b += data[i + 2];
    buckets.set(key, prev);
  }
  const ranked = [...buckets.values()]
    .filter(x => x.n >= 3)
    .sort((a, b) => b.n - a.n)
    .map(x => {
      const r = Math.round(x.r / x.n), g2 = Math.round(x.g / x.n), b = Math.round(x.b / x.n);
      const hex = '#' + [r, g2, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      return { hex, nom: hex, n: x.n, L: 0.2126 * r + 0.7152 * g2 + 0.0722 * b };
    });
  // deterministic shuffle-ish pick spread by seed
  const rnd = mulberry32(seedFrom(fecha));
  const picked = [];
  const used = new Set();
  const take = (pred) => {
    const pool = ranked.filter(c => pred(c) && ![...used].some(u => {
      const A = parseInt(u.slice(1), 16), B = parseInt(c.hex.slice(1), 16);
      const dr = ((A >> 16) & 255) - ((B >> 16) & 255);
      const dg = ((A >> 8) & 255) - ((B >> 8) & 255);
      const db = (A & 255) - (B & 255);
      return (dr * dr + dg * dg + db * db) < 2800;
    }));
    if (!pool.length) return;
    const i = Math.floor(rnd() * Math.min(6, pool.length));
    const c = pool[i];
    used.add(c.hex);
    picked.push({ hex: c.hex, nom: c.hex });
  };
  take(c => c.L < 50); // dark line
  take(c => c.L >= 50 && c.L < 110);
  take(c => c.L >= 110 && c.L < 170);
  take(c => c.L >= 170 && c.L < 230);
  while (picked.length < 5 && ranked.length) take(() => true);
  return normalizePaleta(picked);
}

async function resolvePaleta(ctx) {
  if (Array.isArray(ctx.paleta) && ctx.paleta.length) {
    return normalizePaleta(ctx.paleta);
  }
  try {
    return await extractPaletaFromMood(img(ctx.fecha, ctx.mood), ctx.fecha);
  } catch {
    return COLORES_FALLBACK.slice();
  }
}

function minParam() {
  const m = Number(new URLSearchParams(location.search).get('min'));
  return Number.isFinite(m) && m > 0 && m <= 30 ? m : 3;
}

async function getIndex() {
  return fetch('/content/index.json').then(r => r.ok ? r.json() : []).catch(() => []);
}
async function getDia(f) {
  return fetch(`/content/${f}/dia.json`).then(r => r.ok ? r.json() : null).catch(() => null);
}

function hideChrome(on) {
  document.body.classList.toggle('modo-instalacion', on);
  const t = document.getElementById('timer');
  if (t) t.hidden = on;
  const top = document.querySelector('.top');
  if (top) top.hidden = on;
}

function estrellas(n) {
  const s = Math.max(1, Math.min(5, Number(n) || 3));
  return `${s}/5`;
}

/* ───────── START ───────── */
async function pantallaInicio(app) {
  const dias = await getIndex();
  const u = dias[0];
  if (!u) {
    app.innerHTML = `<section class="inst-vacio"><h1>Todavía no hay un día publicado</h1></section>`;
    return;
  }
  const d = await getDia(u.fecha);
  const ref = (d.datos || []).find(x => x.imagen);
  app.innerHTML = `
  <section class="inst-start">
    <header class="inst-brand">
      <img src="/mascota.png" alt="" width="56" height="56">
      <div>
        <p class="eyebrow">Instalación · por Kathonejo</p>
        <h1>Diario de dibujo</h1>
      </div>
    </header>
    <p class="inst-fecha">${largo(u.fecha)}</p>
    <h2 class="inst-tema">${esc(d.tema)}</h2>
    <ol class="inst-steps inst-steps-solo">
      <li><span aria-hidden="true">1</span> Mirá el tema y el moodboard</li>
      <li><span aria-hidden="true">2</span> Dibujá durante 3 minutos</li>
      <li><span aria-hidden="true">3</span> Entregá: el conejo te comenta y tu dibujo se suma al mural</li>
    </ol>
    <div class="inst-refs">
      <figure>
        <img src="${img(u.fecha, d.moodboard)}" alt="Moodboard">
        <figcaption>Moodboard</figcaption>
      </figure>
      ${ref ? `<figure>
        <img src="${img(u.fecha, ref.imagen)}" alt="Referencia">
        <figcaption>Referencia</figcaption>
      </figure>` : ''}
    </div>
    <div class="inst-cta">
      <button class="btn inst-big" id="inst-dibujar">Dibujar</button>
      <a class="btn sec" href="/instalacion/mural">Ver el mural</a>
    </div>
    <p class="inst-hint">Tenés ${minParam()} minutos. Cuando termines, tu dibujo entra al mural.</p>
  </section>`;
  document.getElementById('inst-dibujar').onclick = () => pantallaDibujo(app, { fecha: u.fecha, tema: d.tema, mood: d.moodboard, ref, paleta: d.paleta });
}

/* ───────── CANVAS ───────── */
async function pantallaDibujo(app, ctx) {
  const mins = minParam();
  let left = Math.round(mins * 60);
  const colores = await resolvePaleta(ctx);
  let color = colores[0].hex;
  let tool = 'grafito';
  let size = TAMANOS[2].sz;
  let strokes = [];
  let current = null;
  let undoStack = [];
  let alive = true;

  app.innerHTML = `
  <section class="inst-draw">
    <div class="inst-draw-top">
      <div class="inst-tema-mini">
        <img src="/mascota.png" alt="" width="36" height="36">
        <div><small>${largo(ctx.fecha)}</small><strong>${esc(ctx.tema)}</strong></div>
      </div>
      <div class="inst-clock" id="inst-clock" aria-live="polite">${fmt(left)}</div>
    </div>
    <div class="inst-stage">
      <aside class="inst-ref-side" id="inst-side" ${ctx.ref ? 'role="button" tabindex="0"' : ''}>
        <img id="inst-side-img" src="${img(ctx.fecha, ctx.mood)}" alt="Moodboard">
        <span class="inst-side-lab" id="inst-side-lab">${ctx.ref ? 'Moodboard · tocá para ver la referencia' : 'Moodboard'}</span>
      </aside>
      <div class="inst-canvas-wrap">
        <canvas id="inst-canvas" width="1200" height="900"></canvas>
      </div>
    </div>
    <div class="inst-tools">
      <div class="inst-brushes" id="inst-brushes" role="toolbar" aria-label="Herramientas">
        ${HERRAMIENTAS.map((h,i) => `<button type="button" class="inst-tool${i===0?' on':''}" data-tool="${h.id}" title="${h.nom}"><span class="inst-tool-ic">${h.icon}</span><span class="inst-tool-nom">${h.nom}</span></button>`).join('')}
      </div>
      <div class="inst-sizes" id="inst-sizes" role="toolbar" aria-label="Grosor">
        ${TAMANOS.map((s,i) => `<button type="button" class="inst-sz${i===2?' on':''}" data-sz="${s.sz}" title="${s.nom}" aria-label="${s.nom}"><i style="width:${s.px}px;height:${s.px}px"></i></button>`).join('')}
      </div>
      <div class="inst-colors" id="inst-colors" role="toolbar" aria-label="Paleta del día">
        ${colores.map((c,i) => `<button type="button" class="inst-sw${i===0?' on':''}" data-hex="${c.hex}" title="${esc(c.nom)}" style="--c:${c.hex}"></button>`).join('')}
      </div>
      <div class="inst-acts">
        <button type="button" class="btn sec" id="inst-fondo">Pintar fondo</button>
        <button type="button" class="btn sec" id="inst-undo">Deshacer</button>
        <button type="button" class="btn sec" id="inst-clear">Borrar todo</button>
        <button type="button" class="btn" id="inst-entregar">Entregar</button>
      </div>
    </div>
  </section>`;

  const canvas = document.getElementById('inst-canvas');
  const c2 = canvas.getContext('2d', { willReadFrequently: true });

  const moodSrc = img(ctx.fecha, ctx.mood);
  const refSrc = ctx.ref ? img(ctx.fecha, ctx.ref.imagen) : null;
  let sideMode = 'mood';
  const side = document.getElementById('inst-side');
  const sideImg = document.getElementById('inst-side-img');
  const sideLab = document.getElementById('inst-side-lab');
  function setSide(mode) {
    if (!refSrc) return;
    sideMode = mode;
    if (mode === 'ref') {
      sideImg.src = refSrc;
      sideImg.alt = 'Referencia';
      sideLab.textContent = 'Referencia · tocá para ver el moodboard';
    } else {
      sideImg.src = moodSrc;
      sideImg.alt = 'Moodboard';
      sideLab.textContent = 'Moodboard · tocá para ver la referencia';
    }
  }
  if (refSrc) {
    side.onclick = () => setSide(sideMode === 'mood' ? 'ref' : 'mood');
    side.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); side.click(); }
    };
  }

  function redrawAll() {
    fillPaper(c2, canvas.width, canvas.height);
    for (const s of strokes) paintStroke(c2, s);
    if (current) paintStroke(c2, current);
  }

  fitCanvas(canvas, c2);
  fillPaper(c2, canvas.width, canvas.height);

  const ro = new ResizeObserver(() => {
    const ow = canvas.width, oh = canvas.height;
    fitCanvas(canvas, c2);
    if (canvas.width === ow && canvas.height === oh) return;
    const sx = canvas.width / ow, sy = canvas.height / oh;
    for (const s of strokes) {
      if (s.fill || !s.points) continue;
      for (const pt of s.points) { pt.x *= sx; pt.y *= sy; }
    }
    if (current?.points) for (const pt of current.points) { pt.x *= sx; pt.y *= sy; }
    // ImageData undo buffers are size-bound; rebuild base from strokes
    undoStack = [];
    fillPaper(c2, canvas.width, canvas.height);
    for (const s of strokes) paintStroke(c2, s);
    if (current) {
      undoStack.push(snapshot(canvas));
      paintStroke(c2, current);
    }
  });
  ro.observe(canvas.parentElement);

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (('clientX' in e) ? e.clientX : e.touches?.[0]?.clientX);
    const cy = (('clientY' in e) ? e.clientY : e.touches?.[0]?.clientY);
    const x = (cx - r.left) * (canvas.width / r.width);
    const y = (cy - r.top) * (canvas.height / r.height);
    return { x, y, _cx: cx, _cy: cy, _t: e.timeStamp || Date.now() };
  }

  function start(e) {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    undoStack.push(snapshot(canvas));
    if (undoStack.length > 25) undoStack.shift();
    const p = pos(e);
    const pr = pressureFrom(e, null);
    current = { tool, color, size, points: [{ x: p.x, y: p.y, pr, _cx: p._cx, _cy: p._cy, _t: p._t }] };
    paintLive(c2, tool, color, current.points, size);
  }
  function move(e) {
    if (!current) return;
    e.preventDefault();
    const p = pos(e);
    const last = current.points[current.points.length - 1];
    // skip micro moves
    if (Math.hypot(p.x - last.x, p.y - last.y) < 2.5) return;
    const pr = pressureFrom(e, last);
    current.points.push({ x: p.x, y: p.y, pr, _cx: p._cx, _cy: p._cy, _t: p._t });
    // redraw full stroke from pre-stroke snapshot for smooth curves
    const base = undoStack[undoStack.length - 1];
    if (base) c2.putImageData(base, 0, 0);
    paintStroke(c2, current);
  }
  function end(e) {
    if (!current) return;
    e?.preventDefault?.();
    if (current.points.length >= 1) {
      strokes.push({
        tool: current.tool,
        color: current.color,
        size: current.size ?? 1,
        points: current.points.map(pt => ({ x: pt.x, y: pt.y, pr: pt.pr })),
      });
    } else {
      undoStack.pop(); // empty tap
    }
    current = null;
  }

  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.style.touchAction = 'none';

  document.getElementById('inst-brushes').onclick = e => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    tool = b.dataset.tool;
    document.querySelectorAll('.inst-tool').forEach(x => x.classList.toggle('on', x === b));
  };
  document.getElementById('inst-sizes').onclick = e => {
    const b = e.target.closest('[data-sz]'); if (!b) return;
    size = Number(b.dataset.sz) || 1;
    document.querySelectorAll('.inst-sz').forEach(x => x.classList.toggle('on', x === b));
  };
  document.getElementById('inst-colors').onclick = e => {
    const b = e.target.closest('[data-hex]'); if (!b) return;
    color = b.dataset.hex;
    document.querySelectorAll('.inst-sw').forEach(x => x.classList.toggle('on', x === b));
    if (tool === 'goma') {
      tool = 'grafito';
      document.querySelectorAll('.inst-tool').forEach(x => x.classList.toggle('on', x.dataset.tool === 'grafito'));
    }
  };
  document.getElementById('inst-undo').onclick = () => {
    if (!undoStack.length) return;
    const prev = undoStack.pop();
    c2.putImageData(prev, 0, 0);
    strokes.pop();
  };
  document.getElementById('inst-clear').onclick = () => {
    if (!strokes.length) return;
    undoStack.push(snapshot(canvas));
    strokes = [];
    fillPaper(c2, canvas.width, canvas.height);
  };
  document.getElementById('inst-fondo').onclick = () => {
    undoStack.push(snapshot(canvas));
    const fillStroke = { tool, color, size, fill: true, points: [] };
    strokes.push(fillStroke);
    paintStroke(c2, fillStroke);
  };

  const clock = document.getElementById('inst-clock');
  const tick = setInterval(() => {
    if (!alive) return;
    left -= 1;
    clock.textContent = fmt(Math.max(0, left));
    clock.classList.toggle('urgente', left <= 30);
    if (left <= 0) {
      clearInterval(tick);
      entregar();
    }
  }, 1000);

  document.getElementById('inst-entregar').onclick = entregar;

  async function entregar() {
    if (!alive) return;
    alive = false;
    clearInterval(tick);
    ro.disconnect();
    if (!strokes.length) {
      app.innerHTML = `<section class="inst-vacio"><h1>No hay dibujo todavía</h1><button class="btn" id="back">Volver</button></section>`;
      document.getElementById('back').onclick = () => pantallaInicio(app);
      return;
    }
    app.innerHTML = `<section class="inst-wait">
      <img src="/mascota.png" alt="" class="spin-bunny">
      <h1>Guardando tu dibujo…</h1>
      <p>Un segundo, el conejo lo mira con cariño.</p>
    </section>`;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      let image = dataUrl;
      try {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.88));
        if (blob && blob.type === 'image/webp' && blob.size < dataUrl.length * 0.75) {
          image = await blobToDataUrl(blob);
        }
      } catch { /* keep png */ }

      const slim = strokes.map(s => {
        const base = {
          t: s.tool,
          c: s.color,
          sz: Math.round((s.size ?? 1) * 100) / 100,
        };
        if (s.fill) return { ...base, f: 1 };
        return {
          ...base,
          p: (s.points || []).map(pt => [Math.round(pt.x), Math.round(pt.y), Math.round((pt.pr ?? 0.55) * 100) / 100]),
        };
      });

      const res = await fetch('/api/instalacion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fecha: ctx.fecha,
          tema: ctx.tema,
          image,
          strokes: slim,
          w: canvas.width,
          h: canvas.height,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'No se pudo guardar');

      let mirar = { texto: 'Qué lindo. Gracias por dibujar.', score: 4, fuente: 'frase' };
      try {
        const mr = await fetch('/api/mirar', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ image: saved.url || image, tema: ctx.tema }),
        });
        if (mr.ok) mirar = await mr.json();
      } catch { /* fallback already set */ }

      pantallaResultado(app, { saved, mirar, preview: image });
    } catch (err) {
      app.innerHTML = `<section class="inst-vacio">
        <h1>Uy, no se pudo guardar</h1>
        <p>${esc(err.message)}</p>
        <button class="btn" id="back">Probar de nuevo</button>
      </section>`;
      document.getElementById('back').onclick = () => pantallaInicio(app);
    }
  }
}

function fitCanvas(canvas, c2) {
  const wrap = canvas.parentElement;
  const w = Math.max(120, Math.floor(wrap.clientWidth || 800));
  const h = Math.max(120, Math.floor(wrap.clientHeight || 500));
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const iw = Math.round(w * scale), ih = Math.round(h * scale);
  if (canvas.width !== iw || canvas.height !== ih) {
    canvas.width = iw;
    canvas.height = ih;
  }
  c2.lineCap = 'round';
  c2.lineJoin = 'round';
}

function snapshot(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}
function fmt(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}m ${String(r).padStart(2, '0')}s`;
}
function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

/* ───────── RESULT ───────── */
let stopResultado = null;

export function createResultCountdown({ seconds = 20, onTick, onDone, isStillThere, schedule } = {}) {
  let left = seconds;
  let stopped = false;
  const set = schedule?.setInterval || setInterval;
  const clear = schedule?.clearInterval || clearInterval;
  const timer = set(() => {
    if (stopped) return;
    left -= 1;
    if (isStillThere && !isStillThere()) {
      stop();
      return;
    }
    onTick?.(left);
    if (left <= 0) {
      stop();
      onDone?.();
    }
  }, 1000);
  function stop() {
    if (stopped) return;
    stopped = true;
    clear(timer);
  }
  return { stop };
}

function cancelResultado() {
  if (!stopResultado) return;
  stopResultado();
  stopResultado = null;
}

function sigueEnResultado() {
  return !!document.getElementById('inst-cd') && !location.pathname.includes('/mural');
}

function pantallaResultado(app, { saved, mirar, preview }) {
  cancelResultado();
  app.innerHTML = `
  <section class="inst-result">
    <div class="inst-result-grid">
      <figure class="inst-preview"><img src="${preview}" alt="Tu dibujo"></figure>
      <div class="inst-bubble-wrap">
        <img src="/mascota.png" alt="" class="inst-bunny">
        <div class="inst-bubble">
          <p>${esc(mirar.texto)}</p>
          <div class="inst-score" title="Ponderación">${estrellas(mirar.score)}</div>
        </div>
      </div>
    </div>
    <div class="inst-cta">
      <a class="btn inst-big" href="/instalacion/mural">Ver el mural</a>
      <button class="btn sec" id="inst-otra">Otro dibujo</button>
    </div>
    <p class="inst-hint">Volvemos al inicio en <strong id="inst-cd">20</strong> s</p>
  </section>`;
  const countdown = createResultCountdown({
    seconds: 20,
    isStillThere: sigueEnResultado,
    onTick: (n) => {
      const el = document.getElementById('inst-cd');
      if (el) el.textContent = n;
    },
    onDone: () => {
      stopResultado = null;
      if (sigueEnResultado()) pantallaInicio(app);
    },
  });
  stopResultado = countdown.stop;
  document.getElementById('inst-otra').onclick = () => {
    cancelResultado();
    pantallaInicio(app);
  };
  const alMural = document.querySelector('.inst-result a[href="/instalacion/mural"]');
  if (alMural) {
    alMural.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      cancelResultado();
    });
  }
}

/* ───────── MURAL ───────── */
let stopMural = null;

export async function mural(app) {
  hideChrome(true);
  document.title = 'Mural · Instalación';
  let soloHoy = true;
  let known = new Set();
  let fechaHoy = null;
  let replayGen = 0;

  const dias = await getIndex();
  fechaHoy = dias[0]?.fecha || new Date().toLocaleDateString('sv', { timeZone: 'America/Buenos_Aires' });

  app.innerHTML = `
  <section class="inst-mural">
    <header class="inst-mural-h">
      <div class="inst-brand">
        <img src="/mascota.png" alt="" width="48" height="48">
        <div>
          <p class="eyebrow">Composición colectiva</p>
          <h1>El mural</h1>
        </div>
      </div>
      <div class="inst-mural-ctl">
        <button class="btn sec on" id="m-hoy">Hoy</button>
        <button class="btn sec" id="m-todo">Todos los días</button>
        <a class="btn" href="/instalacion">Dibujar</a>
      </div>
    </header>
    <p class="inst-mural-meta" id="m-meta">Cargando…</p>
    <div class="inst-mosaic" id="m-mosaic"></div>
  </section>
  <div class="inst-replay" id="m-replay" hidden>
    <canvas id="m-replay-c"></canvas>
    <button type="button" class="btn" id="m-replay-x">Cerrar</button>
  </div>`;

  const mosaic = document.getElementById('m-mosaic');
  const meta = document.getElementById('m-meta');

  document.getElementById('m-hoy').onclick = () => {
    soloHoy = true;
    document.getElementById('m-hoy').classList.add('on');
    document.getElementById('m-todo').classList.remove('on');
    known = new Set();
    refresh(true);
  };
  document.getElementById('m-todo').onclick = () => {
    soloHoy = false;
    document.getElementById('m-todo').classList.add('on');
    document.getElementById('m-hoy').classList.remove('on');
    known = new Set();
    refresh(true);
  };
  const tl = createMuralTimelapse();
  let iv = 0;
  let stopped = false;
  let loadGen = 0;
  let gridRo = null;
  const MURAL_GAP = 12;
  function fitMosaic() {
    if (stopped) return;
    const n = mosaic.querySelectorAll('.inst-tile').length;
    const frame = muralGrid(n, mosaic.clientWidth, mosaic.clientHeight, MURAL_GAP);
    if (!n || !frame) {
      mosaic.style.gridTemplateColumns = '';
      mosaic.style.gridTemplateRows = '';
      return;
    }
    mosaic.style.gridTemplateColumns = `repeat(${frame.cols}, ${Math.floor(frame.dw)}px)`;
    mosaic.style.gridTemplateRows = `repeat(${frame.rows}, ${Math.floor(frame.dh)}px)`;
  }
  if (typeof ResizeObserver === 'function') {
    gridRo = new ResizeObserver(() => fitMosaic());
    gridRo.observe(mosaic);
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(iv);
    gridRo?.disconnect();
    tl.dispose();
    if (stopMural === stop) stopMural = null;
  }

  document.getElementById('m-replay-x').onclick = () => {
    replayGen += 1;
    document.getElementById('m-replay').hidden = true;
    tl.resume();
  };

  async function refresh(reset) {
    const gen = ++loadGen;
    try {
      const q = soloHoy ? `?fecha=${fechaHoy}` : '?all=1';
      const r = await fetch('/api/instalacion' + q, { cache: 'no-store' });
      if (stopped || gen !== loadGen) return;
      const data = await r.json();
      const items = data.items || [];
      meta.textContent = soloHoy
        ? `${items.length} dibujo${items.length === 1 ? '' : 's'} · ${largo(fechaHoy)}`
        : `${items.length} dibujos en total`;

      if (reset) {
        tl.clear();
        mosaic.innerHTML = '';
      }
      const order = [...items].reverse(); // oldest first for mosaic growth
      for (const it of order) {
        if (known.has(it.id)) continue;
        const isNew = known.size > 0 && !reset;
        known.add(it.id);
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'inst-tile' + (isNew ? ' nuevo' : '');
        a.innerHTML = `<img loading="lazy" src="${esc(it.url)}" alt="Dibujo"><span>${esc((it.tema || '').slice(0, 40))}</span>`;
        a.onclick = () => replay(it);
        if (isNew) mosaic.prepend(a);
        else mosaic.append(a);
        tl.attach(a, it);
      }
      if (!items.length) {
        tl.clear();
        mosaic.innerHTML = `<p class="inst-vacio-m">Todavía no hay dibujos. Sé la primera persona en dejar uno.</p>`;
      }
      fitMosaic();
    } catch (e) {
      meta.textContent = 'No se pudo cargar el mural';
    }
  }

  async function replay(it) {
    const gen = ++replayGen;
    tl.suspend();
    const overlay = document.getElementById('m-replay');
    const c = document.getElementById('m-replay-c');
    const c2 = c.getContext('2d');
    overlay.hidden = false;
    let strokes = null;
    try { strokes = await loadDrawingStrokes(it); } catch { strokes = null; }
    if (gen !== replayGen) return;

    const w = it.w || 1200, h = it.h || 900;
    c.width = w; c.height = h;
    fillPaper(c2, w, h);

    if (!strokes?.length) {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => { if (gen === replayGen) c2.drawImage(im, 0, 0, w, h); };
      im.src = it.url;
      return;
    }

    if (prefersReducedMotion()) {
      for (const s of strokes) paintStroke(c2, s);
      return;
    }

    let si = 0;
    function step() {
      if (gen !== replayGen || overlay.hidden) return;
      if (si >= strokes.length) return;
      const s = strokes[si];
      // progressive reveal: paint whole stroke, then next
      paintStroke(c2, s);
      si += 1;
      setTimeout(() => requestAnimationFrame(step), 90);
    }
    requestAnimationFrame(step);
  }

  await refresh(true);
  iv = setInterval(() => {
    if (!location.pathname.startsWith('/instalacion/mural')) { stop(); return; }
    refresh(false);
  }, 10000);
  return stop;
}

export async function instalacion(app) {
  hideChrome(true);
  cancelResultado();
  if (stopMural) { stopMural(); stopMural = null; }
  document.title = 'Instalación · Diario de dibujo';
  if (location.pathname.includes('/mural')) {
    stopMural = await mural(app);
    return;
  }
  await pantallaInicio(app);
}

export function leaveInstalacion() {
  hideChrome(false);
  cancelResultado();
  if (stopMural) { stopMural(); stopMural = null; }
}
