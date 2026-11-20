// Autoría de un trabajo subido: nombre y red (opcionales). Lo usan la API (al guardar) y la página (al mostrar).
const sinHtml = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();

export const LIMITE_AUTOR = 60, LIMITE_RED = 120;

export function limpiarAutor(s) { return sinHtml(s).slice(0, LIMITE_AUTOR).trim(); }

/** Red: link http(s), dominio sin protocolo (se le agrega https://) o texto corto como @usuario. Nunca otro protocolo. */
export function limpiarRed(s) {
  let r = sinHtml(s).replace(/\s/g, '').replace(/["'`]/g, '').slice(0, LIMITE_RED);
  if (!r) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(r) && !/^https?:\/\//i.test(r)) return ''; // javascript:, data:, mailto:, etc.
  if (!/^https?:\/\//i.test(r) && /^(www\.)?[a-z\d-]+(\.[a-z\d-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(r)) r = 'https://' + r;
  if (/^https?:\/\//i.test(r)) {
    try { const u = new URL(r); return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href.slice(0, LIMITE_RED) : ''; } catch { return ''; }
  }
  return r.slice(0, 40);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** HTML de la red: link si es una URL http(s); si es @usuario u otro texto, texto plano (no sabemos de qué red es). */
export function redHTML(red) {
  const r = limpiarRed(red); if (!r) return '';
  if (/^https?:\/\//i.test(r)) {
    const vista = r.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    return `<a href="${esc(r)}" target="_blank" rel="noopener noreferrer nofollow ugc">${esc(vista.length > 40 ? vista.slice(0, 39) + '…' : vista)}</a>`;
  }
  return `<span>${esc(r)}</span>`;
}

/** Línea de autoría («por Autor · red») o vacío si el trabajo no tiene esos datos (trabajos viejos). */
// Los trabajos viejos (subidos con la clave, sin campo publica ni autor) son de Kathonejo.
const autorDe = it => limpiarAutor(it?.autor) || (it && !it.publica ? 'Kathonejo' : '');
export function autoriaHTML(it, por = 'por') {
  const autor = autorDe(it), red = redHTML(it?.red);
  if (!autor && !red) return '';
  return `<p class="autoria">${autor ? `${esc(por)} ${esc(autor)}` : ''}${autor && red ? ' · ' : ''}${red}</p>`;
}
/** Texto plano para title/alt. */
export function autoriaTexto(it, por = 'por') {
  const autor = autorDe(it), red = limpiarRed(it?.red);
  return [autor ? `${por} ${autor}` : '', red].filter(Boolean).join(' · ');
}
