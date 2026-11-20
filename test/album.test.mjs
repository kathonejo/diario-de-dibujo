import assert from 'node:assert/strict';
import { test } from 'node:test';
import { limpiarAutor, limpiarRed, redHTML, autoriaHTML, autoriaTexto } from '../api/_autoria.js';
import { armarItem, rutaValida, fechaSubible, separar, principal, esBot } from '../api/_trabajo.js';
import { crearLimite } from '../api/_rate.js';

const NOW = new Date('2026-11-20T04:00:00Z');
const base = { fecha: '2026-11-19', id: 'abc123', url: 'https://x.public.blob.vercel-storage.com/trabajos/2026-11-19/abc123.webp' };

test('autor: sin HTML, sin controles, con límite', () => {
  assert.equal(limpiarAutor('  <b>Ana</b>   Pérez '), 'Ana Pérez');
  assert.equal(limpiarAutor('<script>alert(1)</script>Lu'), 'alert(1)Lu');
  assert.equal(limpiarAutor('x'.repeat(200)).length, 60);
  assert.equal(limpiarAutor(undefined), '');
});

test('red: solo http(s); dominios sin protocolo pasan a https; @usuario queda como texto', () => {
  assert.equal(limpiarRed('https://instagram.com/kathonejo'), 'https://instagram.com/kathonejo');
  assert.equal(limpiarRed('instagram.com/kathonejo'), 'https://instagram.com/kathonejo');
  assert.equal(limpiarRed('javascript:alert(1)'), '');
  assert.equal(limpiarRed('data:text/html,hola'), '');
  assert.equal(limpiarRed('@kathonejo'), '@kathonejo');
  assert.equal(limpiarRed('<img src=x onerror=alert(1)>@ana'), '@ana');
  assert.equal(limpiarRed('https://x.com/"onmouseover=alert(1)'), 'https://x.com/onmouseover=alert(1)');
});

test('redHTML: link seguro para URLs, texto plano para @usuario', () => {
  const a = redHTML('https://www.instagram.com/kathonejo/');
  assert.match(a, /^<a href="https:\/\/www\.instagram\.com\/kathonejo\/" target="_blank" rel="noopener noreferrer nofollow ugc">instagram\.com\/kathonejo<\/a>$/);
  assert.equal(redHTML('@kathonejo'), '<span>@kathonejo</span>');
  assert.equal(redHTML('javascript:alert(1)'), '');
});

test('autoría: los trabajos viejos (subidos con clave, sin campos) quedan a nombre de Kathonejo', () => {
  assert.equal(autoriaHTML({ id: 'viejo', nota: 'hola' }), '<p class="autoria">por Kathonejo</p>');
  assert.equal(autoriaTexto({ id: 'viejo' }, 'by'), 'by Kathonejo');
  assert.equal(autoriaHTML(null), '');
  assert.equal(autoriaHTML({ autor: 'Ana', red: '@ana' }, 'by'), '<p class="autoria">by Ana · <span>@ana</span></p>');
  assert.equal(autoriaTexto({ autor: 'Ana', red: '@ana' }), 'por Ana · @ana');
});

test('visitante: nombre obligatorio, queda en el álbum (publica)', () => {
  assert.equal(armarItem({ ...base }, { esKatherine: false, now: NOW }).error, 'Falta el nombre');
  const { item } = armarItem({ ...base, autor: '<i>Ana</i>', red: 'instagram.com/ana', nota: '<b>hola</b>' }, { esKatherine: false, now: NOW });
  assert.equal(item.autor, 'Ana');
  assert.equal(item.red, 'https://instagram.com/ana');
  assert.equal(item.nota, 'hola');
  assert.equal(item.publica, true);
});

test('Katherine con clave: autor por defecto Kathonejo y no es del álbum público', () => {
  const { item } = armarItem({ ...base }, { esKatherine: true, now: NOW });
  assert.equal(item.autor, 'Kathonejo');
  assert.equal('publica' in item, false);
});

test('trampa para bots, rutas y fechas', () => {
  assert.equal(esBot({ web: 'spam.com' }), true);
  assert.equal(armarItem({ ...base, autor: 'Bot', web: 'x' }, { now: NOW }).error, 'Datos no válidos');
  assert.equal(armarItem({ ...base, autor: 'Ana', id: 'otro' }, { now: NOW }).error, 'Datos no válidos');
  assert.equal(armarItem({ ...base, autor: 'Ana', url: 'https://x/trabajos/2026-11-19/abc123.svg' }, { now: NOW }).error, 'Datos no válidos');
  assert.equal(armarItem({ ...base, autor: 'Ana', fecha: '2027-01-01', url: base.url.replace('2026-11-19', '2027-01-01') }, { now: NOW }).error, 'Fecha no válida');
  assert.deepEqual(rutaValida('trabajos/2026-11-19/abc123.png'), { fecha: '2026-11-19', id: 'abc123' });
  assert.equal(rutaValida('trabajos/2026-11-19/../x.png'), null);
  assert.equal(rutaValida('instalacion/2026-11-19/x.png'), null);
  assert.equal(fechaSubible('2026-02-30'), false);
});

test('Diario: el dibujo de Katherine va primero; el álbum aparte', () => {
  const l = [{ id: 'a', publica: true }, { id: 'k' }, { id: 'b', publica: true }];
  assert.equal(principal(l).id, 'k');
  assert.deepEqual(separar(l).album.map(x => x.id), ['a', 'b']);
  assert.equal(principal([{ id: 'a', publica: true }]).id, 'a');
  assert.equal(principal([]), null);
  assert.equal(principal([{ id: 'a', publica: true, autor: 'Ana' }, { id: 'k2', publica: true, autor: 'Kathonejo' }]).id, 'k2');
});

test('límite por IP', () => {
  const ok = crearLimite(2, 1000);
  assert.equal(ok('ip', 0), true); assert.equal(ok('ip', 1), true); assert.equal(ok('ip', 2), false);
  assert.equal(ok('otra', 2), true); assert.equal(ok('ip', 1500), true);
});
