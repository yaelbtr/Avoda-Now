# AvodaNow Deployment Checklist

This checklist summarizes what is required to run AvodaNow outside Manus, based on the current codebase.

## 1. Required to boot the app

These are the minimum items you need for the server and database to work reliably.

### Infrastructure

- A Node.js host that can run the Express server
- A PostgreSQL database with the AvodaNow schema migrated
- Environment variable support on the hosting platform

### Required environment variables

- `POSTGRES_URL` or `DATABASE_URL`
  Used by the app runtime and Drizzle.
- `JWT_SECRET`
  Used for signed session tokens.
- `APP_BASE_URL`
  Used for server-generated links such as sitemap, robots, email links, and SMS links.

### Required application steps

1. Install dependencies
2. Run database migrations
3. Build the app
4. Start the server

### Commands

```bash
npm install
npm run db:push
npm run build
npm run start
```

## 2. Required if you keep Google login enabled

### Required environment variables

- `VITE_ENABLE_GOOGLE_LOGIN=true`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Notes

- The frontend starts Google login via the local `/api/auth/google/start` route.
- The backend callback is `/api/auth/google/callback`.
- The session is signed locally; there is no Manus OAuth dependency anymore.

## 3. Required if you keep current Forge-backed platform services

Several Manus-derived helpers rely on the same built-in Forge base URL and API key.

### Required environment variables

- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`

### Features depending on these values

- Storage uploads and downloads
- Google Maps proxy
- Owner notifications
- Built-in email helper
- Image generation helper
- Voice transcription helper
- Generic data API helper

### Frontend values usually paired with this

- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_FRONTEND_FORGE_API_KEY`

These are used by the browser-side Google Maps loader.

## 4. Optional but commonly needed in production

### SMS and OTP via Twilio

Required if you use SMS job alerts or OTP verification:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `TWILIO_FROM_NUMBER`

### Email via SendGrid

Required if you use email OTP or welcome emails:

- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `APP_BASE_URL`

### SMTP-based email helpers

Required only for SMTP-backed flows:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

### Push notifications

Required only if you use Web Push:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### Matching service

Required only if you use worker matching / job offer flows:

- `MATCHING_API_URL`

### Analytics

Required only if you want frontend analytics:

- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`

## 5. Manus-specific dependencies you may need to replace

These are the biggest portability risks when moving to your own hosting.

### Google auth

Current code uses direct Google OAuth on the server:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

If you move away from Google, you should aim to replace this so the app no longer depends on:

- Auth.js / NextAuth-style login
- Clerk
- Firebase Auth
- Supabase Auth
- Custom JWT/session auth

### Forge service layer

Current code assumes a shared Forge-like platform API:

- storage proxy
- maps proxy
- notifications
- email helper
- data API helper
- voice transcription helper

If you move away from Manus, you may replace these with:

- S3 / Cloudflare R2 / Supabase Storage
- direct Google Maps credentials or your own proxy
- SendGrid / Resend / SMTP for email
- OpenAI / Whisper / Deepgram for transcription
- your own notification or queue system

## 6. Recommended production order

If you want the simplest path to a working hosted version, do it in this order:

1. Make database and server boot locally with `POSTGRES_URL` and `JWT_SECRET`
2. Confirm `npm run build` and `npm run start` work
3. Decide whether you are keeping Manus OAuth or replacing it
4. Decide whether you are keeping Forge-backed services or replacing them
5. Add Twilio, SendGrid, Push, Analytics, and Matching only after the core app works

## 7. Fast minimal-production profile

If your goal is "get the app online fast", the smallest stable profile is:

- database working
- server booting
- static build serving
- `APP_BASE_URL` set to the real public domain
- auth either working or temporarily simplified

Everything else can be layered in later:

- SMS
- email
- push
- analytics
- matching
- Forge-dependent helpers
