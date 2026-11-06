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
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  return {
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
  };
}

const MEASURE = `(() => {
  const box = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const nat = el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 0;
    const used = r.height ? r.width / r.height : 0;
    return {
      src: (el.currentSrc || el.src || '').split('/').pop(),
      w: r.width, h: r.height, x: r.x, y: r.y,
      nat, drift: nat ? Math.abs(used - nat) / nat : 1,
      fit: cs.objectFit, pos: cs.objectPosition, bg: cs.backgroundColor,
    };
  };
  const lb = document.getElementById('lightbox');
  const lbr = lb?.getBoundingClientRect();
  const canvas = document.getElementById('inst-canvas');
  const cr = canvas?.getBoundingClientRect();
  return {
    vw: innerWidth, vh: innerHeight,
    lb: lb ? { pos: getComputedStyle(lb).position, hidden: lb.hidden, w: lbr.width, h: lbr.height, x: lbr.x, y: lbr.y } : null,
    moods: [...document.querySelectorAll('.mood img')].map(box),
    datos: [...document.querySelectorAll('.dato img')].map(box),
    refs: [...document.querySelectorAll('.inst-refs img')].map(box),
    side: box(document.querySelector('.inst-ref-side img')),
    focus: box(document.querySelector('.focus > img')),
    light: box(document.querySelector('#lightbox img')),
    mosaic: box(document.querySelector('.mosaico a img')),
    canvas: canvas ? { w: cr.width, h: cr.height } : null,
  };
})()`;

test('visor: el marco sigue el ratio y la lámina entra entera', async () => {
  const vitePort = await freePort();
  const debugPort = await freePort();
  const profile = await mkdtemp(join(tmpdir(), 'visor-chrome-'));
  const build = spawn('node', ['scripts/build-index.mjs'], { cwd: process.cwd(), stdio: 'ignore' });
  await new Promise((resolve, reject) => { build.on('exit', code => code ? reject(new Error('build-index ' + code)) : resolve()); });
  const vite = spawn('npx', ['vite', '--port', String(vitePort), '--strictPort', '--host', '127.0.0.1'], {
    cwd: process.cwd(), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let viteLog = '';
  vite.stdout.on('data', d => { viteLog += d; });
  vite.stderr.on('data', d => { viteLog += d; });
  const chrome = spawn('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { detached: true, stdio: 'ignore' });

  async function session() {
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
    async function evalJs(expression) {
      const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval');
      return r.result.value;
    }
    async function go(url, w, h) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: 1, mobile: w < 700,
      });
      await client.send('Page.navigate', { url });
      await evalJs(`new Promise(res => {
        const start = Date.now();
        const tick = () => {
          const imgs = [...document.images].filter(i => i.getAttribute('src'));
          if (document.querySelector('h1, .inst-tema') && imgs.length && imgs.every(i => i.complete) && Date.now() - start > 200) return res(true);
          if (Date.now() - start > 8000) return res(false);
          setTimeout(tick, 80);
        };
        tick();
      })`);
    }
    async function measure() {
      return evalJs(`(${MEASURE})`);
    }
    return { go, evalJs, measure, close: () => ws.close() };
  }

  try {
    await waitForHttp(`http://127.0.0.1:${vitePort}/`);
    const ui = await session();
    const base = `http://127.0.0.1:${vitePort}`;

    await ui.go(`${base}/dia/2026-11-06`, 1440, 900);
    let m = await ui.measure();
    const mood = m.moods[0];
    assert.equal(mood.src, 'moodboard.webp');
    assert.ok(mood.drift < 0.02, `moodboard deformado ${mood.drift}`);
    assert.equal(mood.fit, 'contain');
    assert.ok(mood.w > 600, `el moodboard de hoy no usa el alto disponible (${mood.w})`);
    const vertical = m.datos.find(d => d.src === 'moreaux-pag369.webp');
    assert.ok(vertical, 'falta la lámina vertical');
    assert.ok(vertical.drift < 0.02, `lámina vertical recortada o deformada ${vertical.drift}`);
    assert.equal(vertical.fit, 'contain');
    assert.ok(vertical.h > 500, `la lámina sigue chica (${vertical.h})`);

    await ui.evalJs(`document.querySelector('img[src$="moreaux-pag369.webp"]').click()`);
    m = await ui.measure();
    assert.equal(m.lb.pos, 'fixed');
    assert.equal(m.lb.hidden, false);
    assert.ok(m.lb.x <= 1 && m.lb.y <= 1 && m.lb.w >= m.vw - 20 && m.lb.h >= m.vh - 20, `el modal no cubre la ventana ${m.lb.w}x${m.lb.h} @${m.lb.x},${m.lb.y} vs ${m.vw}x${m.vh}`);
    assert.ok(m.light.drift < 0.02, `modal de la lámina ${m.light.drift}`);
    assert.equal(m.light.fit, 'contain');
    assert.ok(m.light.y >= -1 && m.light.y + m.light.h <= m.vh + 1, 'la lámina se sale del modal');
    assert.ok(m.light.h > m.vh * 0.9, `la lámina no usa el alto del modal (${m.light.h})`);

    await ui.go(`${base}/dia/2026-10-31`, 1440, 900);
    m = await ui.measure();
    const landscape = m.datos.find(d => d.src === 'esbozar-pag60.webp');
    assert.ok(landscape, 'falta la referencia apaisada');
    assert.ok(landscape.drift < 0.02, `apaisada ${landscape.drift}`);
    assert.equal(landscape.fit, 'contain');
    assert.ok(landscape.w > landscape.h, 'la referencia apaisada no se lee en horizontal');

    await ui.go(`${base}/dia/2026-11-06`, 390, 844);
    await ui.evalJs(`document.querySelector('img[src$="moreaux-pag369.webp"]').click()`);
    m = await ui.measure();
    assert.equal(m.lb.pos, 'fixed');
    assert.ok(m.light.drift < 0.02, `modal móvil ${m.light.drift}`);
    assert.ok(m.light.w > m.vw * 0.9, `el modal móvil deja margen (${m.light.w}/${m.vw})`);
    assert.ok(m.light.y >= -1 && m.light.y + m.light.h <= m.vh + 1);

    await ui.go(`${base}/`, 1440, 900);
    m = await ui.measure();
    assert.equal(m.moods[0].src, 'moodboard.webp');
    assert.ok(m.moods[0].drift < 0.02, `Hoy ${m.moods[0].drift}`);
    assert.ok(m.moods[0].w > 500);

    await ui.go(`${base}/instalacion`, 1440, 900);
    m = await ui.measure();
    assert.equal(m.refs.length, 2);
    for (const ref of m.refs) {
      assert.ok(ref.drift < 0.02, `instalación con banda ${ref.src} ${ref.drift}`);
      assert.equal(ref.fit, 'contain');
      assert.ok(!/247,\s*244,\s*234/.test(ref.bg), `fondo de papel en ${ref.src}`);
    }

    await ui.evalJs(`document.getElementById('inst-dibujar').click()`);
    await ui.evalJs(`new Promise(res => { const t = () => document.getElementById('inst-canvas') ? res(true) : setTimeout(t, 40); t(); })`);
    await ui.evalJs(`new Promise(r => setTimeout(r, 300))`);
    const drawMood = await ui.measure();
    assert.ok(drawMood.canvas.w > 400 && drawMood.canvas.h > 300, `lienzo ${drawMood.canvas.w}x${drawMood.canvas.h}`);
    assert.ok(drawMood.side.drift < 0.02);
    await ui.evalJs(`document.getElementById('inst-side').click()`);
    await ui.evalJs(`new Promise(r => setTimeout(r, 200))`);
    const drawRef = await ui.measure();
    assert.equal(drawRef.side.src.includes('moodboard'), false);
    assert.ok(drawRef.side.drift < 0.02, `referencia del dibujo ${drawRef.side.drift}`);
    assert.ok(Math.abs(drawRef.canvas.w - drawMood.canvas.w) < 2 && Math.abs(drawRef.canvas.h - drawMood.canvas.h) < 2, 'cambiar de lámina mueve el lienzo');

    await ui.go(`${base}/diario`, 1440, 900);
    m = await ui.measure();
    assert.equal(m.mosaic.fit, 'cover');
    assert.match(m.mosaic.pos, /center|50%/);

    ui.close();
  } catch (err) {
    err.message += `\n--- vite ---\n${viteLog.slice(-1500)}`;
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
