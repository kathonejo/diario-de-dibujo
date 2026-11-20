import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { extraerFrases, autorCorto, MAX_CITA } from '../src/frases.js';
import { MOTIVACION, armarCiclo, barajar, citasEn } from '../src/mascota.js';

function dias() {
  return fs.readdirSync('content').filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f)).map(f => {
    const d = JSON.parse(fs.readFileSync(`content/${f}/dia.json`, 'utf8'));
    const i = `i18n/${f}.json`;
    return { fecha: f, frase: d.frase, i18n: fs.existsSync(i) ? JSON.parse(fs.readFileSync(i, 'utf8')) : undefined };
  });
}

test('autorCorto deja solo el nombre (sin «vía…», obra ni paréntesis)', () => {
  assert.equal(autorCorto('Suely Rolnik, vía Claudia Rodríguez-Ponga Linares · Pequeño tratado, Cap. 1 (Banco de Citas)'), 'Suely Rolnik');
  assert.equal(autorCorto('Suely Rolnik, via Claudia Rodríguez-Ponga Linares · Small Treatise'), 'Suely Rolnik');
  assert.equal(autorCorto('María Zambrano · Operador #4 · La Sibila'), 'María Zambrano');
  assert.equal(autorCorto('Taisha Abelar (linaje de don Juan, Castaneda) · Operador #9'), 'Taisha Abelar');
  assert.equal(autorCorto('Carlos Castaneda'), 'Carlos Castaneda');
  assert.equal(autorCorto(undefined), '');
});

test('las citas del conejo salen SOLO de las frases reales de content/ e i18n/, cortas y con autor', () => {
  const ds = dias(), citas = extraerFrases(ds);
  assert.ok(citas.length >= 15, 'hay suficientes citas cortas');
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  for (const c of citas) {
    const d = ds.find(x => x.fecha === c.fecha);
    assert.equal(c.es.texto, norm(d.frase.texto), `texto ES idéntico al original (${c.fecha})`);
    assert.ok(c.es.texto.length <= MAX_CITA, `corta (${c.fecha})`);
    assert.ok(c.es.autor && norm(d.frase.autor).startsWith(c.es.autor.split(',')[0]), `autor real (${c.fecha})`);
    for (const l of ['en', 'pt']) {
      if (!c[l]) continue;
      assert.equal(c[l].texto, norm(d.i18n[l].frase.texto || d.frase.texto), `traducción existente intacta (${c.fecha}/${l})`);
      assert.ok(c[l].autor);
    }
  }
  // las largas quedan fuera
  const largas = ds.filter(d => d.frase?.texto && d.frase.texto.length > MAX_CITA).map(d => d.fecha);
  for (const f of largas) assert.ok(!citas.some(c => c.fecha === f), `larga excluida (${f})`);
});

test('sin traducción cae al español', () => {
  const [c] = extraerFrases([{ fecha: '2026-01-01', frase: { texto: 'Hola mundo.', autor: 'Alguien · Obra' } }]);
  assert.deepEqual(citasEn([c], 'en'), [{ texto: 'Hola mundo.', autor: 'Alguien' }]);
});

test('frases para practicar: 10–12 por idioma, sin autor, cortas', () => {
  for (const l of ['es', 'en', 'pt']) {
    assert.ok(MOTIVACION[l].length >= 10 && MOTIVACION[l].length <= 12, l);
    for (const f of MOTIVACION[l]) assert.ok(f.length <= 60, `${l}: ${f}`);
    assert.equal(new Set(MOTIVACION[l]).size, MOTIVACION[l].length);
  }
  assert.equal(MOTIVACION.es.length, MOTIVACION.en.length);
  assert.equal(MOTIVACION.es.length, MOTIVACION.pt.length);
});

test('armarCiclo mezcla 2 frases para practicar + 1 cita y no pierde ni repite nada', () => {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const citas = [1, 2, 3].map(n => ({ texto: `c${n}`, autor: 'A' }));
  const ciclo = armarCiclo(['a', 'b', 'c', 'd', 'e'], citas, rnd);
  assert.equal(ciclo.length, 8);
  assert.deepEqual(ciclo.map(x => !!x.autor), [false, false, true, false, false, true, false, true]);
  assert.deepEqual(ciclo.filter(x => !x.autor).map(x => x.texto).sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(barajar([1, 2, 3, 4], rnd).sort(), [1, 2, 3, 4]);
  assert.equal(armarCiclo(['a'], []).length, 1);
});
