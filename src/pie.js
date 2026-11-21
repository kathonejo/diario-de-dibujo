import { t } from './i18n.js';

/* URLs taken verbatim from kathonejo.com/contacto. Do not invent any. */
const REDES = [
  { href: 'https://x.com/kathonejo', name: 'X' },
  { href: 'https://www.instagram.com/kathonejo', name: 'Instagram' },
  { href: 'https://www.behance.net/kathonejo', name: 'Behance' },
  { href: 'https://www.linkedin.com/in/kathonejo/', name: 'LinkedIn' },
  { href: 'https://drive.google.com/file/d/172cG1TzCaTPBAgB6iVWnw9gMwEjG6YvD/view', nameKey: 'contact.cosmovision' },
];

export function pie() {
  const links = REDES.map(r => {
    const name = r.nameKey ? t(r.nameKey) : r.name;
    return `<a href="${r.href}" target="_blank" rel="noopener noreferrer">${name} <span aria-hidden="true">→</span></a>`;
  }).join('');
  return `<footer class="site-foot">
    <div class="site-contact">
      <h2 class="site-contact-h">${t('contact.h')}</h2>
      <p class="site-contact-mail"><a href="mailto:Kathonejo@gmail.com">Kathonejo@gmail.com</a></p>
      <nav class="site-contact-links" aria-label="${t('contact.redes')}">${links}</nav>
    </div>
    <p class="site-foot-name">${t('foot')}</p>
  </footer>`;
}
