import { t } from './i18n.js';

const REDES = [
  { href: 'https://www.instagram.com/diariodedibujoapp', name: 'Instagram' },
  { href: 'https://x.com/diariodedibujo', name: 'X' },
];

export function pie() {
  const links = REDES.map(r =>
    `<a href="${r.href}" target="_blank" rel="noopener noreferrer">${r.name} <span aria-hidden="true">→</span></a>`
  ).join('');
  return `<footer class="site-foot">
    <div class="site-contact">
      <h2 class="site-contact-h">${t('contact.h')}</h2>
      <nav class="site-contact-links" aria-label="${t('contact.redes')}">${links}</nav>
    </div>
  </footer>`;
}
