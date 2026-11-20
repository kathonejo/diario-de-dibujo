// Límite de pedidos por IP (best-effort, en memoria de cada instancia).
export function ipDe(req) {
  const xf = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || '';
  return String(xf).split(',')[0].trim() || 'sin-ip';
}
export function crearLimite(max, ventanaMs) {
  const m = new Map();
  return (clave, now = Date.now()) => {
    const arr = (m.get(clave) || []).filter(x => now - x < ventanaMs);
    if (arr.length >= max) { m.set(clave, arr); return false; }
    arr.push(now); m.set(clave, arr);
    if (m.size > 5000) for (const [k, v] of m) if (!v.length || now - v[v.length - 1] > ventanaMs) m.delete(k);
    return true;
  };
}
