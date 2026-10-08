/** @jest-environment node */
import { isLocalModelPreview, readModelBody } from '../model-access';

describe('model request boundaries', () => {
  const oldEnv = process.env;
  afterEach(() => { process.env = oldEnv; });
  it('allows preview only on a development loopback host with explicit opt-in', () => {
    process.env = { ...oldEnv, NODE_ENV: 'development', MODEL_LOCAL_PREVIEW: '1' };
    expect(isLocalModelPreview('http://127.0.0.1:3000')).toBe(true);
    expect(isLocalModelPreview('https://rival.example')).toBe(false);
    process.env = { ...process.env, NODE_ENV: 'production' };
    expect(isLocalModelPreview('http://localhost:3000')).toBe(false);
  });
  it('rejects an oversized body even without a content-length header', async () => {
    await expect(readModelBody(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ value: 'a'.repeat(100) }) }), 30)).rejects.toThrow('too_large');
  });
  it('requires a JSON object', async () => {
    await expect(readModelBody(new Request('http://localhost', { method: 'POST', body: '[]' }))).rejects.toThrow('invalid_json');
    expect(await readModelBody(new Request('http://localhost', { method: 'POST', body: '{"decks":[]}' }))).toBe('{"decks":[]}');
  });
});
