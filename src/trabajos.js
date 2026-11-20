import { upload } from '@vercel/blob/client';
import { t, tError } from './i18n.js';
import { LIMITE_AUTOR, LIMITE_RED } from '../api/_autoria.js';
import { MAX_BYTES } from '../api/_trabajo.js';
const AUT = 'diario-autoria';
const recordado = () => { try { return JSON.parse(localStorage.getItem(AUT) || '{}'); } catch { return {}; } };
const escA = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'diario-passcode';
let cache = null;
export const getTrabajos = async (force) => (!force && cache) ? cache :
  (cache = await fetch('/api/trabajos', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({})));

async function comprimir(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
    return blob && blob.type === 'image/webp' ? blob : file;
  } catch { return file; }
}
async function pedirCodigo(msg) {
  let p = localStorage.getItem(KEY);
  if (p && !msg) return p;
  p = prompt((msg ? msg + '\n' : '') + t('up.codigo'));
  if (!p) return null;
  const ok = await fetch('/api/trabajos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: p.trim(), check: true }) }).then(r => r.ok);
  if (!ok) return pedirCodigo(t('up.incorrecto'));
  localStorage.setItem(KEY, p.trim()); return p.trim();
}
/** Solo Katherine ve los botones de borrar: si ya guardó su clave en este navegador o entra con ?moderar. */
export const puedeModerar = () => { try { return !!localStorage.getItem(KEY) || new URLSearchParams(location.search).has('moderar'); } catch { return false; } };
export function dialogoSubir(fecha, onDone, { album = false } = {}) {
  const d = document.createElement('dialog'); d.className = 'subir';
  const rec = recordado();
  d.innerHTML = `<form method="dialog"><h3>${album ? t('album.subir') : t('subir')}</h3><p class="sub">${fecha} · ${t('album')}</p>
    <label class="drop"><input type="file" accept="image/jpeg,image/png,image/webp" required><span>${t('up.foto')}</span><img hidden alt=""></label>
    <label>${t('up.autor')}<input type="text" name="autor" maxlength="${LIMITE_AUTOR}" autocomplete="name" placeholder="${t('up.autor.ph')}" value="${escA(rec.autor)}" required></label>
    <label>${t('up.red')}<input type="text" name="red" maxlength="${LIMITE_RED}" autocomplete="url" inputmode="url" placeholder="${t('up.red.ph')}" value="${escA(rec.red)}"></label>
    <label>${t('up.nota')}<textarea maxlength="500" rows="3" placeholder="${t('up.placeholder')}"></textarea></label>
    <label class="hp" aria-hidden="true">Web<input type="text" name="web" tabindex="-1" autocomplete="off"></label>
    <p class="aviso">${t('up.publico')}</p>
    <p class="estado" aria-live="polite"></p>
    <div class="acc"><button value="cancel" formnovalidate>${t('up.cancelar')}</button><button class="primary" value="ok">${t('up.subir')}</button></div></form>`;
  document.body.append(d); d.showModal();
  const inp = d.querySelector('input[type=file]'), prev = d.querySelector('.drop img'), est = d.querySelector('.estado');
  const aut = d.querySelector('[name=autor]');
  inp.onchange = () => { const f = inp.files[0]; if (f) { prev.src = URL.createObjectURL(f); prev.hidden = false; d.querySelector('.drop span').textContent = f.name; } };
  d.addEventListener('close', () => d.remove());
  d.querySelector('form').addEventListener('submit', async e => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    const f = inp.files[0]; if (!f) return;
    const autor = aut.value.trim(), red = d.querySelector('[name=red]').value.trim(), web = d.querySelector('[name=web]').value;
    if (!autor) { aut.focus(); return; }
    try { localStorage.setItem(AUT, JSON.stringify({ autor, red })); } catch {}
    const btn = d.querySelector('.primary'); btn.disabled = true;
    try {
      est.textContent = t('up.preparando');
      const blob = await comprimir(f);
      if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) throw new Error('Imagen no válida');
      if (!blob.size || blob.size > MAX_BYTES) throw new Error('La imagen es demasiado grande o está vacía');
      const ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[blob.type] || 'jpg';
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      est.textContent = t('up.subiendo');
      const extra = { web }; // todos suben igual al álbum (build in public)
      const r = await upload(`trabajos/${fecha}/${id}.${ext}`, blob, { access: 'public', handleUploadUrl: '/api/upload', clientPayload: JSON.stringify(extra), contentType: blob.type });
      const res = await fetch('/api/trabajos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...extra, fecha, id, url: r.url, nota: d.querySelector('textarea').value, autor, red }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudo guardar');
      est.textContent = t('up.listo'); await getTrabajos(true); d.close(); onDone?.();
    } catch (err) {
      const m = String(err?.message || '');
      if (/código/i.test(m)) localStorage.removeItem(KEY);
      const conocido = ['Código incorrecto', 'Un toque más despacio', 'Falta el nombre', 'Archivo no válido', 'Ruta no válida', 'Datos no válidos', 'Fecha no válida', 'Imagen no válida', 'La imagen es demasiado grande'].find(k => m.includes(k));
      est.textContent = t('up.error') + tError(conocido ? m.slice(m.indexOf(conocido)) : m); btn.disabled = false;
    }
  });
}
export async function borrar(fecha, id) {
  const pass = await pedirCodigo(); if (!pass) return false;
  const r = await fetch('/api/trabajos', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: pass, fecha, id }) });
  await getTrabajos(true); return r.ok;
}
