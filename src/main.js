import './style.css';
import { initTimer } from './timer.js';
import { openFocus } from './focus.js';
import { getTrabajos, dialogoSubir, borrar, puedeModerar } from './trabajos.js';
import { principal } from '../api/_trabajo.js';
import { instalacion, leaveInstalacion } from './instalacion.js';
import { autoriaHTML, autoriaTexto } from '../api/_autoria.js';
import { t, initLang, fechaLarga, nombreMes, iniciales, localizarDia, temaIndice } from './i18n.js';
initLang();
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const parse = f => { const [y,m,d] = f.split('-').map(Number); return new Date(y, m-1, d); };
const largo = f => fechaLarga(f);
const img = (f, n) => `/content/${f}/${n}`;
const genBadge = d => '';
const fmtGen = g => {
  const [y,m,d] = String(g).split('-');
  if (!d) return g;
  return `${Number(d)}/${Number(m)}`;
};
let indice = null;
const getIndex = async () => indice ??= await fetch('/content/index.json').then(r => r.ok ? r.json() : []).catch(() => []);
const getDia = f => fetch(`/content/${f}/dia.json`).then(r => r.ok ? r.json() : null).catch(() => null).then(d => localizarDia(d));

function frase(d) {
  if (!d?.frase?.texto) return '';
  return `<blockquote class="frase"><p>“${esc(d.frase.texto)}”</p>${d.frase.autor ? `<cite>— ${esc(d.frase.autor)}</cite>` : ''}</blockquote>`;
}

function normPaleta(p) {
  if (!p) return [];
  const arr = Array.isArray(p) ? p : (typeof p === 'object' ? Object.entries(p).map(([k, v]) => (typeof v === 'string' ? { nombre: k, hex: v } : { nombre: k, ...v })) : []);
  return arr.map(c => typeof c === 'string' ? { hex: c } : { nombre: c.nombre ?? c.name ?? c.nombre_color ?? '', hex: c.hex ?? c.color ?? c.valor ?? '' })
    .filter(c => /^#?[0-9a-f]{3,8}$/i.test(c.hex)).map(c => ({ ...c, hex: (c.hex.startsWith('#') ? c.hex : '#' + c.hex).toUpperCase() }));
}
export function paletaHTML(p, cls = '') {
  const cs = normPaleta(p); if (!cs.length) return '';
  return `<div class="paleta ${cls}">${cs.map(c => `<button class="sw" data-hex="${c.hex}" title="${t('copy', { hex: c.hex })}"><i style="background:${c.hex}"></i><span>${esc(c.nombre)}</span><code>${c.hex}</code></button>`).join('')}</div>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('.sw'); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.hex); } catch { const t = Object.assign(document.createElement('textarea'), { value: b.dataset.hex }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  const c = b.querySelector('code'); c.textContent = t('copied'); b.classList.add('ok'); setTimeout(() => { c.textContent = b.dataset.hex; b.classList.remove('ok'); }, 1200);
});

let calMes = null;
let TR = {};
function calendario(dias) {
  const set = new Set(dias.map(d => d.fecha));
  const base = calMes ?? parse(dias[0]?.fecha ?? new Date().toLocaleDateString('sv'));
  calMes = new Date(base.getFullYear(), base.getMonth(), 1);
  const y = calMes.getFullYear(), m = calMes.getMonth();
  const off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m+1, 0).getDate();
  const hoy = new Date().toLocaleDateString('sv');
  let cells = '<span></span>'.repeat(off);
  for (let i = 1; i <= n; i++) {
    const f = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const cls = f === hoy ? ' hoy' : '';
    const tr = principal(TR[f]);
    cells += set.has(f) ? `<a href="/dia/${f}" class="c tiene${cls}${tr ? ' con-trabajo' : ''}"${tr ? ` style="background-image:url('${tr.url}')" title="${esc([t('cal.trabajo'), autoriaTexto(tr, t('por'))].filter(Boolean).join(' · '))}"` : ''}><span>${i}</span></a>` : `<span class="c${cls}">${i}</span>`;
  }
  return `<div class="cal card"><div class="cal-h"><button data-mes="-1" aria-label="${t('cal.prev')}">‹</button><strong>${nombreMes(m)} ${y}</strong><button data-mes="1" aria-label="${t('cal.next')}">›</button></div>
  <div class="cal-g">${iniciales().map(d=>`<b>${d}</b>`).join('')}${cells}</div></div>`;
}
const miniTrabajo = (l = []) => {
  const p = principal(l); if (!p) return '';
  return `<img class="mini-trabajo" loading="lazy" src="${esc(p.url)}" alt="${t('album')}" title="${esc([autoriaTexto(p, t('por')), t('album.n', { n: l.length })].filter(Boolean).join(' · '))}">`;
};
const lista = dias => `<ul class="lista">${dias.map(d => `<li><a href="/dia/${d.fecha}"><img loading="lazy" src="${img(d.fecha, d.moodboard)}" alt=""><span><small>${largo(d.fecha)}</small><strong>${esc(temaIndice(d))}</strong></span>${miniTrabajo(TR[d.fecha])}</a></li>`).join('')}</ul>`;

const manifiesto = n => `<div class="manifiesto"><img src="/mascota.png" alt=""><p>${t('manifiesto', { n })}</p></div>`;

async function home() {
  const [dias, tr] = await Promise.all([getIndex(), getTrabajos()]); TR = tr;
  if (!dias.length) { app.innerHTML = `<section class="vacio"><h1>${t('home.vacio.h')}</h1><p>${t('home.vacio.p')}</p></section>`; return; }
  const u = dias[0], d = await getDia(u.fecha);
  app.innerHTML = `<section class="home-banner">
    <p class="home-banner-lead">${t('home.lead')}</p>
    <p class="home-banner-extra">${t('home.extra1')}</p>
    <p class="home-banner-extra">${t('home.extra2')}</p>
    <p class="home-banner-mantra">${t('home.mantra')}</p>
    <div class="home-banner-cta">
      <a class="btn" href="/instalacion">${t('nav.instalacion')}</a>
    </div>
  </section>
  <section class="hero">
    <a href="/dia/${u.fecha}" class="mood"><img src="${img(u.fecha, d.moodboard)}" alt="${t('moodboard.alt', { tema: esc(d.tema) })}"></a>
    <div class="hero-t"><p class="eyebrow">${t('ultimo', { fecha: largo(u.fecha) })}</p><h1>${esc(d.tema)}</h1>${genBadge(d)}${frase(d)}
    <div class="mision card"><h3>${t('mision')}</h3><p>${esc(d.mision)}</p></div>
    ${manifiesto(dias.length)}
    <div class="acciones" style="margin-top:1.2rem">
      <a class="btn" href="/dia/${u.fecha}">${t('ir.dia')}</a>
      <a class="btn sec" href="/diario">${t('ver.diario')}</a>
    </div></div></section>`;
}
async function diario() {
  const [dias, tr] = await Promise.all([getIndex(), getTrabajos()]); TR = tr;
  document.title = `${t('nav.diario')} · ${t('site')}`;
  // Más reciente primero.
  const orden = [...dias].sort((a,b) => b.fecha.localeCompare(a.fecha));
  const primero = orden[orden.length - 1];
  app.innerHTML = `<section class="obra-head">
    <p class="eyebrow">${t('site')}</p>
    <h1>${t('diario.h')}</h1>
    <p>${t('diario.p')}</p>
    <span class="cuenta"><i></i>${t('diario.cuenta', { n: orden.length, fecha: primero ? largo(primero.fecha) : '—' })}</span>
  </section>
  <div class="mosaico">${orden.map(d => `<a href="/dia/${d.fecha}" title="${esc(temaIndice(d))}">
    <img loading="lazy" src="${img(d.fecha, d.moodboard)}" alt="${esc(temaIndice(d))}">
    <span class="cap"><small>${largo(d.fecha)}</small><strong>${esc(temaIndice(d))}</strong></span>
  </a>`).join('')}</div>
  <section class="archivo">
    <div><h2>${t('calendario')}</h2>${manifiesto(dias.length)}<div id="cal">${calendario(dias)}</div></div>
    <div><h2>${t('todos')}</h2>${lista(dias)}</div>
  </section>`;
}
const figTrabajo = (tr, alt, mod) => `<figure class="card trabajo"><img loading="lazy" src="${esc(tr.url)}" alt="${alt}" data-zoom>${tr.nota ? `<figcaption>${esc(tr.nota)}</figcaption>` : ''}${autoriaHTML(tr, t('por'))}${mod ? `<button class="borrar" data-borrar="${esc(tr.id)}" title="${t('borrar')}">✕</button>` : ''}</figure>`;
async function dia(f) {
  const [d, dias, tr] = await Promise.all([getDia(f), getIndex(), getTrabajos()]); TR = tr;
  if (!d) { app.innerHTML = `<section class="vacio"><h1>${t('dia.no.h')}</h1><p>${t('dia.no.p', { f: esc(f) })}</p><a class="btn" href="/">${t('volver.inicio')}</a></section>`; return; }
  const i = dias.findIndex(x => x.fecha === f), prev = dias[i+1], next = dias[i-1];
  const imgs = [{ src: img(f, d.moodboard), label: t('moodboard') }, ...(d.datos || []).filter(x => x.imagen).map(x => ({ src: img(f, x.imagen), label: t('pag', { p: x.pagina ?? '' }) }))];
  queueMicrotask(() => {
    document.getElementById('focus-btn').onclick = () => openFocus(imgs, 0, paletaHTML(d.paleta, 'mini'));
    const sub = () => dialogoSubir(f, () => dia(f), { album: true });
    document.getElementById('album-btn').onclick = () => dialogoSubir(f, () => dia(f), { album: true });
    document.getElementById('subir-btn').onclick = sub;
    app.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => { if (confirm(t('borrar.confirm')) && await borrar(f, b.dataset.borrar)) dia(f); });
  });
  const album = TR[f] || [], mod = puedeModerar();
  document.title = `${d.tema} · ${t('site')}`;
  app.innerHTML = `<article class="dia">
    <p class="eyebrow">${largo(f)}</p><h1>${esc(d.tema)}</h1>${genBadge(d)}
    <div class="acciones"><button class="btn" id="focus-btn">${t('focus')}</button><button class="btn sec" id="subir-btn">${t('subir')}</button></div>
    <figure class="mood grande"><img src="${img(f, d.moodboard)}" alt="${t('moodboard.alt', { tema: esc(d.tema) })}" data-zoom><figcaption>${t('foto1')}</figcaption></figure>
    ${normPaleta(d.paleta).length ? `<section class="paleta-sec"><h3>${t('paleta')}</h3>${paletaHTML(d.paleta)}<p class="hint">${t('paleta.hint')}</p></section>` : ''}
    <div class="dos">${frase(d)}<div class="mision card"><h3>${t('mision')}</h3><p>${esc(d.mision)}</p></div></div>
    ${d.datos?.length ? `<h2>${t('datos')}</h2><div class="datos">${d.datos.map(x => `<div class="dato card">
      ${x.imagen ? `<img loading="lazy" src="${img(f, x.imagen)}" alt="${t('ref.alt', { libro: esc(x.libro), p: esc(x.pagina) })}" data-zoom>` : ''}
      <div><p>${esc(x.texto)}</p><p class="credito">${esc(x.libro)}${x.pagina ? t('credito.pag', { p: esc(x.pagina) }) : ''}</p></div></div>`).join('')}</div>` : ''}
    <section class="mi-trabajo album" id="album"><h2>${t('album')}</h2>${album.length ? `<div class="trabajos">${album.map(tr => figTrabajo(tr, t('album.alt', { a: esc(tr.autor || (tr.publica ? '' : 'Kathonejo')), f }), mod)).join('')}</div>` : `<p class="vacio-t">${t('album.vacio')}</p>`}
      <button class="btn sec" id="album-btn">${t('album.subir')}</button></section>
    <nav class="pn">${prev ? `<a href="/dia/${prev.fecha}">← ${esc(temaIndice(prev))}</a>` : '<span></span>'}${next ? `<a href="/dia/${next.fecha}">${esc(temaIndice(next))} →</a>` : '<span></span>'}</nav>
  </article>`;
}
async function route({ scroll = true } = {}) {
  const p = location.pathname, m = p.match(/^\/dia\/(\d{4}-\d{2}-\d{2})\/?$/);
  if (!p.startsWith('/instalacion')) leaveInstalacion();
  if (!localStorage.getItem('timer') || !JSON.parse(localStorage.getItem('timer')).running) document.title = t('site');
  if (p.startsWith('/instalacion')) await instalacion(app);
  else if (m) await dia(m[1]);
  else if (p.startsWith('/diario') || p.startsWith('/obra') || p.startsWith('/dias')) {
    if (p.startsWith('/obra') || p.startsWith('/dias')) history.replaceState(null, '', '/diario');
    await diario();
  }
  else await home();
  if (scroll) window.scrollTo(0, 0);
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
addEventListener('popstate', () => route());
// Al cambiar de idioma se vuelve a dibujar la página actual sin saltar arriba.
document.addEventListener('langchange', () => route({ scroll: false }));
initTimer(document.getElementById('timer'));
route();
