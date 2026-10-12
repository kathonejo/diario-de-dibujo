import { list, put, del } from '@vercel/blob';
import { okPass, okFecha, readJson } from './_lib.js';
// GET  /api/trabajos[?fecha=]  -> { "AAAA-MM-DD": [{id,url,nota,creado}] }
// POST {passcode,fecha,url,nota} -> registra la foto (guarda trabajos/<fecha>/<id>.json)
// POST {passcode,check:true} -> valida el código
// DELETE {passcode,fecha,id} -> borra foto + registro
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
    if (!okPass(b.passcode)) return res.status(401).json({ error: 'Código incorrecto' });
    if (req.method === 'POST' && b.check) return res.status(200).json({ ok: true });
    if (!okFecha(b.fecha)) return res.status(400).json({ error: 'Fecha no válida' });
    if (req.method === 'POST') {
      const id = String(b.id || '').replace(/[^\w-]/g, '');
      if (!id || !String(b.url).includes(`/trabajos/${b.fecha}/${id}.`)) return res.status(400).json({ error: 'Datos no válidos' });
      const it = { id, fecha: b.fecha, url: b.url, nota: String(b.nota || '').slice(0, 500), creado: new Date().toISOString() };
      await put(`trabajos/${b.fecha}/${id}.json`, JSON.stringify(it), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
      return res.status(200).json(it);
    }
    if (req.method === 'DELETE') {
      const id = String(b.id || '').replace(/[^\w-]/g, '');
      const { blobs } = await list({ prefix: `trabajos/${b.fecha}/${id}.` });
      if (blobs.length) await del(blobs.map(x => x.url));
      return res.status(200).json({ ok: true, borrados: blobs.length });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
