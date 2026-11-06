import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createResultCountdown } from '../src/instalacion.js';

function reloj() {
  const jobs = [];
  return {
    setInterval(fn) {
      const id = { fn, on: true };
      jobs.push(id);
      return id;
    },
    clearInterval(id) {
      if (id) id.on = false;
    },
    tick(ms) {
      const steps = Math.round(ms / 1000);
      for (let i = 0; i < steps; i++) {
        for (const job of [...jobs]) if (job.on) job.fn();
      }
    },
  };
}

test('si se queda en el resultado, al terminar vuelve al inicio', () => {
  const clock = reloj();
  const ticks = [];
  let done = 0;
  createResultCountdown({
    seconds: 3,
    isStillThere: () => true,
    onTick: (n) => ticks.push(n),
    onDone: () => { done += 1; },
    schedule: clock,
  });
  clock.tick(3000);
  assert.deepEqual(ticks, [2, 1, 0]);
  assert.equal(done, 1);
  clock.tick(5000);
  assert.equal(done, 1);
});

test('si sale hacia el mural, el intervalo no redirige', () => {
  const clock = reloj();
  let there = true;
  let done = 0;
  createResultCountdown({
    seconds: 8,
    isStillThere: () => there,
    onDone: () => { done += 1; },
    schedule: clock,
  });
  clock.tick(2000);
  there = false;
  clock.tick(20000);
  assert.equal(done, 0);
});

test('cancelar al pulsar Ver el mural corta la vuelta automática', () => {
  const clock = reloj();
  let done = 0;
  const countdown = createResultCountdown({
    seconds: 7,
    isStillThere: () => true,
    onDone: () => { done += 1; },
    schedule: clock,
  });
  clock.tick(2000);
  countdown.stop();
  clock.tick(20000);
  assert.equal(done, 0);
});
