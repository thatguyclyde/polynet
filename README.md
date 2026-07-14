# PolyNet

PolyNet is a campus community app for Harare Polytechnic students — a Feed for campus updates, News for official announcements, PolyMart for buying and selling between students (with in-app chat and a WhatsApp fallback), and a Profile with skills, social links and a WhatsApp number. Built with React + Vite, styled with an Instagram-inspired UI in both light and dark mode, and backed by Supabase (auth, database, storage).

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/) — auth, Postgres database, file storage
- [Oxlint](https://oxc.rs/) for linting

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project (existing PolyNet project, or your own for local development)

### Install

```bash
npm install
```

### Configure Supabase

The Supabase URL and publishable anon key live in [`src/supabase.js`](src/supabase.js). If you're pointing this checkout at a different Supabase project, update the `supabaseUrl` and `supabaseAnonKey` values there.

Your Supabase project needs:

- **Tables**: `profiles`, `feed_posts`, `feed_comments`, `news_articles`, `marketplace_listings`, `skills` (existing PolyNet schema), plus `conversations` and `chat_messages` and the `whatsapp_number` / `social_links` columns on `profiles` — run [`supabase/migration_chat_profile.sql`](supabase/migration_chat_profile.sql) once in the Supabase SQL editor to add these.
- **Storage buckets** (public): `avatars`, `post-images`, `news-images`, `marketplace-images`.

### Run

```bash
npm run dev       # start the dev server
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # run oxlint
```

## Project structure

```
src/
  App.jsx            # auth, onboarding gate, tab/page routing, bottom nav
  SplashScreen.jsx    # launch splash
  Onboarding.jsx      # first-run profile + skills setup
  Walkthrough.jsx     # first-run feature tour (Next/Skip)
  Feed.jsx            # campus feed (posts, comments, likes)
  News.jsx            # official announcements
  Polymart.jsx        # marketplace listings
  Chats.jsx           # PolyMart inbox + chat thread
  Profile.jsx         # own editable profile, preferences, about/privacy
  ViewProfile.jsx     # read-only view of another student's profile
  ThemeContext.jsx    # light/dark theme provider
  Skeleton.jsx        # loading-state placeholders
  Icon.jsx            # inline SVG icon set
  supabase.js         # Supabase client
supabase/
  migration_chat_profile.sql  # chat + profile schema additions
```

## License

All rights reserved. This code is proprietary and not licensed for reuse, modification, or redistribution without permission.
