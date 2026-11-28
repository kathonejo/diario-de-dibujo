import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MATERIALES, material, presion, crearHistorial, formatoLienzo, motorFondo, pintarTrazo } from '../src/pinceles.js';
import { t } from '../src/i18n.js';

test('materiales de las clases, cada uno con nombre en ES/EN/PT', () => {
  const ids = MATERIALES.map(m => m.id);
  for (const id of ['grafito', 'carbon', 'sanguina', 'tiza', 'acuarelable', 'pluma', 'pincel', 'seco', 'aguada', 'humedo', 'goma', 'moldeable', 'difumino']) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of MATERIALES) {
    for (const l of ['es', 'en', 'pt']) assert.notEqual(t(`es.m.${m.id}`, {}, l), `es.m.${m.id}`, `${m.id} ${l}`);
    assert.ok(m.borra || /^#[0-9A-F]{6}$/i.test(m.pig), `${m.id} trae pigmento`);
  }
  assert.equal(material('nada').id, 'grafito');
  assert.equal(t('es.abrir', {}, 'en'), 'Draw on screen');
});

test('presión: lápiz óptico usa la presión real; mouse y dedo, la velocidad', () => {
  assert.equal(presion({ pointerType: 'pen', pressure: 0.9 }, null), 0.9);
  assert.equal(presion({ pointerType: 'pen', pressure: 0.01 }, null), 0.04);
  const suave = presion({ pointerType: 'pen', pressure: 1 }, { pr: 0.2 });
  assert.ok(suave > 0.2 && suave < 1, 'suaviza saltos');
  assert.equal(presion({ pointerType: 'mouse', pressure: 0.5 }, null), 0.5);
  const last = { pr: 0.5, _cx: 0, _cy: 0, _t: 0 };
  const lento = presion({ pointerType: 'mouse', clientX: 3, clientY: 0, timeStamp: 40 }, last);
  const rapido = presion({ pointerType: 'mouse', clientX: 200, clientY: 0, timeStamp: 40 }, last);
  assert.ok(lento > rapido, 'más lento, más carga');
});

test('historial: deshacer y rehacer', () => {
  const h = crearHistorial(2);
  h.agregar({ id: 1 }, 'foto0'); h.agregar({ id: 2 }, 'foto1'); h.agregar({ id: 3 }, 'foto2');
  assert.deepEqual(h.trazos.map(x => x.id), [1, 2, 3]);
  let r = h.deshacer(); assert.equal(r.trazo.id, 3); assert.equal(r.foto, 'foto2');
  assert.equal(h.puedeRehacer, true);
  assert.equal(h.rehacer('f').id, 3);
  h.deshacer(); h.deshacer(); r = h.deshacer();
  assert.equal(r.trazo.id, 1); assert.equal(r.foto, null, 'foto vieja descartada: hay que repintar');
  assert.equal(h.puedeDeshacer, false);
  h.rehacer(); h.agregar({ id: 9 });
  assert.equal(h.puedeRehacer, false, 'un trazo nuevo borra el rehacer');
});

test('formato del lienzo según el día', () => {
  assert.deepEqual(formatoLienzo('vertical (2:3)'), { w: 1125, h: 1500 });
  assert.deepEqual(formatoLienzo('cuadrado (1:1)'), { w: 1350, h: 1350 });
  assert.deepEqual(formatoLienzo('horizontal (16:9)'), { w: 1500, h: 1125 });
  assert.deepEqual(formatoLienzo(''), { w: 1500, h: 1125 });
});

test('pintarTrazo: materiales del estudio y fondos de la Instalación, sin romper trazos viejos', () => {
  const ids = MATERIALES.map(m => m.id);
  for (const id of ids) assert.notEqual(t(`tool.${id}`, {}, 'es'), `tool.${id}`, id);
  for (const l of ['es', 'en', 'pt']) {
    for (const id of ids) assert.notEqual(t(`tool.${id}`, {}, l), `tool.${id}`, `${id} ${l}`);
  }
  assert.equal(motorFondo('pluma'), 'tinta');
  assert.equal(motorFondo('pincel'), 'tinta');
  assert.equal(motorFondo('aguada'), 'acuarela');
  assert.equal(motorFondo('humedo'), 'acuarela');
  assert.equal(motorFondo('acuarelable'), 'acuarela');
  assert.equal(motorFondo('carbon'), 'carbonilla');
  assert.equal(motorFondo('sanguina'), 'carbonilla');
  assert.equal(motorFondo('moldeable'), 'goma');
  assert.equal(motorFondo('difumino'), 'goma');
  assert.equal(motorFondo('grafito'), 'grafito');
  assert.equal(motorFondo('tinta'), 'tinta');
  assert.equal(typeof pintarTrazo, 'function');
});
