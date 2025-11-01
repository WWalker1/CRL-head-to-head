# CRL Head to Head Tracker

A simple Next.js application that allows Clash Royale players to track their win/loss records against their friends.

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp env.template .env.local
```

Then fill in the following values:

- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anonymous key
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (for server-side operations)
- **CLASH_ROYALE_API_KEY**: Your Clash Royale API key

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL migrations in order:
   - First: `supabase/migrations/001_initial_schema.sql`
   - Second: `supabase/migrations/002_increment_function.sql`
4. Copy your project URL and keys to `.env.local`

### 3. Clash Royale API

1. Go to [developer.clashroyale.com](https://developer.clashroyale.com)
2. Sign in with your Supercell ID
3. Create a new API key
4. Copy the key to `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Track win/loss records against friends
- Automatic battle syncing from Clash Royale API
- Clean, gaming-themed UI
- User authentication with Supabase

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Clash Royale API

## Deployment

Deploy to Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!