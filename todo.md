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

## Bug Fix — Worker Role Navigation
- [x] Fix: "המשך כעובד" button navigates to /find-jobs instead of / (HomeWorker) — fixed in WelcomeScreen.tsx handleCTA

## UX Improvements — Navigation & Transitions
- [x] Fix onDismiss (X button) in WelcomeScreen: navigate worker to / and employer to /post-job
- [x] Save pre-login return path (sessionStorage) and restore it after successful OTP login
- [x] Add smooth slide-down exit animation in WelcomeScreen (fade + translateY) for natural page reveal

## Google One-Tap Login & Guest Banner
- [x] Add Google login button to LoginModal alongside OTP (with divider, Google SVG logo, redirects via getGoogleLoginUrl)
- [x] Build persistent guest login banner shown at top of all pages for unauthenticated users (GuestLoginBanner.tsx, dismissible via sessionStorage)

## Bug Fix — WelcomeScreen Worker CTA Navigation (Round 2)
- [x] Fix: UserModeContext race condition — serverMode=null while setMode mutation in-flight caused needsRoleSelection=true again; fixed by checking setModeMutation.isPending before clearing localMode

## Bug Fix — HomeWorker Hero CTA
- [x] Fix: "חפש עבודה עכשיו" button in hero section now scrolls to #jobs-section instead of navigating to /find-jobs

## Bug Fix — RoleSelectionScreen Worker Button
- [x] Fix: "המשך כעובד" double-mutation race condition fixed — App.handleRoleSelected now calls setLocalModeOnly (no server mutation) instead of setUserMode, so needsRoleSelection becomes false immediately and WelcomeScreen shows correctly

## Bug Fix — Remove WelcomeScreen Intermediate Step
- [x] Remove WelcomeScreen from role selection flow: navigate directly to / (worker) or /post-job (employer) without intermediate welcome screen

## Button Template System (Mar 6 2026)
- [ ] Create AppButton component with all variants (primary, secondary, outline, ghost, danger, whatsapp, cta, link-style)
- [ ] Replace all Button/button usages in pages with AppButton
- [ ] Replace all Button/button usages in components with AppButton

## Button Template System
- [x] Create AppButton centralized component with all variants (brand, secondary, outline, ghost, destructive, icon)
- [x] Replace all Button usages in pages and components with AppButton
- [x] Verify TypeScript compiles cleanly (0 errors)

## Job Application System (Apply Button + SMS Notification)
- [x] DB: add applications table (workerId, jobId, message, status, createdAt)
- [x] DB: add showPhone boolean to jobs table (default false)
- [x] DB: run migration (pnpm db:push)
- [x] Server: jobs.applyToJob procedure — records application, sends SMS to employer with worker profile link
- [x] Server: jobs.checkApplied procedure — returns whether current user already applied
- [x] Server: jobs.getApplications procedure — returns applications for a job (owner/admin only)
- [x] Server: user.getPublicProfile procedure — public worker profile by userId (no auth required)
- [x] Server: db helper getPublicWorkerProfile (returns safe public fields only)
- [x] PostJob form: showPhone toggle — "הצג מספר טלפון לעובדים" (default: hidden)
- [x] JobBottomSheet: "הגישו אותי להצעה זו" primary CTA button
- [x] JobBottomSheet: phone/WhatsApp buttons only shown when showPhone=true
- [x] JobBottomSheet: duplicate application prevention (shows "מועמדות הוגשה" state)
- [x] JobBottomSheet: optional message textarea before submitting application
- [x] Frontend: /worker/:id public profile page for employers to view applicants
- [x] App.tsx: route /worker/:id → PublicWorkerProfile page
- [x] Vitest: 11 tests for application system (applyToJob, checkApplied, getApplications, getPublicProfile)

## Controlled Contact Reveal for Applications
- [x] DB: add contactRevealed boolean (default false) to applications table
- [x] DB: add revealedAt timestamp to applications table
- [x] DB: run migration
- [x] Server: jobs.revealContact mutation — sets contactRevealed=true + revealedAt, only job owner
- [x] Server: jobs.getApplication query — returns application + worker profile, only job owner
- [x] Server: update applyToJob SMS link to /applications/{id} instead of /worker/{id}
- [x] Frontend: /applications/:id page — worker profile read-only + "הצג פרטי התקשרות" button
- [x] Frontend: contact reveal shows Phone (tel:) + WhatsApp (wa.me) buttons
- [x] Frontend: route /applications/:id in App.tsx
- [x] Vitest: tests for revealContact and getApplication procedures (7 new tests, 101 total)

## Employer-First Contact Logic
- [x] Server: jobs.updateApplicationStatus mutation — accept/reject, only job owner
- [x] Server: accept = sets status=accepted + contactRevealed=true + revealedAt
- [x] Server: reject = sets status=rejected
- [x] MyJobs: applicants count badge per job
- [x] MyJobs: expandable applicants list per job with Accept/Reject buttons
- [x] MyJobs: accepted applicant shows Phone + WhatsApp buttons
- [x] MyJobs: rejected applicant shows greyed-out state
- [x] Vitest: 5 new tests for updateApplicationStatus (accept/reject/forbidden/not-found/auth) — 106 total

## Batched Application Notifications
- [x] DB: notification_batches table (jobId, employerPhone, pendingCount, scheduledAt, sentAt, status)
- [x] DB: run migration
- [x] Server: on applyToJob — upsert batch row, increment pendingCount
- [x] Server: if pendingCount >= 3 → flush immediately (send SMS + mark sent)
- [x] Server: if pendingCount < 3 → schedule flush after 10 min window (setTimeout)
- [x] Server: flush sends SMS "X עובדים חדשים הגישו מועמדות למשרה שלך" + link /jobs/{id}/applications
- [x] Server: prevent double-send (DB guard: only updates status=pending rows)
- [x] Vitest: 8 tests for batch creation, threshold flush, window flush, double-send guard, singular/plural SMS — 114 total

## Admin Applications & Batches Screen
- [x] Server: admin.listApplications — all applications with worker+job info
- [x] Server: admin.listBatches — all notification_batches with job title + status
- [x] Server: admin.flushBatch — manually trigger a batch flush (sends SMS immediately)
- [x] Server: admin.cancelBatch — mark a pending batch as cancelled
- [x] Frontend: Two new tabs in /admin: "מועמדויות" + "הודעות מקובצות"
- [x] Frontend: Applications tab — worker name, phone, job title, status, contactRevealed, date
- [x] Frontend: Batches tab — job title, pendingCount, scheduledAt, status, flush/cancel actions
- [x] Frontend: Overdue badge for batches whose scheduledAt has passed but not yet sent
- [x] Frontend: Explanation banner explaining the 10-min window + threshold logic
- [x] All 114 tests pass

## Employer Applicants Page (/jobs/:id/applications)
- [x] DB: getApplicationsForJobWithDistance helper — Haversine distance from job location, sorted closest first
- [x] Server: jobs.getJobApplications query — returns applicants sorted by distance, only job owner
- [x] Frontend: /jobs/:id/applications page — title "מועמדים למשרה", applicant count at top
- [x] Frontend: applicant card — worker name, distance (km), time since application, "חדש" badge (<24h)
- [x] Frontend: Accept/Reject buttons per card (pending only)
- [x] Frontend: on Accept — reveal Phone (tel:) + WhatsApp (wa.me) buttons, update status
- [x] Frontend: sections: ממתינים / התקבלו / נדחו with counts
- [x] Frontend: route /jobs/:id/applications in App.tsx
- [x] Frontend: "צפה בכל המועמדים בדף מלא" link in MyJobs ApplicantsPanel
- [x] All 114 tests pass

## Pending Badge & Worker Applications Page
- [x] Server: jobs.myJobsWithPendingCounts — myJobs enriched with pendingCount per job
- [x] Server: jobs.myApplications — worker's own applications with job title, status, contactRevealed
- [x] Frontend: MyJobs — red badge with pending count on "מועמדים" button
- [x] Frontend: /my-applications page — worker's applications grouped by status (ממתין/התקבלת/לא התקבלת)
- [x] Frontend: Navbar — "מועמדויות" link in workerLinks + dropdown menu item
- [x] Frontend: route /my-applications in App.tsx
- [x] All 114 tests pass

## Unread Applications Badge (Nav)
- [x] DB: updatedAt column already exists in applications table (onUpdateNow) — no migration needed
- [x] Server: jobs.unreadApplicationsCount — count apps with updatedAt > lastSeenAt AND status != pending
- [x] Frontend: MyApplications stores lastSeenAt = now() in localStorage on mount
- [x] Frontend: Navbar queries unreadApplicationsCount every 60s, shows red badge on "מועמדויות" link
- [x] Frontend: badge shown in both desktop nav and mobile menu
- [x] Frontend: badge clears when worker visits /my-applications (localStorage updated)
- [x] All 114 tests pass

## Web Push Notifications
- [x] web-push npm package installed
- [x] VAPID keys generated and stored as secrets
- [x] DB: push_subscriptions table (userId, endpoint, p256dh, auth, unique on endpoint)
- [x] DB: migration applied
- [x] Server: push.subscribe mutation — save subscription for current user
- [x] Server: push.unsubscribe mutation — remove subscription by endpoint
- [x] Server: push.vapidKey query — returns VAPID public key to client
- [x] Server: webPush.ts helper — sendPushToUser(userId, payload)
- [x] Frontend: client/public/sw.js — service worker handles push + notificationclick
- [x] Frontend: usePushNotifications hook — subscribe/unsubscribe lifecycle
- [x] Frontend: Bell icon in MyApplications header to toggle push
- [x] Frontend: inline banner prompt on /my-applications to enable notifications
- [x] Server: updateApplicationStatus sends push notification to worker on accept/reject
- [x] All 114 tests pass

## MyApplications Filter & Sort
- [x] Frontend: filter pills — הכל / ממתינות / התקבלתי / לא התקבלתי
- [x] Frontend: sort toggle — חדש לישן / ישן לחדש
- [x] Frontend: collapsible filter bar (Filter icon in header)
- [x] Frontend: AnimatePresence exit animation on cards when filter changes

## Push to Employer & Notification Settings

- [ ] DB: add notificationPrefs column to users table (enum: push_only / sms_only / both / none)
- [ ] DB: run migration
- [ ] Server: user.updateNotificationPrefs mutation — saves preference for current user
- [ ] Server: applyToJob — send Push to employer if notificationPrefs includes push
- [ ] Server: applyToJob — send SMS to employer if notificationPrefs includes sms (existing batched logic)
- [ ] Frontend: notification settings section in /profile page
- [ ] Frontend: toggle cards for Push / SMS / Both / None with current state
- [ ] Frontend: subscribe to push when user selects Push or Both
- [ ] Frontend: unsubscribe from push when user selects SMS-only or None
- [ ] Vitest: tests for updateNotificationPrefs procedure

## Push to Employer & Notification Settings [DONE]
- [x] DB: notificationPrefs column on users table (enum: both/push_only/sms_only/none, default both)
- [x] DB: migration applied
- [x] Server: getNotificationPrefs(userId) DB helper
- [x] Server: updateNotificationPrefs(userId, prefs) DB helper
- [x] Server: user.getNotificationPrefs query procedure
- [x] Server: user.updateNotificationPrefs mutation procedure
- [x] Server: applyToJob respects employer's notificationPrefs — sends SMS only if both/sms_only, Push only if both/push_only
- [x] Server: Push to employer on new application — title "מועמד חדש! 🎉", link to /jobs/:id/applications
- [x] Frontend: WorkerProfile — notification settings section with 4 options (הכל/Push/SMS/כבוי)
- [x] Frontend: warning shown when "כבוי" selected
- [x] Frontend: hint shown when "push_only" selected (to enable browser notifications)
- [x] All 114 tests pass

## Bug Fix — "הפעל התראות" Button
- [ ] Diagnose why the Enable Notifications button does not work
- [ ] Fix usePushNotifications hook / service worker / VAPID key flow

## Bug Fix — "הפעל התראות" Button (Push Notifications)
- [x] Root cause: applicationServerKey was passed as .buffer (ArrayBuffer with wrong byte offset) — PushManager silently rejected it
- [x] Fix: use keyBytes.buffer.slice(byteOffset, byteOffset+byteLength) to get a clean, correctly-bounded ArrayBuffer
- [x] Fix: improved error messages in Hebrew for permission denied / network errors
- [x] Fix: added ⚠️ error banner below push prompt in MyApplications so user sees what went wrong
- [x] All 114 tests pass

## Landing Page Always Shows Role Selection Screen
- [x] Route / always shows RoleSelectionScreen (ברוכים הבאים ל-AvodaNow) regardless of login state
- [x] Guest users: clicking a role card navigates directly to /find-jobs or /post-job (no server mutation)
- [x] Authenticated users: clicking a role card saves mode to server as before, then navigates
- [x] handleRoleSelected in App.tsx now navigates to /find-jobs (worker) or /post-job (employer) instead of /

## Welcome-Back Animation on Landing Page
- [x] Show "ברוך הבא בחזרה, [שם]!" greeting for authenticated users on RoleSelectionScreen
- [x] Animate greeting in (fade + slide up) then fade out after ~1.5s
- [x] After greeting fades, animate in the role selection cards
- [x] Guests see cards immediately with no greeting

## Guest Role Persistence (sessionStorage)
- [x] Save guest role selection to sessionStorage on role card click
- [x] On / route: if guest has a saved session role, skip role selection and navigate directly
- [x] Clear session role on logout or when user authenticates
- [x] Add "שנה תפקיד" option so guest can reset their choice and return to role selection

## Role-Based Home Pages
- [x] After role selection: navigate to / which renders HomeWorker or HomeEmployer based on role
- [x] No new pages needed — Home.tsx already handles role-based rendering

## Bug: Blank page after role selection
- [x] Fix: navigating to / after selecting a role shows blank page instead of HomeWorker/HomeEmployer

## Bug: Blank page after role selection (still open)
- [x] Definitive fix: after clicking role button, HomeWorker/HomeEmployer must render

## Bug: Role selection button click does nothing
- [x] Fix: clicking "המשך כעובד" / "המשך כמעסיק" does nothing

## Redirect filter buttons to /find-jobs
- [x] "עבודות להיום" button → /find-jobs?filter=today (auto-apply today filter)
- [x] "בקרבת מקום" button → /find-jobs?filter=nearby (auto-apply location filter)
- [x] /jobs-today route kept as redirect to /find-jobs?filter=today
- [x] FindJobs reads query params on mount and applies filters automatically

## Today Jobs Banner on HomeWorker
- [x] Add animated banner showing count of today's jobs on HomeWorker
- [x] Banner links to /find-jobs?filter=today
- [x] Show skeleton while loading, hide if count is 0

## Redesign HomeEmployer
- [x] Match HomeWorker design language: hero with image, stats row, banners, quick actions
- [x] Live banner: active jobs count → /my-jobs (for authenticated users)
- [x] Quick actions: post job, my jobs, available workers
- [x] Stats row: active jobs, workers available, 100% no fees

## Bug: HomeEmployer mobile layout issues
- [x] Fix RTL text alignment (text centered instead of right-aligned)
- [x] Fix badge positioning (should be right-aligned)
- [x] Fix stats row (cards too small, text cramped)
- [x] Lighten image overlay for better visibility

## Hover animations on "How it works" cards
- [x] HomeEmployer: add whileHover lift + shadow on step cards
- [x] HomeWorker: add matching hover animations to its "how it works" cards

## Scroll-triggered entrance animations on "How it works" cards
- [x] HomeEmployer: replace initial/animate with whileInView + viewport once:true
- [x] HomeWorker: same scroll-triggered entrance animation

## Scroll-in animations for stats + job cards
- [x] HomeWorker: whileInView on StatsRow section header + individual stat cards (staggered)
- [x] HomeWorker: whileInView on carousel section header + job cards
- [x] HomeEmployer: whileInView on StatsRow section header + individual stat cards (staggered)
- [x] HomeEmployer: whileInView on carousel section header + worker cards

## Share button on job cards
- [x] Add share popover/menu on CarouselJobCard and JobCard with WhatsApp + Email options
- [x] WhatsApp: wa.me link with job title + URL
- [x] Email: mailto link with job title + URL

## Unread applications badge on employer banner
- [x] Add totalPendingApplications tRPC procedure
- [x] Show red badge on employer home banner with pending count
- [x] Dynamic text: "X מועמדויות ממתינות לסקירה" when pending > 0

## Counting-up number animation on stats
- [x] HomeWorker StatsRow: animate numbers from 0 to final value on scroll-in
- [x] HomeEmployer StatsRow: same counting-up animation with useCountUp hook

### Mark applications as viewed
- [x] DB: markEmployerApplicationsViewed function — updates all pending apps of employer's jobs to "viewed" status
- [x] Server: markApplicationsViewed mutation — calls markEmployerApplicationsViewed for authenticated employer
- [x] Client: call markApplicationsViewed when employer opens MyJobs page (useEffect on mount)
- [x] Badge count invalidated on success (totalPendingApplications + myJobsWithPendingCounts)
## Expanded share popover
- [x] Add Facebook share option (sharer.php link)
- [x] Add Telegram share option (t.me/share link)
- [x] Add "העתק קישור" with clipboard copy + visual confirmation (Check icon + green color for 1.2s)

## Worker-Job Matching Infrastructure
- [x] DB: add locationMode, workerLatitude, workerLongitude, searchRadiusKm, preferenceText to users table
- [x] DB: add jobLocationMode, jobSearchRadiusKm to jobs table
- [x] DB: push migrations
- [x] Server: updateWorkerProfile — include new matching fields (locationMode, workerLatitude, workerLongitude, searchRadiusKm, preferenceText)
- [x] Server: jobs.matchWorkers mutation — calls external MATCHING_API_URL/match-workers (stub if not configured)
- [x] Server: jobs.sendJobOffer mutation — calls external MATCHING_API_URL/job-offer (stub if not configured)
- [x] UI: /worker-preferences page — preference text, category selection, location mode (radius/city)
- [x] UI: HomeWorker "העדפות" button now navigates to /worker-preferences
- [x] UI: PostJob — location mode selector (radius/city) with radius options
- [x] UI: MyJobs — "עובדים מתאימים" button on active jobs → /matched-workers?jobId=...
- [x] UI: /matched-workers page — shows matched workers with score, distance, send-offer button
- [x] Routes: /worker-preferences and /matched-workers registered in App.tsx

## Worker Profile — Custom Job Tags
- [x] Add free-text custom tags input to WorkerProfile matching preferences section
- [x] Wire custom tags to existing workerTags field in DB via updateProfile

## Spec Compliance Fixes
- [x] Add jobLocationMode + jobSearchRadiusKm to PostJob create mutation payload
- [x] Add jobLocationMode + jobSearchRadiusKm to jobInputSchema in routers.ts
- [x] Fire matching API (POST /match-workers) automatically on job creation (fire-and-forget)
- [x] Add Push notification trigger to worker when sendJobOffer is called
- [x] Fix WorkerProfile categories to match spec list (add: טיפול בבעלי חיים, עזרה בבית, הובלות וסבלים, תחזוקה ותיקונים, עבודה משרדית, מכירות ושירות)

## Worker Profile — Preferred Schedule
- [x] Add preferredDays (JSON array) and preferredTimeSlots (JSON array) to users table in schema
- [x] Update updateWorkerProfile in db.ts and updateProfile in routers.ts
- [x] Add days + time slots UI to WorkerProfile matching preferences section

## Job Search — Time-of-Day Filter
- [x] Add timeSlot filter UI (בוקר/צהריים/ערב/לילה) to job search page
- [x] Filter jobs client-side by workingHours field matching selected time slot

## Worker Signup Flow (Multi-Step)
- [x] Add workerSignup tRPC procedure (saves all profile fields at once)
- [x] Build WorkerSignup.tsx with 5 steps + progress indicator
- [x] Step 1: Name + Phone (required)
- [x] Step 2: Location preference — radius or city (required)
- [x] Step 3: Category selection (required)
- [x] Step 4: Preference text (optional but recommended)
- [x] Step 5: Optional details (hourly rate, bio, availability)
- [x] Wire /worker-signup route in App.tsx
- [x] Redirect new workers from HomeWorker to /worker-signup if profile incomplete

## Worker Signup — Step 3 Optional
- [x] Make category selection (step 3) optional — enable "המשך" even with 0 categories selected
- [x] Add "דלג" link below the continue button on step 3

## Worker Signup — Email + Schedule Step + Profile Banner
- [x] Add email field to step 1 of WorkerSignup (auto-filled from Google OAuth data)
- [x] Add work schedule step (days + time slots) as step 4 in signup flow
- [x] Add "complete profile" banner to HomeWorker for workers with no categories selected
- [x] Verify categories are editable in WorkerProfile matching section

## Worker Signup Integration into WorkerProfile
- [ ] Add first-time onboarding wizard mode to WorkerProfile (shown when signupCompleted=false)
- [ ] Remove standalone /worker-signup page and route
- [ ] Update HomeWorker redirect to /worker-profile for new workers

## Worker Profile — Profile Photo
- [ ] Add profilePhoto field to users table in schema.ts
- [ ] Add uploadProfilePhoto tRPC procedure (S3 upload + save URL)
- [ ] Add photo upload UI to WorkerProfile with friendly message
- [ ] Show photo in PublicWorkerProfile and AvailableWorkers list

## Israeli Phone Number Input (Split Prefix + Number)
- [x] DB: add phone_prefixes table (id, prefix, description, is_active)
- [x] DB: add phone_prefix (varchar 3) and phone_number (varchar 7) columns to users table
- [x] DB: push migration with pnpm db:push
- [x] DB: seed phone_prefixes with 050, 052, 053, 054, 055, 058, 059
- [x] Server: getPhonePrefixes query helper in db.ts
- [x] Server: isValidPhonePrefix query helper in db.ts
- [x] Server: getPhonePrefixes tRPC procedure (public, cached)
- [x] Server: updateProfile — accept phonePrefix + phoneNumber, validate, save split + combined
- [x] Server: getWorkerProfile — return phonePrefix + phoneNumber fields
- [x] Component: IsraeliPhoneInput with RTL row-reverse layout
- [x] Component: parseIsraeliPhone helper (parse combined → split)
- [x] Component: combinePhone helper (split → combined for API)
- [x] UI: LoginModal — replace single Input with IsraeliPhoneInput
- [x] UI: WorkerProfile wizard step 1 — replace Input with IsraeliPhoneInput
- [x] UI: WorkerProfile details tab — replace Input with IsraeliPhoneInput (read-only for OTP users)
- [x] Tests: 19 vitest tests for phone validation logic (all passing)

## Phone Change OTP Verification
- [ ] tRPC procedure: requestPhoneChangeOtp — sends OTP via Twilio Verify to new number
- [ ] tRPC procedure: verifyPhoneChangeOtp — verifies code and updates phone in DB
- [ ] PhoneChangeModal component with OTP flow
- [ ] Wire into WorkerProfile — intercept phone save, open modal instead
- [ ] Vitest tests for OTP phone change flow

## Phone OTP Security Enhancements
- [ ] Email fallback when SMS fails
- [ ] Phone change audit log (phone_change_log table)
- [ ] Account lockout after 5 failed OTP attempts with email alert

## Admin: Release Phone Change Lockout
- [x] clearPhoneChangeLockout DB helper
- [x] Admin tRPC procedure: clearPhoneChangeLockout
- [x] Release Lockout button in admin users panel

## Employer Worker Profile View
- [ ] Add completedJobsCount to worker profile DB query
- [ ] Add Haversine distance calculation from employer location
- [ ] Update WorkerProfilePreviewModal: avatar, name, rating, availability, distance, categories, completedJobsCount

## Rating System & UX Improvements
- [ ] worker_ratings table in schema
- [ ] rateWorker tRPC procedure (employer only, after job completion)
- [ ] Auto-update workerRating average and completedJobsCount on new rating
- [ ] Star rating UI in ApplicationView and JobApplications cards
- [ ] Quick availability update button on worker home page
- [ ] Distance display in applicant cards (JobApplications page)

## My Applications + Saved Jobs Tab
- [ ] Add saved jobs tab to /my-applications page
- [ ] Tab switching via URL param (?tab=saved)
- [ ] Remove saved job button
- [ ] Nav links open correct tab

## Saved Jobs Sorting
- [x] Sort saved jobs by save date, salary, or city

## Saved Jobs Badge in Navbar
- [x] Show saved jobs count badge next to 'משרות ששמרתי' in navbar

## עיצוב מחדש של עמוד /my-applications
- [x] עיצוב עמוד מועמדויות ומשרות שמורות בשפת עיצוב זהה לעמוד הבית של העובד
- [x] תמונת גיבור ברקע כותרת עמוד /my-applications

## תיקון עמוד /my-applications
- [x] הבהרת צבע הטקסט בכותרת
- [x] עיצוב הטאבים בסגנון הטאבים בעמוד הפרופיל

## פילטרים לטאב מועמדויות
- [x] פילטרי סטטוס ומיון לטאב מועמדויות בסגנון פילטרי משרות שמורות

## פילטרים מועמדויות — עיצוב מחדש
- [x] שורת מיון זהה לשמורות + dropdown multi-checkbox לסטטוס + מיון לפי תאריך עבודה / עיר / שכר

## הזזת הודעת התראות
- [x] הודעת "הפעל התראות" תופיע מתחת לשורת הפילטרים בשני הטאבים

## כפתור הגשת מועמדות מהיר מכרטיס שמור
- [x] כפתור "הגש מועמדות" בכרטיס משרה שמורה עם modal הגשה ישיר

## counter מועמדויות ושמורות בכותרת
- [x] הצגת "הגשת X מועמדויות" ו-"Y משרות שמורות" בכותרת עמוד /my-applications

## כפתור שיתוף בכרטיס משרה שמורה
- [x] הוספת אייקון שיתוף לכרטיסי משרות שמורות עם Web Share API

## שיפורי כפתור שיתוף
- [x] אייקון שיתוף בכרטיסי מועמדויות
- [x] hover effect על כפתורי שיתוף
- [x] טקסט שיתוף מותאם עם שם עסק ושכר

## הצגת כפתור שיתוף רק למשרות פעילות
- [ ] הסתרת כפתור שיתוף כשהמשרה לא פעילה (בשמורות ובמועמדויות)

## כפתור הגש מועמדות רק למשרות פעילות
- [ ] הסתרת כפתור "הגש מועמדות" בכרטיסי שמורות כשהמשרה לא פעילה

## קומפוננטה אחידה JobCard
- [x] יצירת JobCard קומפוננטה מרכזית לכל כרטיסי המשרות
- [x] החלפת כרטיסי משרה ב-MyApplications (שמורות + מועמדויות)
- [x] החלפת כרטיסי משרה ב-FindJobs / HomeWorker

## החלפת כל כרטיסי המשרות ב-JobCard מרכזית
- [x] החלפת כרטיסי משרה ב-HomeWorker
- [x] החלפת כרטיסי משרה ב-FindJobs
- [x] החלפת SearchJobCard usages בשאר הדפים

## פתיחת פרטי משרה ב-Bottom Sheet Modal
- [x] לחיצה על כרטיס משרה פותחת bottom sheet modal עם פרטי המשרה
- [x] עיצוב modal לפי הדיזיין בתמונה (כותרת, אייקון קטגוריה, גריד פרטים, תיאור, תאריך תפוגה, כפתור הגשה)
- [x] חיבור כל כרטיסי המשרות (JobCard, SearchJobCard, CarouselJobCard) לפתיחת ה-modal

## איחוד כרטיסיות משרה לעיצוב אחיד
- [x] עיצוב JobCard אחיד לפי עיצוב כרטיסיית "שמורות" (כפתורי WhatsApp + טלפון ישירים, שיתוף, שמירה, "צפה במשרה")
- [x] הסרת SearchJobCard ו-CarouselJobCard — החלפה מלאה ב-JobCard
- [x] כפתורי יצירת קשר ישירים (WhatsApp + טלפון) בכל כרטיסיה
- [x] אחידות ב-HomeWorker list, FindJobs, MyApplications, carousel

## גרסה קומפקטית של כרטיס משרה לקרוסלה
- [x] הוספת prop variant="compact" ל-JobCard
- [x] גרסה קומפקטית: כותרת, קטגוריה, מיקום, שכר, כפתורי WhatsApp + "צפה במשרה" בלבד
- [x] עדכון שימוש ב-carousel ב-HomeWorker לגרסה קומפקטית

## תמונות קטגוריה ישראליות + stagger animation
- [x] חיפוש תמונות ישראליות מותאמות לכל קטגוריה (אוכל, אירוח, ניקויון, משלוחים, בנייה, אבטחה, משרד, קמעונאות, אירועים, טיפול בילדים, טיפול בקשישים, טכנולוגיה)
- [x] העלאת תמונות ל-CDN
- [x] עדכון bgImages ב-JobCard compact variant
- [x] הוספת stagger animation (80ms delay) לכרטיסיות הקרוסלה ב-HomeWorker

## blur placeholder לתמונות קטגוריה
- [ ] הוספת צבע רקע מותאם לכל קטגוריה כ-placeholder בזמן טעינה
- [ ] fade-in חלק כשהתמונה מוכנה (onLoad + opacity transition)
- [ ] shimmer animation על ה-placeholder

## הסרת כפתורי יצירת קשר ישיר מכרטיסיות
- [x] הסרת כפתורי WhatsApp + טלפון מ-JobCard (גרסה רגילה)
- [x] הסרת כפתורי WhatsApp + טלפון מ-JobCard compact (קרוסלה)
- [x] הסרת כפתורי WhatsApp + טלפון מ-JobBottomSheet
- [x] השארת כפתור "הגש מועמדות" בלבד כדרך ליצירת קשר

## הסתרת contactPhone בצד השרת
- [x] זיהוי כל הפרוצדורות שמחזירות contactPhone לעובדים
- [x] סינון contactPhone מתגובות API לעובדים/ציבור (null תמיד)
- [x] מעסיקים ממשיכים לראות contactPhone במשרות שלהם
- [x] עדכון טיפוסי TypeScript בצד הלקוח
- [x] כתיבת טסטים לאימות הסינון

## כפתור "הגש מועמדות" בכל הכרטיסיות
- [x] הוספת כפתור "הגש מועמדות" ל-JobCard (גרסה רגילה)
- [x] הוספת כפתור "הגש מועמדות" ל-JobCard compact (קרוסלה)
- [x] מצב "נשלחה מועמדות ✓" כשכבר הוגשה מועמדות לאותה משרה
- [x] חיבור apply mutation ו-appliedJobIds ב-HomeWorker, FindJobs, MyApplications

## הסרת כפתור "צפה במשרה" והוספת hint text
- [x] הסרת כפתור "צפה במשרה" / ChevronLeft מגרסה רגילה של JobCard
- [x] הסרת כפתור "צפה במשרה" / ChevronLeft מגרסה compact של JobCard
- [x] הוספת hint text מעוצב "לחץ על הכרטיסיה לפרטים נוספים" בתחתית כל כרטיסיה

## hint text צף ב-hover
- [x] הצגת hint text רק בעת hover על הכרטיסיה (fade-in/out)

## הסרת כמות עובדים ושם מעסיק מכרטיסיות
- [x] הסרת workersNeeded מגרסה רגילה של JobCard
- [x] הסרת businessName מגרסה רגילה של JobCard
- [x] הסרת businessName מגרסה compact של JobCard

## הצגת עיר בלבד בכרטיסיות
- [x] החלפת address/cityDisplay בעיר בלבד (city) בגרסה רגילה
- [x] החלפת address/cityDisplay בעיר בלבד (city) בגרסה compact

## תיקון הצגת עיר בכרטיסיות
- [x] בדיקת מבנה שדות city ו-address בבסיס הנתונים
- [x] תיקון לוגיקת חילוץ העיר מהכתובת כשהשדה city מכיל כתובת רחוב

## מיון לפי מרחק (Geolocation)
- [x] הוספת כפתור "קרוב אלי" ב-FindJobs
- [x] שימוש ב-Geolocation API לקבלת מיקום המשתמש
- [x] מיון משרות לפי מרחק עם נוסחת Haversine (client-side + server-side)

## תיקון נתוני עיר קיימים ב-DB
- [x] migration חד-פעמי לתיקון שדה city בכל המשרות הקיימות (8 records fixed)

## סינון מהיר לפי עיר ב-FindJobs
- [x] שליפת ערים מטבלת הערים הקיימת (trpc.user.getCities)
- [x] הצגת chips של ערים נפוצות מעל רשימת המשרות
- [x] סינון המשרות לפי עיר שנבחרה (server-side filter in list + search procedures)

## אוטו-קומפליט לשדה עיר בטופס פרסום
- [x] שליפת ערים מהטבלה הקיימת
- [x] הוספת CityAutocomplete לשדה העיר ב-PostJob (Google Places autocomplete)

## שיפור כרטיסיית compact (קרוסלה)
- [x] הוספת איקון שיתוף (SharePopover) לכרטיסיית compact
- [x] הוספת badge קטגוריה (איקון + שם) לכרטיסיית compact
- [x] עיצוב מחדש של הפריסה — סדר נקי ומאורגן

## אנימציית כניסה לקרוסלה
- [x] הוספת staggerChildren לקרוסלת הכרטיסיות — כל כרטיסייה נכנסת בהדרגה אחת אחרי השנייה

## Shared Element Animation + Skeleton Loading
- [x] הוספת layoutId לכרטיסיות קרוסלה ו-bottom sheet לאנימציית shared element
- [x] עדכון skeleton loading ל-210px (compact card) וודא שמוצג בזמן טעינה

## טולטיפ מעוצב בכרטיסיות
- [x] החלפת title="לחץ לפרטים..." בטולטיפ Radix מעוצב בשתי וריאנטי הכרטיסייה (compact + standard)

## Cursor + Tooltip על כרטיסיות
- [x] הוספת cursor pointer וטולטיפ Radix "לחץ לפרטים נוספים" על הכרטיסייה כולה (compact + standard)

## Badge "חדש" על משרות חדשות
- [x] הוספת נקודה ירוקה מהבהבת (animate-ping) בפינה שמאלית עליונה למשרות שפורסמו בשעה האחרונה (compact + standard)

## הסרת סרגל ניווט מיותר
- [x] הסרת קישורי הניווט הכפולים מה-dropdown — נשארו רק: מצב משתמש, עבור למצב, אפס בחירה, פאנל ניהול, התנתק

## ניקוי mobile sidebar
- [x] הסתרת ה-dropdown במובייל (hidden md:block) — רק ה-sidebar מוצג במובייל, רק ה-dropdown ב-desktop

## ניווט מובייל חדש
- [x] יצירת MobileBottomNav — 4 פריטים קבועים בתחתית המסך (Search, Flame, FileText, User)
- [x] יצירת MobileDrawer — תפריט צד עם קטגוריות (ניווט, אזור אישי, מערכת) + backdrop
- [x] חיבור hamburger ל-MobileDrawer (מחליף את ה-inline mobile nav)
- [x] הוספת pb-16 md:pb-0 ל-main למניעת כיסוי תוכן
- [x] תמיכה ב-RTL ועיצוב מותאם מובייל

## Haptic Feedback ב-Bottom Nav
- [x] הוספת navigator.vibrate(10) לכל לחיצה על פריטי ה-bottom nav (עם בדיקת תמיכה)
