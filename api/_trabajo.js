// Reglas de los trabajos del día (álbum): validación pura, sin red. La usan api/trabajos.js y api/upload.js.
import { limpiarAutor, limpiarRed } from './_autoria.js';

export const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 8 * 1024 * 1024;
export const AUTORA = 'Kathonejo';
const RUTA = /^trabajos\/(\d{4}-\d{2}-\d{2})\/([\w-]{1,40})\.(jpe?g|png|webp)$/i;

const sinHtml = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').trim();

/** Fecha válida y no más de un día en el futuro (zonas horarias). */
export function fechaSubible(f, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return false;
  const t = Date.parse(f + 'T00:00:00Z');
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === f && t <= now + 36 * 3600e3 && f >= '2024-01-01';
}

/** Ruta del archivo de imagen que se va a subir directo a Blob. */
export function rutaValida(pathname) {
  const m = RUTA.exec(pathname || '');
  return m && fechaSubible(m[1]) ? { fecha: m[1], id: m[2] } : null;
}

/** ¿Es una trampa para bots? (campo oculto completado) */
export const esBot = b => !!String(b?.web ?? '').trim();

/**
 * Arma el registro de un trabajo a partir del POST. esKatherine = clave correcta.
 * Devuelve { item } o { error, status }.
 */
export function armarItem(b, { esKatherine, now = new Date() } = {}) {
  if (!esKatherine && esBot(b)) return { error: 'Datos no válidos', status: 400 };
  if (!fechaSubible(b?.fecha, now.getTime())) return { error: 'Fecha no válida', status: 400 };
  const id = String(b.id || '').replace(/[^\w-]/g, '').slice(0, 40);
  let ruta = '';
  try { ruta = new URL(String(b.url)).pathname.replace(/^\//, ''); } catch {}
  const r = rutaValida(ruta);
  if (!id || !r || r.id !== id || r.fecha !== b.fecha) return { error: 'Datos no válidos', status: 400 };
  let autor = limpiarAutor(b.autor);
  const red = limpiarRed(b.red);
  if (esKatherine && !autor) autor = AUTORA;
  if (!esKatherine && !autor) return { error: 'Falta el nombre', status: 400 };
  const it = { id, fecha: b.fecha, url: String(b.url), nota: sinHtml(b.nota).slice(0, 500), creado: now.toISOString(), autor };
  if (red) it.red = red;
  if (!esKatherine) it.publica = true;
  return { item: it };
}

/** Los trabajos de Katherine son los que no vienen del álbum público (incluye los viejos, sin campo). */
export const esDeKatherine = it => !it?.publica;

/** Separa los trabajos de un día: los de ella primero, luego el álbum. */
export function separar(lista = []) {
  return { propios: lista.filter(esDeKatherine), album: lista.filter(x => !esDeKatherine(x)) };
}
/** Trabajo principal del día (para el Diario): el de ella (viejo con clave, o a nombre de Kathonejo); si no, el primero del álbum. */
export const principal = (lista = []) => lista.find(esDeKatherine) || lista.find(x => /^kathonejo$/i.test(String(x.autor || '').trim())) || lista[0] || null;
