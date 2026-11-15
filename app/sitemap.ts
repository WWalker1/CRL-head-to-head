import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '')
  
  const tools = ['/counter-deck', '/matchup', '/models', '/clash-royale-skill-score'].map(path => ({
    url: `${baseUrl}${path}`, changeFrequency: 'weekly' as const, priority: 0.8,
  }));
  return [
    ...['/about', '/contact', '/privacy', '/clash-royale-counter-deck-finder', '/guides/understand-skill-score'].map(path => ({ url: `${baseUrl}${path}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...['/guides', '/guides/elixir-management', '/guides/review-clash-royale-losses'].map(path => ({
      url: `${baseUrl}${path}`, lastModified: '2026-11-15', changeFrequency: 'monthly' as const, priority: 0.7,
    })),
    ...(process.env.MODEL_TOOLS_ENABLED === '1' ? tools : []),
    {
      url: baseUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/info`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]
}


