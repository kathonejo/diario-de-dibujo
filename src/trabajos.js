import { upload } from '@vercel/blob/client';
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
  p = prompt((msg ? msg + '\n' : '') + 'Código para subir trabajos:');
  if (!p) return null;
  const ok = await fetch('/api/trabajos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: p.trim(), check: true }) }).then(r => r.ok);
  if (!ok) return pedirCodigo('Código incorrecto.');
  localStorage.setItem(KEY, p.trim()); return p.trim();
}
export function dialogoSubir(fecha, onDone) {
  const d = document.createElement('dialog'); d.className = 'subir';
  d.innerHTML = `<form method="dialog"><h3>Subir mi trabajo</h3><p class="sub">${fecha}</p>
    <label class="drop"><input type="file" accept="image/jpeg,image/png,image/webp" required><span>Elegí una foto (jpg, png o webp)</span><img hidden alt=""></label>
    <label>Nota (opcional)<textarea maxlength="500" rows="3" placeholder="¿Qué aprendiste hoy?"></textarea></label>
    <p class="estado" aria-live="polite"></p>
    <div class="acc"><button value="cancel" formnovalidate>Cancelar</button><button class="primary" value="ok">Subir</button></div></form>`;
  document.body.append(d); d.showModal();
  const inp = d.querySelector('input'), prev = d.querySelector('.drop img'), est = d.querySelector('.estado');
  inp.onchange = () => { const f = inp.files[0]; if (f) { prev.src = URL.createObjectURL(f); prev.hidden = false; d.querySelector('.drop span').textContent = f.name; } };
  d.addEventListener('close', () => d.remove());
  d.querySelector('form').addEventListener('submit', async e => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    const f = inp.files[0]; if (!f) return;
    const pass = await pedirCodigo(); if (!pass) return;
    const btn = d.querySelector('.primary'); btn.disabled = true;
    try {
      est.textContent = 'Preparando imagen…';
      const blob = await comprimir(f);
      const ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[blob.type] || 'jpg';
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      est.textContent = 'Subiendo…';
      const r = await upload(`trabajos/${fecha}/${id}.${ext}`, blob, { access: 'public', handleUploadUrl: '/api/upload', clientPayload: JSON.stringify({ passcode: pass }), contentType: blob.type });
      const res = await fetch('/api/trabajos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: pass, fecha, id, url: r.url, nota: d.querySelector('textarea').value }) });
      if (!res.ok) throw new Error((await res.json()).error);
      est.textContent = '¡Listo!'; await getTrabajos(true); d.close(); onDone?.();
    } catch (err) {
      if (/código/i.test(err.message)) localStorage.removeItem(KEY);
      est.textContent = 'No se pudo subir: ' + err.message; btn.disabled = false;
    }
  });
}
export async function borrar(fecha, id) {
  const pass = await pedirCodigo(); if (!pass) return false;
  const r = await fetch('/api/trabajos', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: pass, fecha, id }) });
  await getTrabajos(true); return r.ok;
}
