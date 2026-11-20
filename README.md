# Diario de dibujo

Diario de estudio de dibujo: una página por día (moodboard, frase, misión y datos de libros) + temporizador 15/30/60 min.

- Contenido: `content/AAAA-MM-DD/dia.json` + imágenes. `npm run build` genera el índice.
- Publicar un día: `scripts/publicar_dia.sh [AAAA-MM-DD] [carpeta_origen]` (por defecto hoy). Lee `/workspace/raton-perez/<fecha>/`, sale con error si falta `dia.json` (1) o `moodboard.png` (2), optimiza imágenes a webp ≤1600px, hace commit y push → Vercel despliega solo.

## Idiomas (ES / EN / PT)

- Selector ES / EN / PT en el menú (y en la pantalla de inicio y el mural de la instalación). Se recuerda la elección; si no hay elección, usa el idioma del navegador (es→ES, pt→PT, en u otro→EN). Link directo: `/?lang=en`, `/?lang=pt`, `/?lang=es`.
- Textos de la interfaz: `src/i18n.js` (el español es el original; si falta una traducción se muestra el español).
- Traducciones de cada día: `i18n/AAAA-MM-DD.json` con `{"en": {...}, "pt": {...}}` (campos `tema`, `mision`, `frase.texto/autor`, `paleta` como mapa nombre-original→traducción, y `datos[i].texto/pagina` en el mismo orden). Están fuera de `content/` para que `publicar_dia.sh` no las borre al reemplazar un día. `npm run build` las suma al `dia.json` publicado. Un `dia.json` también puede traer su propio campo `"i18n"` con el mismo formato.
- Si un día no tiene traducción, la página de ese día se ve en español con la interfaz en el idioma elegido.
