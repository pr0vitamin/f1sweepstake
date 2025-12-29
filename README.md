# F1 Sweepstakes

A Formula 1 fantasy draft game built with Next.js and Supabase.

## Features

- **Snake Draft System** - Live draft room with turn-based driver selection
- **Real-time Updates** - Draft picks and notifications update instantly
- **Points Scoring** - Configurable points per position, including penalties for DNF/DSQ
- **Season Management** - Admin dashboard for managing teams, drivers, races, and results
- **Leaderboard** - Track standings across the season
- **In-App Notifications** - Get notified when drafts open or it's your turn

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- npm or yarn

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/f1sweepstake.git
cd f1sweepstake
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project URL and publishable key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

You can find these in your Supabase project dashboard under **Settings > API**.

### 4. Set Up the Database

First, log in to the Supabase CLI:

```bash
npx supabase login
```

Then, link your local project to your Supabase project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

Then run the migrations to create tables, policies, and seed data:

```bash
npx supabase db push
```

This will create:
- All database tables (seasons, teams, drivers, races, picks, etc.)
- Row Level Security policies
- Changelog triggers for audit logging
- 2026 season with teams, drivers, and race calendar

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First-Time Setup

### Creating an Admin User

1. Sign up for an account using your email.
2. Run this SQL in the Supabase SQL Editor to make yourself an admin:

```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

3. Refresh the page - you'll now see the **Admin** link in the header

### Inviting Players

By default, anyone can sign themselves up at `/auth/login`, but you probably don't want that, since this sweepstakes only works with a specific number of people.

To prevent anyone from being able to sign up, you should disable the "Allow new users to sign up" setting in Supabase (Project Settings > Authentication > Sign In/Providers).

Once this is disabled, you can invite players by inviting them in Supabase (Authentication > Users > Add User > Send Invitation).

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy!
5. **Configure Supabase URLs** - After deploying, go to your Supabase Dashboard:
   - **Authentication → URL Configuration**
   - Set **Site URL** to your production URL (e.g., `https://your-app.vercel.app`)
   - Add `https://your-app.vercel.app/**` to **Redirect URLs**

### Netlify

1. Push your code to GitHub
2. Import the repository in [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `.next`
5. Add environment variables in Site Settings

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Authenticated user pages
│   │   ├── dashboard/      # User home
│   │   ├── draft/          # Draft room
│   │   ├── leaderboard/    # Season standings
│   │   └── races/          # Race calendar & details
│   ├── admin/              # Admin pages
│   └── auth/               # Login/signup
├── components/             # React components
├── lib/                    # Utilities, types, Supabase clients
├── supabase/
│   └── migrations/         # Database migrations
└── tests/                  # Unit tests
```

## Running Tests

```bash
npm test
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Real-time**: Supabase Realtime
