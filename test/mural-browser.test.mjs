import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { test } from 'node:test';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
}

async function waitForHttp(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch { /* vite todavía no escucha */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`sin respuesta de ${url}`);
}

function cdp(ws) {
  let seq = 0;
  const pending = new Map();
  const exceptions = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params?.exceptionDetails?.text || 'exception');
    }
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  return {
    exceptions,
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
  };
}

async function openPage(debugPort, url) {
  const expected = new URL(url).search;
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(r => r.json());
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const client = cdp(ws);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Page.navigate', { url });
  const start = Date.now();
  let payload = null;
  while (Date.now() - start < 40000) {
    const evaled = await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify({done:document.documentElement.dataset.done||"",page:document.documentElement.dataset.page||""})',
      returnByValue: true,
    });
    let state = { done: '', page: '' };
    try { state = JSON.parse(evaled.result?.value || '{}'); } catch { /* página a medias */ }
    if (state.done && state.page === expected) {
      const body = await client.send('Runtime.evaluate', {
        expression: 'document.documentElement.dataset.result || "{}"',
        returnByValue: true,
      });
      payload = JSON.parse(body.result?.value || '{}');
      payload.done = state.done;
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  ws.close();
  if (!payload) throw new Error(`la página no terminó: ${url}`);
  if (client.exceptions.length) payload.cdpExceptions = client.exceptions;
  return payload;
}

test('mural: timelapse de 33 dibujos, textos y reduced motion', async () => {
  const vitePort = await freePort();
  const debugPort = await freePort();
  const profile = await mkdtemp(join(tmpdir(), 'mural-chrome-'));
  const vite = spawn('npx', ['vite', '--port', String(vitePort), '--strictPort', '--host', '127.0.0.1'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let viteLog = '';
  vite.stdout.on('data', d => { viteLog += d; });
  vite.stderr.on('data', d => { viteLog += d; });
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1280',
    'about:blank',
  ], { detached: true, stdio: 'ignore' });

  try {
    await waitForHttp(`http://127.0.0.1:${vitePort}/test/harness.html`);
    const live = await openPage(debugPort, `http://127.0.0.1:${vitePort}/test/harness.html`);
    assert.equal(live.done, 'ok', JSON.stringify(live, null, 2));
    assert.deepEqual(live.texts, {
      eyebrow: 'Composición colectiva',
      title: 'El mural',
      hoy: 'Hoy',
      todo: 'Todos los días',
      draw: 'Dibujar',
      close: 'Cerrar',
      meta: live.texts.meta,
    });
    assert.match(live.texts.meta, /33 dibujos/);
    assert.match(live.texts.meta, /noviembre/);
    assert.equal(live.tiles, 33);
    assert.equal(live.frame.tiles, 33);
    assert.equal(live.frame.outside, 0, 'algún dibujo queda fuera del plano');
    assert.ok(live.frame.scroll <= 2, `el mural scrollea ${live.frame.scroll}px`);
    assert.ok(live.live >= 20, `en vivo ${live.live}`);
    assert.ok(live.hashed >= 20);
    assert.ok(live.unique >= 6, `firmas únicas ${live.unique} de ${live.hashed}`);
    assert.ok(live.median < 34, `mediana ${live.median}ms`);
    assert.ok(live.slow <= 4, `frames lentos ${live.slow} / ${live.samples}`);
    assert.match(live.todos, /33 dibujos en total/);
    assert.match(live.hoy, /33 dibujos/);
    assert.match(live.hoy, /noviembre/);
    assert.equal(live.replayHidden, true);
    assert.deepEqual(live.errors, []);

    const reduce = await openPage(debugPort, `http://127.0.0.1:${vitePort}/test/harness.html?reduce=1`);
    assert.equal(reduce.done, 'ok', JSON.stringify(reduce, null, 2));
    assert.equal(reduce.texts.title, 'El mural');
    assert.equal(reduce.texts.hoy, 'Hoy');
    assert.equal(reduce.texts.todo, 'Todos los días');
    assert.equal(reduce.tiles, 33);
    assert.equal(reduce.live, 0);
    assert.equal(reduce.mediaAfterWait, 1, 'reduced motion no precarga los trazos del mural');
    assert.equal(reduce.timeouts90, 0);
    assert.ok(reduce.ink > 8, `tinta del replay ${reduce.ink}`);
    assert.deepEqual(reduce.errors, []);
  } catch (err) {
    err.message += `\n--- vite ---\n${viteLog.slice(-2000)}`;
    throw err;
  } finally {
    vite.stdout.destroy();
    vite.stderr.destroy();
    for (const child of [chrome, vite]) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }
    await rm(profile, { recursive: true, force: true });
  }
});
