# LeetTracker Setup Guide

A minimalistic web app to track daily LeetCode completion for two users with automatic verification.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works great)
- Two LeetCode usernames to track

## Step 1: Clone and Install Dependencies

```bash
cd leettracker
npm install
```

Dependencies installed:
- `next` - React framework
- `@supabase/supabase-js` - Supabase client
- `luxon` - Timezone handling
- `tailwindcss` - Styling

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: `leettracker`
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to you
4. Wait ~2 minutes for provisioning

## Step 3: Set Up Environment Variables

1. In Supabase dashboard, go to **Project Settings → API**
2. Copy the **Project URL** and **anon public** key
3. Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open `supabase/migrations/001_initial_schema.sql`
4. **IMPORTANT**: Edit the INSERT statement at the bottom to add your two usernames:

```sql
INSERT INTO users (leetcode_username, display_name) VALUES
  ('actual_leetcode_user1', 'Alice'),  -- Replace with real username
  ('actual_leetcode_user2', 'Bob')     -- Replace with real username
ON CONFLICT (leetcode_username) DO NOTHING;
```

5. Copy the entire SQL and paste into Supabase SQL Editor
6. Click **Run** to execute
7. Verify tables were created: Go to **Table Editor** and you should see `users` and `daily_results` tables

## Step 5: Test Locally

```bash
npm run dev
```

Open browser to:
- **Main app**: http://localhost:3000
- **Test endpoint**: http://localhost:3000/api/test-leetcode?username=YOUR_USERNAME

The test endpoint should return JSON showing whether the user solved today.

## Step 6: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up/login
3. Click "**New Project**" → Import your GitHub repository
4. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**
6. Vercel will automatically enable the cron job (defined in `vercel.json`)

## How It Works

### Data Flow

1. **Every 5 minutes**, Vercel Cron calls `/api/sync`
2. Sync endpoint:
   - Fetches LeetCode data for both users via GraphQL
   - Checks if they have accepted submissions "today" (Pacific timezone)
   - Updates `daily_results` table in Supabase
3. **UI reads from database** (not live LeetCode API)
   - Shows today's status (✅ or ❌)
   - Displays solve time if completed
   - Calculates current and longest streaks

### Timezone Handling

- All day boundaries use **America/Los_Angeles** timezone
- "Today" = 00:00:00 to 23:59:59 Pacific time
- LeetCode timestamps (UTC) are converted to Pacific for display
- Countdown timer shows time until midnight Pacific

### Database Schema

**users table:**
- `id` (UUID)
- `leetcode_username` (unique)
- `display_name`

**daily_results table:**
- `user_id` → references users
- `date` (Pacific timezone date)
- `did_solve` (boolean)
- `solved_at` (timestamp)
- `problem_title`, `problem_slug`, `submission_id`
- Unique constraint: one record per user per date

## Troubleshooting

**"Missing Supabase environment variables"**
- Make sure `.env.local` exists with correct values
- Restart dev server after creating `.env.local`

**API returns `isDone: false` but user did solve**
- Check timezone: submissions must be within today in Pacific time
- Test with: `/api/test-leetcode?username=YOUR_USERNAME`
- Verify LeetCode username is spelled correctly

**Vercel cron not running**
- Check Vercel dashboard → your project → Settings → Cron
- View logs: Deployments → select deployment → Runtime Logs

## Project Structure

```
leettracker/
├── app/
│   ├── page.tsx                 # Main "today" view
│   ├── history/page.tsx         # 30-day history
│   ├── api/
│   │   ├── sync/route.ts        # Background sync (cron)
│   │   └── test-leetcode/route.ts
│   └── globals.css
├── lib/
│   ├── leetcode.ts              # LeetCode API client
│   ├── supabase.ts              # Database client
│   ├── streaks.ts               # Streak calculations
│   ├── timezone.ts              # Pacific time helpers
│   └── types.ts
├── supabase/migrations/
│   └── 001_initial_schema.sql
└── vercel.json                  # Cron config
```

## Next Steps

1. Customize the UI in `app/page.tsx`
2. Add your LeetCode usernames in Supabase
3. Deploy to Vercel
4. Share the URL with your accountability partner!

## License

MIT
