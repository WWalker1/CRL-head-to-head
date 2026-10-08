'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { createClient } from '@/lib/supabase';

export default function PostHogAuth() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;

    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (user) posthog.identify(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        posthog.reset();
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        posthog.identify(session.user.id);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
