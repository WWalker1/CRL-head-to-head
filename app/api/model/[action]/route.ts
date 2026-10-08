import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { isLocalModelPreview, MODEL_READ_ACTIONS, MODEL_WRITE_ACTIONS, readModelBody } from '@/lib/model-access';
import { checkAnonymousRateLimit } from '@/lib/anonymous-rate-limit';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function forward(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const reading = request.method === 'GET';
  if (!(reading ? MODEL_READ_ACTIONS : MODEL_WRITE_ACTIONS).has(action)) {
    return NextResponse.json({ error: 'Unknown model operation.' }, { status: 404 });
  }
  if (process.env.MODEL_TOOLS_ENABLED !== '1') {
    return NextResponse.json({ error: 'Model tools are not enabled yet.' }, { status: 503 });
  }
  const serviceUrl = process.env.MODEL_SERVICE_URL;
  const serviceToken = process.env.MODEL_SERVICE_TOKEN;
  if (!serviceUrl || !serviceToken) {
    return NextResponse.json({ error: 'The model service is not configured.' }, { status: 503 });
  }
  try {
    let body: string | undefined;
    if (reading && !isLocalModelPreview(request.url)) {
      const limited = await checkAnonymousRateLimit(request, 'model_read');
      if (limited) return limited;
    }
    if (!reading) {
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin) {
        return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
      }
      body = await readModelBody(request);
      if (!isLocalModelPreview(request.url)) {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          return NextResponse.json({ error: 'Sign-in is not configured.' }, { status: 503 });
        }
        const supabase = await createClient();
        const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
        const { data: { user }, error } = await supabase.auth.getUser(bearer);
        if (error || !user) {
          if (action !== 'counter') return NextResponse.json({ error: 'Sign in to use model predictions.' }, { status: 401 });
          if (!origin) return NextResponse.json({ error: 'A same-site origin is required.' }, { status: 403 });
          const limited = await checkAnonymousRateLimit(request, 'counter_search');
          if (limited) return limited;
        } else {
          // The browser supplies its current token as a fallback when an SSR cookie
          // has not been refreshed yet (for example, after moving to a preview host).
          const quotaClient = bearer ? createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${bearer}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          }) : supabase;
          const { data: allowed, error: quotaError } = await quotaClient.rpc('consume_model_quota', {
            operation: action === 'predict' ? 'predict' : 'search',
          });
          if (quotaError) return NextResponse.json({ error: 'Model quota service is unavailable.' }, { status: 503 });
          if (!allowed) return NextResponse.json({ error: 'Usage limit reached. Try again in a minute.' }, {
            status: 429, headers: { 'Retry-After': '60' },
          });
        }
      }
    }
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/${action}`, {
      method: reading ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body, cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    });
    const payload = await response.json();
    // Never return upstream tracebacks; FastAPI's structured validation errors remain useful.
    if (response.status >= 500) return NextResponse.json({ error: 'The model service is busy or unavailable. Try again shortly.' }, { status: 503 });
    return NextResponse.json(payload, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'too_large') return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    if (reason === 'invalid_json') return NextResponse.json({ error: 'Send a valid JSON object.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not reach the model service. Check that it is running.' }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
