import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'content'), out = path.join(root, 'public', 'content');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const dias = [];
for (const f of fs.readdirSync(src).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))) {
  const j = path.join(src, f, 'dia.json'); if (!fs.existsSync(j)) continue;
  const d = JSON.parse(fs.readFileSync(j, 'utf8'));
  fs.cpSync(path.join(src, f), path.join(out, f), { recursive: true });
  dias.push({ fecha: f, tema: d.tema, moodboard: d.moodboard, frase: d.frase });
}
dias.sort((a, b) => b.fecha.localeCompare(a.fecha));
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(dias));
console.log(`index: ${dias.length} días`);
