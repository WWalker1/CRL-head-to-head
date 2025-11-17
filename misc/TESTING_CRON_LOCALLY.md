# Testing Cron Job Locally

## Quick Overview

Your cron job can be tested locally in several ways without pushing to main. Here are the best options:

## Method 1: Local Development Server (Easiest)

### 1. Start your Next.js dev server
```bash
npm run dev
```

### 2. Trigger the cron job with curl

The cron job accepts either:
- `x-vercel-cron` header with value `"1"`
- `CRON_SECRET` in Authorization header

**Option A: Using Vercel Cron Header**
```bash
curl http://localhost:3000/api/cron/sync-all-users \
  -H "x-vercel-cron: 1"
```

**Option B: Using CRON_SECRET (Recommended for local testing)**
```bash
# First, set your CRON_SECRET in .env.local
# Then:
curl http://localhost:3000/api/cron/sync-all-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Monitor logs
Watch your terminal where `npm run dev` is running to see:
- Batch processing logs
- Timing information
- Error messages
- Success/failure counts

## Method 2: Create a Test Script

Create a script to test with different scenarios:

### `scripts/test-cron.ts`
```typescript
// scripts/test-cron.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

async function testCron() {
  const response = await fetch(`${BASE_URL}/api/cron/sync-all-users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(data, null, 2));
}

testCron().catch(console.error);
```

Run with:
```bash
tsx scripts/test-cron.ts
# or
npx tsx scripts/test-cron.ts
```

## Method 3: Vercel Preview Deployments (Recommended for Real Testing)

### Setup Preview Environment

1. **Push to a branch** (not main):
```bash
git checkout -b test-cron-batch-processing
git add .
git commit -m "Test async batch processing"
git push origin test-cron-batch-processing
```

2. **Vercel automatically creates a preview deployment** for the branch

3. **Find your preview URL**: Check Vercel dashboard or your PR

4. **Test the cron endpoint** on preview:
```bash
curl https://your-preview-url.vercel.app/api/cron/sync-all-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Benefits of Preview Deployments
- ✅ Real production-like environment
- ✅ Uses actual Supabase database
- ✅ Same infrastructure as production
- ✅ Doesn't affect main branch
- ✅ Can test with real data

### Monitor in Vercel Dashboard
- Go to your deployment → Functions → View logs
- See real-time logs of batch processing
- Monitor execution time and errors

## Method 4: Vercel CLI Local Testing

### Install Vercel CLI
```bash
npm i -g vercel
```

### Link your project
```bash
vercel link
```

### Run locally with Vercel environment
```bash
vercel dev
```

This runs your app with Vercel's environment variables and infrastructure simulation.

Then test with:
```bash
curl http://localhost:3000/api/cron/sync-all-users \
  -H "x-vercel-cron: 1"
```

## Method 5: Direct Function Testing (Advanced)

### Test with limited users
Modify the cron route temporarily to only process first N users:

```typescript
// Temporarily add at line ~136 in route.ts
const usersWithPlayerTag = users.filter(
  (user) => user.user_metadata?.player_tag
).slice(0, 30); // Only test with first 30 users
```

This lets you:
- Test batch processing logic quickly
- Avoid processing all users during testing
- See results faster

**Remember to remove this limit before merging!**

## Method 6: Environment Variable Testing

### Use a separate test database

1. **Create a Supabase test project** (free tier is fine)
2. **Set test environment variables**:
```bash
# .env.local.test
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
CRON_SECRET=test-secret
```

3. **Run with test env**:
```bash
# Load test env and run
dotenv -e .env.local.test -- npm run dev
```

## Recommended Testing Strategy

### Phase 1: Quick Local Test (5 min)
```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, trigger cron
curl http://localhost:3000/api/cron/sync-all-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Phase 2: Preview Deployment (15 min)
1. Push to feature branch
2. Test on Vercel preview deployment
3. Monitor logs and performance
4. Check database for results

### Phase 3: Test with Subset of Data (Optional)
1. Temporarily limit users (see Method 5)
2. Verify batch processing works correctly
3. Check timing and rate limiting
4. Remove limit before merging

## What to Monitor During Testing

### 1. Console Logs
Look for:
- `=== Starting batch X at Ys ===`
- Batch completion times
- `Users processed: X of Y`
- Rate limit errors (429)

### 2. Execution Time
- Should complete in < 5 minutes
- Each batch should take ~500ms (plus processing time)
- Monitor total elapsed time

### 3. Database Results
- Check `battles` table for new entries
- Verify `user_ratings` updates
- Confirm no duplicate battles

### 4. Error Rates
- Track `usersFailed` count
- Monitor for 429 errors
- Check for database errors

## Troubleshooting

### Cron returns 401 Unauthorized
- Check `CRON_SECRET` is set in `.env.local`
- Verify Authorization header format: `Bearer YOUR_SECRET`
- Or use `x-vercel-cron: 1` header

### Timeout errors
- Vercel free tier has 10s function timeout (Hobby)
- Vercel Pro has 60s timeout
- Cron jobs can run up to 5 minutes
- Check your plan limits

### Database connection errors
- Verify Supabase environment variables
- Check Supabase project is active
- Monitor Supabase dashboard for connection limits

### Rate limiting issues
- Monitor for 429 responses
- Check batch timing (should be ~500ms between batches)
- Verify batch size is 15

## Production Testing (After Merging)

### Trigger manually in production
```bash
# Only do this when confident!
curl https://your-production-url.vercel.app/api/cron/sync-all-users \
  -H "Authorization: Bearer YOUR_PRODUCTION_CRON_SECRET"
```

### Monitor in Vercel Dashboard
- Deployments → Your deployment → Functions
- View real-time logs
- Check execution metrics

## Quick Test Script

Save this as `test-cron.sh`:

```bash
#!/bin/bash

# Test cron job locally
# Usage: ./test-cron.sh

URL="${1:-http://localhost:3000/api/cron/sync-all-users}"
SECRET="${CRON_SECRET:-your-secret-here}"

echo "Testing cron job at: $URL"
echo "Using secret: ${SECRET:0:10}..."

curl -v "$URL" \
  -H "Authorization: Bearer $SECRET" \
  | jq '.'

# Or without jq:
# curl "$URL" -H "Authorization: Bearer $SECRET"
```

Make executable:
```bash
chmod +x test-cron.sh
./test-cron.sh
```

## Next Steps

1. **Test locally** with Method 1 (quickest)
2. **Create preview deployment** with Method 3 (most realistic)
3. **Monitor performance** and verify batch processing
4. **Merge to main** when confident
5. **Monitor first production run** closely

