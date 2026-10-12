const KEY = 'timer';
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; };
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.35;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 2.3);
    });
  } catch {}
}
export function initTimer(el) {
  let st = Object.assign({ total: 30*60e3, left: 30*60e3, end: 0, running: false, min: false }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  el.innerHTML = `<button class="t-min" aria-label="Minimizar temporizador">–</button>
    <div class="t-lbl">Sesión de dibujo</div><div class="t-time" aria-live="polite">30:00</div>
    <div class="t-bar"><i></i></div>
    <div class="t-pre">${[15,30,60].map(m=>`<button data-min="${m}">${m} min</button>`).join('')}</div>
    <div class="t-ctl"><button class="t-go primary">Iniciar</button><button class="t-rs">Reiniciar</button></div>`;
  const $ = s => el.querySelector(s);
  const left = () => st.running ? st.end - Date.now() : st.left;
  function draw() {
    const l = left(); $('.t-time').textContent = fmt(l);
    $('.t-bar i').style.width = `${100 - Math.max(0, l) / st.total * 100}%`;
    $('.t-go').textContent = st.running ? 'Pausar' : (st.left < st.total && st.left > 0 ? 'Seguir' : 'Iniciar');
    el.classList.toggle('min', st.min); el.classList.toggle('on', st.running);
    el.querySelectorAll('[data-min]').forEach(b => b.classList.toggle('sel', +b.dataset.min * 60e3 === st.total));
    if (st.running) document.title = `⏳ ${fmt(l)} · Diario de dibujo`;
  }
  function done() {
    st.running = false; st.left = 0; save(); chime();
    document.title = '✓ ¡Sesión terminada!';
    if ('Notification' in window && Notification.permission === 'granted') new Notification('¡Sesión terminada!', { body: 'Buen trabajo. Soltá el lápiz y mirá tu dibujo de lejos.' });
    el.classList.add('fin'); setTimeout(() => el.classList.remove('fin'), 4000);
  }
  setInterval(() => { if (st.running && left() <= 0) done(); draw(); }, 250);
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.min) { st = { ...st, total: b.dataset.min*60e3, left: b.dataset.min*60e3, running: false }; document.title = 'Diario de dibujo'; }
    else if (b.classList.contains('t-go')) {
      if (st.running) { st.left = left(); st.running = false; }
      else { if (st.left <= 0) st.left = st.total; st.end = Date.now() + st.left; st.running = true;
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }
    } else if (b.classList.contains('t-rs')) { st.running = false; st.left = st.total; document.title = 'Diario de dibujo'; }
    else if (b.classList.contains('t-min')) st.min = !st.min;
    save(); draw();
  });
  el.addEventListener('click', e => { if (st.min && !e.target.closest('button')) { st.min = false; save(); draw(); } });
  draw();
}
