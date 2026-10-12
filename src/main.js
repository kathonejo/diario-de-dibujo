import './style.css';
import { initTimer } from './timer.js';
import { openFocus } from './focus.js';
import { getTrabajos, dialogoSubir, borrar } from './trabajos.js';
const app = document.getElementById('app');
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const parse = f => { const [y,m,d] = f.split('-').map(Number); return new Date(y, m-1, d); };
const largo = f => { const d = parse(f); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const img = (f, n) => `/content/${f}/${n}`;
let indice = null;
const getIndex = async () => indice ??= await fetch('/content/index.json').then(r => r.ok ? r.json() : []).catch(() => []);
const getDia = f => fetch(`/content/${f}/dia.json`).then(r => r.ok ? r.json() : null).catch(() => null);

function frase(d) {
  return d.frase ? `<blockquote class="frase"><p>“${esc(d.frase.texto)}”</p>${d.frase.autor ? `<cite>— ${esc(d.frase.autor)}</cite>` : ''}</blockquote>` : '';
}

let calMes = null;
let TR = {};
function calendario(dias) {
  const set = new Set(dias.map(d => d.fecha));
  const base = calMes ?? parse(dias[0]?.fecha ?? new Date().toISOString().slice(0,10));
  calMes = new Date(base.getFullYear(), base.getMonth(), 1);
  const y = calMes.getFullYear(), m = calMes.getMonth();
  const off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m+1, 0).getDate();
  const hoy = new Date().toISOString().slice(0,10);
  let cells = '<span></span>'.repeat(off);
  for (let i = 1; i <= n; i++) {
    const f = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const cls = f === hoy ? ' hoy' : '';
    const t = TR[f]?.[0];
    cells += set.has(f) ? `<a href="/dia/${f}" class="c tiene${cls}${t ? ' con-trabajo' : ''}"${t ? ` style="background-image:url('${t.url}')" title="Con trabajo subido"` : ''}><span>${i}</span></a>` : `<span class="c${cls}">${i}</span>`;
  }
  return `<div class="cal card"><div class="cal-h"><button data-mes="-1" aria-label="Mes anterior">‹</button><strong>${MESES[m]} ${y}</strong><button data-mes="1" aria-label="Mes siguiente">›</button></div>
  <div class="cal-g">${['L','M','M','J','V','S','D'].map(d=>`<b>${d}</b>`).join('')}${cells}</div></div>`;
}
const lista = dias => `<ul class="lista">${dias.map(d => `<li><a href="/dia/${d.fecha}"><img loading="lazy" src="${img(d.fecha, d.moodboard)}" alt=""><span><small>${largo(d.fecha)}</small><strong>${esc(d.tema)}</strong></span>${TR[d.fecha]?.length ? `<img class="mini-trabajo" loading="lazy" src="${TR[d.fecha][0].url}" alt="Mi trabajo" title="Mi trabajo">` : ''}</a></li>`).join('')}</ul>`;

async function home() {
  const [dias, tr] = await Promise.all([getIndex(), getTrabajos()]); TR = tr;
  if (!dias.length) { app.innerHTML = `<section class="vacio"><h1>Todavía no hay días</h1><p>El primer estudio aparece pronto.</p></section>`; return; }
  const u = dias[0], d = await getDia(u.fecha);
  app.innerHTML = `<section class="hero">
    <a href="/dia/${u.fecha}" class="mood"><img src="${img(u.fecha, d.moodboard)}" alt="Moodboard: ${esc(d.tema)}"></a>
    <div class="hero-t"><p class="eyebrow">Último día · ${largo(u.fecha)}</p><h1>${esc(d.tema)}</h1>${frase(d)}
    <div class="mision card"><h3>Misión del día</h3><p>${esc(d.mision)}</p></div>
    <a class="btn" href="/dia/${u.fecha}">Ir al día →</a></div></section>
    <section class="archivo"><div><h2>Calendario</h2><div id="cal">${calendario(dias)}</div></div><div><h2>Días anteriores</h2>${lista(dias)}</div></section>`;
}
async function archivo() {
  const [dias, tr] = await Promise.all([getIndex(), getTrabajos()]); TR = tr;
  app.innerHTML = `<section class="archivo solo"><div><h1>Todos los días</h1><div id="cal">${calendario(dias)}</div></div><div>${lista(dias)}</div></section>`;
}
async function dia(f) {
  const [d, dias, tr] = await Promise.all([getDia(f), getIndex(), getTrabajos()]); TR = tr;
  if (!d) { app.innerHTML = `<section class="vacio"><h1>Este día no existe (todavía)</h1><p>No hay estudio para ${esc(f)}.</p><a class="btn" href="/">Volver al inicio</a></section>`; return; }
  const i = dias.findIndex(x => x.fecha === f), prev = dias[i+1], next = dias[i-1];
  const imgs = [{ src: img(f, d.moodboard), label: 'Moodboard' }, ...(d.datos || []).filter(x => x.imagen).map(x => ({ src: img(f, x.imagen), label: `Pág. ${x.pagina ?? ''}` }))];
  queueMicrotask(() => {
    document.getElementById('focus-btn').onclick = () => openFocus(imgs, 0);
    const sub = () => dialogoSubir(f, () => dia(f));
    document.getElementById('subir-btn').onclick = sub; document.getElementById('subir-btn2').onclick = sub;
    app.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => { if (confirm('¿Borrar este trabajo?') && await borrar(f, b.dataset.borrar)) dia(f); });
  });
  document.title = `${d.tema} · Diario de dibujo`;
  app.innerHTML = `<article class="dia">
    <p class="eyebrow">${largo(f)}</p><h1>${esc(d.tema)}</h1>
    <div class="acciones"><button class="btn" id="focus-btn">◎ Modo focus</button><button class="btn sec" id="subir-btn">⬆ Subir mi trabajo</button></div>
    <figure class="mood grande"><img src="${img(f, d.moodboard)}" alt="Moodboard: ${esc(d.tema)}" data-zoom><figcaption>Foto 1 · Moodboard</figcaption></figure>
    <div class="dos">${frase(d)}<div class="mision card"><h3>Misión del día</h3><p>${esc(d.mision)}</p></div></div>
    ${d.datos?.length ? `<h2>Datos</h2><div class="datos">${d.datos.map(x => `<div class="dato card">
      ${x.imagen ? `<img loading="lazy" src="${img(f, x.imagen)}" alt="Referencia: ${esc(x.libro)}, pág. ${esc(x.pagina)}" data-zoom>` : ''}
      <div><p>${esc(x.texto)}</p><p class="credito">${esc(x.libro)}${x.pagina ? `, pág. ${esc(x.pagina)}` : ''}</p></div></div>`).join('')}</div>` : ''}
    <section class="mi-trabajo"><h2>Mi trabajo</h2>${(TR[f] || []).length ? `<div class="trabajos">${TR[f].map(t => `<figure class="card trabajo"><img loading="lazy" src="${t.url}" alt="Mi trabajo del ${f}" data-zoom>${t.nota ? `<figcaption>${esc(t.nota)}</figcaption>` : ''}<button class="borrar" data-borrar="${t.id}" title="Borrar">✕</button></figure>`).join('')}</div>` : `<p class="vacio-t">Todavía no subiste tu dibujo de este día.</p>`}
      <button class="btn sec" id="subir-btn2">⬆ Subir mi trabajo</button></section>
    <nav class="pn">${prev ? `<a href="/dia/${prev.fecha}">← ${esc(prev.tema)}</a>` : '<span></span>'}${next ? `<a href="/dia/${next.fecha}">${esc(next.tema)} →</a>` : '<span></span>'}</nav>
  </article>`;
}
async function route() {
  const p = location.pathname, m = p.match(/^\/dia\/(\d{4}-\d{2}-\d{2})\/?$/);
  if (!localStorage.getItem('timer') || !JSON.parse(localStorage.getItem('timer')).running) document.title = 'Diario de dibujo';
  if (m) await dia(m[1]); else if (p.startsWith('/dias')) await archivo(); else await home();
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mes]');
  if (b) { calMes = new Date(calMes.getFullYear(), calMes.getMonth() + +b.dataset.mes, 1); getIndex().then(d => document.getElementById('cal').innerHTML = calendario(d)); return; }
  const z = e.target.closest('[data-zoom]'), lb = document.getElementById('lightbox');
  if (z) { lb.querySelector('img').src = z.src; lb.hidden = false; return; }
  if (e.target.closest('#lightbox')) { lb.hidden = true; return; }
  const a = e.target.closest('a[href^="/"]');
  if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); route(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('lightbox').hidden = true; });
addEventListener('popstate', route);
initTimer(document.getElementById('timer'));
route();
