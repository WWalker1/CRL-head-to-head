import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '')
  
  const tools = ['/counter-deck', '/matchup', '/models', '/clash-royale-counter-deck-finder', '/clash-royale-skill-score'].map(path => ({
    url: `${baseUrl}${path}`, changeFrequency: 'weekly' as const, priority: 0.8,
  }));
  const guides = ['/tools', '/guides', '/guides/matchup-skill', '/guides/review-a-matchup', '/about', '/privacy'].map(path => ({
    url: `${baseUrl}${path}`, changeFrequency: 'monthly' as const, priority: 0.7,
  }));
  return [
    ...(process.env.PUBLIC_PLAYER_LOOKUP_ENABLED === '1' ? [{ url: `${baseUrl}/compare-players`, changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...guides,
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


