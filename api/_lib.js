export const okPass = p => !!process.env.UPLOAD_PASSCODE && p === process.env.UPLOAD_PASSCODE;
export const okFecha = f => /^\d{4}-\d{2}-\d{2}$/.test(f || '');
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
