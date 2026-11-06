import { list, put, del } from '@vercel/blob';
import { okFecha, readJson } from './_lib.js';

const MAX_IMG = 1.8 * 1024 * 1024; // ~1.8 MB
const MAX_STROKES = 700_000; // bytes of JSON
const MAX_POR_DIA = 200;
const RATE_VENTANA_MS = 60_000;
const RATE_MAX = 8; // por IP por minuto (best-effort en memoria)
const rate = new Map();

function ipDe(req) {
  const xf = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  return String(xf).split(',')[0].trim() || 'anon';
}

function rateOk(ip) {
  const now = Date.now();
  const arr = (rate.get(ip) || []).filter(t => now - t < RATE_VENTANA_MS);
  if (arr.length >= RATE_MAX) { rate.set(ip, arr); return false; }
  arr.push(now);
  rate.set(ip, arr);
  if (rate.size > 5000) {
    for (const [k, v] of rate) if (!v.length || now - v[v.length - 1] > RATE_VENTANA_MS) rate.delete(k);
  }
  return true;
}

function hoyArt() {
  return new Date().toLocaleDateString('sv', { timeZone: 'America/Buenos_Aires' });
}

async function listar(prefix) {
  let blobs = [], cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : null;
  } while (cursor);
  return blobs;
}

export function itemPublico(it, metaUrl) {
  if (!it || typeof it !== 'object') return null;
  const { strokes, ipHash, ...rest } = it;
  const list = Array.isArray(strokes) ? strokes : [];
  return {
    ...rest,
    strokes: list,
    metaUrl: metaUrl || null,
    hasStrokes: list.length > 0,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const fecha = req.query?.fecha;
      const all = req.query?.all === '1' || req.query?.all === 'true';
      const prefix = (!all && okFecha(fecha)) ? `instalacion/${fecha}/` : 'instalacion/';
      const blobs = await listar(prefix);
      const metas = blobs.filter(b => b.pathname.endsWith('.json') && !b.pathname.includes('/_rate/'));
      const raw = await Promise.all(metas.map(async b => {
        const it = await fetch(b.url).then(r => r.json()).catch(() => null);
        if (!it) return null;
        return itemPublico(it, b.url);
      }));
      const items = raw.filter(Boolean).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ items, total: items.length });
    }

    if (req.method === 'DELETE') {
      // Solo para limpieza de prueba: requiere UPLOAD_PASSCODE
      const b = await readJson(req);
      const { okPass } = await import('./_lib.js');
      if (!okPass(b.passcode)) return res.status(401).json({ error: 'Código incorrecto' });
      if (!b.url && !b.id) return res.status(400).json({ error: 'Falta url o id' });
      if (b.url) {
        const { blobs } = await list({ prefix: `instalacion/` });
        const match = blobs.filter(x => x.url === b.url || (b.id && x.pathname.includes(`/${b.id}.`)));
        if (match.length) await del(match.map(x => x.url));
        return res.status(200).json({ ok: true, borrados: match.length });
      }
      const fecha = okFecha(b.fecha) ? b.fecha : hoyArt();
      const { blobs } = await list({ prefix: `instalacion/${fecha}/${b.id}.` });
      if (blobs.length) await del(blobs.map(x => x.url));
      return res.status(200).json({ ok: true, borrados: blobs.length });
    }

    if (req.method !== 'POST') return res.status(405).end();

    const ip = ipDe(req);
    if (!rateOk(ip)) return res.status(429).json({ error: 'Un toque más despacio: esperá un minutito.' });

    const b = await readJson(req);
    const fecha = okFecha(b.fecha) ? b.fecha : hoyArt();

    const delDia = (await listar(`instalacion/${fecha}/`)).filter(x => x.pathname.endsWith('.json'));
    if (delDia.length >= MAX_POR_DIA) {
      return res.status(429).json({ error: 'Hoy el mural ya está lleno. Volvé mañana.' });
    }

    const dataUrl = String(b.image || '');
    const m = dataUrl.match(/^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return res.status(400).json({ error: 'Imagen no válida' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 200 || buf.length > MAX_IMG) {
      return res.status(400).json({ error: 'La imagen es demasiado grande o está vacía' });
    }

    let strokes = b.strokes;
    if (typeof strokes === 'string') {
      try { strokes = JSON.parse(strokes); } catch { strokes = []; }
    }
    if (!Array.isArray(strokes)) strokes = [];
    const strokesJson = JSON.stringify(strokes);
    if (strokesJson.length > MAX_STROKES) {
      return res.status(400).json({ error: 'Demasiados trazos' });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const ext = m[1] === 'image/webp' ? 'webp' : m[1] === 'image/jpeg' ? 'jpg' : 'png';
    const imgPath = `instalacion/${fecha}/${id}.${ext}`;
    const metaPath = `instalacion/${fecha}/${id}.json`;

    const img = await put(imgPath, buf, {
      access: 'public',
      contentType: m[1],
      addRandomSuffix: false,
    });

    const meta = {
      id,
      fecha,
      url: img.url,
      strokes,
      creado: new Date().toISOString(),
      w: Number(b.w) || null,
      h: Number(b.h) || null,
      tema: String(b.tema || '').slice(0, 200),
      ipHash: String(ip).slice(0, 40),
    };
    await put(metaPath, JSON.stringify(meta), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // No devolvemos strokes enteros al cliente otra vez (peso); el mural los pide por URL
    return res.status(200).json({
      id: meta.id,
      fecha: meta.fecha,
      url: meta.url,
      creado: meta.creado,
      w: meta.w,
      h: meta.h,
      tema: meta.tema,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error' });
  }
}
