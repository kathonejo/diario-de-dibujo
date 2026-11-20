/** Estudio del día: dibujar en pantalla al lado de la referencia, y subir el dibujo al Álbum del día. */
import { t } from './i18n.js';
import { MATERIALES, material, presion, pintar, repintar, pintarPapel, crearHistorial, formatoLienzo } from './pinceles.js';
import { dialogoSubir } from './trabajos.js';
import { MAX_BYTES } from '../api/_trabajo.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let abierto = null;

/**
 * Abre el estudio. imgs = [{src,label}] (moodboard y páginas), paleta = [{hex,nombre}].
 * onSubido se llama cuando el dibujo ya está en el álbum.
 */
export function abrirEstudio({ fecha, tema = '', formato = '', imgs = [], paleta = [], refInicial = 0, onSubido } = {}) {
  if (abierto) return;
  const { w, h } = formatoLienzo(formato);
  const colores = [...new Map(paleta.filter(c => /^#[0-9a-f]{6}$/i.test(c?.hex || '')).map(c => [c.hex.toUpperCase(), c])).values()];
  const st = { tool: 'grafito', color: material('grafito').pig, size: 1, alpha: 1, tono: 'blanco', ref: refInicial, verRef: matchMedia('(min-width: 900px)').matches };
  const hist = crearHistorial();

  const el = document.createElement('div');
  el.className = 'estudio'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('es.titulo'));
  el.innerHTML = `
  <header class="es-top">
    <div class="es-tit"><strong>${t('es.titulo')}</strong><span>${esc(tema)}</span></div>
    <div class="es-top-acc">
      <button type="button" class="es-b" data-a="ref" aria-pressed="false">${t('es.ref')}</button>
      <button type="button" class="es-b" data-a="cerrar">${t('es.cerrar')}</button>
    </div>
  </header>
  <div class="es-main">
    <aside class="es-ref" ${imgs.length ? '' : 'hidden'}>
      <div class="es-ref-img"><img alt=""></div>
      ${imgs.length > 1 ? `<div class="es-ref-chips">${imgs.map((m, k) => `<button type="button" data-k="${k}"><img src="${esc(m.src)}" alt="">${esc(m.label)}</button>`).join('')}</div>` : ''}
    </aside>
    <div class="es-lienzo"><canvas width="${w}" height="${h}" aria-label="${t('es.lienzo')}"></canvas></div>
  </div>
  <div class="es-tools">
    <div class="es-mats" role="toolbar" aria-label="${t('es.materiales')}">
      ${MATERIALES.map(m => `<button type="button" class="es-mat" data-tool="${m.id}" title="${t(`es.m.${m.id}`)}" aria-pressed="false"><span class="es-ic">${m.icon}</span><span>${t(`es.m.${m.id}`)}</span></button>`).join('')}
    </div>
    <div class="es-fila">
      <label class="es-rango">${t('es.tam')}<input type="range" min="0.3" max="3" step="0.05" value="1" data-in="size"></label>
      <label class="es-rango">${t('es.opac')}<input type="range" min="0.1" max="1" step="0.05" value="1" data-in="alpha"></label>
      <div class="es-colores" role="toolbar" aria-label="${t('paleta')}">
        ${colores.map(c => `<button type="button" class="es-sw" data-c="${c.hex}" title="${esc(c.nombre || c.hex)}" style="--c:${c.hex}"></button>`).join('')}
        <button type="button" class="es-sw es-pig" data-c="" title="${t('es.pigmento')}"></button>
        <label class="es-otro" title="${t('es.color')}"><input type="color" data-in="color" value="#2b2b30"><span>${t('es.color')}</span></label>
      </div>
      <div class="es-papel" role="group" aria-label="${t('es.papel')}">
        <span>${t('es.papel')}</span>
        <button type="button" class="es-b" data-papel="blanco" aria-pressed="true">${t('es.papel.blanco')}</button>
        <button type="button" class="es-b" data-papel="entonado" aria-pressed="false">${t('es.papel.entonado')}</button>
      </div>
    </div>
    <div class="es-acc">
      <button type="button" class="es-b" data-a="deshacer">${t('i.deshacer')}</button>
      <button type="button" class="es-b" data-a="rehacer">${t('es.rehacer')}</button>
      <button type="button" class="es-b" data-a="limpiar">${t('es.limpiar')}</button>
      <button type="button" class="es-b" data-a="descargar">${t('es.descargar')}</button>
      <button type="button" class="es-b" data-a="archivo">${t('es.archivo')}</button>
      <button type="button" class="es-b es-prim" data-a="subir">${t('es.subir')}</button>
    </div>
    <p class="es-estado" aria-live="polite"></p>
  </div>`;
  document.body.append(el); document.body.classList.add('en-estudio');
  abierto = el;

  const cv = el.querySelector('canvas'), c2 = cv.getContext('2d', { willReadFrequently: true });
  const estado = el.querySelector('.es-estado');
  pintarPapel(c2, st.tono);
  // El lienzo guarda su tamaño real (para exportar) y se muestra ajustado al espacio disponible.
  const wrap = el.querySelector('.es-lienzo');
  const ajustar = () => { const r = wrap.getBoundingClientRect(), k = Math.min((r.width - 2) / w, (r.height - 2) / h); if (k > 0) { cv.style.width = Math.floor(w * k) + 'px'; cv.style.height = Math.floor(h * k) + 'px'; } };
  const ro = new ResizeObserver(ajustar); ro.observe(wrap); ajustar();

  // ── Referencia
  const refImg = el.querySelector('.es-ref-img img');
  const verRef = k => {
    if (!imgs.length) return;
    st.ref = (k + imgs.length) % imgs.length; refImg.src = imgs[st.ref].src; refImg.alt = imgs[st.ref].label || '';
    el.querySelectorAll('.es-ref-chips [data-k]').forEach(b => b.classList.toggle('sel', +b.dataset.k === st.ref));
  };
  const mostrarRef = on => { st.verRef = on && imgs.length > 0; el.classList.toggle('con-ref', st.verRef); el.querySelector('[data-a=ref]').setAttribute('aria-pressed', st.verRef); };
  verRef(st.ref); mostrarRef(st.verRef);

  // ── Material, color, tamaño
  const marcar = () => {
    el.querySelectorAll('.es-mat').forEach(b => { const on = b.dataset.tool === st.tool; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const m = material(st.tool);
    el.querySelectorAll('.es-sw').forEach(b => b.classList.toggle('on', !m.borra && (b.dataset.c || m.pig || '').toUpperCase() === st.color.toUpperCase() && (b.dataset.c ? true : !colores.some(c => c.hex.toUpperCase() === st.color.toUpperCase()))));
    const pig = el.querySelector('.es-pig'); pig.style.setProperty('--c', m.pig || '#888'); pig.hidden = !m.pig; pig.dataset.c = m.pig || '';
    el.querySelector('[data-in=color]').value = st.color.toLowerCase();
    el.classList.toggle('borrando', !!m.borra);
  };
  el.querySelector('.es-mats').onclick = e => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    const m = material(b.dataset.tool); st.tool = m.id;
    if (m.pig) st.color = m.pig; // cada material trae su pigmento; después se puede cambiar
    marcar();
  };
  el.querySelector('.es-colores').onclick = e => {
    const b = e.target.closest('[data-c]'); if (!b || !b.dataset.c) return;
    st.color = b.dataset.c; if (material(st.tool).borra) st.tool = 'grafito'; marcar();
  };
  el.querySelector('[data-in=color]').oninput = e => { st.color = e.target.value; if (material(st.tool).borra) st.tool = 'grafito'; marcar(); };
  el.querySelector('[data-in=size]').oninput = e => { st.size = +e.target.value; };
  el.querySelector('[data-in=alpha]').oninput = e => { st.alpha = +e.target.value; };
  el.querySelector('.es-papel').onclick = e => {
    const b = e.target.closest('[data-papel]'); if (!b) return;
    st.tono = b.dataset.papel; hist.vaciarFotos(); repintar(c2, hist.trazos, st.tono);
    el.querySelectorAll('[data-papel]').forEach(x => x.setAttribute('aria-pressed', x === b));
  };
  marcar();

  // ── Dibujo
  let actual = null, base = null, raf = 0;
  const foto = () => c2.getImageData(0, 0, cv.width, cv.height);
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height, _cx: e.clientX, _cy: e.clientY, _t: e.timeStamp }; };
  const dibujarActual = () => { raf = 0; if (!actual) return; c2.putImageData(base, 0, 0); pintar(c2, actual, st.tono); };
  cv.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch {}
    base = foto();
    const p = pos(e); p.pr = presion(e, null);
    actual = { tool: st.tool, color: st.color, size: st.size, alpha: st.alpha, points: [p] };
    dibujarActual();
  });
  cv.addEventListener('pointermove', e => {
    if (!actual) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents?.() || [e];
    for (const ev of (evs.length ? evs : [e])) {
      const last = actual.points[actual.points.length - 1], p = pos(ev);
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) continue;
      p.pr = presion(ev, last); actual.points.push(p);
    }
    if (!raf) raf = requestAnimationFrame(dibujarActual);
  });
  const fin = e => {
    if (!actual) return;
    e?.preventDefault?.();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    c2.putImageData(base, 0, 0); pintar(c2, actual, st.tono);
    hist.agregar({ ...actual, points: actual.points.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, pr: Math.round(p.pr * 100) / 100 })) }, base);
    actual = null; base = null; sucio = true;
  };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin); cv.addEventListener('lostpointercapture', fin);
  let sucio = false;

  // ── Acciones
  const exportar = async () => {
    for (const [tipo, q] of [['image/webp', 0.9], ['image/jpeg', 0.88], ['image/jpeg', 0.75]]) {
      const b = await new Promise(r => cv.toBlob(r, tipo, q));
      if (b && b.type === tipo && b.size <= MAX_BYTES) return b;
    }
    return await new Promise(r => cv.toBlob(r, 'image/png'));
  };
  const cerrar = (forzar = false) => {
    if (!forzar && hist.trazos.length && sucio && !confirm(t('es.salir.confirm'))) return;
    document.removeEventListener('keydown', tecla); ro.disconnect(); el.remove(); document.body.classList.remove('en-estudio'); abierto = null;
  };
  const tecla = e => {
    if (e.target.closest?.('dialog')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); accion(e.shiftKey ? 'rehacer' : 'deshacer'); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); accion('rehacer'); }
    else if (e.key === 'Escape' && !document.querySelector('dialog[open]')) cerrar();
  };
  document.addEventListener('keydown', tecla);
  async function accion(a) {
    if (a === 'cerrar') return cerrar();
    if (a === 'ref') return mostrarRef(!st.verRef);
    if (a === 'deshacer') { const r = hist.deshacer(); if (!r) return; r.foto ? c2.putImageData(r.foto, 0, 0) : repintar(c2, hist.trazos, st.tono); return; }
    if (a === 'rehacer') { const f0 = foto(); const tr = hist.rehacer(f0); if (!tr) return; tr.tool === 'limpiar' ? pintarPapel(c2, st.tono) : pintar(c2, tr, st.tono); return; }
    if (a === 'limpiar') { if (!hist.trazos.length || !confirm(t('es.limpiar.confirm'))) return; hist.agregar({ tool: 'limpiar' }, foto()); pintarPapel(c2, st.tono); return; }
    if (a === 'archivo') return dialogoSubir(fecha, () => { cerrar(true); onSubido?.(); }, { album: true });
    if (a === 'descargar' || a === 'subir') {
      if (!hist.trazos.some(x => x.tool !== 'limpiar')) { estado.textContent = t('es.vacio'); return; }
      const blob = await exportar();
      if (a === 'descargar') {
        const u = URL.createObjectURL(blob), l = Object.assign(document.createElement('a'), { href: u, download: `diario-${fecha}.${blob.type.split('/')[1]}` });
        document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); sucio = false; return;
      }
      dialogoSubir(fecha, () => { cerrar(true); onSubido?.(); }, { album: true, archivo: blob });
    }
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (b) return accion(b.dataset.a);
    const k = e.target.closest('.es-ref-chips [data-k]'); if (k) verRef(+k.dataset.k);
  });
  return { el, cerrar };
}
