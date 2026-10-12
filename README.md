# Diario de dibujo

Diario de estudio de dibujo: una página por día (moodboard, frase, misión y datos de libros) + temporizador 15/30/60 min.

- Contenido: `content/AAAA-MM-DD/dia.json` + imágenes. `npm run build` genera el índice.
- Publicar un día: `scripts/publicar_dia.sh [AAAA-MM-DD]` (por defecto hoy). Lee `/workspace/raton-perez/<fecha>/`, sale con error si falta `dia.json` (1) o `moodboard.png` (2), optimiza imágenes a webp ≤1600px, hace commit y push → Vercel despliega solo.
