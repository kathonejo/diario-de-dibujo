import { handleUpload } from '@vercel/blob/client';
import { okPass, readJson } from './_lib.js';
import { rutaValida, esBot, TIPOS, MAX_BYTES } from './_trabajo.js';
import { ipDe, crearLimite } from './_rate.js';
// Token para subida directa desde el navegador (client upload) al álbum del día.
// Abierto a todos (con límite por IP y trampa para bots); la clave, si viene, tiene que ser correcta.
const limite = crearLimite(6, 10 * 60_000);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await readJson(req);
    const json = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let p = {}; try { p = JSON.parse(clientPayload || '{}'); } catch {}
        const conClave = p.passcode != null && p.passcode !== '';
        if (conClave && !okPass(p.passcode)) throw new Error('Código incorrecto');
        if (!conClave && esBot(p)) throw new Error('Datos no válidos');
        if (!conClave && !limite(ipDe(req))) throw new Error('Un toque más despacio: esperá un minutito.');
        if (!rutaValida(pathname)) throw new Error('Ruta no válida');
        return { allowedContentTypes: TIPOS, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: false, allowOverwrite: false };
      },
      onUploadCompleted: async () => {},
    });
    res.status(200).json(json);
  } catch (e) {
    const m = e.message || '';
    res.status(m === 'Código incorrecto' ? 401 : /despacio/.test(m) ? 429 : 400).json({ error: m });
  }
}
