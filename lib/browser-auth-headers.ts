import { createClient } from '@/lib/supabase';

/** The browser session can be newer than the SSR cookie after crossing hosts. */
export async function browserAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ? { authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}
