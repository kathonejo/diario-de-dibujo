import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  FRAME_BUDGET,
  clearStrokeCache,
  containMap,
  coverMap,
  muralGrid,
  createQueue,
  createTimelapseDirector,
  createTimingLedger,
  loadDrawingStrokes,
  phaseAt,
  projectStroke,
  sourceSize,
  strokesRevealed,
  strokesUrlFor,
  timingForDrawing,
  workUnits,
} from '../src/timelapse.js';

beforeEach(() => clearStrokeCache());

describe('tiempos desfasados', () => {
  it('asigna offset, duración y pausa distintos a 33 dibujos', () => {
    const taken = createTimingLedger();
    const timings = Array.from({ length: 33 }, (_, i) => timingForDrawing(`dibujo-${i}`, taken));
    const offsets = new Set(timings.map(t => t.offset));
    const durations = new Set(timings.map(t => t.duration));
    const pauses = new Set(timings.map(t => t.pause));
    assert.equal(offsets.size, 33);
    assert.equal(durations.size, 33);
    assert.equal(pauses.size, 33);
    for (const t of timings) {
      assert.ok(t.offset >= 0 && t.offset <= 24000 + 97 * 40);
      assert.ok(t.duration >= 11000 && t.duration <= 11000 + 15000 + 131 * 40);
      assert.ok(t.pause >= 2800 && t.pause <= 2800 + 6200 + 89 * 40);
    }
  });

  it('es determinista para el mismo id', () => {
    const a = timingForDrawing('mismo', createTimingLedger());
    const b = timingForDrawing('mismo', createTimingLedger());
    assert.deepEqual(a, b);
  });

  it('no arranca las 33 obras en el mismo punto del ciclo', () => {
    const taken = createTimingLedger();
    const timings = Array.from({ length: 33 }, (_, i) => timingForDrawing(`fase-${i}`, taken));
    const counts = timings.map(t => strokesRevealed(40, phaseAt(0, t).progress));
    assert.ok(new Set(counts).size > 1);
    const modes = new Set(timings.map(t => phaseAt(5_000_000, t).mode));
    assert.ok(modes.size >= 1);
    const spread = timings.map(t => phaseAt(5_000_000, t).progress);
    const min = Math.min(...spread);
    const max = Math.max(...spread);
    assert.ok(max - min > 0.2);
  });
});

describe('fase del ciclo', () => {
  const timing = { offset: 0, duration: 1000, pause: 500 };

  it('dibuja, sostiene y vuelve a empezar', () => {
    assert.deepEqual(phaseAt(0, timing).mode, 'draw');
    assert.equal(phaseAt(0, timing).progress, 0);
    assert.equal(phaseAt(500, timing).progress, 0.5);
    assert.equal(phaseAt(1000, timing).mode, 'pause');
    assert.equal(phaseAt(1499, timing).mode, 'pause');
    assert.equal(phaseAt(1500, timing).mode, 'draw');
    assert.ok(phaseAt(1500, timing).progress < 0.001);
  });

  it('el offset adelanta la fase', () => {
    const phased = phaseAt(0, { offset: 500, duration: 1000, pause: 500 });
    assert.equal(phased.mode, 'draw');
    assert.equal(phased.progress, 0.5);
  });

  it('revela trazos enteros según el progreso', () => {
    assert.equal(strokesRevealed(4, 0), 0);
    assert.equal(strokesRevealed(4, 0.1), 1);
    assert.equal(strokesRevealed(4, 0.5), 2);
    assert.equal(strokesRevealed(4, 1), 4);
    assert.equal(strokesRevealed(0, 1), 0);
  });
});

describe('director compartido', () => {
  function player(partial = {}) {
    const paints = [];
    const resets = [];
    const p = {
      strokeCount: 4,
      offset: 0,
      duration: 1000,
      pause: 1000,
      visible: true,
      paints,
      resets,
      onPaint(i) { paints.push(i); },
      onReset() { resets.push(p.drawn); },
      ...partial,
    };
    return p;
  }

  it('no pinta si reduced motion está activo', () => {
    const director = createTimelapseDirector({ reducedMotion: true, frameMs: 1e9 });
    const p = player();
    director.add(p);
    const stats = director.step(500);
    assert.equal(stats.painted, 0);
    assert.equal(p.paints.length, 0);
    director.setReducedMotion(false);
    assert.ok(director.step(500).painted > 0);
  });

  it('pinta solo lo nuevo y no repinta en la pausa', () => {
    const director = createTimelapseDirector({ budget: 20, frameMs: 1e9 });
    const p = player();
    director.add(p);
    assert.equal(director.step(0).painted, 0);
    const mid = director.step(500);
    assert.deepEqual(p.paints, [0, 1]);
    assert.equal(mid.painted, 2);
    assert.equal(director.step(500).painted, 0);
    const hold = director.step(1000);
    assert.equal(hold.painted, 2);
    assert.equal(p.drawn, 4);
    assert.equal(director.step(1200).painted, 0);
    assert.equal(p.resets.length, 0);
  });

  it('al cerrar el ciclo limpia y vuelve a trazar', () => {
    const director = createTimelapseDirector({ budget: 20, frameMs: 1e9 });
    const p = player();
    director.add(p);
    director.step(1000);
    assert.equal(p.drawn, 4);
    const wrapped = director.step(2000);
    assert.equal(p.resets.length, 1);
    assert.equal(wrapped.painted, 0);
    assert.equal(p.drawn, 0);
    director.step(2500);
    assert.deepEqual(p.paints.slice(-2), [0, 1]);
  });

  it('reparte el cupo entre 33 obras sin pasarse del presupuesto', () => {
    const director = createTimelapseDirector({ budget: 8, frameMs: 1e9 });
    const group = Array.from({ length: 33 }, () => player({
      strokeCount: 6,
      offset: 0,
      duration: 1000,
      pause: 1000,
    }));
    for (const p of group) director.add(p);
    let seenSkew = 0;
    for (let frame = 0; frame < 40; frame++) {
      const stats = director.step(1000);
      assert.ok(stats.painted <= 8);
      const drawn = group.map(p => p.drawn);
      const skew = Math.max(...drawn) - Math.min(...drawn);
      assert.ok(skew <= 1, `desbalance ${skew}`);
      seenSkew = Math.max(seenSkew, skew);
    }
    assert.ok(group.every(p => p.drawn === 6));
    assert.ok(seenSkew <= 1);
  });

  it('una obra fuera de pantalla no consume cupo', () => {
    const director = createTimelapseDirector({ budget: 8, frameMs: 1e9 });
    const hidden = player({ visible: false, strokeCount: 4, offset: 900, duration: 1000, pause: 1000 });
    const shown = player({ strokeCount: 4, offset: 900, duration: 1000, pause: 1000 });
    director.add(hidden);
    director.add(shown);
    director.step(0);
    assert.equal(hidden.paints.length, 0);
    assert.equal(shown.drawn, 4);
  });

  it('corta el frame por tiempo y retoma sin perder trazos', () => {
    const times = [0, 0, 100];
    let read = 0;
    const director = createTimelapseDirector({
      budget: 100,
      frameMs: 10,
      now: () => times[Math.min(read++, times.length - 1)],
    });
    const group = Array.from({ length: 6 }, () => player({ strokeCount: 3, offset: 999, duration: 1000, pause: 5000 }));
    for (const p of group) director.add(p);
    const first = director.step(0);
    assert.equal(first.painted, 2);
    const clock = { t: 0, reads: 0 };
    const follow = createTimelapseDirector({
      budget: 100,
      frameMs: 10,
      now: () => {
        clock.reads += 1;
        if (clock.reads > 1) clock.t = 100;
        const value = clock.reads === 1 ? 0 : clock.t;
        if (clock.reads > 2) {
          clock.reads = 0;
          clock.t = 0;
        }
        return value;
      },
    });
    const again = Array.from({ length: 4 }, () => player({ strokeCount: 3, offset: 999, duration: 1000, pause: 5000 }));
    for (const p of again) follow.add(p);
    for (let i = 0; i < 30; i++) follow.step(0);
    assert.ok(again.every(p => p.drawn === 3));
  });

  it('sostiene 33 obras durante varios ciclos sin redibujar cada frame', () => {
    const taken = createTimingLedger();
    const director = createTimelapseDirector({ budget: FRAME_BUDGET, frameMs: 1e9 });
    const group = [];
    for (let i = 0; i < 33; i++) {
      const timing = timingForDrawing(`vivo-${i}`, taken);
      const p = player({ strokeCount: 40, ...timing, paints: [] });
      p.onPaint = (index) => { p.paints.push(index); };
      group.push(p);
      director.add(p);
    }
    const t0 = performance.now();
    let painted = 0;
    const snapshots = [];
    for (let t = 0; t <= 45000; t += 50) {
      painted += director.step(t).painted;
      if (t % 3000 === 0) snapshots.push(group.map(p => p.drawn).join(','));
    }
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 1000, `el reloj tardó ${elapsed}ms`);
    assert.ok(painted < 33 * 40 * 5);
    assert.ok(painted > 33 * 40);
    assert.ok(new Set(snapshots).size > 1);
    const at = group.map(p => p.drawn);
    assert.ok(new Set(at).size > 1);
  });
});

describe('mural en una sola vista', () => {
  it('con 8 dibujos los deja grandes y completos en el recuadro', () => {
    const frame = muralGrid(8, 1200, 640, 12);
    assert.equal(frame.cols, 4);
    assert.equal(frame.rows, 2);
    assert.ok(frame.dw >= 250, `ancho ${frame.dw}`);
    assert.ok(frame.dh >= 180, `alto ${frame.dh}`);
    assert.ok(frame.cols * frame.dw + 12 * (frame.cols - 1) <= 1200 + 1);
    assert.ok(frame.rows * frame.dh + 12 * (frame.rows - 1) <= 640 + 1);
    assert.ok(Math.abs(frame.dw / frame.dh - 4 / 3) < 0.02);
  });

  it('con 33 dibujos entran todos sin salirse', () => {
    const frame = muralGrid(33, 1280, 720, 12);
    assert.ok(frame.cols * frame.rows >= 33);
    assert.ok(frame.cols * frame.dw + 12 * (frame.cols - 1) <= 1280 + 1);
    assert.ok(frame.rows * frame.dh + 12 * (frame.rows - 1) <= 720 + 1);
    assert.ok(frame.dw >= 70 && frame.dh >= 50);
  });
});

describe('proyección y peso', () => {
  it('encuadra el centro y no muta el trazo original', () => {
    const map = coverMap(100, 100, 200, 100);
    assert.equal(map.x(100), 50);
    assert.equal(map.y(50), 50);
    const contained = containMap(100, 100, 200, 100);
    assert.equal(contained.x(100), 50);
    assert.equal(contained.y(50), 50);
    assert.ok(contained.s < map.s);
    const raw = { t: 'tinta', c: '#112233', sz: 2, p: [[0, 0, 0.4], [200, 100, 0.8]] };
    const before = JSON.stringify(raw);
    const out = projectStroke(raw, map);
    assert.equal(JSON.stringify(raw), before);
    assert.equal(out.tool, 'tinta');
    assert.equal(out.color, '#112233');
    assert.ok(Math.abs(out.points[0].x - map.x(0)) < 1e-9);
    assert.ok(out.size <= 3);
    assert.equal(workUnits({ f: 1 }), 8);
    assert.equal(workUnits({ p: new Array(10) }), 1);
    assert.equal(workUnits({ p: new Array(80) }), 2);
    assert.equal(workUnits({ points: new Array(130) }), 4);
  });

  it('usa el tamaño guardado o la caja de los puntos', () => {
    assert.deepEqual(sourceSize([], 1200, 900), { w: 1200, h: 900 });
    const box = sourceSize([{ p: [[10, 20], [40, 5]] }], null, null);
    assert.ok(box.w >= 44 && box.h >= 24);
  });
});

describe('carga de trazos', () => {
  it('limita la concurrencia y no toca la red si ya vienen en el objeto', async () => {
    const limit = createQueue(4);
    let active = 0;
    let max = 0;
    await Promise.all(Array.from({ length: 33 }, () => limit(async () => {
      active += 1;
      max = Math.max(max, active);
      await new Promise(r => setTimeout(r, 8));
      active -= 1;
    })));
    assert.equal(max, 4);

    let fetches = 0;
    const strokes = [{ t: 'grafito', p: [[1, 2, 0.5]] }];
    const got = await loadDrawingStrokes({ strokes, url: '/x.png' }, {
      fetchImpl: async () => { fetches += 1; return { ok: false }; },
    });
    assert.equal(fetches, 0);
    assert.equal(got, strokes);
  });

  it('deduplica la descarga y guarda el fallo', async () => {
    let fetches = 0;
    const fetchImpl = async () => {
      fetches += 1;
      return { ok: true, json: async () => ({ strokes: [{ t: 'grafito', p: [[1, 1, 1]] }] }) };
    };
    const item = { metaUrl: 'https://blob.example/a.json', hasStrokes: true };
    const [a, b] = await Promise.all([
      loadDrawingStrokes(item, { fetchImpl }),
      loadDrawingStrokes(item, { fetchImpl }),
    ]);
    assert.equal(fetches, 1);
    assert.equal(a.length, 1);
    assert.equal(a, b);
    clearStrokeCache();
    let bad = 0;
    const fail = { url: '/dibujo.webp' };
    assert.equal(strokesUrlFor(fail), '/dibujo.json');
    const empty = await loadDrawingStrokes(fail, {
      fetchImpl: async () => { bad += 1; return { ok: false }; },
    });
    const again = await loadDrawingStrokes(fail, {
      fetchImpl: async () => { bad += 1; return { ok: true, json: async () => ({ strokes: [{ t: 'x' }] }) }; },
    });
    assert.equal(empty, null);
    assert.equal(again, null);
    assert.equal(bad, 1);
  });
});
