import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'content'), out = path.join(root, 'public', 'content');
// Traducciones (inglés/portugués) de cada día: i18n/AAAA-MM-DD.json, fuera de content/ para que publicar_dia.sh no las pise.
// Si el propio dia.json ya trae "i18n", se respeta; el archivo de i18n/ lo completa o lo corrige.
const trDir = path.join(root, 'i18n');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const dias = [];
let traducidos = 0;
for (const f of fs.readdirSync(src).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))) {
  const j = path.join(src, f, 'dia.json'); if (!fs.existsSync(j)) continue;
  const d = JSON.parse(fs.readFileSync(j, 'utf8'));
  fs.cpSync(path.join(src, f), path.join(out, f), { recursive: true });
  const trFile = path.join(trDir, `${f}.json`);
  if (fs.existsSync(trFile)) {
    const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
    d.i18n = { ...(d.i18n || {}) };
    for (const [l, v] of Object.entries(tr)) d.i18n[l] = { ...(d.i18n[l] || {}), ...v };
  }
  if (d.i18n) { traducidos++; fs.writeFileSync(path.join(out, f, 'dia.json'), JSON.stringify(d, null, 2)); }
  const temas = d.i18n ? Object.fromEntries(Object.entries(d.i18n).filter(([, v]) => v?.tema).map(([l, v]) => [l, { tema: v.tema }])) : null;
  dias.push({ fecha: f, tema: d.tema, moodboard: d.moodboard, frase: d.frase, generado: d.generado || null, formato: d.formato || null, ...(temas && Object.keys(temas).length ? { i18n: temas } : {}) });
}
dias.sort((a, b) => b.fecha.localeCompare(a.fecha));
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(dias));
console.log(`index: ${dias.length} días (${traducidos} con traducción)`);
