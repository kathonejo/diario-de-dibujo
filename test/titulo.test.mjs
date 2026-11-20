import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { partirTema, tituloHTML, CORTO, MAX_TITULAR } from '../src/titulo.js';

test('«Cabeza (marco: tema): descripción» → titular corto + bajada (ES/EN/PT)', () => {
  assert.deepEqual(partirTema('Integración (viernes, noviembre: la mancha y la aguada): la mancha al servicio de la forma — volumen con aguada'),
    { titular: 'Integración: la mancha y la aguada', bajada: 'La mancha al servicio de la forma — volumen con aguada', partido: true });
  const en = partirTema('Integration (Friday, November: blots and washes): the blot in service of form — volume with washes on basic shapes, an animal in motion from line to mass, and a head in ink and wash');
  assert.equal(en.titular, 'Integration: blots and washes');
  assert.match(en.bajada, /^The blot in service of form/);
  assert.equal(partirTema('Integração (sexta-feira, novembro: a mancha e a aguada): a mancha a serviço da forma — volume com aguada em formas básicas, animal em movimento').titular, 'Integração: a mancha e a aguada');
});

test('«Cabeza: tema (detalle)» → el paréntesis pasa a la bajada', () => {
  const r = partirTema('Anatomía humana: el pie y el tobillo (arco, talón y apoyo y algo más para que pase el límite)');
  assert.deepEqual([r.titular, r.bajada], ['Anatomía humana: el pie y el tobillo', 'Arco, talón y apoyo y algo más para que pase el límite']);
});

test('titular demasiado largo → solo la cabeza; el detalle conserva todo el texto', () => {
  const t = 'Día experimental: figura humana en movimiento con carbón y aguada monocolor (apunte rápido, líneas de movimiento y direccionales)';
  const r = partirTema(t);
  assert.equal(r.titular, 'Día experimental');
  assert.ok(r.titular.length <= MAX_TITULAR);
  assert.match(r.bajada, /^Figura humana en movimiento con carbón y aguada monocolor \(apunte rápido/);
});

test('temas cortos o sin separadores no se parten (el CSS los achica con clamp)', () => {
  assert.deepEqual(partirTema('Valor y Masa'), { titular: 'Valor y Masa', bajada: '', partido: false });
  const largo = 'Un título largo sin ningún separador que sigue y sigue y sigue';
  assert.equal(partirTema(largo).bajada, '');
  assert.match(tituloHTML(largo), /class="tit tit-largo"/);
  assert.equal(partirTema('').titular, '');
  assert.equal(partirTema(undefined).partido, false);
});

test('tituloHTML escapa HTML y deja el tema completo en title', () => {
  const h = tituloHTML('Tema <b>: algo que es bastante largo para pasar el límite de caracteres "x" (detalle)');
  assert.ok(!h.includes('<b>'));
  assert.match(h, /<h1 class="tit" title="[^"]*&lt;b&gt;/);
  assert.match(h, /<h1 class="tit"[^>]*>Tema &lt;b&gt;<\/h1><p class="bajada">Algo que es bastante largo/);
});

test('todos los temas reales (content/ e i18n/) se parten sin perder texto', () => {
  const temas = [];
  for (const f of fs.readdirSync('content')) {
    const j = `content/${f}/dia.json`; if (!fs.existsSync(j)) continue;
    temas.push(JSON.parse(fs.readFileSync(j, 'utf8')).tema);
    const i = `i18n/${f}.json`;
    if (fs.existsSync(i)) for (const v of Object.values(JSON.parse(fs.readFileSync(i, 'utf8')))) if (v.tema) temas.push(v.tema);
  }
  assert.ok(temas.length > 100);
  const palabras = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ');
  for (const t of temas) {
    const r = partirTema(t);
    assert.ok(r.titular, t);
    if (r.partido) {
      assert.ok(r.titular.length <= MAX_TITULAR, `titular largo: ${r.titular}`);
      const orig = new Set(palabras(t));
      for (const w of palabras(`${r.titular} ${r.bajada}`)) assert.ok(orig.has(w), `palabra inventada «${w}» en ${t}`);
    }
  }
});
