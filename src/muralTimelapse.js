/** Lienzos vivos del mural. Un rAF compartido, fuera de pantalla no pinta. */
import { PAPER, paintStroke } from './brushes.js';
import {
  FRAME_BUDGET,
  FRAME_MS,
  containMap,
  createQueue,
  createTimelapseDirector,
  createTimingLedger,
  clearStrokeCache,
  loadDrawingStrokes,
  prefersReducedMotion,
  projectStroke,
  sourceSize,
  timingForDrawing,
  workUnits,
} from './timelapse.js';

const MAX_EDGE = 480;

function clearPaper(ctx) {
  const canvas = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function measure(canvas) {
  const tile = canvas.parentElement;
  const w = tile?.clientWidth || 0;
  const h = tile?.clientHeight || 0;
  if (w < 2 || h < 2) return null;
  const dpr = Math.min(1.35, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  let bw = Math.max(1, Math.round(w * dpr));
  let bh = Math.max(1, Math.round(h * dpr));
  const edge = Math.max(bw, bh);
  if (edge > MAX_EDGE) {
    const k = MAX_EDGE / edge;
    bw = Math.max(1, Math.round(bw * k));
    bh = Math.max(1, Math.round(bh * k));
  }
  return { bw, bh };
}

export function createMuralTimelapse() {
  const director = createTimelapseDirector({
    budget: FRAME_BUDGET,
    frameMs: FRAME_MS,
    reducedMotion: prefersReducedMotion(),
  });
  const ledger = createTimingLedger();
  const limit = createQueue(4);
  const pending = [];
  const nodes = new Set();
  let generation = 0;
  let disposed = false;
  let suspended = false;
  let raf = 0;

  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      for (const entry of entries) entry.target._tlVisible?.(entry.isIntersecting);
    }, { root: null, rootMargin: '160px', threshold: 0.01 })
    : null;

  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(entries => {
      for (const entry of entries) entry.target._tlRelayout?.();
    })
    : null;

  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;

  function shouldRun() {
    return !disposed && !director.reduced && !suspended && !document.hidden && director.size > 0;
  }

  function tick(now) {
    raf = 0;
    if (!shouldRun()) return;
    director.step(now);
    if (shouldRun()) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf && shouldRun()) raf = requestAnimationFrame(tick);
  }

  function hideLive() {
    for (const el of nodes) {
      el.classList.remove('tl-live');
      if (el._tlPlayer) el._tlPlayer.ready = false;
    }
  }

  function onMq() {
    const on = !!mq?.matches;
    director.setReducedMotion(on);
    if (on) hideLive();
    else {
      for (const job of pending) startJob(job);
      wake();
    }
  }

  if (mq?.addEventListener) mq.addEventListener('change', onMq);
  else mq?.addListener?.(onMq);
  document.addEventListener('visibilitychange', wake);

  function startJob(job) {
    if (job.started || disposed || director.reduced) return;
    job.started = true;
    const gen = job.gen;
    loadDrawingStrokes(job.item, { limit }).then(strokes => {
      if (disposed || gen !== generation || !job.el.isConnected) return;
      if (!Array.isArray(strokes) || !strokes.length) return;
      mount(job.el, job.item, strokes);
    }).catch(() => { /* la ficha queda con la foto */ });
  }

  function mount(el, item, strokes) {
    if (disposed || !el.isConnected || el.querySelector('.inst-tl')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'inst-tl';
    canvas.setAttribute('aria-hidden', 'true');
    const img = el.querySelector('img');
    if (img) img.after(canvas);
    else el.prepend(canvas);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const src = sourceSize(strokes, item.w, item.h);
    let mapped = [];
    let player = null;
    let visible = !io;
    function setVisible(value) {
      visible = value;
      if (player) player.visible = value;
    }
    el._tlVisible = setVisible;

    function ensure() {
      if (disposed || !el.isConnected) return;
      const box = measure(canvas);
      if (!box) return;
      if (player && canvas.width === box.bw && canvas.height === box.bh && mapped.length === strokes.length) return;
      canvas.width = box.bw;
      canvas.height = box.bh;
      const map = containMap(box.bw, box.bh, src.w, src.h);
      mapped = strokes.map(s => projectStroke(s, map));
      clearPaper(ctx);
      if (!player) {
        const timing = timingForDrawing(item.id || item.url || strokes.length, ledger);
        player = director.add({
          ...timing,
          strokeCount: strokes.length,
          visible,
          cost: (index) => workUnits(mapped[index]),
          onPaint: (index) => {
            const stroke = mapped[index];
            if (stroke) paintStroke(ctx, stroke);
          },
          onReset: () => clearPaper(ctx),
          onReady: () => {
            if (!disposed && el.isConnected && !director.reduced && !suspended) el.classList.add('tl-live');
          },
        });
        el._tlPlayer = player;
        wake();
      } else {
        player.drawn = 0;
        player.ready = false;
        el.classList.remove('tl-live');
      }
    }

    el._tlRelayout = ensure;
    nodes.add(el);
    io?.observe(el);
    ro?.observe(el);
    ensure();
  }

  function attach(el, item) {
    if (disposed || !el) return;
    const inline = Array.isArray(item?.strokes) && item.strokes.length > 0;
    if (!inline && item?.hasStrokes !== true) return;
    const job = { el, item, gen: generation, started: false };
    pending.push(job);
    nodes.add(el);
    if (!director.reduced) startJob(job);
  }

  function clear() {
    generation += 1;
    pending.length = 0;
    for (const el of nodes) {
      io?.unobserve(el);
      ro?.unobserve(el);
      el.classList.remove('tl-live');
      el._tlPlayer = null;
      el._tlRelayout = null;
      el._tlVisible = null;
    }
    nodes.clear();
    director.clear();
    ledger.offset.clear();
    ledger.duration.clear();
    ledger.pause.clear();
  }

  function suspend() {
    suspended = true;
    hideLive();
  }

  function resume() {
    suspended = false;
    wake();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener('visibilitychange', wake);
    if (mq?.removeEventListener) mq.removeEventListener('change', onMq);
    else mq?.removeListener?.(onMq);
    clear();
    clearStrokeCache();
    io?.disconnect();
    ro?.disconnect();
  }

  return { attach, clear, suspend, resume, dispose, wake };
}
