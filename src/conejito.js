import { t } from './i18n.js';

const KEYS = ['bunny.m1', 'bunny.m2', 'bunny.m3', 'bunny.m4', 'bunny.q1', 'bunny.q2', 'bunny.q3', 'bunny.q4'];
const INTERVAL = 7000;
const CHROMA = [255, 0, 255];
const SIMIL = 48;

function frases() {
  return KEYS.map(k => t(k));
}

function supportsWebmAlpha() {
  const v = document.createElement('video');
  return v.canPlayType('video/webm; codecs="vp9"') !== '';
}

function chromakey(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [cr, cg, cb] = CHROMA;
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - cr, dg = d[i + 1] - cg, db = d[i + 2] - cb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) < SIMIL) d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
}

function runChroma(video, canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const draw = () => {
    if (!video.isConnected) return;
    if (video.readyState >= 2) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0);
      chromakey(ctx, canvas.width, canvas.height);
    }
    requestAnimationFrame(draw);
  };
  video.play().catch(() => {});
  requestAnimationFrame(draw);
}

export function montarConejito(root) {
  const box = root.querySelector('.home-bunny');
  if (!box) return;
  const txt = box.querySelector('.home-bunny-txt');
  const video = box.querySelector('video');
  const canvas = box.querySelector('canvas');
  if (!txt) return;

  let i = 0;
  const list = () => frases();
  const show = () => {
    const L = list();
    txt.textContent = L[i % L.length];
    i += 1;
  };
  show();
  const tick = setInterval(show, INTERVAL);
  const onLang = () => { i = 0; show(); };
  document.addEventListener('langchange', onLang);

  if (video && canvas && !supportsWebmAlpha()) {
    video.hidden = true;
    canvas.hidden = false;
    const start = () => runChroma(video, canvas);
    if (video.readyState >= 2) start();
    else video.addEventListener('loadeddata', start, { once: true });
  } else if (video) {
    video.play().catch(() => {});
  }

  return () => {
    clearInterval(tick);
    document.removeEventListener('langchange', onLang);
  };
}
