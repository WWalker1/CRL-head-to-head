import posthog from 'posthog-js';

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-05-30',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
  });
}
