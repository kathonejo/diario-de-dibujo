import '/src/style.css';
import { mural, leaveInstalacion } from '/src/instalacion.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function strokes() {
  const list = [];
  for (let s = 0; s < 28; s++) {
    const y = 48 + s * 28;
    const pts = [];
    for (let i = 0; i < 16; i++) pts.push([36 + i * 72, y + Math.sin(i * 0.7 + s) * 14, 0.35 + (i % 5) * 0.08]);
    list.push({ t: 'grafito', c: s % 2 ? '#1A1A1A' : '#1159CC', sz: 1.1, p: pts });
  }
  return list;
}

const SHARED = strokes();
const ITEMS = Array.from({ length: 33 }, (_, i) => ({
  id: `d${String(i).padStart(2, '0')}`,
  url: `/media/d${i}.webp`,
  metaUrl: `/media/d${String(i).padStart(2, '0')}.json`,
  hasStrokes: true,
  tema: 'Estudio de línea',
  w: 1200,
  h: 900,
  creado: new Date(Date.UTC(2026, 10, 5, 12, 0, i)).toISOString(),
}));

function installFetch() {
  const hits = { media: 0, api: 0, index: 0 };
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input?.url || input);
    if (url.includes('/content/index.json')) {
      hits.index += 1;
      return json([{ fecha: '2026-11-05', tema: 'Prueba', moodboard: 'moodboard.webp' }]);
    }
    if (url.includes('/api/instalacion')) {
      hits.api += 1;
      const items = ITEMS.map(it => ({ ...it }));
      return json({ items, total: items.length });
    }
    if (url.includes('/media/') && url.endsWith('.json')) {
      hits.media += 1;
      return json({ strokes: SHARED });
    }
    if (url.startsWith('/media/')) return new Response('', { status: 404 });
    return orig(input, init);
  };
  return hits;
}

function ink(canvas) {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let n = 0;
  for (let i = 0; i < data.length; i += 32) if (data[i] < 170 && data[i + 3] > 200) n += 1;
  return n;
}

function signature(canvas) {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 48) {
    h ^= data[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function waitFor(fn, ms, label) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    if (fn()) return;
    await new Promise(r => setTimeout(r, 40));
  }
  throw new Error(`timeout: ${label}`);
}

function texts() {
  const root = document.querySelector('.inst-mural');
  return {
    eyebrow: root.querySelector('.eyebrow')?.textContent,
    title: root.querySelector('h1')?.textContent,
    hoy: document.getElementById('m-hoy')?.textContent,
    todo: document.getElementById('m-todo')?.textContent,
    draw: root.querySelector('a.btn')?.textContent,
    close: document.getElementById('m-replay-x')?.textContent,
    meta: document.getElementById('m-meta')?.textContent,
  };
}

export async function run() {
  const errors = [];
  window.addEventListener('error', e => { if (e.message) errors.push(e.message); });
  window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
  const reduce = new URLSearchParams(location.search).has('reduce');
  const hits = installFetch();
  let timeouts90 = 0;
  const origTimeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...args) => {
    if (ms === 90) timeouts90 += 1;
    return origTimeout(fn, ms, ...args);
  };
  try {
    const stop = await mural(document.getElementById('app'));
    await waitFor(() => document.querySelectorAll('.inst-tile').length === 33, 4000, '33 fichas');
    const base = { texts: texts(), tiles: document.querySelectorAll('.inst-tile').length, hits: { ...hits }, errors: [...errors] };

    if (reduce) {
      await new Promise(r => setTimeout(r, 700));
      const tile = document.querySelector('.inst-tile');
      timeouts90 = 0;
      tile.click();
      await waitFor(() => document.getElementById('m-replay')?.hidden === false, 2000, 'replay');
      await new Promise(r => setTimeout(r, 80));
      const canvas = document.getElementById('m-replay-c');
      const result = {
        ...base,
        reduce: true,
        live: document.querySelectorAll('.inst-tl').length,
        mediaAfterWait: hits.media,
        timeouts90,
        ink: ink(canvas),
        errors,
      };
      document.getElementById('m-replay-x').click();
      stop?.();
      leaveInstalacion();
      document.documentElement.dataset.result = JSON.stringify(result);
      document.documentElement.dataset.done = 'ok';
      return;
    }

    await waitFor(() => document.querySelectorAll('.inst-tile.tl-live').length >= 20, 12000, 'timelapse en vivo');
    await new Promise(r => setTimeout(r, 600));
    const samples = [];
    await new Promise(resolve => {
      let frames = 0;
      let last = performance.now();
      const loop = (t) => {
        const dt = t - last;
        last = t;
        frames += 1;
        if (frames > 8) samples.push(dt);
        if (frames < 70) requestAnimationFrame(loop);
        else resolve();
      };
      requestAnimationFrame(loop);
    });
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    const slow = samples.filter(n => n > 50).length;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const sigs = [...document.querySelectorAll('.inst-tile.tl-live canvas')].map(signature);
    const liveCount = sigs.length;
    const muralEl = document.querySelector('.inst-mural');
    const mbox = muralEl.getBoundingClientRect();
    const tileRects = [...document.querySelectorAll('.inst-tile')].map(el => el.getBoundingClientRect());
    const outside = tileRects.filter(r => r.width < 8 || r.height < 8 || r.top < mbox.top - 2 || r.bottom > mbox.bottom + 2 || r.left < mbox.left - 2 || r.right > mbox.right + 2).length;
    const frame = { outside, scroll: muralEl.scrollHeight - muralEl.clientHeight, tiles: tileRects.length };
    document.getElementById('m-todo').click();
    await waitFor(() => document.getElementById('m-meta').textContent.includes('en total'), 4000, 'todos los días');
    const todos = document.getElementById('m-meta').textContent;
    document.getElementById('m-hoy').click();
    await waitFor(() => /noviembre/.test(document.getElementById('m-meta').textContent), 4000, 'hoy');
    const tile = document.querySelector('.inst-tile');
    tile.click();
    await waitFor(() => document.getElementById('m-replay')?.hidden === false, 2000, 'replay');
    document.getElementById('m-replay-x').click();
    const result = {
      ...base,
      reduce: false,
      live: liveCount,
      frame,
      median,
      avg,
      slow,
      samples: samples.length,
      unique: new Set(sigs).size,
      hashed: sigs.length,
      todos,
      hoy: document.getElementById('m-meta').textContent,
      replayHidden: document.getElementById('m-replay').hidden,
      errors,
    };
    stop?.();
    leaveInstalacion();
    document.documentElement.dataset.result = JSON.stringify(result);
    document.documentElement.dataset.done = 'ok';
  } catch (err) {
    document.documentElement.dataset.result = JSON.stringify({
      error: String(err && err.stack || err),
      texts: document.querySelector('.inst-mural') ? texts() : null,
      tiles: document.querySelectorAll('.inst-tile').length,
      live: document.querySelectorAll('.inst-tile.tl-live').length,
      hits,
      errors,
    });
    document.documentElement.dataset.done = 'fail';
  }
}
