# LeetTracker

A simple daily LeetCode accountability tracker for groups. Made this because my friends and I made a challenge to do daily leetcode problems and I was too lazy to manually check everyone's profiles.

## What it does

- Tracks whether everyone in your group solved a LeetCode problem today
- Shows streaks and a 30-day history grid
- Rooms let you create separate tracking groups
- Auto-syncs via cron job every 15 minutes but you can manually refresh

## Tech stack

- Next.js
- Supabase (Postgres)
- Deployed on Vercel

## Running locally

1. Clone the repo
2. `npm install`
3. Create a Supabase project and grab your URL + anon key
4. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```
5. Run the SQL migrations in `supabase/migrations/` via Supabase SQL Editor
6. `npm run dev`

## Deploying

Push to GitHub, import into Vercel, add env vars, done. The cron job in `vercel.json` handles auto-syncing.

## License

MIT
