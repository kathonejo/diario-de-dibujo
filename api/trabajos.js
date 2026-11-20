import { list, put, del, head } from '@vercel/blob';
import { okPass, okFecha, readJson } from './_lib.js';
import { armarItem, TIPOS, MAX_BYTES } from './_trabajo.js';
import { ipDe, crearLimite } from './_rate.js';
// GET  /api/trabajos[?fecha=]  -> { "AAAA-MM-DD": [{id,url,nota,creado,autor?,red?,publica?}] }
// POST {fecha,id,url,autor,red?,nota?,web?,passcode?} -> registra la foto en el álbum del día
//      (abierto a todos: autor obligatorio; con la clave de Katherine queda como suya)
// POST {passcode,check:true} -> valida el código
// DELETE {passcode,fecha,id} -> borra foto + registro (solo con la clave)
const limite = crearLimite(6, 10 * 60_000);
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const fecha = req.query?.fecha;
      const prefix = okFecha(fecha) ? `trabajos/${fecha}/` : 'trabajos/';
      let blobs = [], cursor;
      do { const r = await list({ prefix, cursor, limit: 1000 }); blobs.push(...r.blobs); cursor = r.hasMore ? r.cursor : null; } while (cursor);
      const metas = blobs.filter(b => b.pathname.endsWith('.json'));
      const items = await Promise.all(metas.map(b => fetch(b.url).then(r => r.json()).catch(() => null)));
      const out = {};
      for (const it of items.filter(Boolean).sort((a, b) => a.creado.localeCompare(b.creado))) (out[it.fecha] ??= []).push(it);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(out);
    }
    const b = await readJson(req);
    const conClave = b.passcode != null && b.passcode !== '';
    if (conClave && !okPass(b.passcode)) return res.status(401).json({ error: 'Código incorrecto' });
    if (req.method === 'POST' && b.check) return conClave ? res.status(200).json({ ok: true }) : res.status(401).json({ error: 'Código incorrecto' });
    if (req.method === 'POST') {
      if (!conClave && !limite(ipDe(req))) return res.status(429).json({ error: 'Un toque más despacio: esperá un minutito.' });
      const { item, error, status } = armarItem(b, { esKatherine: conClave });
      if (error) return res.status(status).json({ error });
      // La imagen tiene que existir en nuestro Blob, ser imagen y no pasar el límite.
      let h = null;
      try { h = await head(item.url); } catch {}
      if (!h || !h.url || new URL(h.url).pathname !== new URL(item.url).pathname) return res.status(400).json({ error: 'Datos no válidos' });
      if (!TIPOS.includes(String(h.contentType).split(';')[0]) || h.size > MAX_BYTES) {
        await del(h.url).catch(() => {});
        return res.status(400).json({ error: 'Archivo no válido' });
      }
      item.url = h.url; // la URL real del Blob, no la que mandó el navegador
      const ruta = `trabajos/${item.fecha}/${item.id}.json`;
      if (!conClave) { // un visitante nunca pisa un registro existente
        const ya = await head(ruta).catch(() => null);
        if (ya) return res.status(409).json({ error: 'Datos no válidos' });
      }
      await put(ruta, JSON.stringify(item), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: conClave });
      return res.status(200).json(item);
    }
    if (req.method === 'DELETE') {
      if (!conClave) return res.status(401).json({ error: 'Código incorrecto' });
      if (!okFecha(b.fecha)) return res.status(400).json({ error: 'Fecha no válida' });
      const id = String(b.id || '').replace(/[^\w-]/g, '');
      if (!id) return res.status(400).json({ error: 'Datos no válidos' });
      const { blobs } = await list({ prefix: `trabajos/${b.fecha}/${id}.` });
      if (blobs.length) await del(blobs.map(x => x.url));
      return res.status(200).json({ ok: true, borrados: blobs.length });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
