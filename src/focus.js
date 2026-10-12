let el = null;
export function openFocus(images, start = 0) {
  let i = start;
  el = document.createElement('div'); el.className = 'focus';
  el.innerHTML = `<button class="f-salir">Salir (Esc)</button><button class="f-fs" aria-pressed="false">⛶ Pantalla completa</button>
    <button class="f-nav f-prev" aria-label="Anterior">‹</button><img alt=""><button class="f-nav f-next" aria-label="Siguiente">›</button>
    <div class="f-chips">${images.map((m, k) => `<button data-k="${k}"><img src="${m.src}" alt="">${m.label}</button>`).join('')}</div>`;
  document.body.append(el); document.body.classList.add('en-focus');
  const show = k => { i = (k + images.length) % images.length; el.querySelector(':scope > img').src = images[i].src;
    el.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('sel', +b.dataset.k === i)); };
  const close = () => { if (!el) return; document.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', fs);
    el.remove(); el = null; document.body.classList.remove('en-focus'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  const key = e => { if (e.key === 'ArrowLeft') show(i - 1); else if (e.key === 'ArrowRight') show(i + 1); else if (e.key === 'Escape') close(); };
  const fs = () => { const b = el?.querySelector('.f-fs'); if (b) { const on = !!document.fullscreenElement; b.setAttribute('aria-pressed', on); b.textContent = on ? '⛶ Salir de pantalla completa' : '⛶ Pantalla completa'; } };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k) show(+b.dataset.k); else if (b.classList.contains('f-prev')) show(i - 1); else if (b.classList.contains('f-next')) show(i + 1);
    else if (b.classList.contains('f-fs')) { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen?.().catch(() => {}); }
    else close(); });
  document.addEventListener('keydown', key);
  show(i);
  // Pantalla completa opcional (apagada por defecto); el overlay ocupa la ventana actual.
  document.addEventListener('fullscreenchange', fs);
}
