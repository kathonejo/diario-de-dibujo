// Parte el "tema" del día en un titular corto y una bajada (buenas prácticas: título breve y grande,
// detalle aparte en letra más chica). No toca el contenido: es solo presentación, para todos los días e idiomas.
//
// Regla (en orden):
//  1. Si el tema es corto (≤ CORTO caracteres) no se parte.
//  2. «Cabeza (marco: tema): descripción»  → titular «Cabeza: tema», bajada «descripción».
//     (El paréntesis intermedio suele ser «(noviembre: la mancha y la aguada)» o «(viernes, noviembre: …)»; se queda lo que sigue a «:».)
//  3. «Cabeza: tema (detalle)» / «Cabeza: tema — detalle» → titular «Cabeza: tema», bajada «detalle».
//  4. «Cabeza: descripción larga» sin paréntesis ni raya → titular «Cabeza», bajada «descripción».
//  5. Sin ninguno de esos separadores → todo el tema como titular (el CSS lo achica con clamp()).
// Si el titular que sale es demasiado largo (> MAX_TITULAR) se queda solo con la «Cabeza».
export const CORTO = 48;
export const MAX_TITULAR = 64;

/** Posiciones de nivel 0 (fuera de paréntesis) de un carácter o texto. */
function topNivel(s) {
  const res = []; let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') { if (depth === 0) res.push({ i, c: '(' }); depth++; }
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) res.push({ i, c });
  }
  return res;
}
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const limpia = s => (s || '').replace(/\s+/g, ' ').replace(/^[\s:—–-]+|[\s:—–-]+$/g, '').trim();
const sinParen = s => limpia(s).replace(/^\(([^()]*)\)$/, '$1');

export function partirTema(tema) {
  const full = limpia(tema);
  const entero = { titular: full, bajada: '', partido: false };
  if (!full || full.length <= CORTO) return entero;

  const top = topNivel(full);
  const dosPuntos = top.find(x => x.c === ':');
  const paren = top.find(x => x.c === '(');
  const raya = top.find(x => (x.c === '—' || x.c === '–') && full[x.i - 1] === ' ');
  let titular = '', bajada = '';

  if (dosPuntos && paren && paren.i < dosPuntos.i) {
    // «Cabeza (marco: tema): descripción»
    const cierre = full.indexOf(')', paren.i);
    const dentro = full.slice(paren.i + 1, cierre);
    const tema2 = limpia(dentro.includes(':') ? dentro.slice(dentro.lastIndexOf(':') + 1) : dentro);
    titular = `${limpia(full.slice(0, paren.i))}: ${tema2}`;
    bajada = full.slice(dosPuntos.i + 1);
  } else if (dosPuntos) {
    const resto = full.slice(dosPuntos.i + 1);
    const sep = [paren, raya].filter(x => x && x.i > dosPuntos.i).sort((a, b) => a.i - b.i)[0];
    if (sep) { titular = limpia(full.slice(0, sep.i)); bajada = full.slice(sep.i + 1); }
    else { titular = limpia(full.slice(0, dosPuntos.i)); bajada = resto; }
    if (sep && sep.c === '(') bajada = full.slice(sep.i);
  } else if (paren && paren.i > 0) {
    titular = limpia(full.slice(0, paren.i)); bajada = full.slice(paren.i);
  } else if (raya) {
    titular = limpia(full.slice(0, raya.i)); bajada = full.slice(raya.i + 1);
  }
  if (titular && titular.length > MAX_TITULAR && dosPuntos && dosPuntos.i < titular.length) {
    bajada = `${limpia(titular.slice(dosPuntos.i + 1))}${bajada ? ` ${limpia(bajada)}` : ''}`;
    titular = limpia(full.slice(0, dosPuntos.i));
  }
  titular = limpia(titular); bajada = sinParen(limpia(bajada));
  if (!titular || !bajada) return entero;
  return { titular, bajada: cap(bajada), partido: true };
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** HTML del encabezado: <h1 class="tit"> + bajada. El texto completo queda en title/aria para lectores y buscadores. */
export function tituloHTML(tema) {
  const { titular, bajada, partido } = partirTema(tema);
  const largo = !partido && titular.length > CORTO ? ' tit-largo' : '';
  return `<h1 class="tit${largo}" title="${esc(tema)}">${esc(titular)}</h1>${bajada ? `<p class="bajada">${esc(bajada)}</p>` : ''}`;
}
