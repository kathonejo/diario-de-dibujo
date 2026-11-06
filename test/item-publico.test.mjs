import assert from 'node:assert/strict';
import { test } from 'node:test';
import { itemPublico } from '../api/instalacion.js';

test('la entrega trae strokes en el GET y no el hash de IP', () => {
  const item = itemPublico({
    id: 'entrega',
    fecha: '2026-11-05',
    url: 'https://blob.example/d.webp',
    tema: 'Estudio de línea',
    w: 1200,
    h: 900,
    strokes: [{ t: 'grafito', c: '#1A1A1A', sz: 1, p: [[10, 20, 0.4], [30, 40, 0.6]] }],
    ipHash: 'no-publicar',
  }, 'https://blob.example/d.json');
  assert.equal(item.hasStrokes, true);
  assert.equal(item.strokes.length, 1);
  assert.equal(item.strokes[0].t, 'grafito');
  assert.equal(item.metaUrl, 'https://blob.example/d.json');
  assert.equal(item.tema, 'Estudio de línea');
  assert.equal('ipHash' in item, false);
});

test('un dibujo sin trazos sigue en el mural como foto', () => {
  const item = itemPublico({ id: 'foto', strokes: [], ipHash: 'x', tema: 'Solo imagen' }, null);
  assert.equal(item.hasStrokes, false);
  assert.deepEqual(item.strokes, []);
  assert.equal(item.metaUrl, null);
});
