import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createMuralTimelapse } from '../src/muralTimelapse.js';
import { phaseAt, strokesRevealed, timingForDrawing, createTimingLedger } from '../src/timelapse.js';

const rafQueue = [];
const resizeObservers = [];
const intersectionObservers = [];
let rafSeq = 0;

function classList() {
  const names = new Set();
  return {
    add(name) { names.add(name); },
    remove(name) { names.delete(name); },
    contains(name) { return names.has(name); },
  };
}

function createCanvas() {
  const canvas = {
    className: '',
    width: 0,
    height: 0,
    parentElement: null,
    setAttribute() {},
    getContext() {
      return {
        canvas,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillStyle: '',
        setTransform() {},
        fillRect() {},
      };
    },
  };
  return canvas;
}

function createTile(w, h) {
  const tile = {
    isConnected: true,
    clientWidth: w,
    clientHeight: h,
    classList: classList(),
    _kids: [],
    querySelector(sel) {
      if (sel === 'img') return this._img;
      if (sel === '.inst-tl') return this._kids.find(node => node.className === 'inst-tl') || null;
      return null;
    },
    prepend(node) {
      node.parentElement = this;
      this._kids.unshift(node);
    },
  };
  tile._img = {
    after(node) {
      node.parentElement = tile;
      tile._kids.push(node);
    },
  };
  return tile;
}

function installDom() {
  rafQueue.length = 0;
  resizeObservers.length = 0;
  intersectionObservers.length = 0;
  globalThis.devicePixelRatio = 1;
  globalThis.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  globalThis.window = globalThis;
  globalThis.requestAnimationFrame = (fn) => {
    const id = ++rafSeq;
    rafQueue.push({ id, fn });
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    const index = rafQueue.findIndex(job => job.id === id);
    if (index >= 0) rafQueue.splice(index, 1);
  };
  globalThis.ResizeObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.els = [];
      resizeObservers.push(this);
    }
    observe(el) { this.els.push(el); }
    unobserve(el) { this.els = this.els.filter(node => node !== el); }
    disconnect() { this.els = []; }
  };
  globalThis.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.els = [];
      intersectionObservers.push(this);
    }
    observe(el) { this.els.push(el); }
    unobserve(el) { this.els = this.els.filter(node => node !== el); }
    disconnect() { this.els = []; }
  };
  globalThis.document = {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    createElement(tag) {
      if (tag !== 'canvas') throw new Error(`elemento inesperado: ${tag}`);
      return createCanvas();
    },
  };
}

function flush(now) {
  const batch = rafQueue.splice(0, rafQueue.length);
  for (const job of batch) job.fn(now);
}

function fireResize() {
  for (const observer of resizeObservers) {
    if (!observer.els.length) continue;
    observer.cb(observer.els.map(target => ({ target })));
  }
}

function fireIntersect(el, isIntersecting) {
  for (const observer of intersectionObservers) {
    if (!observer.els.includes(el)) continue;
    observer.cb([{ target: el, isIntersecting }]);
  }
}

function strokes(count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    t: 'tinta',
    c: '#1A1A1A',
    sz: 1.2,
    p: [[8, 12 + index], [24, 16 + index], [40, 10 + index], [56, 18 + index]],
  }));
}

function item(id) {
  return { id, url: `/${id}.webp`, w: 1200, h: 900, hasStrokes: true, strokes: strokes() };
}

function elapsedForInto(timing, into, minElapsed = 0) {
  const cycle = timing.duration + timing.pause;
  let elapsed = into - timing.offset;
  const steps = Math.ceil((minElapsed - elapsed) / cycle);
  if (steps > 0) elapsed += steps * cycle;
  if (elapsed < minElapsed) elapsed += cycle;
  return elapsed;
}

function hook(player) {
  const paints = [];
  const resets = [];
  player.onPaint = (index) => { paints.push(index); };
  player.onReset = () => { resets.push(player.drawn); };
  return { paints, resets };
}

async function mount(tl, id, w = 320, h = 240) {
  const tile = createTile(w, h);
  tl.attach(tile, item(id));
  await Promise.resolve();
  assert.ok(tile._tlPlayer, `no se montó ${id}`);
  fireIntersect(tile, true);
  return { tile, player: tile._tlPlayer, trace: hook(tile._tlPlayer) };
}

describe('mural: el trazo sigue cuando entra otro visitante', () => {
  let tl;

  beforeEach(() => {
    installDom();
    tl = createMuralTimelapse();
  });

  afterEach(() => {
    tl?.dispose();
    tl = null;
  });

  it('el observer de tamaño redibuja el detalle y el trazo viejo sigue', async () => {
    const ledger = createTimingLedger();
    const timing = timingForDrawing('visitante-a', ledger);
    const first = await mount(tl, 'visitante-a');
    const midInto = timing.duration * 0.45;
    const laterInto = timing.duration * 0.75;
    const eMid = elapsedForInto(timing, midInto);
    const eLater = elapsedForInto(timing, laterInto, eMid + 1);
    const cycle = timing.duration + timing.pause;
    assert.equal(phaseAt(eMid, timing).mode, 'draw');
    assert.equal(phaseAt(eLater, timing).mode, 'draw');
    assert.ok(phaseAt(eLater, timing).progress > phaseAt(eMid, timing).progress);
    assert.equal(Math.floor((eMid + timing.offset) / cycle), Math.floor((eLater + timing.offset) / cycle));

    flush(eMid);
    const revealed = strokesRevealed(first.player.strokeCount, phaseAt(eMid, timing).progress);
    assert.equal(first.player.drawn, revealed);
    assert.ok(revealed > 1 && revealed < first.player.strokeCount);
    assert.deepEqual(first.trace.paints, Array.from({ length: revealed }, (_, index) => index));
    assert.equal(first.player.ready, true);
    assert.equal(first.tile.classList.contains('tl-live'), true);
    assert.equal(first.trace.resets.length, 0);

    const quiet = first.trace.paints.length;
    fireResize();
    assert.equal(first.trace.paints.length, quiet, 'el mismo tamaño no redibuja ni reinicia');
    assert.equal(first.player.drawn, revealed);

    first.tile.clientWidth = 0;
    first.tile.clientHeight = 0;
    fireResize();
    assert.equal(first.player.drawn, revealed, 'un paso de layout en cero no reinicia');
    assert.equal(first.trace.resets.length, 0);

    const secondTiming = timingForDrawing('visitante-b', ledger);
    const second = await mount(tl, 'visitante-b', 300, 220);
    first.tile.clientWidth = 180;
    first.tile.clientHeight = 140;
    fireResize();

    assert.equal(first.trace.resets.length, 0);
    assert.equal(first.player.drawn, revealed);
    assert.equal(first.player.ready, true);
    assert.equal(first.tile.classList.contains('tl-live'), true);
    assert.deepEqual(
      first.trace.paints.slice(quiet),
      Array.from({ length: revealed }, (_, index) => index),
      'se vuelven a trazar los ya revelados, no se congela la foto',
    );

    flush(eLater);
    const next = strokesRevealed(first.player.strokeCount, phaseAt(eLater, timing).progress);
    assert.ok(next > revealed);
    assert.equal(first.player.drawn, next);
    assert.equal(first.trace.resets.length, 0);
    assert.deepEqual(first.trace.paints.slice(quiet + revealed), Array.from({ length: next - revealed }, (_, index) => revealed + index));

    const secondAt = strokesRevealed(second.player.strokeCount, phaseAt(eLater, secondTiming).progress);
    assert.equal(second.player.drawn, secondAt);
    assert.equal(second.trace.resets.length, 0);
    assert.notEqual(first.player, second.player);
    if (secondAt > 0) assert.equal(second.trace.paints[0], 0);
  });

  it('completa, sostiene, y pausar no tira el trazo; el ciclo nuevo sí limpia', async () => {
    const timing = timingForDrawing('visitante-ciclo');
    const { tile, player, trace } = await mount(tl, 'visitante-ciclo');
    const eMid = elapsedForInto(timing, timing.duration * 0.4);
    const eHold = elapsedForInto(timing, timing.duration, eMid + 1);
    const eStill = elapsedForInto(timing, timing.duration + timing.pause - 1, eHold + 1);
    const eWrap = elapsedForInto(timing, 0, eStill + 1);

    flush(eMid);
    const partial = player.drawn;
    assert.ok(partial > 0 && partial < player.strokeCount);
    assert.equal(player.ready, true);
    assert.equal(tile.classList.contains('tl-live'), true);

    flush(eHold);
    assert.equal(phaseAt(eHold, timing).mode, 'pause');
    assert.equal(player.drawn, player.strokeCount);
    assert.equal(player.ready, true);
    assert.equal(trace.resets.length, 0);
    assert.equal(tile.classList.contains('tl-live'), true);
    const completePaints = trace.paints.length;
    assert.equal(completePaints, player.strokeCount);

    flush(eStill);
    assert.equal(phaseAt(eStill, timing).mode, 'pause');
    assert.equal(trace.paints.length, completePaints);
    assert.equal(trace.resets.length, 0);
    assert.equal(player.drawn, player.strokeCount);
    assert.equal(player.ready, true);

    const queued = rafQueue.length;
    tl.suspend();
    assert.equal(tile.classList.contains('tl-live'), false);
    assert.equal(player.ready, false);
    assert.equal(player.drawn, player.strokeCount);
    flush(eStill);
    assert.equal(player.drawn, player.strokeCount);
    assert.equal(trace.resets.length, 0);
    assert.equal(trace.paints.length, completePaints);
    assert.ok(queued >= 1);

    tl.resume();
    flush(eStill);
    assert.equal(player.drawn, player.strokeCount);
    assert.equal(trace.resets.length, 0);
    assert.equal(trace.paints.length, completePaints);
    assert.equal(player.ready, true);
    assert.equal(tile.classList.contains('tl-live'), true);

    flush(eWrap);
    assert.equal(phaseAt(eWrap, timing).mode, 'draw');
    assert.equal(phaseAt(eWrap, timing).progress, 0);
    assert.equal(trace.resets.length, 1);
    assert.equal(trace.resets[0], player.strokeCount);
    assert.equal(player.drawn, 0);
    assert.equal(tile.classList.contains('tl-live'), true);

    const eAgain = elapsedForInto(timing, timing.duration * 0.25, eWrap + 1);
    flush(eAgain);
    const again = strokesRevealed(player.strokeCount, phaseAt(eAgain, timing).progress);
    assert.ok(again > 0 && again < player.strokeCount);
    assert.equal(player.drawn, again);
    assert.equal(trace.resets.length, 1);
    assert.deepEqual(trace.paints.slice(completePaints), Array.from({ length: again }, (_, index) => index));
  });

  it('salir de pantalla no reinicia el trazo si la fase no cerró', async () => {
    const timing = timingForDrawing('visitante-fuera');
    const { tile, player, trace } = await mount(tl, 'visitante-fuera');
    const eMid = elapsedForInto(timing, timing.duration * 0.35);
    const eLater = elapsedForInto(timing, timing.duration * 0.55, eMid + 1);
    flush(eMid);
    const revealed = player.drawn;
    assert.ok(revealed > 0);
    const paints = trace.paints.length;

    fireIntersect(tile, false);
    flush(eLater);
    assert.equal(player.drawn, revealed);
    assert.equal(trace.paints.length, paints);
    assert.equal(trace.resets.length, 0);
    assert.equal(player.visible, false);

    const eBack = elapsedForInto(timing, timing.duration * 0.7, eLater + 1);
    fireIntersect(tile, true);
    flush(eBack);
    const next = strokesRevealed(player.strokeCount, phaseAt(eBack, timing).progress);
    assert.ok(next > revealed);
    assert.equal(player.drawn, next);
    assert.equal(trace.resets.length, 0);
    assert.equal(trace.paints[paints], revealed);
  });
});
