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

## Bug Fixes

- [x] Fix phone number validation — expanded to support all Israeli formats (050-058, 02, 03, 04, 08, 09, +972, 972)
- [x] Fix persistent "מספר הטלפון אינו תקין" — root cause: TWILIO_VERIFY_SERVICE_SID was set to Account SID (AC...) instead of Verify Service SID (VA...)

## RTL / Hebrew Layout Fixes

- [x] Global CSS: ensure dir=rtl on html, body; Heebo font; text-align: right defaults
- [x] Fix Navbar: logo on right, nav links on left, RTL flex direction
- [x] Fix Footer: RTL columns, text alignment
- [x] Fix LoginModal: RTL form layout, labels, inputs
- [x] Fix JobCard: RTL card layout, button order, text alignment
- [x] Fix Home page: hero, category grid, stats — all RTL
- [x] Fix FindJobs page: filters on right, results RTL
- [x] Fix JobDetails page: RTL layout, map position, action buttons
- [x] Fix PostJob page: form labels right-aligned, inputs RTL
- [x] Fix MyJobs page: RTL table/cards
- [x] Fix shadcn/ui Select, Input, Textarea, Dialog, DropdownMenu for RTL
- [x] Fix all icons: directional icons (arrows, chevrons) correct for RTL context

## SMS Customization
- [ ] Set Twilio sender name to "Avoda-Now"
- [ ] Set Hebrew OTP message: "Avoda-Now: קוד האימות שלך הוא {CODE}"

## Hebrew SMS Locale
- [x] Add Locale=he to Twilio Verify sendOtp request
- [x] Add CustomFriendlyName=JobNow to Twilio Verify sendOtp request

## Bug Fix — OTP Send Failure After Hebrew Locale Change
- [x] Fixed: Twilio error 60204 — removed CustomFriendlyName (not supported on standard Verify service), kept Locale=he

## CustomFriendlyName Re-add
- [x] Add CustomFriendlyName=JobNow to sendOtp with automatic 60204 fallback retry (sends without it if feature not enabled)

## OTP UX Improvements
- [x] 6 separate digit input boxes with auto-advance cursor
- [x] autocomplete="one-time-code" and inputmode="numeric" for SMS autofill
- [x] 30-second resend countdown timer
- [x] Phone normalization: 0501234567 → +972501234567 (server-side via smsProvider)
- [x] 30-day session persistence: JWT expiresIn=30d + cookie maxAge=30 days
- [x] Enforce OTP length = 6 digits before submit (auto-submit on last digit)

## User Permissions & Access Control (Completed)
- [x] Backend: strip contactPhone from job responses for unauthenticated users
- [x] Backend: strip contactPhone from job list (search/nearby) for guests
- [x] JobCard: hide phone, show "התחבר לראות מספר" button for guests
- [x] JobCard: disable WhatsApp/Phone buttons for guests with login prompt
- [x] JobDetails: hide phone, show masked placeholder for guests
- [x] JobDetails: disable Report button for guests
- [x] PostJob: redirect guests to login with message
- [x] MyJobs: redirect guests to login with message
- [x] Login prompt modal: show "כדי ליצור קשר עם המעסיק יש להתחבר למערכת"
- [x] After login: reveal phone numbers and contact buttons (phone returned only for authenticated users)

## Security Protections Against Scraping & Bots
- [x] Global API rate limiting: max 60 requests/min per IP (express-rate-limit)
- [x] Jobs list rate limiting: max 20 requests/min per IP
- [x] Authenticated endpoints: max 30 requests/min per user (via global limit)
- [x] Bot detection: block known scraper User-Agents (python-requests, scrapy, curl, headless, puppeteer, etc.)
- [x] Pagination enforcement: max 20 jobs per request, no unlimited dumps
- [x] Phone numbers: never returned in bulk list endpoints (only in getById for auth users)
- [x] Security headers: helmet (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy)
- [x] robots.txt: disallow /api/*, /admin/, /post-job, /my-jobs for all crawlers
- [x] CORS: trust proxy enabled for accurate IP detection
- [x] Request size limit: max 10kb body for /api/trpc endpoints
- [x] Suspicious pattern detection: block sequential ID enumeration (15+ sequential IDs in 10s)
- [x] Vitest tests for security middleware: 13 tests (bot detection + anti-enumeration + exports)

## Admin Panel & Full RBAC Implementation (Completed)
- [x] Audit existing RBAC gaps vs requirements
- [x] Admin tRPC procedures: list all jobs, approve/reject, hide job
- [x] Admin tRPC procedures: list all users, block/unblock user
- [x] Admin tRPC procedures: view all reports, resolve report
- [x] Admin tRPC procedures: system statistics (total jobs, users, reports)
- [x] Admin panel page /admin: jobs moderation list with approve/reject/hide actions
- [x] Admin panel page /admin: reported jobs queue with approve/delete actions
- [x] Admin panel page /admin: user management with block/unblock/promote
- [x] Admin panel page /admin: stats dashboard (6 KPI cards)
- [x] Backend: adminProcedure middleware (role=admin check, FORBIDDEN for non-admins)
- [x] Backend: job owner OR admin can edit/delete jobs (enforced server-side)
- [x] Frontend: admin nav link visible only to admins (desktop + mobile)
- [x] Frontend: redirect non-admins from /admin with 403 message
- [x] Vitest tests: 19 admin RBAC tests (guest/user/admin access patterns)

## Growth Features
- [x] Feature 1: "פרסם עבודה דרך WhatsApp" button on homepage hero section
- [x] Feature 1: "פרסם עבודה דרך WhatsApp" button on post-job page
- [x] Feature 1: Pre-filled WhatsApp message with job template fields
- [x] Feature 2: "פרסם עבודה דומה" button on job details page
- [x] Feature 2: Pre-fill post-job form with existing job data via URL query params

## Instant Jobs Platform Adaptation
- [ ] DB: add isUrgent boolean to jobs table
- [ ] DB: change default activeDuration to 1 day (24h auto-expiry)
- [ ] DB: add workerAvailability table (userId, lat, lng, availableUntil, note)
- [ ] Server: getUrgentJobs query helper
- [ ] Server: jobs.list — sort urgent jobs to top
- [ ] Server: workers.setAvailable mutation (stores lat/lng + 4h window)
- [ ] Server: workers.setUnavailable mutation
- [ ] Server: workers.getNearby query (returns workers available within radius)
- [ ] Server: jobs.create — enforce 24h expiry as default (activeDuration=1)
- [ ] UI: "אני פנוי לעבוד עכשיו" button on homepage and navbar
- [ ] UI: Worker availability status indicator (green dot when available)
- [ ] UI: "צריך עובד עכשיו" toggle on PostJob form
- [ ] UI: Urgent badge on job cards (🚨 עדיפות)
- [ ] UI: Urgent jobs sorted to top in job listings
- [ ] UI: /available-workers page for employers (sorted by distance)
- [ ] UI: Job cards show expiry countdown
- [ ] UI: Simplified contact — only Phone + WhatsApp buttons

## Full Platform Rebuild — Instant Jobs
- [ ] DB: add reminderSentAt timestamp to jobs (tracks 6h reminder)
- [ ] DB: add closedReason enum to jobs (found_worker / expired / manual)
- [ ] Server: expiry — urgent jobs expire in 12h, normal in 24h (default)
- [ ] Server: jobs.create — set expiresAt based on isUrgent (12h vs 24h)
- [ ] Server: jobs.markFilled mutation — sets status=closed, closedReason=found_worker
- [ ] Server: background job — hide posts with no response after 9h (6h reminder + 3h grace)
- [ ] Server: workers.setAvailable / setUnavailable / getNearby procedures
- [ ] UI: Redesigned homepage — new hero, urgent section, today jobs, categories, how-it-works
- [ ] UI: WhatsApp share button on every job page with pre-filled Hebrew message
- [ ] UI: Open Graph meta tags on /job/:id pages (og:title, og:description, og:url)
- [ ] UI: Urgent badge "🚨 דחוף" on job cards
- [ ] UI: Relative time display "פורסם לפני שעה" on job cards
- [ ] UI: Expiry countdown on job cards "פג תוקף בעוד 3 שעות"
- [ ] UI: "מצאתי עובד" button for job owner on job details page
- [ ] UI: "אני פנוי לעבוד עכשיו" prominent button on homepage
- [ ] UI: PostJob — urgent toggle "צריך עובד עכשיו" (sets isUrgent=true, 12h expiry)
- [ ] UI: PostJob — default activeDuration = 1 day

## Completed (Mar 4 2026)
- [x] Auth fix: JWT now uses openId/appId/name fields matching sdk.verifySession
- [x] Auth fix: invalidateQueries after OTP login so UI refreshes immediately
- [x] DB schema: isUrgent, reminderSentAt, closedReason, startDateTime fields
- [x] DB schema: workerAvailability table
- [x] Server: listUrgent procedure (isUrgent=true jobs)
- [x] Server: markFilled procedure (owner closes job)
- [x] Server: workers router (setAvailable, setUnavailable, myStatus, nearby)
- [x] Server: urgent jobs expire in 12h, normal in activeDuration days
- [x] Homepage: full redesign with hero, urgent jobs section, today jobs, categories, how-it-works
- [x] Homepage: availability toggle button "אני פנוי לעבוד עכשיו"
- [x] JobCard: urgent badge (red "דחוף"), today badge (orange "להיום"), relative time, expiry countdown
- [x] JobCard: WhatsApp share with proper format (job title, location, salary, URL)
- [x] JobCard: direct call and WhatsApp contact buttons
- [x] JobDetails: urgent badge, expiry countdown, mark-filled button for owner
- [x] JobDetails: WhatsApp share with proper message format
- [x] PostJob: isUrgent toggle "צריך עובד עכשיו"
- [x] PostJob: activeDuration default changed to 1 day
- [x] FindJobs: urgent filter "⚡ דחוף עכשיו", urgent jobs sorted to top
- [x] /available-workers page for employers to see nearby available workers
- [x] Navbar: added "עובדים זמינים" link
- [x] Tests: 83 tests passing (7 test files)

## Wartime & Passover Adaptation
- [x] Add categories: emergency_support, passover_jobs, reserve_families
- [x] DB: add isLocalBusiness boolean to jobs table
- [x] PostJob: volunteer mode toggle (salaryType=volunteer already exists, make prominent)
- [x] PostJob: local business badge toggle
- [x] PostJob: new categories in category selector
- [x] JobCard: "עסק מקומי" badge
- [x] FindJobs: "צריך עזרה היום" filter (urgent + today combined)
- [x] FindJobs: emergency/Passover category quick-filters
- [x] Homepage: wartime/Passover section with emergency categories

## Real-Time Activity & Nearby Jobs
- [x] Server: getLiveStats procedure (available workers, new jobs last hour)
- [x] Server: getActivityFeed procedure (recent job posts + available workers)
- [x] UI: ActivityTicker component with horizontal scroll animation
- [x] UI: LiveStats bar on homepage (auto-refresh every 45s)
- [x] UI: Nearby jobs section with 1/3/5 km radius selector
- [x] UI: Distance display on job cards in nearby section
- [x] UI: Optional map view for nearby jobs

## Role-Based UI (Worker / Employer)
- [ ] DB: add userMode enum (worker/employer) to users table
- [ ] Server: getUserMode and setUserMode procedures
- [ ] UI: RoleSelectionScreen shown on first visit or after login if no mode set
- [ ] UI: Navbar adapts links based on userMode
- [ ] UI: Navbar shows role-switcher button
- [ ] UI: Home page shows worker-specific sections for workers
- [ ] UI: Home page shows employer-specific sections for employers
- [ ] UI: FindJobs accessible to workers; PostJob accessible to employers
- [ ] UI: Available workers page accessible to employers only

## Role-Based UI — Completed (Mar 4 2026)
- [x] DB: add userMode field (worker/employer) to users table
- [x] Server: user.getMode and user.setMode procedures
- [x] Context: UserModeContext with global userMode state
- [x] UI: RoleSelectionScreen shown after login when no mode chosen
- [x] Navbar: role-specific links, role badge, role-switcher in dropdown
- [x] Home: role-specific hero title, CTA buttons, availability toggle visibility
- [x] PostJob: worker-mode guard with prompt to switch to employer
- [x] All 83 tests passing

## Location UX Improvements
- [x] Location permission explanation dialog before browser prompt
- [x] Manual city search fallback when permission denied
- [x] Distance badge on each job card when location is active
- [x] Smart radius auto-expand when 0 results found
- [x] localStorage caching of location (1 hour TTL)
- [x] Clear-location button (X) when location is active
- [x] Update button labels: "הצג עבודות קרובות אלי" / "ממוין לפי מרחק ממך"

## Bug Fix
- [x] Role selection screen not shown after OTP login

## New Features (Mar 5 2026)
- [x] Animation: fade-out role selection screen, slide-in homepage
- [x] Welcome screen: personalized "ברוך הבא" with 3 targeted job cards after role selection
- [x] localStorage role fallback: persist chosen role so returning users skip selection
- [x] Worker profile page: preferred categories, preferred area, bio
- [x] DB: add workerProfile fields to users (preferredCategories JSON, preferredCity, bio)
- [x] Server: user.getProfile and user.updateProfile procedures
- [x] City autocomplete: Google Places API suggestions when typing city name

## Bug (Mar 5 2026)
- [x] Role selection screen (worker/employer) not shown after login — fixed: server mode is now authoritative after first fetch, stale localStorage no longer hides the screen
- [x] Clear localStorage role on logout so role selection screen shows on next login
- [x] Add "reset role" button in Navbar dropdown and WorkerProfile page
- [x] PostJob: phone number must be taken from logged-in user, not entered manually
- [x] Home page: sections not filtered by role (worker/employer)
- [x] Create HomeWorker.tsx — dedicated worker home screen
- [x] Create HomeEmployer.tsx — dedicated employer home screen
- [x] Route Home.tsx to correct home based on userMode
- [x] Fix: Google Maps JS API loaded multiple times on /post-job causing errors
- [x] Preload Google Maps script in background immediately after user login
- [x] Geocoding cache: save results in sessionStorage to avoid duplicate calls
- [x] Dynamic Navbar per role: worker sees Find/Today/Profile, employer sees PostJob/MyJobs/Workers
- [x] Push notifications to workers when a new job matches their preferred category and area
- [x] Redesign HomeWorker hero section — stronger visual hierarchy, inviting UI
- [x] Add tooltip to availability toggle button explaining what it does
- [x] Move "available workers in area" stat card from HomeWorker to HomeEmployer only
- [x] Fix LiveStats: hide available-workers card from worker view (employer only)
- [x] Mobile tooltip: add Info Dialog for availability button on touch devices
- [x] Availability duration selector: let worker choose 2/4/8 hours before marking
- [x] SMS reminder 30 min before availability expires with extend option
- [x] Merge urgent+today job sections into a single horizontal carousel in HomeWorker
- [x] Carousel: compact job card showing only essential info (title, category, location, salary, badge)
- [x] Carousel: navigation arrows + dot indicators
- [x] Carousel: click opens full job detail bottom sheet with all info and actions

## Full UI Redesign (Mar 5 2026)
- [ ] Install Framer Motion and collect background images
- [ ] Redesign global theme: dark/gradient palette, premium fonts, base CSS
- [ ] Redesign RoleSelectionScreen + WelcomeScreen with animations and hero imagery
- [ ] Redesign HomeWorker: animated hero, glassmorphism cards, motion effects
- [ ] Redesign HomeEmployer: premium layout, animated stats, motion effects
- [ ] Redesign Navbar, JobCard, CarouselJobCard with micro-interactions

## UI Redesign — Premium Dark Theme (Mar 6 2026)
- [x] Install Framer Motion for animations
- [x] Global dark theme: index.css with OKLCH color palette, Heebo/Rubik fonts
- [x] RoleSelectionScreen: animated glassmorphism cards, floating orbs, gradient logo
- [x] HomeWorker: animated hero with floating orbs, glassmorphism job cards, Framer Motion
- [x] HomeEmployer: premium dark layout, animated stats, glassmorphism cards
- [x] Navbar: dark glassmorphism, animated mobile menu, gradient logo, role badges
- [x] JobCard: dark glassmorphism, Framer Motion hover effects, premium badge styling
- [x] CarouselJobCard: dark glassmorphism tile, animated hover, premium bottom sheet
- [x] ActivityTicker: dark theme with green live indicator
- [x] LiveStats: dark glassmorphism stat cards with accent colors
- [x] Footer: dark gradient with gradient logo

## UI Redesign — FindJobs & JobDetails (Mar 6 2026)
- [x] FindJobs: glassmorphism filter panel, animated hero, staggered job list with Framer Motion
- [x] JobDetails: glassmorphism layout, animated sections, premium action buttons

## Skeleton Loading (Mar 6 2026)
- [x] Create JobCardSkeleton component with shimmer animation
- [x] Create CarouselJobCardSkeleton component with shimmer animation
- [x] Integrate skeletons into FindJobs loading state (3-4 skeleton cards)
- [x] Integrate skeletons into HomeWorker loading state
- [x] Integrate skeletons into HomeEmployer loading state

## Page Transitions (Mar 6 2026)
- [x] Create PageTransition wrapper component with Framer Motion
- [x] Integrate AnimatePresence into App.tsx routing
- [x] Ensure transitions work correctly for all routes

## Confetti Celebration (Mar 6 2026)
- [x] Create ConfettiCelebration component (canvas-based particle burst)
- [x] Integrate into PostJob success state

## MyJobs Improvements (Mar 6 2026)
- [x] Add skeleton loading to MyJobs job list
- [x] Add Framer Motion stagger animations to job cards
- [x] Add glassmorphism styling to MyJobs page
- [x] Add animated empty state

## Carousel Improvements (Mar 6 2026)
- [x] Make carousel cards smaller
- [x] Remove workers count from carousel cards
- [x] Add auto-scroll to carousel

## Worker Carousel in HomeEmployer (Mar 6 2026)
- [x] Create WorkerCarouselCard component
- [x] Integrate auto-scroll worker carousel into HomeEmployer

## Light Theme Redesign (Mar 6 2026)
- [ ] Update index.css to light theme (white bg, blue #3c83f6 accent, Inter font)
- [ ] Redesign RoleSelectionScreen to match mockup
- [ ] Update Navbar to light theme
- [ ] Redesign HomeWorker to light theme (pending mockup)
- [ ] Redesign HomeEmployer to light theme (pending mockup)
- [ ] Redesign FindJobs to light theme (pending mockup)
- [ ] Redesign JobDetails to light theme (pending mockup)
- [ ] Redesign remaining pages to light theme (pending mockups)

## Bug Fix (Mar 6 2026)
- [x] Fix RoleSelectionScreen click behavior (card click not triggering role selection)

## Bug Fix — Scrollable RoleSelectionScreen (Mar 6 2026)
- [x] Fix RoleSelectionScreen overflow/scroll issue (fixed inset-0 prevents scrolling)

## Bug Fix — RoleSelectionScreen Overlay (Mar 6 2026)
- [x] Fix RoleSelectionScreen showing as overlay instead of replacing page content

## Bug Fix — Restore Navbar/Footer in RoleSelectionScreen (Mar 6 2026)
- [x] Show Navbar and Footer with RoleSelectionScreen as the main content area

## Bug Fix — Duplicate Navbar/Footer (Mar 6 2026)
- [x] Remove internal Navbar and Footer from RoleSelectionScreen (duplicates from App.tsx)

## Navbar Light Theme (Mar 6 2026)
- [x] Update Navbar to white background, dark text, blue accent

## Footer Light Theme (Mar 6 2026)
- [x] Update Footer to light-gray background and dark text

## Rename JobNow → AvodaNow (Mar 6 2026)
- [x] Replace all occurrences of JobNow/Job-Now/Job Now with AvodaNow in all frontend visual files

## Browser Tab Title (Mar 6 2026)
- [ ] Update VITE_APP_TITLE and index.html title to AvodaNow

## RoleSelectionScreen Premium Upgrade (Mar 6 2026)
- [x] Redesign RoleSelectionScreen with premium card layout, better imagery, and polished details

## Branded Loading Animation (Mar 6 2026)
- [ ] Create BrandLoader component with shimmer and brand animation
- [ ] Create PageLoader full-screen branded loading screen
- [ ] Replace generic spinners in App.tsx and key pages

## Custom Brand Loading Animation (Shimmer)
- [x] Create BrandLoader component with shimmer animation in brand colors (blue arc + pulsing glow)
- [x] Replace generic Loader2 spinners in HomeWorker with BrandLoader
- [x] Replace generic Loader2 spinners in HomeEmployer with BrandLoader
- [x] Replace generic Loader2 spinners in JobDetails with BrandLoader
- [x] Update JobCardSkeleton to use light-theme shimmer (white cards, #e2e8f0 shimmer base)
- [x] Update JobDetails page to light theme (white cards, gray text, blue accents)
- [x] Update FindJobs page to light theme (bg-[#f5f7f8], white cards)
- [x] Update HomeWorker page to light theme
- [x] Update HomeEmployer page to light theme
- [x] Update JobCard component to light theme

## Mobile UX — Role Selection Cards
- [x] Compact RoleSelectionScreen cards to fit mobile viewport (no scroll needed)

## Color Palette Centralization
- [x] Audit all hardcoded color values across codebase
- [x] Create client/src/lib/colors.ts with named TS constants
- [x] Wire CSS custom properties in index.css for Tailwind-compatible tokens
- [x] Replace hardcoded colors in RoleSelectionScreen, BrandLoader, JobCard, JobCardSkeleton
- [x] Replace hardcoded colors in HomeWorker, HomeEmployer, FindJobs, JobDetails
- [x] Replace hardcoded colors in remaining pages and components (Navbar, Footer, ActivityTicker, CarouselJobCard, MyJobs, PostJob, AvailableWorkers)
- [x] Verify 0 TypeScript errors and all 83 tests pass

## Bug Fix — JobCardSkeleton JSX Parse Error
- [x] Fix JSX parsing error in JobCardSkeleton.tsx (line ~78) so component loads correctly — confirmed: error was stale HMR artifact; current file is valid (0 TS errors, 83 tests pass)
