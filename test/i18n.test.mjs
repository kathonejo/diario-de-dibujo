import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectLang, t, fechaLarga, localizarDia, temaIndice, tError } from '../src/i18n.js';

test('?lang= manda sobre lo guardado y el navegador', () => {
  assert.equal(detectLang({ search: '?lang=en', stored: 'pt', languages: ['es-AR'] }), 'en');
  assert.equal(detectLang({ search: '?lang=PT', languages: ['en-US'] }), 'pt');
  assert.equal(detectLang({ search: '?lang=fr', stored: 'pt' }), 'pt', 'un ?lang= desconocido se ignora');
});

test('la elección guardada manda sobre el navegador', () => {
  assert.equal(detectLang({ stored: 'pt', languages: ['es-AR'] }), 'pt');
  assert.equal(detectLang({ stored: 'es', languages: ['en-US'] }), 'es');
});

test('idioma del navegador: es→ES, pt→PT, en u otro→EN; sin datos→ES', () => {
  assert.equal(detectLang({ languages: ['es-AR', 'en'] }), 'es');
  assert.equal(detectLang({ languages: ['pt-BR'] }), 'pt');
  assert.equal(detectLang({ languages: ['en-GB'] }), 'en');
  assert.equal(detectLang({ languages: ['fr-FR', 'de'] }), 'en');
  assert.equal(detectLang({ languages: ['fr-FR', 'pt-PT'] }), 'pt', 'usa el primero que reconoce');
  assert.equal(detectLang({ languages: [] }), 'es');
});

test('los textos en español quedan idénticos y lo que falta cae al español', () => {
  assert.equal(t('nav.instalacion', null, 'es'), 'Instalación');
  assert.equal(t('manifiesto', { n: 37 }, 'es'), 'Un ejercicio nuevo cada día: frase, misión, moodboard y referencias. Hoy hay <strong>37</strong> días publicados.');
  assert.equal(t('nav.instalacion', null, 'en'), 'Installation');
  assert.equal(t('nav.diario', null, 'pt'), 'Diário');
  assert.equal(t('nav.hoy', null, 'xx'), 'Hoy', 'idioma desconocido → español');
  assert.equal(tError('Demasiados trazos', 'en'), 'Too many strokes');
  assert.equal(tError('Mensaje nuevo sin traducir', 'pt'), 'Mensaje nuevo sin traducir');
});

test('fechas largas en los tres idiomas', () => {
  assert.equal(fechaLarga('2026-11-19', { lang: 'es' }), 'jueves 19 de noviembre de 2026');
  assert.equal(fechaLarga('2026-11-19', { lang: 'en' }), 'Thursday, November 19, 2026');
  assert.equal(fechaLarga('2026-11-19', { lang: 'pt' }), 'quinta-feira, 19 de novembro de 2026');
  assert.equal(fechaLarga('2026-11-19', { lang: 'es', anio: false }), 'jueves 19 de noviembre');
});

test('un día se traduce campo por campo y lo no traducido queda en español', () => {
  const d = {
    tema: 'Valor y Masa', mision: 'Ver dos masas', frase: { texto: 'Hola', autor: 'Castaneda' },
    paleta: [{ nombre: 'Gris perla', hex: '#EEE' }, { nombre: 'Sin traducir', hex: '#000' }],
    datos: [{ texto: 'uno', libro: 'Libro', pagina: 3 }, { texto: 'dos', libro: 'Libro', pagina: 4 }],
    i18n: { en: { tema: 'Value and Mass', frase: { texto: 'Hello' }, paleta: { 'Gris perla': 'Pearl gray' }, datos: [{ texto: 'one' }] } },
  };
  assert.equal(localizarDia(d, 'es'), d, 'en español no se toca nada');
  const en = localizarDia(d, 'en');
  assert.equal(en.tema, 'Value and Mass');
  assert.equal(en.mision, 'Ver dos masas');
  assert.deepEqual(en.frase, { texto: 'Hello', autor: 'Castaneda' });
  assert.deepEqual(en.paleta.map(c => c.nombre), ['Pearl gray', 'Sin traducir']);
  assert.deepEqual(en.datos.map(x => x.texto), ['one', 'dos']);
  assert.equal(en.datos[0].libro, 'Libro');
  assert.equal(en._es.tema, 'Valor y Masa', 'guarda el original para el mural');
  assert.equal(localizarDia(d, 'pt'), d, 'sin traducción al portugués → español');
  assert.equal(temaIndice({ tema: 'Valor', i18n: { pt: { tema: 'Valor PT' } } }, 'pt'), 'Valor PT');
  assert.equal(temaIndice({ tema: 'Valor' }, 'en'), 'Valor');
});
