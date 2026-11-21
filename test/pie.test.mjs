import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pie } from '../src/pie.js';
import { setLang } from '../src/i18n.js';

test('el pie del Diario solo trae Instagram y X de diariodedibujo', () => {
  setLang('es', { store: false });
  const html = pie();
  assert.match(html, /Contacto/);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/diariodedibujoapp"/);
  assert.match(html, /href="https:\/\/x\.com\/diariodedibujo"/);
  assert.equal((html.match(/target="_blank"/g) || []).length, 2);
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2);
  assert.equal(html.includes('Kathonejo@gmail.com'), false);
  assert.equal(html.includes('mailto:'), false);
  assert.equal(html.includes('kathonejo'), false);
  assert.equal(html.includes('behance'), false);
  assert.equal(html.includes('linkedin'), false);
  assert.equal(html.includes('Cosmovisión'), false);
  assert.equal(html.includes('site-foot-name'), false);
});
