import { readJson } from './_lib.js';

const FRASES = [
  { texto: 'Qué lindo trazo. Se nota que te soltaste.', score: 4 },
  { texto: 'Me gusta el ritmo de la línea. Seguí por ahí.', score: 4 },
  { texto: 'Hay algo tierno en cómo lo resolviste. Bien.', score: 5 },
  { texto: 'Se siente el gesto. No hace falta que sea perfecto.', score: 4 },
  { texto: 'Buena energía. Probá una pasada más suelta la próxima.', score: 3 },
  { texto: 'El contraste te quedó piola. El ojo se va para donde querés.', score: 4 },
  { texto: 'Me encanta lo simple. A veces menos es más.', score: 5 },
  { texto: 'Se ve el intento con cariño. Eso ya vale.', score: 4 },
  { texto: 'Hay movimiento. Dejá que la línea respire un toque más.', score: 3 },
  { texto: 'Qué presencia. Quedó con carácter.', score: 5 },
  { texto: 'Bonito equilibrio. Seguí mirando la forma grande antes del detalle.', score: 4 },
  { texto: 'Se nota la mano. Relajá el hombro y va a salir todavía más fluido.', score: 3 },
  { texto: 'Hay humor en el dibujo. Me gusta.', score: 5 },
  { texto: 'Buena composición. El espacio vacío también habla.', score: 4 },
  { texto: 'Quedó con alma. Gracias por dejarlo en el mural.', score: 5 },
];

function fraseFallback() {
  return FRASES[Math.floor(Math.random() * FRASES.length)];
}

function parseRespuesta(text) {
  const raw = String(text || '').trim();
  try {
    const j = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
    const texto = String(j.texto || j.comentario || j.message || '').trim().slice(0, 280);
    let score = Number(j.score ?? j.ponderacion ?? j.nota);
    if (!Number.isFinite(score)) score = 4;
    score = Math.max(1, Math.min(5, Math.round(score)));
    if (texto) return { texto, score, fuente: 'grok' };
  } catch { /* fall through */ }
  const clean = raw.replace(/^["']|["']$/g, '').slice(0, 280);
  if (clean.length > 8) return { texto: clean, score: 4, fuente: 'grok' };
  return null;
}

async function mirarConGrok(imageUrl, tema) {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;

  const prompt =
    `Sos un conejo dibujante rioplatense, cálido y breve. Mirás un dibujo hecho en una instalación táctil` +
    (tema ? ` sobre el tema: "${tema.slice(0, 120)}"` : '') +
    `. Respondé SOLO un JSON válido, sin markdown: {"texto":"...","score":N}. ` +
    `"texto" = 1 o 2 oraciones cortas en español rioplatense (vos), amables, sin ser cursi, que digan qué ves y una sugerencia suave. ` +
    `"score" = número entero 1 a 5 (ponderación gentil; 1 casi nunca, 3 está bien, 5 brilla). Nunca seas cruel ni pongas nota escolar.`;

  // Preferimos chat/completions OpenAI-compatible (rápido). Modelo visión: grok-2-vision-1212; fallback grok-4.
  const models = ['grok-2-vision-1212', 'grok-4-fast-non-reasoning', 'grok-4'];
  for (const model of models) {
    try {
      const r = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 160,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });
      if (!r.ok) {
        const err = await r.text().catch(() => '');
        if (r.status === 404 || /model/i.test(err)) continue;
        console.error('xAI error', r.status, err.slice(0, 200));
        continue;
      }
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content;
      const parsed = parseRespuesta(text);
      if (parsed) return { ...parsed, model };
    } catch (e) {
      console.error('xAI fetch fail', e.message);
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = await readJson(req);
    const image = String(b.image || b.url || '');
    if (!image || image.length < 12) return res.status(400).json({ error: 'Falta imagen' });
    // Aceptamos URL pública o data URL
    if (!/^https?:\/\//i.test(image) && !/^data:image\//i.test(image)) {
      return res.status(400).json({ error: 'Imagen no válida' });
    }
    if (image.startsWith('data:') && image.length > 2_500_000) {
      return res.status(400).json({ error: 'Imagen demasiado grande' });
    }

    const ai = await mirarConGrok(image, String(b.tema || ''));
    if (ai) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(ai);
    }
    const fb = fraseFallback();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ...fb, fuente: 'frase' });
  } catch (e) {
    const fb = fraseFallback();
    return res.status(200).json({ ...fb, fuente: 'frase', error: e.message });
  }
}
