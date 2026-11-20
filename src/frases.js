// Citas cortas de Operadores Mágicos para el globo del conejo de la portada.
// Salen SOLO de las frases reales de cada día (content/AAAA-MM-DD/dia.json → frase, y su traducción en i18n/AAAA-MM-DD.json).
// No se inventa ni se reescribe nada: se filtran las cortas y se conserva la traducción existente.
export const MAX_CITA = 120;

/** Autor corto para el globo: sin «vía …», sin « · obra · capítulo» y sin paréntesis. */
export function autorCorto(autor) {
  return String(autor || '')
    .split(' · ')[0]
    .split(/,\s*(?:vía|via)\s/i)[0]
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const limpia = f => {
  const texto = String(f?.texto || '').replace(/\s+/g, ' ').trim();
  const autor = autorCorto(f?.autor);
  return texto && autor ? { texto, autor } : null;
};

/**
 * dias = [{ fecha, frase, i18n? }] (como los arma scripts/build-index.mjs).
 * Devuelve [{ fecha, es:{texto,autor}, en?:{…}, pt?:{…} }] solo con las citas cuyo texto en español mide ≤ max.
 * Si falta la traducción, el cliente cae al español (igual que el resto de la app).
 */
export function extraerFrases(dias, max = MAX_CITA) {
  const out = [];
  for (const d of dias) {
    const es = limpia(d.frase);
    if (!es || es.texto.length > max) continue;
    const item = { fecha: d.fecha, es };
    for (const l of ['en', 'pt']) {
      const tr = d.i18n?.[l]?.frase;
      if (!tr) continue;
      const fr = limpia({ texto: tr.texto || d.frase.texto, autor: tr.autor || d.frase.autor });
      if (fr && fr.texto.length <= Math.round(max * 1.35)) item[l] = fr;
    }
    out.push(item);
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
