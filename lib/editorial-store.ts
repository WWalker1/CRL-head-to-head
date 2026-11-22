import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import snapshot from '@/content/editorial/preview/2026-11-22.json';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const sign = (key: string | Buffer, value: string) => createHmac('sha256', key).update(value).digest();

async function readObject(file: string): Promise<unknown> {
  if (!/^(latest|index|months\/\d{4}-\d{2})\.json$/.test(file)) return null;
  const account = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_EDITORIAL_BUCKET;
  const access = process.env.R2_EDITORIAL_READ_KEY_ID;
  const secret = process.env.R2_EDITORIAL_READ_SECRET;
  if (account && /^[a-f0-9]{32}$/.test(account) && bucket === 'rival-royale-editorial-dev' && access && secret) {
    const host = account + '.r2.cloudflarestorage.com';
    const uri = '/' + bucket + '/editorial/meta/' + file;
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = now.slice(0,8);
    const hash = digest('');
    const headers = 'host:' + host + '\nx-amz-content-sha256:' + hash + '\nx-amz-date:' + now + '\n';
    const names = 'host;x-amz-content-sha256;x-amz-date';
    const canonical = ['GET',uri,'',headers,names,hash].join('\n');
    const scope = date + '/auto/s3/aws4_request';
    const key = sign(sign(sign(sign('AWS4'+secret,date),'auto'),'s3'),'aws4_request');
    const signature = sign(key,['AWS4-HMAC-SHA256',now,scope,digest(canonical)].join('\n')).toString('hex');
    const response = await fetch('https://'+host+uri, { cache:'no-store', signal:AbortSignal.timeout(8000),
      headers:{ 'x-amz-content-sha256':hash, 'x-amz-date':now,
        Authorization:'AWS4-HMAC-SHA256 Credential='+access+'/'+scope+', SignedHeaders='+names+', Signature='+signature } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Editorial storage returned '+response.status);
    return response.json();
  }
  if (process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development' || (!process.env.VERCEL && process.env.EDITORIAL_LOCAL_PREVIEW === '1')) {
    // This verified collection lies wholly in November. The month and week
    // therefore have the same counts. Only the twelve most-used lists are bundled.
    if (file === 'latest.json') return snapshot;
    if (file === 'index.json') return ['2026-11'];
    if (file === 'months/2026-11.json') return {...snapshot,collectionWindows:1};
  }
  return null;
}

export const readReport = unstable_cache(readObject,['editorial-objects-v1'],{revalidate:900});
