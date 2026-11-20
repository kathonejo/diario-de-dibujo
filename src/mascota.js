// Conejo del Diario en la portada: video sin fondo + globo que va diciendo frases para practicar
// y citas cortas de Operadores Mágicos (src/frases.js → public/content/frases.json).
import { getLang, t } from './i18n.js';

export const MOTIVACION = {
  es: [
    'Un trazo más, hoy cuenta.',
    'No tiene que salir perfecto, tiene que salir.',
    'Tres minutos alcanzan para empezar.',
    'Mirar bien ya es dibujar.',
    'Hoy practicás, mañana se nota.',
    'Un borrón también es una decisión.',
    'Respirá, soltá la muñeca y dibujá.',
    'Lo importante es volver mañana.',
    'Tu mano aprende aunque no lo veas.',
    'Empezá por la mancha, la línea viene después.',
    'Cada página es un permiso para equivocarte.',
    'Lo que dibujás hoy es práctica, no un examen.',
  ],
  en: [
    'One more stroke, today counts.',
    'It doesn’t have to be perfect, it just has to happen.',
    'Three minutes is enough to begin.',
    'Looking closely is already drawing.',
    'Practice today, you’ll see it tomorrow.',
    'A smudge is a decision too.',
    'Breathe, loosen your wrist and draw.',
    'What matters is coming back tomorrow.',
    'Your hand is learning even if you can’t see it.',
    'Start with the blot, the line comes later.',
    'Every page is permission to get it wrong.',
    'What you draw today is practice, not an exam.',
  ],
  pt: [
    'Mais um traço, hoje conta.',
    'Não precisa sair perfeito, precisa sair.',
    'Três minutos bastam para começar.',
    'Olhar bem já é desenhar.',
    'Pratique hoje, amanhã você nota.',
    'Uma mancha também é uma decisão.',
    'Respire, solte o pulso e desenhe.',
    'O importante é voltar amanhã.',
    'Sua mão aprende mesmo que você não veja.',
    'Comece pela mancha, a linha vem depois.',
    'Cada página é uma licença para errar.',
    'O que você desenha hoje é prática, não prova.',
  ],
};

/** Citas en la lengua pedida (cae al español si falta la traducción). */
export const citasEn = (frases, lang) => (frases || []).map(f => f[lang] || f.es).filter(c => c?.texto && c?.autor);

/** Baraja con un generador inyectable (para poder testear). */
export function barajar(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Mezcla: dos frases para practicar y una cita de Operadores Mágicos, repetido. Devuelve [{texto, autor?}]. */
export function armarCiclo(motivacion, citas, rnd = Math.random) {
  const m = barajar(motivacion.map(texto => ({ texto })), rnd), c = barajar(citas, rnd), out = [];
  while (m.length || c.length) {
    for (let k = 0; k < 2 && m.length; k++) out.push(m.shift());
    if (c.length) out.push(c.shift());
  }
  return out;
}

let frasesCache = null;
async function cargarFrases() {
  if (frasesCache) return frasesCache;
  try { const r = await fetch('/content/frases.json'); frasesCache = r.ok ? await r.json() : []; } catch { frasesCache = []; }
  return frasesCache;
}

const esSafari = () => /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** HTML del conejo con su globo. Se activa luego con activarMascota(). */
export const mascotaHTML = () => `<aside class="mascota" aria-label="${t('mascota.label')}">
  <div class="mascota-globo" role="status" aria-live="polite" aria-atomic="true"><p class="mascota-txt"></p><p class="mascota-aut"></p></div>
  <button type="button" class="mascota-btn" aria-label="${t('mascota.sig')}" title="${t('mascota.sig')}">
    <img class="mascota-img" src="/conejo/conejo.png" width="450" height="299" alt="${t('mascota.alt')}">
  </button>
</aside>`;

const MS = 7000;
export async function activarMascota(root = document) {
  const el = root.querySelector('.mascota'); if (!el) return;
  const lang = getLang();
  const frases = await cargarFrases();
  if (!el.isConnected) return;
  const ciclo = armarCiclo(MOTIVACION[lang] || MOTIVACION.es, citasEn(frases, lang));
  const txt = el.querySelector('.mascota-txt'), aut = el.querySelector('.mascota-aut'), globo = el.querySelector('.mascota-globo'), btn = el.querySelector('.mascota-btn');
  let i = -1, timer = null, pausa = false;
  const poner = animar => {
    i = (i + 1) % ciclo.length; const f = ciclo[i];
    const set = () => { txt.textContent = f.autor ? `“${f.texto}”` : f.texto; aut.textContent = f.autor ? `— ${f.autor}` : ''; globo.classList.toggle('es-cita', !!f.autor); globo.classList.remove('sale'); };
    if (animar && !reducido()) { globo.classList.add('sale'); setTimeout(set, 350); } else set();
  };
  const agendar = () => { clearTimeout(timer); if (reducido()) return; timer = setTimeout(() => { if (!el.isConnected) return; if (!pausa && !document.hidden) poner(true); agendar(); }, MS); };
  poner(false);
  btn.addEventListener('click', () => { poner(true); agendar(); });
  el.addEventListener('pointerenter', () => { pausa = true; }); el.addEventListener('pointerleave', () => { pausa = false; });
  el.addEventListener('focusin', () => { pausa = true; }); el.addEventListener('focusout', () => { pausa = false; });
  agendar();
  if (reducido()) return; // imagen quieta y sin ciclo automático
  const img = el.querySelector('.mascota-img');
  if (esSafari()) { // Safari: WebP animado (el WebM con transparencia no es fiable ahí)
    const a = new Image(); a.onload = () => { img.src = a.src; }; a.src = '/conejo/conejo-anim.webp';
    return;
  }
  const v = document.createElement('video');
  v.className = 'mascota-video'; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'auto'; v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
  v.width = 600; v.height = 398;
  v.innerHTML = '<source src="/conejo/conejo.webm" type="video/webm; codecs=vp09.00.10.08">';
  v.addEventListener('playing', () => el.classList.add('con-video'), { once: true });
  btn.append(v);
  v.play?.().catch(() => {});
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? v.play?.().catch(() => {}) : v.pause()))).observe(el);
}
