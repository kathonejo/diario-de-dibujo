import { handleUpload } from '@vercel/blob/client';
import { okPass, okFecha, readJson } from './_lib.js';
// Token para subida directa desde el navegador (client upload). Exige el código.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await readJson(req);
    const json = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { passcode } = JSON.parse(clientPayload || '{}');
        if (!okPass(passcode)) throw new Error('Código incorrecto');
        if (!/^trabajos\/\d{4}-\d{2}-\d{2}\/[\w.-]+\.(jpe?g|png|webp)$/i.test(pathname)) throw new Error('Ruta no válida');
        return { allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'], maximumSizeInBytes: 15 * 1024 * 1024, addRandomSuffix: false };
      },
      onUploadCompleted: async () => {},
    });
    res.status(200).json(json);
  } catch (e) { res.status(e.message === 'Código incorrecto' ? 401 : 400).json({ error: e.message }); }
}
