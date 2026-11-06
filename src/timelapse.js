/** Timelapse del mural: fase, duración y pausa distintas por dibujo. */

export const FRAME_BUDGET = 32;
export const FRAME_MS = 10;

const OFFSET_MAX = 24000;
const DURATION_MIN = 11000;
const DURATION_SPAN = 15000;
const PAUSE_MIN = 2800;
const PAUSE_SPAN = 6200;

export function hash32(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mod(n, m) {
  if (!m) return 0;
  return ((n % m) + m) % m;
}

export function createTimingLedger() {
  return { offset: new Set(), duration: new Set(), pause: new Set() };
}

/** Offset, duración y pausa deterministas y únicos dentro de `taken`. */
export function timingForDrawing(id, taken = createTimingLedger()) {
  const rnd = mulberry32(hash32(String(id)));
  let offset = Math.round(rnd() * OFFSET_MAX);
  let duration = DURATION_MIN + Math.round(rnd() * DURATION_SPAN);
  let pause = PAUSE_MIN + Math.round(rnd() * PAUSE_SPAN);
  let guard = 0;
  while (taken.offset.has(offset) && guard++ < 100000) offset += 97;
  guard = 0;
  while (taken.duration.has(duration) && guard++ < 100000) duration += 131;
  guard = 0;
  while (taken.pause.has(pause) && guard++ < 100000) pause += 89;
  taken.offset.add(offset);
  taken.duration.add(duration);
  taken.pause.add(pause);
  return { offset, duration, pause };
}

export function phaseAt(elapsed, timing) {
  const duration = Math.max(1, Number(timing.duration) || 1);
  const pause = Math.max(0, Number(timing.pause) || 0);
  const offset = Number(timing.offset) || 0;
  const cycle = duration + pause;
  const t = mod(Number(elapsed) + offset, cycle);
  if (t >= duration) return { mode: 'pause', progress: 1, into: t - duration };
  return { mode: 'draw', progress: t / duration, into: t };
}

export function strokesRevealed(count, progress) {
  const n = Math.max(0, count | 0);
  if (!n) return 0;
  if (progress >= 1) return n;
  if (!(progress > 0)) return 0;
  return Math.min(n, Math.ceil(progress * n));
}

/** Unidades de trabajo: un relleno cubre el lienzo; un trazo largo pesa más. */
export function workUnits(stroke) {
  if (!stroke) return 1;
  if (stroke.fill || stroke.f || stroke.kind === 'fill') return 8;
  const raw = stroke.points || stroke.p || [];
  const n = raw.length;
  if (n > 120) return 4;
  if (n > 40) return 2;
  return 1;
}

function frameMap(destW, destH, srcW, srcH, contain) {
  const dw = Math.max(1, destW);
  const dh = Math.max(1, destH);
  const sw = Math.max(1, srcW);
  const sh = Math.max(1, srcH);
  const s = contain ? Math.min(dw / sw, dh / sh) : Math.max(dw / sw, dh / sh);
  const ox = (dw - sw * s) / 2;
  const oy = (dh - sh * s) / 2;
  return {
    s,
    x: (x) => x * s + ox,
    y: (y) => y * s + oy,
  };
}

export function coverMap(destW, destH, srcW, srcH) {
  return frameMap(destW, destH, srcW, srcH, false);
}

export function containMap(destW, destH, srcW, srcH) {
  return frameMap(destW, destH, srcW, srcH, true);
}

/** Reparte el mural en una sola pantalla: todas las obras, lo más grandes posible, sin recortar el 4/3. */
export function muralGrid(count, width, height, gap = 12) {
  const n = count | 0;
  if (n <= 0 || !(width > 1) || !(height > 1)) return null;
  const ratio = 4 / 3;
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const maxW = (width - gap * (cols - 1)) / cols;
    const maxH = (height - gap * (rows - 1)) / rows;
    if (maxW <= 8 || maxH <= 8) continue;
    let dw = maxW;
    let dh = dw / ratio;
    if (dh > maxH) {
      dh = maxH;
      dw = dh * ratio;
    }
    const area = dw * dh;
    if (!best || area > best.area) best = { cols, rows, dw, dh, area };
  }
  return best;
}

export function sourceSize(strokes, w, h) {
  const W = Number(w);
  const H = Number(h);
  if (W > 1 && H > 1) return { w: W, h: H };
  let maxX = 1;
  let maxY = 1;
  for (const s of strokes || []) {
    const raw = s.points || s.p || [];
    for (const pt of raw) {
      const x = Array.isArray(pt) ? +pt[0] : +pt.x;
      const y = Array.isArray(pt) ? +pt[1] : +pt.y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { w: Math.max(32, Math.ceil(maxX + 4)), h: Math.max(32, Math.ceil(maxY + 4)) };
}

export function projectStroke(stroke, map) {
  const fill = !!(stroke.fill || stroke.f || stroke.kind === 'fill');
  if (fill) {
    return {
      tool: stroke.tool || stroke.t || 'grafito',
      color: stroke.color || stroke.c || '#1A1A1A',
      size: stroke.size ?? stroke.sz ?? 1,
      fill: true,
    };
  }
  const raw = stroke.points || stroke.p || [];
  const points = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const pt = raw[i];
    if (Array.isArray(pt)) {
      points[i] = { x: map.x(+pt[0]), y: map.y(+pt[1]), pr: +(pt[2] ?? 0.55) };
    } else {
      points[i] = { x: map.x(+pt.x), y: map.y(+pt.y), pr: +(pt.pr ?? pt.p ?? 0.55) };
    }
  }
  const size = Math.max(0.35, Math.min(3, (+(stroke.size ?? stroke.sz ?? 1) || 1) * map.s));
  return {
    tool: stroke.tool || stroke.t || 'grafito',
    color: stroke.color || stroke.c || '#1A1A1A',
    size,
    points,
  };
}

/**
 * Un solo reloj para todas las obras. Cada frame pinta solo trazos nuevos,
 * reparte el cupo en round-robin y corta si se acaba el presupuesto o el tiempo.
 */
export function createTimelapseDirector({
  budget = FRAME_BUDGET,
  frameMs = FRAME_MS,
  reducedMotion = false,
  now,
} = {}) {
  const players = [];
  let cursor = 0;
  let reduced = !!reducedMotion;
  const clock = now || (() => (globalThis.performance ? globalThis.performance.now() : 0));

  function add(player) {
    if (player.drawn == null) player.drawn = 0;
    if (player.ready == null) player.ready = false;
    if (player.visible == null) player.visible = true;
    players.push(player);
    return player;
  }

  function clear() {
    players.length = 0;
    cursor = 0;
  }

  function step(elapsed) {
    const stats = { painted: 0, units: 0, resets: 0, ready: 0 };
    if (reduced) return stats;
    const n = players.length;
    if (!n) return stats;

    const targets = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = players[i];
      if (p.visible === false || !p.strokeCount) {
        targets[i] = null;
        continue;
      }
      const target = strokesRevealed(p.strokeCount, phaseAt(elapsed, p).progress);
      if (target < p.drawn) {
        try { p.onReset?.(); } catch { /* el lienzo se reintenta al pintar */ }
        p.drawn = 0;
        stats.resets += 1;
      }
      targets[i] = target;
    }

    let budgetLeft = budget;
    let idle = 0;
    let idx = cursor;
    let guard = 0;
    const guardMax = n * (budget + 2) + 8;
    const t0 = clock();
    while (budgetLeft > 0 && idle < n && guard++ < guardMax) {
      const i = ((idx % n) + n) % n;
      const p = players[i];
      const target = targets[i];
      if (target == null || p.drawn >= target) {
        idle += 1;
        idx += 1;
        continue;
      }
      let cost = 1;
      try { cost = Math.max(1, Number(p.cost?.(p.drawn)) || 1); } catch { cost = 1; }
      if (stats.painted > 0 && (cost > budgetLeft || clock() - t0 > frameMs)) break;
      try { p.onPaint?.(p.drawn); } catch { /* trazo dañado: se salta */ }
      p.drawn += 1;
      budgetLeft -= cost;
      stats.painted += 1;
      stats.units += cost;
      idle = 0;
      idx += 1;
    }
    cursor = ((idx % n) + n) % n;

    for (let i = 0; i < n; i++) {
      const p = players[i];
      const target = targets[i];
      if (target == null || p.ready) continue;
      if (p.drawn === target && target > 0) {
        p.ready = true;
        stats.ready += 1;
        try { p.onReady?.(); } catch { /* la ficha sigue en imagen fija */ }
      }
    }
    return stats;
  }

  function setReducedMotion(value) {
    reduced = !!value;
  }

  return {
    add,
    clear,
    step,
    setReducedMotion,
    get reduced() { return reduced; },
    get size() { return players.length; },
    players,
  };
}

export function prefersReducedMotion(win = globalThis) {
  try {
    return !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch {
    return false;
  }
}

const strokeCache = new Map();

export function clearStrokeCache() {
  strokeCache.clear();
}

export function strokesUrlFor(item) {
  if (!item) return null;
  if (item.metaUrl) return String(item.metaUrl);
  if (!item.url) return null;
  const s = String(item.url);
  if (!/\.(png|webp|jpe?g)(\?.*)?$/i.test(s)) return null;
  return s.replace(/\.(png|webp|jpe?g)(\?.*)?$/i, '.json');
}

export function createQueue(max = 4) {
  const cap = Math.max(1, max | 0);
  let active = 0;
  const q = [];
  function pump() {
    while (active < cap && q.length) {
      const job = q.shift();
      active += 1;
      Promise.resolve()
        .then(job.fn)
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  }
  return function limit(fn) {
    return new Promise((resolve, reject) => {
      q.push({ fn, resolve, reject });
      pump();
    });
  };
}

export function loadDrawingStrokes(item, { fetchImpl = globalThis.fetch, limit } = {}) {
  if (Array.isArray(item?.strokes) && item.strokes.length) return Promise.resolve(item.strokes);
  const url = strokesUrlFor(item);
  if (!url || typeof fetchImpl !== 'function') return Promise.resolve(null);
  if (strokeCache.has(url)) return strokeCache.get(url);
  const exec = () => Promise.resolve()
    .then(() => fetchImpl(url, { cache: 'no-store' }))
    .then(r => (r && r.ok ? r.json() : null))
    .then(j => (Array.isArray(j?.strokes) ? j.strokes : null))
    .catch(() => null);
  const p = limit ? limit(exec) : exec();
  strokeCache.set(url, p);
  return p;
}
