/** Modo instalación · kiosco táctil */
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const parse = f => { const [y,m,d] = f.split('-').map(Number); return new Date(y, m-1, d); };
const largo = f => { const d = parse(f); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const img = (f, n) => `/content/${f}/${n}`;

const COLORES = [
  { hex: '#0A0A0A', nom: 'Tinta' },
  { hex: '#FF6666', nom: 'Coral' },
  { hex: '#1159CC', nom: 'Azul' },
  { hex: '#00CC99', nom: 'Menta' },
  { hex: '#FF99CC', nom: 'Rosa' },
  { hex: '#FFCC66', nom: 'Oro' },
  { hex: '#FFF8E8', nom: 'Goma' },
];
const TAMAÑOS = [
  { r: 3, nom: 'Fino' },
  { r: 8, nom: 'Medio' },
  { r: 18, nom: 'Grueso' },
];

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
        <p class="eyebrow">Instalación · Diario de dibujo</p>
        <h1>Hoy dibujamos juntos</h1>
      </div>
    </header>
    <p class="inst-fecha">${largo(u.fecha)}</p>
    <h2 class="inst-tema">${esc(d.tema)}</h2>
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
    ${d.mision ? `<p class="inst-mision">${esc(d.mision)}</p>` : ''}
    <div class="inst-cta">
      <button class="btn inst-big" id="inst-dibujar">Dibujar</button>
      <a class="btn sec" href="/instalacion/mural">Ver el mural</a>
    </div>
    <p class="inst-hint">Tenés ${minParam()} minutos. Cuando termines, tu dibujo entra al mural.</p>
  </section>`;
  document.getElementById('inst-dibujar').onclick = () => pantallaDibujo(app, { fecha: u.fecha, tema: d.tema, mood: d.moodboard, ref });
}

/* ───────── CANVAS ───────── */
function pantallaDibujo(app, ctx) {
  const mins = minParam();
  let left = Math.round(mins * 60);
  let color = COLORES[0].hex;
  let size = TAMAÑOS[1].r;
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
      ${ctx.ref ? `<aside class="inst-ref-side"><img src="${img(ctx.fecha, ctx.ref.imagen)}" alt="Referencia"></aside>` : ''}
      <div class="inst-canvas-wrap">
        <canvas id="inst-canvas" width="1200" height="900"></canvas>
      </div>
    </div>
    <div class="inst-tools">
      <div class="inst-colors" id="inst-colors">
        ${COLORES.map((c,i) => `<button type="button" class="inst-sw${i===0?' on':''}" data-hex="${c.hex}" title="${c.nom}" style="--c:${c.hex}"></button>`).join('')}
      </div>
      <div class="inst-sizes" id="inst-sizes">
        ${TAMAÑOS.map((t,i) => `<button type="button" class="inst-sz${i===1?' on':''}" data-r="${t.r}" title="${t.nom}"><i style="width:${t.r*2}px;height:${t.r*2}px"></i></button>`).join('')}
      </div>
      <div class="inst-acts">
        <button type="button" class="btn sec" id="inst-undo">Deshacer</button>
        <button type="button" class="btn sec" id="inst-clear">Borrar todo</button>
        <button type="button" class="btn" id="inst-entregar">Entregar</button>
      </div>
    </div>
  </section>`;

  const canvas = document.getElementById('inst-canvas');
  const c2 = canvas.getContext('2d');
  fitCanvas(canvas, c2);
  c2.fillStyle = '#FFF8E8';
  c2.fillRect(0, 0, canvas.width, canvas.height);
  c2.lineCap = 'round';
  c2.lineJoin = 'round';

  const ro = new ResizeObserver(() => {
    // Redibujar al redimensionar preservando bitmap
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    tmp.getContext('2d').drawImage(canvas, 0, 0);
    fitCanvas(canvas, c2);
    c2.fillStyle = '#FFF8E8';
    c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  });
  ro.observe(canvas.parentElement);

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = (('clientX' in e) ? e.clientX : e.touches?.[0]?.clientX) - r.left;
    const y = (('clientY' in e) ? e.clientY : e.touches?.[0]?.clientY) - r.top;
    return { x: x * (canvas.width / r.width), y: y * (canvas.height / r.height) };
  }

  function start(e) {
    e.preventDefault();
    const p = pos(e);
    current = { color, size, points: [p] };
    c2.strokeStyle = color;
    c2.lineWidth = size * 2;
    c2.beginPath();
    c2.moveTo(p.x, p.y);
  }
  function move(e) {
    if (!current) return;
    e.preventDefault();
    const p = pos(e);
    current.points.push(p);
    c2.lineTo(p.x, p.y);
    c2.stroke();
    c2.beginPath();
    c2.moveTo(p.x, p.y);
  }
  function end(e) {
    if (!current) return;
    e?.preventDefault?.();
    if (current.points.length > 1) {
      undoStack.push(snapshot(canvas));
      if (undoStack.length > 30) undoStack.shift();
      strokes.push(current);
    }
    current = null;
  }

  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);
  canvas.style.touchAction = 'none';

  document.getElementById('inst-colors').onclick = e => {
    const b = e.target.closest('[data-hex]'); if (!b) return;
    color = b.dataset.hex;
    document.querySelectorAll('.inst-sw').forEach(x => x.classList.toggle('on', x === b));
  };
  document.getElementById('inst-sizes').onclick = e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    size = Number(b.dataset.r);
    document.querySelectorAll('.inst-sz').forEach(x => x.classList.toggle('on', x === b));
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
    c2.fillStyle = '#FFF8E8';
    c2.fillRect(0, 0, canvas.width, canvas.height);
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
    // Si no dibujó nada, volver al inicio
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
      // Comprimir a webp si se puede
      let image = dataUrl;
      try {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.88));
        if (blob && blob.type === 'image/webp' && blob.size < dataUrl.length * 0.75) {
          image = await blobToDataUrl(blob);
        }
      } catch { /* keep png */ }

      const slim = strokes.map(s => ({
        c: s.color,
        s: s.size,
        p: s.points.map(pt => [Math.round(pt.x), Math.round(pt.y)]),
      }));

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
  const maxW = Math.min(1200, wrap.clientWidth || 800);
  const maxH = Math.min(900, Math.floor((window.innerHeight - 220) * 0.9));
  const ratio = 4 / 3;
  let w = maxW, h = Math.round(w / ratio);
  if (h > maxH) { h = maxH; w = Math.round(h * ratio); }
  // Keep internal resolution reasonably sharp
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
function pantallaResultado(app, { saved, mirar, preview }) {
  let left = 20;
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
    <p class="inst-hint">Volvemos al inicio en <strong id="inst-cd">${left}</strong> s</p>
  </section>`;
  document.getElementById('inst-otra').onclick = () => { clearInterval(t); pantallaInicio(app); };
  const t = setInterval(() => {
    left -= 1;
    const el = document.getElementById('inst-cd');
    if (el) el.textContent = left;
    if (left <= 0) { clearInterval(t); pantallaInicio(app); }
  }, 1000);
}

/* ───────── MURAL ───────── */
export async function mural(app) {
  hideChrome(true);
  document.title = 'Mural · Instalación';
  let soloHoy = true;
  let known = new Set();
  let fechaHoy = null;

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
  document.getElementById('m-replay-x').onclick = () => {
    document.getElementById('m-replay').hidden = true;
  };

  async function refresh(reset) {
    try {
      const q = soloHoy ? `?fecha=${fechaHoy}` : '?all=1';
      const r = await fetch('/api/instalacion' + q, { cache: 'no-store' });
      const data = await r.json();
      const items = data.items || [];
      meta.textContent = soloHoy
        ? `${items.length} dibujo${items.length === 1 ? '' : 's'} · ${largo(fechaHoy)}`
        : `${items.length} dibujos en total`;

      if (reset) mosaic.innerHTML = '';
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
      }
      if (!items.length) {
        mosaic.innerHTML = `<p class="inst-vacio-m">Todavía no hay dibujos. Sé la primera persona en dejar uno.</p>`;
      }
    } catch (e) {
      meta.textContent = 'No se pudo cargar el mural';
    }
  }

  async function replay(it) {
    const overlay = document.getElementById('m-replay');
    const c = document.getElementById('m-replay-c');
    const c2 = c.getContext('2d');
    overlay.hidden = false;
    let strokes = it.strokes;
    if (!strokes && it.metaUrl) {
      try {
        const metaJ = await fetch(it.metaUrl, { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
        strokes = metaJ?.strokes;
      } catch { /* show static */ }
    }
    if (!strokes) {
      try {
        const jsonUrl = it.url.replace(/\.(png|webp|jpg|jpeg)(\?.*)?$/i, '.json');
        const metaJ = await fetch(jsonUrl).then(r => r.ok ? r.json() : null).catch(() => null);
        strokes = metaJ?.strokes;
      } catch { /* show static */ }
    }

    const w = it.w || 1200, h = it.h || 900;
    c.width = w; c.height = h;
    c2.fillStyle = '#FFF8E8';
    c2.fillRect(0, 0, w, h);
    c2.lineCap = 'round';
    c2.lineJoin = 'round';

    if (!strokes?.length) {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => c2.drawImage(im, 0, 0, w, h);
      im.src = it.url;
      return;
    }

    let si = 0, pi = 1;
    function step() {
      if (overlay.hidden) return;
      if (si >= strokes.length) return;
      const s = strokes[si];
      const pts = s.p || s.points || [];
      const col = s.c || s.color || '#0A0A0A';
      const sz = (s.s || s.size || 4) * 2;
      if (pi === 1 && pts.length) {
        c2.strokeStyle = col;
        c2.lineWidth = sz;
        c2.beginPath();
        const p0 = Array.isArray(pts[0]) ? { x: pts[0][0], y: pts[0][1] } : pts[0];
        c2.moveTo(p0.x, p0.y);
      }
      if (pi < pts.length) {
        const p = Array.isArray(pts[pi]) ? { x: pts[pi][0], y: pts[pi][1] } : pts[pi];
        c2.lineTo(p.x, p.y);
        c2.stroke();
        c2.beginPath();
        c2.moveTo(p.x, p.y);
        pi += Math.max(1, Math.floor(pts.length / 40));
        requestAnimationFrame(step);
      } else {
        si += 1; pi = 1;
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  await refresh(true);
  const iv = setInterval(() => {
    if (!location.pathname.startsWith('/instalacion/mural')) { clearInterval(iv); return; }
    refresh(false);
  }, 10000);
}

export async function instalacion(app) {
  hideChrome(true);
  document.title = 'Instalación · Diario de dibujo';
  if (location.pathname.includes('/mural')) return mural(app);
  await pantallaInicio(app);
}

export function leaveInstalacion() {
  hideChrome(false);
}
