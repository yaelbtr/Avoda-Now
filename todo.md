# Job-Now TODO

## Phase 1: Database & Schema
- [ ] Jobs table: title, description, category, location (lat/lng), address, salary, contactPhone, contactName, postedBy, status, createdAt
- [ ] OTP table: phone, code, expiresAt, used
- [ ] Update users table: add phone field
- [ ] Push DB migrations

## Phase 2: Backend API
- [ ] SMS OTP: sendOtp procedure (mock/real SMS)
- [ ] SMS OTP: verifyOtp procedure + session creation
- [ ] Jobs: createJob procedure (protected)
- [ ] Jobs: listJobs procedure with geo-distance filtering
- [ ] Jobs: getJobById procedure
- [ ] Jobs: updateJobStatus procedure (protected, owner only)
- [ ] Jobs: deleteJob procedure (protected, owner only)
- [ ] Jobs: getMyJobs procedure (protected)

## Phase 3: Frontend Foundation
- [ ] RTL + Hebrew global CSS setup
- [ ] Color palette and typography (elegant style)
- [ ] App layout with mobile-first navigation
- [ ] Auth context for phone/OTP session
- [ ] Routing setup for all pages

## Phase 4: Core Pages
- [ ] Home page: hero section, category quick-search, nearby jobs preview
- [ ] Find Jobs page: GPS filter, category filter, radius selector, job cards with distance
- [ ] Job Details page: full info, WhatsApp contact, WhatsApp share button

## Phase 5: Job Management & Maps
- [ ] Post Job page: category, GPS + manual address, salary, contact details
- [ ] My Jobs page: list user's jobs, mark active/closed
- [ ] Google Maps integration: location picker on Post Job, map display on Job Details

## Phase 6: Polish & Delivery
- [ ] Footer with terms, privacy, contact info
- [ ] WhatsApp share on all job cards
- [ ] Mobile-first responsive review
- [ ] Vitest tests for backend procedures
- [ ] Final checkpoint and delivery

## Extended Requirements

### Shareable Job Links & OG Metadata
- [x] Unique public URL /job/{id} already exists — ensure it works
- [x] Server-side OG metadata endpoint for job pages (og:title, og:description, og:image)
- [x] WhatsApp share button on job cards and job details page
- [x] Prefilled WhatsApp share message with job URL

### Anti-Spam Features
- [x] Require phone OTP verification before posting a job
- [x] Limit: max 3 active job posts per phone number
- [x] Math CAPTCHA (anti-spam) on job posting form
- [x] "Report Job" button on every job page
- [x] If job receives 3+ reports → status = "under_review"
- [x] job_reports table in DB

### Job Expiration
- [x] Add activeDuration field to jobs table (1d / 3d / 7d)
- [x] Add expiresAt timestamp field to jobs table
- [x] Expired jobs excluded from search results (status = "expired")
- [x] Server-side auto-expiry on every search query

### DB Extensions for AI Matching
- [x] Add jobTags (JSON) field to jobs table
- [x] Add workerTags (JSON) field to users table

### UX Enhancements
- [x] Job card: show title, city, distance, job type, salary, start time
- [x] Job card buttons: WhatsApp, Phone, Share
- [x] Complete MyJobs page
- [x] Complete Terms and Privacy pages

## Twilio SMS OTP Authentication

- [x] Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID secrets
- [x] Update users table: phone (unique), status, lastLoginAt
- [x] SMS provider abstraction layer (smsProvider.ts) for easy switching
- [x] Twilio Verify: sendOtp procedure (POST /Verifications)
- [x] Twilio Verify: verifyOtp procedure (POST /VerificationCheck)
- [x] Rate limiting: max 5 OTP requests per phone per hour
- [x] Rate limiting: max 3 verification attempts per phone
- [x] IP-based rate limiting for abuse prevention
- [x] E.164 phone number normalization (+972...)
- [x] Session creation after successful OTP verification
- [x] Update LoginModal: phone entry screen + OTP entry screen
- [x] Update AuthContext to use new OTP procedures
- [x] Error messages in Hebrew (SMS failure, wrong code)
- [x] Vitest tests for OTP flow (15 tests passing)
