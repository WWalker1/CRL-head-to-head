export function isLocalModelPreview(url: string): boolean {
  const host = new URL(url).hostname;
  return process.env.NODE_ENV === 'development' && process.env.MODEL_LOCAL_PREVIEW === '1'
    && ['localhost', '127.0.0.1', '[::1]'].includes(host);
}

export const MODEL_READ_ACTIONS = new Set(['catalog', 'examples']);
export const MODEL_WRITE_ACTIONS = new Set(['predict', 'counter']);

// Bound streamed requests too: Content-Length is optional and untrusted.
export async function readModelBody(request: Request, limit = 32768): Promise<string> {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_json');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error('too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  const body = new TextDecoder().decode(joined);
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
  } catch { throw new Error('invalid_json'); }
  return body;
}
