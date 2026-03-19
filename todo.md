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
- [x] Vitest tests for backend procedures
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
- [x] Vitest tests for OTP phone change flow

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

## Footer SEO + מינימלי
- [x] קטע קישורי SEO — 12 ערים (תל אביב, ירושלים, חיפה ועוד) עם קישורי /find-jobs?city=
- [x] קטע קישורי SEO — 12 קטגוריות עם קישורי /find-jobs?category=
- [x] footer מינימלי עם תנאי שימוש + פרטיות + זכויות
- [x] קישורים crawlable ב-<a href> אמיתיים + FindJobs קורא ?city= מה-URL

## SEO Improvements
- [x] sitemap.xml דינמי — Express endpoint עם 15 ערים + 12 קטגוריות + 3 עמודים ראשיים
- [x] robots.txt עם Allow /find-jobs, Allow /post-job, Disallow /api/, Sitemap directive
- [x] הסתרת footer במובייל (hidden md:block ב-App.tsx)

## SEO Meta Tags
- [ ] יצירת useSEO hook לניהול title, description, og:image, canonical דינמיים
- [ ] הוספת meta tags לכל הדפים הראשיים (Home, FindJobs, PostJob, Profile)
- [ ] canonical link למניעת תוכן כפול

## SEO Improvements (Session 2026-03-10)
- [x] Create useSEO hook with title, description, og:image, canonical, noIndex support
- [x] Apply useSEO to FindJobs page with dynamic city/category meta tags
- [x] Apply useSEO to HomeWorker page
- [x] Apply useSEO to HomeEmployer page
- [x] Apply useSEO to PostJob page (noIndex=true)
- [x] Apply useSEO to MyApplications page (noIndex=true)
- [x] Apply useSEO to JobsToday page
- [x] Apply useSEO to WorkerProfile page (noIndex=true)
- [x] Apply useSEO to MyJobs page (noIndex=true)
- [x] Update index.html with full static OG meta tags (og:title, og:description, og:image, og:url, og:locale)
- [x] Add Twitter Card meta tags to index.html
- [x] Add static canonical link to index.html
- [x] Generate OG default image (1200x630) and upload to CDN
- [x] Update useSEO hook to use CDN OG image URL
- [ ] Submit sitemap to Google Search Console (manual step after domain deployment)

## Mobile Drawer — Legal & Contact Section
- [x] Add legal/contact section to bottom of MobileDrawer: email, terms, privacy, copyright

## Mobile Drawer — Report a Problem
- [x] Add "דווח על בעיה" mailto button in MobileDrawer legal section

## Bug Fix — MobileDrawer Overflow
- [x] Fix MobileDrawer: items overlap at bottom when content exceeds screen height — add overflow-y scroll

## Bug Fix — MobileDrawer Footer Cutoff
- [x] Fix MobileDrawer: elements after "מאובטח ומוגן" are not visible (footer cut off)

## Bug Fix — MobileDrawer Bottom Nav Overlap
- [x] Fix MobileDrawer: bottom content hidden under MobileBottomNav — add pb-20 to nav

## SEO Landing Pages
- [ ] Create /jobs/{city}, /jobs/{category}, /jobs/{category}/{city} routes
- [ ] JobsLanding page: dynamic H1, meta title/description, noindex when no jobs
- [ ] Add internal SEO links section (popular cities + categories) at bottom of JobsLanding
- [ ] Dynamic sitemap: include /jobs/* routes only for city/category combos with active jobs
- [ ] Update robots.txt to allow /jobs/*

## Auto-Close MobileDrawer on Scroll
- [ ] Close MobileDrawer automatically when user scrolls the main page

## SEO Landing Pages & Drawer Scroll Close (Session Mar 10)
- [x] Create JobsLanding page with dynamic H1/meta/noindex and internal SEO links
- [x] Add /jobs/:slug and /jobs/:category/:city routes to App.tsx
- [x] Add getJobCountByCityAndCategory function to db.ts
- [x] Add seoRouter with cityJobCounts procedure to routers.ts
- [x] Update sitemap.xml to be dynamic with real job counts from DB (10min cache)
- [x] Auto-close MobileDrawer when user scrolls down >=60px

## Structured Data — JSON-LD JobPosting
- [x] Create useJobPostingSchema hook for single job pages (/job/:id)
- [x] Apply JobPosting schema to JobDetails/JobPublic page
- [x] Add ItemList + JobPosting schema to JobsLanding SEO pages

## Structured Data — Additional Schemas
- [x] Add useBreadcrumbSchema hook and apply to JobsLanding (/jobs/{category}/{city})
- [x] Add useOrganizationSchema hook and apply to Home page
- [x] Add useFAQSchema hook and apply to Terms page

## Structured Data — WebSite, LocalBusiness, Privacy FAQ
- [x] Add useWebSiteSchema hook (WebSite + SearchAction) and apply to Home page
- [x] Add useLocalBusinessSchema hook and apply to Home page
- [x] Add FAQPage schema to Privacy page

## Performance — Preconnect Hints
- [x] Add preconnect + dns-prefetch hints to index.html for CDN and API domains

## Performance — Lazy Loading Images
- [x] Add loading="lazy" decoding="async" to images in JobCard, JobDetails, JobsLanding, and other job pages

## Performance — CLS Fix (Hero Images)
- [x] Add width/height to hero images in HomeWorker and HomeEmployer to prevent Layout Shift

## Performance — Cache-Control Headers
- [x] Add Cache-Control headers in server: immutable for hashed assets, no-store for API, no-cache for HTML

## SEO — robots.txt Private Paths
- [x] Add Disallow for /post-job, /my-jobs, /profile, /my-applications, /worker-profile in robots.txt

## Performance — Gzip/Brotli Compression
- [x] Add compression middleware to Express server for gzip/brotli response compression

## Internal SEO Links — FindJobs Page
- [x] Add SEO links section at the bottom of FindJobs results: context-aware city/category links

## Jobs Near Me — Geolocation Button
- [x] Add prominent "עבודות קרוב אלי" button in FindJobs SEO links section and filter bar
- [x] On click: request browser geolocation, store lat/lng in state, pass to job search query
- [x] Show distance badge on each job card when geolocation is active
- [x] Show "מציג עבודות ב-5 ק״מ ממך" status indicator when geo filter is active
- [x] Allow user to clear the geo filter

## Reverse Geocoding — Geo Status Bar
- [x] Reverse geocode GPS coordinates to Hebrew city name after geolocation succeeds
- [x] Display resolved city name in status bar: "מציג עבודות ליד {city}"
- [x] Cache resolved city name alongside lat/lng in localStorage

## Filter Panel Auto-Collapse — FindJobs
- [x] Auto-collapse filter panel for users with a filled worker profile (category/city set)
- [x] Show filter panel open by default for users without a profile
- [x] Add profile-completion recommendation banner inside filter panel for users without a profile
- [x] Allow manual toggle of filter panel open/closed at any time

## SEO Checklist — Missing Items Implementation

### High Priority
- [x] Add `noindex` to FindJobs when there are no results
- [x] Add `canonical` tag to JobDetails page via `useSEO`
- [x] Add `BreadcrumbList` JSON-LD structured data to JobDetails
- [x] Add `Disallow: /admin` to robots.txt

### Medium Priority
- [x] Add `/jobs/today/:city` SEO route (time+city landing page)
- [x] Add RSS feed endpoint `/jobs/rss.xml`
- [x] Add visual breadcrumb UI component to JobDetails
- [x] Add visual breadcrumb UI component to JobsLanding

### Low Priority
- [ ] Add SEO content pages (עבודות לפסח, עבודה זמנית, עבודה לסטודנטים)

## Guide / Topic Cluster Section
- [x] Write Hebrew guide content for all 12 category sub-pages (300-600 words each)
- [x] Build GuideHub page at /guide/temporary-jobs
- [x] Build GuidePage component for /guide/temporary-jobs/:category
- [x] Register /guide/temporary-jobs and /guide/temporary-jobs/:category routes in App.tsx
- [x] Add internal links from guide pages to /jobs/{category} and /jobs/{category}/{city}
- [x] Add guide links to sitemap.xml
- [x] Add "מדריך" nav link to desktop footer and mobile nav

## FindJobs Filter Panel Rebuild (Profile-style UI)
- [x] Rebuild filter panel to match WorkerProfile preferences UI style
- [x] Collapsible row: "תחומי עיסוק מועדפים" with count badge and category chips
- [x] Collapsible row: "מצב חיפוש עבודה לפי עיר" with city selector
- [x] "שמור העדפות" button that triggers search and saves to profile

## FindJobs — Move "דחוף להיום" Button
- [x] Remove "דחוף להיום" button from inside the filter panel
- [x] Add "דחוף להיום" button next to the green "עבודות קרוב אלי" button at the top

## Full SEO Architecture Implementation

### Phase 2 — Slug-based Job Pages
- [ ] Add slug generation utility (Hebrew title → URL-safe slug)
- [ ] Update /job/:id route to also accept /job/:id-:slug pattern
- [ ] Update all job links across the app to use slug URLs
- [ ] Verify JobPosting JSON-LD is present on job detail pages

### Phase 3 — Time-based SEO Pages
- [ ] Add /jobs/immediate route (עבודות מיידיות)
- [ ] Add /jobs/evening and /jobs/evening/:city routes
- [ ] Add /jobs/weekend and /jobs/weekend/:city routes
- [ ] Extend JobsLanding to handle immediate/evening/weekend time filters

### Phase 4 — Guide Pages (extended)
- [ ] Add /guide/:topic generic route
- [ ] Add guide topics: student-jobs, delivery-salary, passover-jobs
- [ ] Add CTA links from each guide to relevant /jobs/* pages

### Phase 5 — Structured Data & Sitemap
- [ ] Add WebSite + SearchAction JSON-LD to homepage
- [ ] Add Organization JSON-LD to homepage
- [ ] Update sitemap to include all job pages, time-based pages, guide pages
- [ ] Add noindex to zero-result pages in JobsLanding

## AI Visibility Pages (2026-03-10)
- [x] Create /faq/:slug pages with FAQPage JSON-LD schema (jobs, delivery-jobs, student-jobs)
- [x] Create /best/:slug curated job pages with ItemList + FAQPage JSON-LD (delivery, student, evening, weekend, immediate)
- [x] Register /faq/:slug and /best/:slug routes in App.tsx
- [x] Add /faq/* and /best/* pages to sitemap.xml
- [x] Add FAQ and best-jobs links to Footer
- [x] Write vitest tests for FAQ and best-jobs data integrity (207 tests passing)

## Dynamic Admin-Managed Categories (Mar 12 2026)
- [ ] Add `categories` table to Drizzle schema (id, name, groupName, imageUrl, isActive, createdAt, updatedAt)
- [ ] Push DB migration (pnpm db:push)
- [ ] Add DB helpers: getCategories, getCategoryById, createCategory, updateCategory, deleteCategory
- [ ] Add tRPC procedures: categories.list (public, active only), categories.adminList (all), categories.create, categories.update, categories.toggleActive, categories.delete
- [ ] Build admin categories page /admin/categories with CRUD table (add, edit, toggle active, delete)
- [ ] Seed initial categories (cleaning, events, repairs, gardening, etc.)
- [ ] Migrate FindJobs category chips to use dynamic categories from DB
- [ ] Migrate PostJob category selector to use dynamic categories from DB
- [ ] Migrate HomeWorker category section to use dynamic categories from DB
- [ ] Migrate Footer SEO links to use dynamic categories from DB
- [ ] Migrate JobsLanding SEO pages to use dynamic categories from DB
- [ ] Migrate shared/categories.ts — keep as fallback/seed only, not as source of truth
- [ ] Write vitest tests for categories procedures

## Regional Activation System

- [x] DB: add regions table (id, name, slug, centerCity, centerLat, centerLng, activationRadiusKm, minWorkersRequired, currentWorkers, status, description, imageUrl, createdAt, updatedAt)
- [x] DB: add regionId FK to users table (worker's associated region)
- [x] DB: push migrations
- [x] Seed initial regions: Tel Aviv, Jerusalem, Haifa, Bnei Brak, Ashdod, Beer Sheva, Netanya, Rishon LeZion + more (12 total)
- [x] Server: region DB helpers (getRegions, getRegionBySlug, getRegionById, findNearestRegion, associateWorkerWithRegion, checkRegionActiveForJob, updateRegionStatus, updateRegion, recountRegionWorkers, seedRegionsIfEmpty, haversineKm)
- [x] Server: worker.updateProfile — after saving lat/lng, find nearest region within radius, associate worker, update count, auto-activate if threshold met
- [x] Server: regions tRPC procedures (regions.list, regions.getBySlug, regions.checkActive, regions.updateStatus, regions.update, regions.recount, regions.seed)
- [x] Server: jobs.create — check if employer's city region is active; throw error with Hebrew message if not (admins bypass)
- [x] Frontend: /work/:slug worker landing pages (pre-activation sign-up)
- [x] Frontend: WorkerLandingPage component — hero, region stats (X workers joined, Y needed), CTA to register
- [x] Frontend: PostJob — region-not-active error surfaced via tRPC FORBIDDEN error
- [x] Admin: Regions management tab in /admin panel (list, edit status, view worker counts)
- [x] Admin: Ability to manually activate/pause/reset regions
- [x] Tests: 242 tests passing — haversine, region selection, employer block, auto-activation threshold, slug validation

## Regional Activation — Gap Fixes

- [x] DB: add worker_regions table (worker_id, region_id, distance_km, match_type, created_at)
- [x] DB: add radiusMinutes field to regions table (alongside activationRadiusKm)
- [x] DB: push migrations
- [x] Server: replace single-region association with multi-region (worker_regions table)
- [x] Server: associate worker with ALL regions within GPS radius (not just nearest)
- [x] Server: associate worker with regions whose centerCity matches any preferredCity
- [x] Server: recountRegionWorkers — count from worker_regions table
- [x] Server: regions.create procedure (admin)
- [x] Server: regions.delete procedure (admin)
- [x] Server: regions.getWorkers procedure — list workers in a region with distance_km and match_type
- [x] Frontend: /admin/regions standalone page (full table with create/edit/delete/activate/pause)
- [x] Frontend: /admin/regions/:id detail page — worker list, progress bar, activation controls
- [x] Frontend: Add route /admin/regions and /admin/regions/:id to App.tsx

## New Features Batch

- [x] Fix TS error in server/_core/trpc.ts errorFormatter
- [x] PostJob: add hourlyRate (₪/hour) and estimatedHours fields
- [x] DB: add hourlyRate + estimatedHours columns to jobs table, push migration
- [x] JobCard/JobDetails: display hourlyRate × estimatedHours summary (rate/hour + hours + total)
- [x] Homepage: add region landing page CTAs section (/work/tel-aviv etc.) in HomeWorker
- [x] WorkerLandingPage: real-time worker count polling every 30s with pulsing indicator
- [x] Push notifications to workers when their region auto-activates (fire-and-forget in _recountAndMaybeActivate)

## Inactive Region Notifications

- [ ] DB: add region_notification_requests table (id, userId, regionId, type: worker|employer, createdAt) — unique per user+region
- [ ] DB: push migration
- [ ] Server: regions.requestNotification procedure — subscribe user to region activation alert
- [ ] Server: regions.getMyNotificationRequests — list regions user subscribed to
- [ ] Server: regions.getWorkerRegionStatus — returns worker's regions with active/inactive status
- [ ] Worker: show banner on homepage when ALL associated regions are inactive: "אזור זה טרם נפתח למעסיקים..."
- [ ] Employer: show inline message on PostJob when region is inactive with "הודע לי כשהאזור נפתח" button
- [ ] Employer: confirmation toast after subscribing to notification
- [ ] Admin: when region is activated, send push notification to all subscribed employers

## Bug Fixes

- [x] City autocomplete not working — fixed: CityAutocomplete now queries cities table via trpc.user.searchCities (58 cities seeded); Google Places used as enhancement only
- [x] WorkerProfile: added "יציאה ללא שמירה" button next to save button in all 3 tabs (details, work, schedule)

## Referral System

- [x] DB: add referredBy (optional FK to users.id) to users table, push migration
- [x] Frontend: on any page load, if ?ref=X in URL, save X to localStorage (ReferralCapture in App.tsx)
- [x] Backend: applyRef tRPC mutation — reads stored ref from localStorage after login and saves referredBy
- [x] Share buttons: append ?ref={userId} to all shared URLs (JobCard, CarouselJobCard, JobDetails)
- [x] My Referrals page at /my-referrals — shows count, referral link, and list of referred users
- [x] Navbar + MobileDrawer: "הפניות שלי" link in user menu
- [ ] Admin: referrals tab showing who referred whom and count
- [x] Tests: 11 referral tests in referrals.test.ts (262 total tests passing)

## Job Card Enhancements (Mar 2026)

- [ ] DB: add jobDate (date), workStartTime (text), workEndTime (text) to jobs table
- [ ] DB: add imageUrls (JSON array, max 5) to jobs table
- [ ] DB: push migration
- [ ] PostJob: add date picker for jobDate
- [ ] PostJob: add time range inputs (workStartTime, workEndTime) e.g. 14:00–16:00
- [ ] PostJob: add image upload (up to 5 images) with S3 storage + encouragement text
- [ ] JobDetails/BottomSheet: show jobDate and work hours range
- [ ] JobDetails/BottomSheet: show up to 5 job images in scrollable gallery
- [ ] JobDetails/BottomSheet: show employer profile photo (from users table)
- [ ] Worker: add "הסר מועמדות" (withdraw) button — only if job not expired and worker hasn't completed the job
- [ ] Backend: applications.withdraw mutation
- [ ] Tests: withdraw mutation, image upload validation

## Job Card Enhancements (Mar 12, 2026)

- [x] DB: add jobDate, workStartTime, workEndTime, imageUrls fields to jobs table, migration pushed
- [x] PostJob form: date picker, time range (start/end), image upload (up to 5 with preview + delete)
- [x] PostJob form: tip text "הוספת תמונות תעזור לעובדים להבין את העבודה ולקבל החלטה מהר יותר"
- [x] JobDetails: show employer profile photo (if available) instead of category icon in header
- [x] JobDetails: show job date and work hours (start-end) in details grid
- [x] JobDetails: image gallery with lightbox (scrollable thumbnails, full-screen viewer with prev/next)
- [x] JobDetails: withdraw application button for workers (only when job is active, not expired)
- [x] Server: uploadJobImage procedure for S3 upload
- [x] Server: withdrawApplication procedure wired to UI
- [x] All 262 tests passing

## Incomplete Profile Banner (Mar 12, 2026)

- [x] FindJobs page: animated banner "השלם את הפרופיל שלך" shown only when worker profile is incomplete
- [x] Banner: animated pulsing border (framer-motion opacity+scale loop), icon, text, and "עדכן עכשיו" button linking to /worker-profile
- [x] Banner: hidden if profile is complete (has categories + location) or user is not logged in

## PostJob Date/Time UX (Mar 12, 2026)

- [ ] Make jobDate field required in PostJob form (validation + UI indicator)
- [ ] Make workStartTime / workEndTime optional (remove required validation)
- [ ] Add quick-select time preset buttons: בוקר (06:00-14:00), צהרים (12:00-20:00), ערב (16:00-22:00), לילה (22:00-06:00)
- [ ] Preset buttons auto-fill both start and end time fields

## Date Display & Filter (Mar 12, 2026)

- [ ] JobCard: show date + hours row below description
- [ ] CarouselJobCard: show date + hours row
- [ ] SearchJobCard: show date + hours row
- [ ] FindJobs: date filter buttons (היום / מחר / השבוע)
- [ ] Backend: support dateFilter param in jobs.search procedure

## Sort Options in FindJobs (Mar 12, 2026)

- [x] FindJobs: add sort state (salary desc, date desc, distance asc)
- [x] FindJobs: sort chips row between results header and job list
- [x] FindJobs: client-side sort logic applied to jobs array (salary, date, distance, default)

## Push Notifications (Mar 12, 2026)

- [ ] DB: pushSubscriptions table (userId, endpoint, p256dh, auth, createdAt)
- [ ] Server: subscribe/unsubscribe tRPC procedures
- [ ] Server: sendJobPushNotifications helper — match workers by category + city
- [ ] Server: call sendJobPushNotifications inside createJob mutation
- [ ] Frontend: service worker (sw.js) for push event handling
- [ ] Frontend: notification permission prompt in Navbar/HomeWorker
- [ ] Frontend: subscribe mutation wired to permission grant
- [ ] Tests: push subscription procedures

## Pagination System (Completed)
- [x] jobs.list procedure: returns { jobs, total, page, limit } instead of Job[]
- [x] jobs.search procedure: returns { jobs, total, page, limit } instead of Job[]
- [x] FindJobs.tsx: updated to extract .jobs from paginated response + pagination UI (page numbers, prev/next)
- [x] JobsLanding.tsx: updated to extract .jobs from paginated response
- [x] HomeWorker.tsx: updated to extract .jobs from paginated response
- [x] WelcomeScreen.tsx: updated to extract .jobs from paginated response
- [x] BestJobsPage.tsx: already handled paginated response
- [x] contactphone.privacy.test.ts: updated mocks and assertions for new paginated response format
- [x] All 262 tests passing, 0 TypeScript errors

## Push Notifications for Workers (Completed)
- [x] Audit existing push notification infrastructure (webPush.ts, pushSubscriptions schema, usePushNotifications hook, sw.js)
- [x] Server: sendJobPushNotifications fan-out called in jobs.create alongside SMS alerts
- [x] Server: early-exit guard — skip push fan-out when no matching workers exist
- [x] Client: PushNotificationBanner reusable component (compact + full variants)
- [x] Client: PushNotificationToggle reusable component for headers/toolbars
- [x] Client: Banner added to HomeWorker.tsx (compact, after WorkerRegionBanner)
- [x] Client: Banner added to FindJobs.tsx (compact, after jobs list)
- [x] Client: Banner added to JobsLanding.tsx (compact, after jobs list)
- [x] Tests: push.notifications.test.ts — 6 tests covering fan-out, no-match guard, isUrgent flag, subscribe/unsubscribe/vapidKey
- [x] All 268 tests passing, 0 TypeScript errors

## Bug Fix — Blank page on /find-jobs and other pages
- [x] Diagnose and fix syntax/runtime error causing blank pages after push notification changes

## FindJobs UX Redesign — Search/Filter Area
- [ ] Move profile completion banner above search bar
- [ ] Replace sort chips with a Select dropdown ("הצג לפי")
- [ ] Add "סנן לפי" button that opens the existing filter modal
- [ ] Add quick-filter chips (עבודות קרוב אלי, דחוף, היום, מחר, השבוע) above category tabs

## FindJobs UX Redesign — Search Area
- [x] Move profile completion banner above search bar
- [x] Replace quick-action row with "הצג לפי" select + "סנן לפי" button
- [x] Move quick filter chips (עבודות קרוב אלי, דחוף, היום, מחר, השבוע) above job list
- [x] "נקה הכל" chip to clear all active quick filters at once

## FindJobs UX Fixes (Round 2)
- [x] Fix sort select: "ברירת מחדל" overflows "הצג לפי" label — use placeholder approach instead of overlay label
- [x] Move quick filter chips (עבודות קרוב אלי, דחוף, היום, מחר, השבוע) inside the filter modal at the top

## FindJobs UX Fixes (Round 3)
- [x] Show total active filter count (panel filters + quick chips: location, urgent, date) on "סנן לפי" button badge when panel is closed

## FindJobs Filter Panel Button Redesign
- [x] Add "נקה סינון" button next to "הצג תוצאות" in one row (smaller buttons)
- [x] "שמור כהעדפות שלי" below the two buttons with distinct dashed-border style

## FindJobs Day Filter
- [ ] Add day-of-week filter chips to "שעות עבודה" section in filter panel (matching profile UI)
- [ ] Wire day filter to backend query (jobs.list / jobs.search)

## FindJobs Dynamic City Chips
- [x] Add backend procedure to return active region cities from the regions table
- [x] Replace hardcoded city chips in filter panel with dynamic cities from active regions

## FindJobs Filter Panel Collapsible Sections
- [x] Make "שעות עבודה" and "ימי עבודה" sections collapsible like "תחומי עיסוק" and "מיקום"
- [x] Replace hardcoded city chips with active region cities from backend (regions.getActiveCities)

## Bug Fix — Blank page on /find-jobs (Round 2)
- [x] Fix blank page on חיפוש עבודה after latest filter panel changes (was stale checkpoint, dev server working correctly)

## FindJobs Day Filter (Mar 12, 2026)
- [ ] Add day-of-week filter chips to filter panel (ראשון-שבת)
- [ ] Wire day filter to backend jobs.list / jobs.search query

## Job Card "Today" Badge (Mar 12, 2026)
- [x] Add "היום" badge on job cards for jobs starting today (green badge via jobDate, orange via startTime)
- [x] Badge should be visually distinct (green for scheduled today, orange for startTime=today)

## Filter Persistence (Mar 12, 2026)
- [x] Save active filters to localStorage so they persist across page visits (auto-save on change)
- [x] Restore saved filters on page load (category, city, timeSlots, days, sortBy)
- [x] Show "מסנן שמור" indicator when using saved filters
- [x] Clear saved filters when user clicks "נקה סינון"

## Empty State Smart Suggestions (Mar 12, 2026)
- [x] Show "הרחב לעיר הסמוכה" suggestion when city filter active and no results
- [x] Show "הצג עבודות מחר / השבוע" suggestion when date filter active and no results
- [x] Show "הסר פילטר קטגוריה" with category name when category filter active
- [x] Show nearby cities quick-links based on selected city (NEARBY_CITIES map)
- [x] Show popular categories chips when category filter is too narrow
- [x] Add "עבר להגדרות התראות" CTA button for logged-in users (links to /profile)
- [x] Improve empty state visual design (SmartEmptyState component with dynamic headline/subtitle)

## Day-of-Week Filter Backend Integration (Mar 12, 2026)
- [x] Add dayOfWeek param to getActiveJobs() and getJobsNearLocation() in server/db.ts (MySQL DAYOFWEEK)
- [x] Add dayOfWeek param to jobs.list and jobs.search tRPC procedures in server/routers
- [x] Update FindJobs.tsx to pass selectedDays as dayOfWeek to both queries
- [x] Remove client-side day filtering (now handled server-side)
- [x] Move DAY_NAME_TO_NUM to module-level constant (DRY principle)
- [ ] Add vitest for dayOfWeek filter in jobs router test

## Bug: Location Button Not Working (Mar 12, 2026)
- [x] Fix "לפי מיקום" button in FindJobs filter panel - button now calls doGetLocation() directly
- [x] Verify handleLocationButtonClick is wired to the button correctly
- [x] Added disabled state and BrandLoader spinner while locating

## Vitest: dayOfWeek Filter Tests (Mar 12, 2026)
- [x] Test getActiveJobs builds correct SQL condition for dayOfWeek (via router mock)
- [x] Test getJobsNearLocation builds correct SQL condition for dayOfWeek (via router mock)
- [x] Test jobs.list tRPC procedure passes dayOfWeek to getActiveJobs (9 tests)
- [x] Test jobs.search tRPC procedure passes dayOfWeek to getJobsNearLocation (9 tests)
- [x] Test DAY_NAME_TO_NUM mapping (0=Sun..6=Sat JS convention) (6 tests)
- [x] Test MySQL DAYOFWEEK conversion (JS+1 = MySQL) (5 tests)
- [x] Test edge cases: empty array, pagination, combined filters (4 tests)
- [x] Total: 33 new tests in server/dayOfWeek.test.ts — all passing (301 total)

## Bug: FindJobs Blank Page (Mar 12, 2026 Round 3)
- [x] Diagnose blank page on /find-jobs — NOT a code bug
- [x] Root cause: user was viewing the old published version (avodanow.co.il); dev server and published site both work correctly. Need to Publish new checkpoint to update the live site.

## Location Filter Mutual Exclusion (Mar 12, 2026)
- [x] "לפי מיקום" mode: shows only km-radius chips, city controls hidden, selectedCity reset to null
- [x] "לפי עיר" mode: shows only city controls (input + popular cities), km chips hidden, userLat/userLng/geoCity reset
- [x] Switching modes resets the other mode's state (mutual exclusion enforced)

## Bug: City Selection Doesn't Clear Location Mode (Mar 12, 2026)
- [x] handleCitySelect now sets selectedCity and clears userLat/userLng/geoCity (was incorrectly setting userLat)
- [x] Popular city chip click also clears userLat/userLng/geoCity

## Multi-City Filter (Mar 12, 2026)
- [ ] Replace selectedCity (string|null) with selectedCities (string[]) in FindJobs state
- [ ] Update getActiveJobs and getJobsNearLocation in db.ts to accept cities: string[]
- [ ] Update jobs.list and jobs.search tRPC procedures to accept cities array
- [ ] Update city autocomplete: selecting a city adds it to selectedCities (toggle)
- [ ] Update popular city chips: clicking toggles city in/out of selectedCities
- [ ] Show selected cities as removable chips in the filter panel
- [ ] Update filter persistence (localStorage) to save selectedCities array
- [ ] Update SEO title/canonical to reflect multi-city selection
- [ ] Update SmartEmptyState to handle selectedCities array

## Bottom Nav: Replace Profile with Home (Mar 12, 2026)
- [x] Replaced "הפרופיל שלי" button in bottom nav with "מסך הבית" (Home icon, links to /)

## Shared city-chip CSS Class (Mar 12, 2026)
- [x] Found all city chip render locations: HomeWorker, FindJobs (3 places), JobsLanding, GuidePage
- [x] Added .city-chip class to index.css (white bg, rounded-full, pink 📍 via ::before, brand border, .active state)
- [x] Applied .city-chip in FindJobs.tsx (popular cities, SmartEmptyState nearby + popular, SEO links x2)
- [x] Applied .city-chip in HomeWorker.tsx (city links section)
- [x] Applied .city-chip in JobsLanding.tsx (SEO city links)
- [x] Applied .city-chip in GuidePage.tsx (city-specific links)

## Multi-City Filter UI (Mar 12, 2026)
- [ ] Replace selectedCity with selectedCities[] in FindJobs state (backend already supports cities[])
- [ ] Popular city chips: clicking toggles city in/out of selectedCities (multi-select)
- [ ] CityAutocomplete: selecting a city adds it to selectedCities (not replaces)
- [ ] Show selected cities as removable .city-chip tags above the city list
- [ ] Update filter persistence (localStorage) to save selectedCities array
- [ ] Update SmartEmptyState to handle selectedCities array
- [ ] Update hasSavedFilters and clearFilters to handle selectedCities

## Profile Shortcut in Top Navbar (Mar 12, 2026)
- [ ] Add "הפרופיל שלי" link to the user dropdown menu in the top navbar
- [ ] Link should navigate to /profile page

## Passover/Pesach SEO Keywords (Mar 12, 2026)
- [ ] Add /jobs/pesach and /jobs/cleaning/pesach SEO landing pages (route + meta)
- [ ] Add "ניקיון לפסח" and "מנקה לפסח" to SEO_CITIES equivalent (keyword variants)
- [ ] Add Passover cleaning jobs FAQ structured data (FAQPage JSON-LD)
- [ ] Add "ניקיון לפסח" as a featured category/banner on homepage near Passover
- [ ] Update sitemap to include Passover landing pages
- [ ] Add Passover-specific meta description to cleaning category pages

## SEO Passover Landing Pages (Mar 12, 2026 - Session 2)
- [x] Created PassoverLandingPage.tsx with dedicated content for /jobs/ניקיון-לפסח and /jobs/מנקה-לפסח
- [x] Added FAQ JSON-LD (FAQPage schema) with 5 Q&A items about Passover cleaning jobs
- [x] Added Article JSON-LD with keywords field
- [x] Added BreadcrumbList JSON-LD via useBreadcrumbSchema hook
- [x] Added keywords meta tag support to useSEO hook (new `keywords` field in SEOOptions)
- [x] Added GuideTopicFAQ interface and faq/keywords fields to GuideTopic interface in guideTopics.ts
- [x] Added FAQ data and keywords array to passover-jobs guide topic
- [x] Updated GuideTopicPage.tsx to inject FAQPage JSON-LD when topic has faq data
- [x] Updated GuideTopicPage.tsx to pass keywords to useSEO hook
- [x] Registered /jobs/ניקיון-לפסח and /jobs/מנקה-לפסח routes in App.tsx (before /jobs/:slug)
- [x] Passover landing pages show cleaning jobs, Passover info banner, FAQ section, city SEO links
- [x] 301 tests still passing, 0 TypeScript errors

## Remove Duplicate Active Filter Chips (Mar 12, 2026)
- [x] Remove active filter chips (category + city X buttons) from the results header — they already appear in a better format below

## Multi-Category Selection in FindJobs (Mar 12, 2026)
- [x] Replace single `category` string state with `selectedCategories: string[]` array
- [x] Update category chips in filter panel to toggle (multi-select) instead of replace
- [x] Update tRPC query params to pass categories[] array
- [x] Update server db.ts getActiveJobs / getJobsNearLocation to accept categories: string[]
- [x] Update server routers.ts jobs.list and jobs.search to accept categories array
- [x] Update filter persistence (localStorage) to save selectedCategories array
- [x] Update activeFilterCount to count selectedCategories.length
- [x] Update SmartEmptyState to handle selectedCategories array
- [ ] Update SEO title/canonical to reflect multi-category selection
- [x] Update clear-all logic to reset selectedCategories to []

## Maintenance Mode (Mar 12, 2026)
- [x] Add systemSettings table to drizzle/schema.ts (key TEXT PK, value TEXT)
- [x] Push DB migration
- [x] Add getSystemSetting / setSystemSetting helpers to server/db.ts
- [x] Add admin tRPC procedures: admin.getMaintenanceMode + admin.setMaintenanceMode + public maintenance.status
- [x] Add MaintenancePage.tsx — shown to non-admin users when maintenance mode is ON
- [x] Add MaintenanceGate — inline in Router() in App.tsx, polls every 60s, auto-unblocks when admin turns off
- [x] Add Maintenance Mode toggle card to Admin panel (new תחזוקה tab) with ON/OFF button and status indicator
- [x] Admins bypass maintenance mode and see the site normally
- [x] Run tests, verify 0 TypeScript errors, save checkpoint

## Conditional Hero Stats Banner (Mar 12, 2026)
- [x] Add server-side getHeroStats query: returns activeJobs, closedJobs, registeredWorkers counts
- [x] Update QuickStats banner: show activeJobs if >50, else closedJobs if >50, else workers if >100, else hide stat

## Maintenance Mode Login Flow (Mar 12, 2026)
- [x] Show login button on MaintenancePage (open LoginModal)
- [x] After successful OTP login during maintenance: check if user is admin
- [x] If not admin → close modal, stay on MaintenancePage (non-admin cannot bypass)
- [x] If admin → maintenance gate re-checks and lets them through automatically

## Fix QuickStats Banner (Mar 12, 2026)
- [x] Fix QuickStats — RoleSelectionScreen badge now uses real heroStats data (hides when <50 active jobs / <50 closed / <100 workers)

## Fix QuickStats in FindJobs (Mar 12, 2026 - v2)
- [x] Fix QuickStats in FindJobs — found in HomeWorker.tsx StatsRow (hardcoded useCountDown), now uses real heroStats data

## Footer Badge Dynamic (Mar 12, 2026)
- [x] Update Footer.tsx badge from hardcoded "500+ משרות" to real heroStats data (hidden when thresholds not met)

## Footer Workers Text Dynamic (Mar 12, 2026)
- [x] Replace hardcoded "אלפי עובדים" in Footer with real registeredWorkers count from heroStats (hidden when 0)

## Profile Shortcut in Header Dropdown (Mar 12, 2026)
- [x] Add "הפרופיל שלי" shortcut button inside the user dropdown in the top navigation header (already existed for workers; added mobile icon button)

## Mobile Profile Icon in Navbar (Mar 12, 2026)
- [x] Add user/profile icon button in mobile top navbar (next to hamburger menu) — links to /profile for workers, active state highlighted

## Mobile Navbar Reorganization (Mar 12, 2026)
- [x] Reorganize mobile top navbar: ☰ (right) | 👤 user icon | Logo (center) | 📋 applications | 🔖 saved jobs (left)

## Navbar Fixes (Mar 12, 2026)
- [x] Fix /profile route returning 404 — register route in App.tsx
- [x] Style user icon in mobile navbar consistently with other icons (same size/color/active state)

## Custom Maintenance Message (Mar 12, 2026)
- [ ] Add maintenanceMessage field to systemSettings DB table
- [ ] Add getMaintenanceSettings and setMaintenanceMessage tRPC procedures
- [ ] Admin panel: textarea to set custom maintenance message
- [ ] MaintenancePage: display custom message when set

## Login Modal Redesign (Mar 12, 2026)
- [x] Redesign LoginModal as full-page overlay (covers entire screen)
- [x] Add 2 tabs: התחברות (login via OTP) and הרשמה (register via OTP)
- [x] Register tab: collect name + phone, then OTP verification
- [x] Login tab: phone input + OTP verification (existing flow)

## Progressive Onboarding Flow (Mar 12, 2026)
- [ ] LoginModal: remove name field, phone-only step 1 (no name required)
- [ ] LoginModal: after OTP success show inline role selection (Worker / Employer) instead of navigating away
- [ ] Role-specific quick setup: Worker → categories multi-select + city; Employer → city only
- [ ] After setup: redirect Worker to /find-jobs, Employer to /post-job
- [ ] Progressive profile banners on WorkerProfile page (photo, description, experience prompts)
- [ ] Profile completion score (%) on WorkerProfile and employer profile pages

## Progressive Onboarding Flow (Mar 12, 2026)
- [x] LoginModal: phone → OTP only (no name field), tabs for login/register
- [x] Post-OTP role selection step (worker / employer) inside modal
- [x] Quick setup step after role selection (categories + city, optional)
- [x] Profile completion score + banner in WorkerProfile

## User Management Table Redesign (Mar 12, 2026)
- [x] Redesign users tab in Admin panel as a data table
- [x] Table columns: name, phone, role, status, created, last login, actions
- [x] Table actions: edit (modal), delete (confirm), block/unblock, promote
- [x] Add "הוסף משתמש" button with form modal (name, phone, role)
- [x] Backend: admin.createUser procedure
- [x] Backend: admin.updateUser procedure (name, phone, role, status)
- [x] Backend: admin.deleteUser procedure

## User Role Changes (Mar 12, 2026)
- [x] Add 'test' role enum to users table in schema
- [x] Run db:push migration
- [x] Update adminSetUserRole / adminUpdateUser to accept 'test' role
- [x] Remove promote-to-admin button from user management table
- [x] Update role selects in add/edit user modals to include 'test'
- [x] Update role badge display to show 'טסט' label

## Test User Permissions (Mar 12, 2026)
- [x] Backend: verifyOtp bypass for test users (last 5 digits of phone as OTP)
- [x] Backend: maintenance mode bypass for test users
- [x] Frontend: LoginModal hint for test users about bypass code
- [x] Frontend: maintenance page bypass for test users

## Registration Flow Update (Mar 13, 2026)
- [x] Separate login vs registration in LoginModal
- [x] Registration: collect name, phone, email + terms checkbox
- [x] Backend: store email during registration (sendOtp/verifyOtp)
- [x] Terms checkbox must be checked before sending OTP

## Manus.im Maintenance Bypass (Mar 13, 2026)
- [x] Bypass maintenance mode for users arriving from manus.im / manus.space / manus.computer
- [x] Fix 'test' role type in AuthContext.tsx and Admin.tsx

## Terms Enforcement (Mar 13, 2026)
- [x] Add termsAcceptedAt column to users table in schema.ts
- [ ] Save termsAcceptedAt on registration (sendOtp/verifyOtp)
- [ ] Block login for users without termsAcceptedAt (phone login)
- [ ] Show "יש להירשם תחילה" message in LoginModal for blocked users

## Duplicate Phone/Email Check (Mar 13, 2026)
- [x] Check all phone variants (E.164, local) for duplicates in sendOtp on registration
- [x] Check email uniqueness in verifyOtp on registration
- [x] Show contact-admin message in LoginModal when duplicate found

## Test User Profile Reset on Re-login
- [x] Backend: resetTestUserProfile() function in db.ts — clears all profile/onboarding fields (userMode, categories, city, bio, photo, signupCompleted, etc.) while keeping name, phone, email, role
- [x] Backend: verifyOtp calls resetTestUserProfile() for test-role users before issuing session, returns testReset=true flag
- [x] Frontend: LoginModal detects testReset=true and clears relevant localStorage/sessionStorage keys (role, filters, location cache, banner dismissed, etc.)
- [x] Tests: twilio.otp.test.ts updated — mock includes resetTestUserProfile, mockUser includes termsAcceptedAt, new-user test passes termsAccepted=true

## Bug Fix — Mobile Navbar User Icon
- [x] Fix: clicking user icon in mobile navbar when not logged in navigates to /my-jobs instead of opening login modal

## Bug Fix — Logout Redirect
- [x] Fix: after logout, redirect to home page (/) instead of staying on protected page showing inline login prompt
- [x] Remove inline "כניסה נדרשת" screens from protected pages (MyJobs, MyApplications, WorkerProfile) — redirect to home on logout instead
- [x] DRY: centralized PROTECTED_PATHS in client/src/const.ts (single source of truth)

## UI Cleanup — Mobile Navbar
- [x] Remove duplicate "כניסה" text button from mobile navbar left side (user icon already handles login for guests)

## Bug Fix — FindJobs Blank Page for Guests
- [ ] Fix: /find-jobs shows blank page for unauthenticated users — should show job listings to everyone

## Bug Fix — Login Mode Phone Validation
- [x] Fix: when user tries to login (not register) with unregistered phone, block OTP send and show error "מספר זה אינו רשום במערכת"
- [x] Check: use termsAcceptedAt field to determine if user is registered

## Feature — Guest Reset Role in Mobile Drawer
- [x] Add "איפוס תפקיד" option in mobile drawer menu for unauthenticated users

## UX — Register Link in Login Error
- [x] Show "עבור להרשמה" link in LoginModal when login fails with NOT_FOUND (unregistered phone)

## UX — Mobile Drawer Login Button Redesign
- [x] Replace wide yellow "כניסה" button with user icon + "התחברות" label in mobile drawer

## Bug Fix — Mobile Drawer Login Button Appearance
- [x] Fix login button (user icon + התחברות) appearance in worker/guest mode — visually distinct with proper separator

## UX — Mobile Drawer Header Redesign
- [x] Remove "תפריט" title from drawer header
- [x] Move login block (large centered user icon + התחברות) to top of drawer for guests

## UX — Mobile Drawer Authenticated Header Redesign
- [x] Replace "מחובר כ:" pill with full user card: name + "אזור אישי" + colored avatar + role badge

## Session Mar 13 2026
- [x] Add real-time name validation (min 2 chars, Hebrew/Latin letters only) in registration form
- [x] Send welcome email after successful registration (fire-and-forget via Forge API)
- [x] Fix maintenance mode bypass — remove auto-bypass for Manus domains, keep only for authenticated admins
- [x] Fix maintenance bypass: clear stale bypass key on production domains, only allow bypass on manus.computer dev domain
- [x] Replace RoleSelectionScreen with new mobile-first design from provided HTML
- [ ] Revert RoleSelectionScreen to original (was wrongly changed)
- [ ] Replace LoginModal with new mobile-first design from provided HTML mockup
- [ ] Redesign LoginModal: full-screen mobile-first with hero image + welcome step before phone/OTP flow
- [x] Add swipe-down gesture to close LoginModal welcome sheet
- [x] Animate drag handle pill to hint swipe-down gesture
- [x] Replace registration step in LoginModal with new design from mockup
- [x] Remove 'כניסה נדרשת' screen in MyJobs — open LoginModal directly instead
- [x] Overhaul IsraeliPhoneInput: single field, country picker, input masking, paste cleanup, E.164

## UI Bug Fixes — March 2026
- [x] Fix duplicate "מספר טלפון" label in registration form (LoginModal had its own label + IsraeliPhoneInput rendered its own — removed the outer wrapper label)

## Shared Form Components — Design System
- [ ] Audit all form controls across the codebase (input, textarea, select, label patterns)
- [ ] Create AppInput shared component (label, icon, error, RTL, phone-input visual style)
- [ ] Create AppTextarea shared component (same design language)
- [ ] Create AppSelect shared component (same design language)
- [ ] Replace all raw inputs in LoginModal with AppInput
- [ ] Replace all raw inputs in PostJob with AppInput/AppTextarea/AppSelect
- [ ] Replace all raw inputs in WorkerProfile with AppInput
- [ ] Replace all raw inputs in PhoneChangeModal with AppInput
- [ ] Replace all raw inputs in Admin panel with AppInput/AppSelect
- [ ] Replace all raw inputs in remaining pages (FindJobs, JobDetails, etc.)
- [ ] Write Vitest tests for new shared components

## Shared Form Components — March 2026
- [x] Create AppInput, AppTextarea, AppSelect shared components in client/src/components/ui/AppFormField.tsx
- [x] Apply AppInput to LoginModal (name, email fields)
- [x] Apply AppInput/AppTextarea to PostJob (address, workingHours, jobDate, workStartTime, workEndTime)
- [x] Apply AppInput/AppTextarea to WorkerProfile (name, email, bio)
- [x] Apply AppInput/AppSelect to Admin (user search, add user, edit user modals)
- [x] Apply AppInput to AdminCategories (name, icon, slug, sortOrder, imageUrl)
- [x] Apply AppInput to AdminRegions (name, minWorkers, radius, description)
- [x] Apply AppInput/AppTextarea to AdminRegionsPage (all region form fields)
- [x] Apply AppTextarea to JobDetails (report dialog)
- [x] Apply AppTextarea to RateWorkerModal (comment field)
- [x] Apply AppTextarea to Admin (maintenance message)

## UI Compaction & AppSelect — March 2026
- [ ] Compact LoginModal registration bottom-sheet: reduce spacing/padding/icon size to fit one screen without scroll
- [ ] Add AppSelect wrapper to PostJob Select fields (salary type, category, duration)
- [ ] Add AppSelect wrapper to Admin Select fields (status, role)
- [ ] Add inline error props to LoginModal required fields (name, email)
- [ ] Build design-language skill file for AvodaNow visual system

## Validation & Layout — March 2026
- [x] Add inline real-time validation (error props) to name and email fields in LoginModal registration (touched=true on blur shows "שדה חובה")
- [x] Apply col-span-2 to wide fields in PostJob grid layout (startDateTime moved into 2-col grid with col-span-2)
- [x] Fix curly apostrophe (U+2019) in AdminRegions radius label causing Vite pre-transform error

## Design Skill Implementation — March 2026
- [x] AppButton focus ring changed from ring-blue-500 to ring-primary/60 (olive green)
- [x] AppSelect placeholder color uses TOKENS.placeholderColor when no value selected
- [x] IsraeliPhoneInput label replaced with AppLabel (single source of truth)
- [x] LoginModal: replaced all raw <label> in OTP, categories, regions sections with AppLabel
- [x] WorkerProfile: replaced all raw <label> (phone, description, schedule) with AppLabel
- [x] Admin: replaced raw <label> in maintenance message section with AppLabel
- [x] RateWorkerModal: replaced raw <label> with AppLabel

## PostJob Label Cleanup — March 2026
- [ ] Replace all shadcn Label usages in PostJob.tsx with AppLabel

## Login Screen Redesign — March 2026
- [ ] Redesign login phone step: full-page centered card layout (reference HTML), AvodaNow logo top, decorative blobs background, divider "או התחבר באמצעות", Google button styled per reference
- [ ] Keep all existing logic (OTP, register tab, validation, terms) intact

## OTP Channel Picker — March 2026
- [x] Add step="channel" to LoginModal: after registration, show channel selection (Email / SMS) before sending OTP
- [x] Wire channel choice into sendOtp mutation (email vs phone)
- [x] Match reference design: selection cards with radio, brand CTA, back link, security badge footer

## OTP Channel Display — March 2026
- [x] Show selected channel (email/SMS) and masked destination on OTP verification screen

## Bug Fix — March 2026
- [x] Fix: When email is already registered via Google, show a friendly message directing user to log in with Google instead of a generic error

## Auth UX Improvements — March 2026
- [x] Add inline Google login button inside email-conflict error message
- [x] Handle reverse case: phone-registered user tries Google login with same email — merge accounts via mergeAccountToGoogleOpenId in OAuth callback
- [x] Add "שנה שיטת קבלה" link on OTP screen returning to step=channel

## UX & Auth Polish — March 2026
- [x] Fix: all API errors in LoginModal must surface as UI messages (toast/inline), not only console
- [x] Add blob background animation to login screen (two blurred olive-green circles inside card)
- [x] Send welcome email after successful registration (verifyOtp isNewUser=true) — already implemented
- [x] Disable email channel card in channel picker when no email was entered in registration form

## Login UX Improvements — March 2026
- [x] Convert login phone step to bottom sheet (like registration bottom sheet)
- [x] Add blob-pulse @keyframes animation to login and channel screens
- [x] Add 60-second resend countdown to OTP screen
- [x] Add email validation in channel picker before sending OTP

## Bug Fix — Google User Gets False Email Conflict Error (March 2026)
- [x] Find which mutation fires "המייל כבר קשור לחשבון Google" for an already-logged-in Google user
- [x] Fix root cause: duplicateError now shown inline in channel step with Google login button

## UI Fix — Login Phone Step No-Scroll (March 2026)
- [x] Fix login bottom sheet overflow — all content must fit viewport without scrolling

## UX Improvements — Logged-in Guard + Email Pre-fill + OTP Toast (March 2026)
- [x] Show "already logged in" message when logged-in user opens registration modal
- [x] Pre-fill email field in register form from Google account (read-only)
- [x] Add OTP toast with phone number and 5-minute validity after sending code

## Skill Update — Primary CTA Button Design (March 2026)
- [x] Find "המשך כעובד" button exact CSS, add primary CTA variant to AppButton, document in avodanow-design skill

## Feature — cta-outline Button Variant (March 2026)
- [x] Add cta-outline variant to AppButton: white bg, dark olive text, dark olive border (inverse of cta)
- [x] Document cta-outline in avodanow-design skill

## Feature — cta-outline Hover Effect (March 2026)
- [x] Add hover: dark olive bg + white text transition to cta-outline variant

## UI — Welcome Step CTA Buttons (March 2026)
- [x] Apply cta variant to "הרשמה" and cta-outline to "התחברות" in LoginModal welcome step

## Feature — Ripple Click Effect on CTA Buttons (March 2026)
- [x] Add ripple effect to cta and cta-outline variants in AppButton (pure React/CSS, no new deps)

## UI Fix — CTA Button Hover & Border (March 2026)
- [x] Add scale(1.02) hover effect to cta primary button (currently missing)
- [x] Thin cta-outline border from 2px to 1.5px
- [x] Update avodanow-design skill with corrected specs

## Design System — Page Background Single Source of Truth (March 2026)
- [x] Extract page background gradient into --page-bg-gradient CSS variable in :root
- [x] Apply variable to body and all page containers
- [x] Update avodanow-design skill with background token documentation

## UI — Frosted Glass Effect on Cards & Modals (March 2026)
- [x] Add .glass-card CSS utility class to index.css (backdrop-blur + semi-transparent white bg)
- [x] Apply to shadcn Card component (card.tsx) as default
- [x] Apply to LoginModal bottom sheet panels
- [x] Apply to key page cards (JobCard, HomeWorker sections, HomeEmployer sections via Card component)
- [x] Update avodanow-design skill with glass-card documentation

## UI — Design Language Update (March 2026)
- [x] Apply updated design language (glass, cta buttons, typography) to all login/register screens
- [x] Glass Navbar: add backdrop-blur on scroll using useScrolled hook
- [x] Glass JobCard: add hover:backdrop-blur + hover:bg-white/85 transition to job cards
- [x] Dark mode glass: add .dark .glass-card and .dark .glass-modal to index.css
- [x] Update avodanow-design skill with Navbar glass and dark mode glass specs

## UI — Navbar & Button Polish (March 2026)
- [ ] Add transition-colors duration-200 to cta-outline CVA for smooth hover color change
- [ ] Change Navbar glass scroll threshold from > 10 to > 60
- [ ] Add dark/light mode toggle button (moon/sun) to Navbar

## Design System — Login Modal Background Fix
- [x] Apply page background gradient to the welcome step content area (below hero image) in LoginModal

## Design System — Login Modal All Steps Background Fix
- [x] Apply var(--page-bg-gradient) to all LoginModal bottom-sheet steps (register, login phone, OTP, channel, role, setup)

## Design System — Divider Consistency
- [x] Align register form divider to match login form divider style (var(--page-bg) span background, same markup)

## Design System — Shared GoogleAuthButton Component
- [x] Create shared GoogleAuthButton component in client/src/components/ui/
- [x] Replace login Google button in LoginModal with shared component
- [x] Replace register Google button in LoginModal with shared component

## Design System — UI Index Export & Navbar Scroll Threshold
- [x] Export GoogleAuthButton from client/src/components/ui/index.ts
- [x] Update LoginModal import to use @/components/ui instead of direct path
- [x] Raise Navbar scroll threshold from > 10 to > 60 (was already at 60)

## Design System — Barrel Import Migration
- [x] Add AppButton export to ui/index.ts barrel
- [x] Migrate all direct AppLabel/AppInput/AppTextarea/AppSelect/AppButton/GoogleAuthButton imports to @/components/ui

## Bug Fix — OTP Error for Google-authenticated User
- [x] Fix "מספר זה אינו רשום במערכת" error triggered for Google-logged-in user with no phone number

## Auth — Google Login Only (No Google Registration)
- [x] Remove Google registration button from register step in LoginModal (Google = login only)

## Design — Login Phone Step Redesign
- [x] Convert login phone step from scrollable centered modal to compact non-scrollable bottom sheet with page gradient background

## Design — Welcome Step Hero Image Removal
- [x] Remove hero image from welcome step in LoginModal

## Design — Welcome Step Background Fix
- [x] Apply var(--page-bg-gradient) directly to the welcome step sheet (remove glass-modal white background)

## Design — Register Sheet Redesign
- [x] Redesign register sheet to match login phone step: unified gradient background, no separate top section, same header pattern (back arrow + centered title + X close), drag handle, no icon block

## Design — Shared AppLogo Component
- [x] Create shared AppLogo component matching Navbar logo (AvodaNow + briefcase icon + tagline)
- [x] Replace "AvodaNow" text in LoginModal headers with AppLogo component
- [x] Export AppLogo from ui/index.ts barrel

## Refactor — Navbar Logo → AppLogo Component
- [ ] Replace inline logo markup in Navbar (desktop + mobile) with shared AppLogo component

## Revert — LoginModal AppLogo → Original Text
- [x] Revert AppLogo in LoginModal welcome step header back to original "AvodaNow" h2 text

## Design — AppLogo Light Variant
- [x] Add 'variant' prop (dark|light) to AppLogo component — dark for dark nav bg, light for cream/white backgrounds
- [x] Update avodanow-design SKILL.md to document both logo variants with usage rules

## AppLogo Integration
- [x] Apply AppLogo variant="light" size="sm" to LoginModal welcome step header (replace text "AvodaNow")
- [x] Add AppLogo variant="light" to 404 page
- [x] Write Vitest spec for AppLogo variant color tokens

## Design — BrandName Styled Component
- [x] Add .brand-name CSS utility class to index.css (Avoda dark olive + Now citrus gold)
- [x] Create BrandName shared component and export from ui/index.ts
- [x] Replace all plain "AvodaNow" text instances across the app with BrandName component

## Design Updates — cta-outline Variant
- [x] Update cta-outline AppButton variant to match "נקה סינון" style: cream bg, subtle border, dark text, no heavy shadow
- [x] Update avodanow-design SKILL.md to document the new cta-outline style

## Security Hardening (Audit Results)
- [x] Fix missing max-length Zod constraints on description, address, city, businessName, workingHours
- [x] Fix SQL injection edge case in db.ts line 751 (use parameterized inArray)
- [x] Add server-side XSS sanitization utility (server/sanitize.ts - strip HTML tags from free-text fields)
- [x] Apply XSS sanitization in createJob, updateJob, updateWorkerProfile, createApplication, reportJob
- [x] Enable Content-Security-Policy headers in production (helmet CSP via NODE_ENV check)
- [x] Add explicit CORS middleware with allowed origins whitelist (cors package)
- [x] Implement structured logger (pino) in server/logger.ts with child loggers
- [x] Add security event logging (OTP rate limit, OTP failures, login success, admin block/unblock/role changes)
- [x] Set up automated daily database backup mechanism (server/backup.ts, runs at 02:00 UTC)
- [x] Write Vitest tests for new security protections (XSS, CORS patterns, Zod max-length, bot detection)

## Bug Fix — Login "מספר אינו רשום" for Existing Users
- [x] Investigate phone normalization mismatch: DB stores 0559258668 but login lookup fails
- [x] Fix login flow to allow admin users without termsAcceptedAt to log in (created directly in DB)
- [x] Delete duplicate old-format record (id=28, phone=0559258668) with no linked data
- [x] Set termsAcceptedAt for admin user id=30004 (+972559258668)

## Phone Normalization & Duplicate Prevention
- [x] Write one-time migration script (scripts/normalize-phones.mjs) to convert all 05x phone numbers to +972x format in DB
- [x] Run migration — all 3 users already in E.164, 0 collisions
- [x] Add getUserByNormalizedPhone helper in db.ts (checks exact + normalized format)
- [x] Apply duplicate check in createUserByPhone before INSERT (with normalizePhone optional param)
- [x] Apply duplicate check in updateUserPhone before UPDATE (with normalizePhone optional param)
- [x] adminCreateUser already had duplicate check (adminDb.ts) — verified
- [x] Write Vitest tests for phone normalization and duplicate prevention (phone-normalization.test.ts, 20 tests)

## Legal Documents Integration
- [x] Audit existing legal integrations in the codebase
- [x] Create 4 missing legal pages: /job-posting-policy, /safety-policy, /user-content-policy, /reviews-policy
- [x] Add all 6 legal links to Footer
- [x] Add 4 new legal routes to App.tsx
- [x] Create userConsents table in drizzle/schema.ts and run db:push
- [x] Add recordUserConsent and getUserConsents helpers to server/db.ts
- [x] Add user.recordConsent and user.getMyConsents tRPC procedures (in userRouter)
- [x] Update signup: add age 18+ checkbox alongside terms+privacy checkbox
- [x] Record terms, privacy, age_18 consents on successful registration (isNewUser flag)
- [x] Add legal notice to PostJob.tsx before submit button (Job Posting Policy + Terms links)
- [x] Add legal notice to JobBottomSheet.tsx before apply button (Privacy + Safety Policy links)
- [x] Add legal notice to RateWorkerModal.tsx before submit button (Reviews Policy + User Content links)
- [x] Add legal notice to WorkerProfile.tsx before save button (Terms + User Content links)
- [x] Write 14 Vitest tests for legal integration (server/legal-integration.test.ts)

## Legal Hub Page & Terms Update Banner
- [x] Create /legal hub page with table of contents and anchor links to all 6 documents
- [x] Add /legal route to App.tsx and footer link ("כל המסמכים המשפטיים")
- [x] Add LEGAL_DOCUMENT_VERSIONS, LEGAL_DOCUMENT_LABELS, LEGAL_DOCUMENT_PATHS to shared/const.ts (single source of truth)
- [x] Verified documentVersion column exists in userConsents table (default "2026-03")
- [x] Add user.checkOutdatedConsents tRPC procedure (returns outdated core docs for re-consent)
- [x] Build TermsUpdateBanner component (olive banner with Hebrew text, re-consent CTA, dismiss button)
- [x] Wire TermsUpdateBanner into App.tsx layout below Navbar (only for authenticated users)
- [x] Write 14 Vitest tests for version format, labels, paths, and outdated detection logic (server/legal-hub.test.ts)

## Re-Consent Modal (Replace Banner)
- [ ] Remove TermsUpdateBanner from App.tsx layout
- [ ] Build ReConsentModal — blocking modal with checkboxes for outdated consents
- [ ] Wire ReConsentModal into App.tsx (shown after login when checkOutdatedConsents returns non-empty)
- [ ] Write Vitest tests for re-consent modal logic

## Legal Documents — Content Replacement & Missing Steps
- [x] Replace Terms.tsx content with terms_of_use.md from skill (39 sections, info@avodanow.co.il, מרץ 2026)
- [x] Replace Privacy.tsx content with privacy_policy.md from skill (13 sections)
- [x] Replace JobPostingPolicy.tsx content with job_posting_policy.md from skill
- [x] Replace SafetyPolicy.tsx content with safety_policy.md from skill
- [x] Replace UserContentPolicy.tsx content with user_content_policy.md from skill
- [x] Replace ReviewsPolicy.tsx content with reviews_policy.md from skill
- [x] Step 5: Add 3 checkboxes to PostJob screen (law compliance, license verification, job posting policy agreement)
- [x] Step 7: Add messaging notice to ApplicationView.tsx (contact reveal legal notice + safety policy link)
- [x] Step 9: Add account deletion section to WorkerProfile.tsx settings tab (legal notice + mailto link)
- [x] Step 10: Capture ip_address and user_agent in UserConsents table and consent storage (getClientIp + user-agent header)

## Re-Consent Modal — Blocking Version
- [x] Remove TermsUpdateBanner component from App.tsx layout (never wired; ReConsentModal replaces it)
- [x] Build ReConsentModal component: blocking overlay, checkboxes per outdated doc, accept CTA, error handling
- [x] Wire ReConsentModal into App.tsx (shown after login when checkOutdatedConsents returns non-empty)
- [x] On accept: call recordConsent for each outdated doc, close modal
- [x] Prevent app navigation while modal is open (Escape key suppressed, body scroll locked, no dismiss on overlay click)
- [x] Write Vitest tests for re-consent modal logic (server/re-consent.test.ts — 16 tests)

## PostgreSQL Migration
- [x] Install pg and @types/pg packages
- [x] Request POSTGRES_URL secret from user (Neon PostgreSQL 17.8)
- [x] Convert drizzle/schema.ts from mysql-core to pg-core (20 tables)
- [x] Update server/db.ts to use drizzle-orm/node-postgres with Pool
- [x] Update drizzle.config.ts dialect from mysql to postgresql
- [x] Run drizzle-kit generate + migrate to create all tables in PostgreSQL (19 tables)
- [x] Write and run data migration script (MySQL → PostgreSQL, preserving IDs, all rows migrated)
- [x] Add 19 performance indexes: jobs(category/city/status/expiry), users(phone/rating/role), applications(jobId/workerId/status)
- [x] Enable PostGIS extension for future geolocation queries
- [x] Move mysql2 to devDependencies (kept for migration scripts only), all production code uses pg
- [x] Run full test suite: 453 tests passing, 0 TypeScript errors

## PostGIS Radius Search
- [x] Add `location` geometry(Point, 4326) column to jobs and worker_availability tables (customType in schema.ts)
- [x] Populate `location` from existing latitude/longitude columns (one-time SQL UPDATE on 8/8 jobs)
- [x] Add GIST spatial index: idx_jobs_location + idx_worker_availability_location
- [x] Update db.ts getJobsNearLocation to use ST_DWithin + ST_Distance (PostGIS geography)
- [x] Update db.ts getNearbyWorkers to use ST_DWithin + ST_Distance (PostGIS geography)
- [x] Update db.ts getApplicationsForJobWithDistance to use ST_Distance (PostGIS geography)
- [x] Replace DAYOFWEEK (MySQL) with EXTRACT(DOW) (PostgreSQL) in both job search functions
- [x] Add radiusKm min(1)/max(200) validation to routers.ts jobs.search procedure
- [x] Frontend FindJobs already sends GPS coords + radius to backend (no changes needed)
- [x] Haversine fallback retained for rows where location IS NULL (backward-compat)
- [x] Write 18 Vitest tests for PostGIS radius search (server/postgis-radius.test.ts) — 471 total passing

## Google Sign-in on Verification Screen
- [x] Remove "קבלת סיסמא במייל" option from OTP channel selection screen
- [x] Add "המשך הרשמה עם Google" button with divider to OTP channel selection screen
- [x] Google button saves {name, phone, termsAccepted, age18Accepted} to sessionStorage (PENDING_GOOGLE_REG_KEY) before redirect
- [x] Add PENDING_GOOGLE_REG_KEY constant to shared/const.ts (Single Source of Truth)
- [x] Add completeGoogleRegistration db function (idempotent: only updates if termsAcceptedAt IS NULL)
- [x] Add user.completeGoogleRegistration tRPC procedure with phone validation and consent recording
- [x] Add PostGoogleRegistration invisible component to App.tsx (fires once after OAuth callback)
- [x] Add termsAcceptedAt to AuthUser interface in AuthContext
- [x] 471 tests passing, 0 TypeScript errors

## Google Button Validation Gate
- [x] Disable "המשך עם Google" button until all registration fields are valid (name, phone, email, both checkboxes) — same gate as SMS button
- [x] Show inline hint text "יש למלא את כל פרטי ההרשמה לפני המשך עם Google" when button is disabled
- [x] Pass email to completeGoogleRegistration payload (sessionStorage + server procedure + db function)
- [x] 471 tests passing, 0 TypeScript errors

## Email Duplication Check Before Google Redirect
- [x] Add `user.checkEmailAvailable` public tRPC procedure (returns {available: boolean, loginMethod?: string})
- [x] Add `getUserByEmail` db helper (reuse if exists, else create)
- [x] Call checkEmailAvailable in handleGoogleContinue before redirect — show error toast if taken
- [x] Write 32 Vitest tests (server/check-email.test.ts) — 503 total passing, 0 TypeScript errors

## הסרת Google Login ממסך התחברות
- [x] שוחזר כפתור "כניסה עם Google" במסך Login (step=phone, activeTab=login) — הוסר בטעות
- [x] Google OAuth זמין גם ב-Login (לחשבונות קיימים) וגם בהרשמה (channel step)

## נעילת גישת מעסיקים (Employer Lock)
- [x] שימוש בטבלת system_settings הקיימת עם מפתח employerLock (DRY)
- [x] הוסף admin.getEmployerLock / admin.setEmployerLock procedures
- [x] הוסף platform.settings publicProcedure (bypass לאדמין/טסט)
- [x] חסום PostJob, MyJobs, RoleSelectionScreen, Navbar, MobileDrawer כשהנעילה פעילה
- [x] הוסף טאב "נעילת מעסיקים" בפאנל הניהול עם toggle ואינדיקטור סטטוס
- [x] 19 Vitest tests (server/employer-lock.test.ts) — 522 total passing

## חסימת אפשרות מעסיק בהרשמה ראשונית
- [x] חסום אפשרות "מעסיק" ב-role step של LoginModal כשהנעילה פעילה (greyed out + "בקרוב" badge)

## באג — פאנל ניהול נחסם לפני בחירת תפקיד
- [x] עקוף את gate בחירת התפקיד עבור מנהלים שמנווטים ל-/admin (isAdminRoute bypass)

## דיווח על בעיה עם צילום מסך
- [x] התקן html2canvas ו-nodemailer
- [x] הוסף SMTP secrets (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS)
- [x] Backend: tRPC procedure support.reportProblem עם rate-limit (5/שעה)
- [x] Backend: שליחת מייל עם nodemailer + צילום מסך מצורף
- [x] Frontend: ReportProblemModal עם html2canvas, preview, form fields
- [x] Frontend: כפתור "דווח על בעיה" ב-Navbar ו-MobileDrawer
- [x] Vitest tests לפרוצדורה

## באג — נתוני הרשמה לא נשמרים לאחר redirect של Google
- [x] בדוק מה נשמר ב-sessionStorage לפני ה-redirect ומה נקרא אחריו
- [x] תקן שמירת phone/name/email/consents לפני ה-redirect
- [x] תקן קריאה ושחזור הנתונים ב-PostGoogleRegistration

## מסך השלמת פרופיל למשתמשי Google ללא טלפון
- [x] בנה CompleteProfileModal עם שדה טלפון, ולידציה, ו-submit
- [x] הצג אוטומטית כשמשתמש Google מחובר ואין לו טלפון
- [x] Backend: הרחב completeGoogleRegistration לתמוך ב-skip (ללא טלפון)
- [x] Vitest tests

## מילוי אוטומטי של מייל וטלפון מגוגל בהרשמה
- [x] הוסף email ו-phone לפייליוד PENDING_GOOGLE_REG_KEY לפני redirect
- [x] ב-PostGoogleRegistration: שמור email ו-phone מ-Google כ-fallback אם שדות ריקים
- [x] ב-completeGoogleRegistration: קבל גם phone מ-Google (אם קיים)

## הסרת הרשמה עם Google
- [x] הסר כפתור Google מ-channel step (הרשמה)
- [x] נקה קוד PENDING_GOOGLE_REG_KEY ו-PostGoogleRegistration שאינם נחוצים יותר
- [x] הסר checkEmailAvailable call מ-handleGoogleContinue (לא רלוונטי להתחברות)

## באג — כיוון מספר טלפון ב-channel step
- [x] תקן כיוון מספר טלפון ל-LTR בתצוגת SMS ב-channel step

## באג קריטי — הרשמה לפני אימות OTP
- [x] חסום יצירת חשבון עד לאחר אימות OTP מוצלח
- [x] ודא שטלפון ופרטי הרשמה נשמרים רק לאחר verifyOtp מוצלח

## הסרת Google מהתחברות
- [x] הסר כפתור Google ומפריד ממסך ההתחברות (Login phone step)

## קבלת קוד OTP בשיחת טלפון (Twilio Voice)
- [ ] הוסף channel "call" ל-sendOtp procedure (Twilio voice)
- [ ] הוסף כפתור "קבל קוד בשיחה" ב-OTP step (התחברות)
- [ ] הוסף אפשרות "שיחת טלפון" ב-channel step (הרשמה)
- [ ] הוסף כפתור "שלח שוב בשיחה" ב-resend area

## באג — CompleteProfileModal שולח OTP עם isRegistration=true
- [ ] תקן CompleteProfileModal לשלוח OTP ללא isRegistration (זרימת עדכון טלפון, לא הרשמה)
- [ ] ודא שטלפון שכבר קיים אצל משתמש אחר עדיין נחסם (duplicate check)

## באג — "קבל שיחה במקום" מוצג בהרשמה
- [x] הסתר "קבל שיחה במקום" ממסך OTP של הרשמה — יופיע רק במסך OTP של התחברות

## UX — בחירת ערוץ OTP במסך התחברות
- [x] הוסף שני כפתורים במסך ה-phone step של login: "קבל קוד ב-SMS" ו"קבל קוד בשיחת טלפון"
- [x] הסר toggle "קבל שיחה במקום" / "קבל SMS במקום" ממסך ה-OTP

## באג — כפתור שיחה שולח SMS
- [x] תקן handleSend לקבל channel כפרמטר כדי למנוע stale state
- [x] פטור מנהלים מ-rate limit ב-sendOtp (DB + Express middleware)
- [x] תקן שגיאת Twilio 60331 — הסר Locale=he משיחת קול (לא נתמך ב-TTS)
- [ ] הוסף שיחת קול בעברית עם Twilio Programmable Voice + Google TTS (he-IL-Wavenet-A)
- [x] תקן יישור RTL בתצוגה מקדימה של פרופיל עובד
- [x] תקן RTL מלא ב-WorkerProfilePreviewModal: תמונה ימין, תגיות/מעגלים מימין, השלמת פרופיל RTL
- [x] תקן השלמת פרופיל: טקסט צמוד לאייקון מימין, סרגל לא מכסה תוכן
- [x] עמוד עריכת פרופיל: כפתור "שמור" אחד + קישור "יציאה ללא שמירה" עם אייקון חץ
- [x] WorkerProfilePreviewModal: גריד השלמת פרופיל — אייקון ימין, טקסט שמאלו; padding תחתון מעל navbar
- [x] תקן navigate(-1) ב-WorkerProfile — משתמש הגיע ל-/-1 במקום לדף הקודם
- [x] הוסף toast "נשמר בהצלחה" לאחר שמירת פרופיל מוצלחת
- [x] הוסף אינדיקטור ויזואלי "שינויים לא נשמרו" ליד כפתור שמור ב-WorkerProfile
- [x] הוסף הערת לשון זכר בתחתית עמוד הבית
- [x] צור רכיב AppFooter גלובלי עם הערת לשון זכר + קישורים לתנאי שימוש ומדיניות פרטיות
- [x] שנה טקסט badge בעמוד הבית מג"פלטפורמת הגיוס המהירה בישראל"ל"הפלטפורמה לעבודות זמניות בישראל"
- [x] עדכן meta description ו-og:description בכל הקבצים לשקף "הפלטפורמה לעבודות זמניות בישראל"
- [x] Update worker role card: title → 'מחפש עבודה?', description → two-line copy, bullets → three updated items
- [ ] Replace worker card image: practical male worker (warehouse/delivery/kitchen/event)
- [x] Replace employer card image: male business owner/manager in real workplace
- [x] Replace homepage hero image with diverse temporary jobs image

## FindJobs Filter Redesign (2026-03-17)
- [x] Redesign sticky toolbar: Row 1 = quick pills (קרוב אלי, דחוף, היום, מחר, השבוע) + Row 2 = dropdown chips (קטגוריה, מיקום, שעות, ימים) + sort pills + סנן button
- [x] Dropdown chips open the filter panel to the matching section when clicked
- [x] Active state on chips shows count badge (e.g. "קטגוריה (2)")
- [x] Clear-all X button appears in quick pills row when any quick filter is active

## FindJobs Toolbar Pixel-Perfect Fix (2026-03-17)
- [x] Row 1: קרוב אלי (solid green, first), דחוף (bolt icon), היום, מחר — white pills with border, no sort pills
- [x] Row 2: dropdown chips (קטגוריה, מיקום, שעות, ימים) with chevron, gray bg
- [x] Row 3: "X משרות נמצאו" right + "סנן לפי" left — as a separate bar below toolbar
- [x] Remove sort pills from toolbar (move sort to סנן לפי dropdown in results bar)

## FindJobs Toolbar — Remove Chips Row (2026-03-17)
- [x] Remove 4 dropdown chips (קטגוריה, מיקום, שעות, ימים) from Row 2
- [x] Replace with single icon-only filter button (SlidersHorizontal) that opens filter panel

## FindJobs Filter Bottom Sheet Modal (2026-03-17)
- [x] Convert filter panel from top-slide-down to bottom sheet modal (slide up from bottom)
- [x] 4 collapsible rows: תחומי עיסוק, מיקום, שעות עבודה, ימי עבודה
- [x] Bottom action bar: הצג תוצאות (dark green) + נקה סינון (light green)
- [x] שמור כהעדפות link row at very bottom
- [x] Backdrop overlay (semi-transparent) closes modal on click
- [x] Drag handle pill at top of sheet

## FindJobs Date Filter Button (2026-03-17)
- [ ] Replace היום/מחר/השבוע pills with single date button
- [ ] Calendar picker opens on click (single date or range)
- [ ] Active date shown on button label
- [ ] Clear date button (X) when date is selected
- [ ] Wire date filter to job query

## Date Filter Button (Completed 2026-03-17)
- [x] Replace היום/מחר/השבוע quick pills with single תאריך button
- [x] Popover calendar with preset pills (היום, מחר, השבוע) + date range picker
- [x] Extend dateFilter type to support ISO date strings and ranges (YYYY-MM-DD:YYYY-MM-DD)
- [x] Update backend db.ts and routers.ts to handle specific date / range filters
- [x] Add date section (collapsible) to filter bottom sheet

## FindJobs Toolbar Pill Style Update (2026-03-17)
- [x] Match pill style to HomeWorker "חדש בסביבה" chips: active=dark green bg+white text, inactive=white+gray border, rounded-full, text-xs font-bold, px-3 py-1

## Filter Bottom Sheet Swipe-to-Close (2026-03-17)
- [x] Add swipe-to-close gesture to filter bottom sheet (drag down > 80px closes it)

## Calendar Redesign — AvodaNow Design Scale (2026-03-17)
- [x] Redesign date filter calendar popover: mobile-friendly, glass-modal style, brand colors, AppButton variants, RTL

## Calendar Swipe-to-Close on Mobile (2026-03-17)
- [x] Convert date calendar to bottom sheet on mobile with swipe-to-close gesture

## JobCard Date/Day Badge (2026-03-17)
- [x] Add prominent date/work-day badge to JobCard in AvodaNow design scale style

## Skeleton Loading State (FindJobs)
- [x] Update JobCardSkeleton to match current card variant layout (header, meta chips, date badge, action row)
- [x] Verify JobCardSkeletonList is used in FindJobs showSkeleton branch
- [x] Ensure shimmer animation uses AvodaNow design tokens

## Scroll-Based Toolbar Backdrop (FindJobs)
- [x] Add useEffect scroll listener to track scrollY > threshold
- [x] Apply backdrop-blur + semi-transparent white bg + box-shadow to sticky toolbar when scrolled
- [x] Smooth CSS transition between transparent and frosted-glass states

## Toolbar Layout — Search + Filter in One Row
- [x] Shorten search input (flex-1 instead of full width)
- [x] Move SlidersHorizontal filter button into the search row (right side)
- [x] Remove the standalone Row 2 filter button section
- [x] Filter button border matches search box exactly (same C_BORDER, same shadow)
- [x] Chip pills row aligned to same left edge as search row (both inside sticky toolbar wrapper)
- [x] Placeholder shortened to avoid truncation on small screens

## Merge Radius + Empty-State Messages
- [x] Merge the two separate cards (radius selector + no-results) into a single combined card
- [x] Update C_BORDER to #d4c799 (user-adjusted warm honey border)

## Urgent Mode Geo Card
- [x] When showUrgentToday is active, replace green geo card with single amber card (no two-section split)

## Separate Geo Card and No-Results Card
- [x] Split merged two-section card into two fully independent cards (green geo card + separate amber no-results card)

## Single Geo Card Display
- [x] Show only one card at a time: amber no-results card when no results, green geo card otherwise (mutual exclusion)

## Calendar Today Indicator
- [x] Mark today's date in the calendar bottom sheet with a dashed circle (iOS Calendar style)

## SQL Query Fixes
- [x] Fix today-filter query error (startDateTime range + category filter)
- [x] Fix category-only query error (category IN filter)
- [x] Fix geo-distance query error (ST_Distance / ST_DWithin)
- [x] Convert jobs.category from job_category enum to varchar(64) to support dynamic categories table

## Empty-State Carousel
- [ ] Build EmptyStateCarousel component: auto-rotates every 3s, uniform card/button size, image per slide
- [ ] Slides: no-urgent-jobs, try-another-date, expand-category, enable-notifications, expand-radius
- [ ] Replace all separate info cards in FindJobs with the single carousel

## Empty-State Carousel (Completed)
- [x] Build EmptyStateCarousel component with auto-rotate every 3s, emoji illustrations, uniform card layout
- [x] Replace SmartEmptyState multi-card layout with single EmptyStateCarousel
- [x] Dot indicators for manual navigation
- [x] Slides: no-urgent, try-tomorrow, try-this-week, try-category, try-city, notifications
- [x] Uniform card size and button layout across all slides

## Geo-Radius Slide in Carousel
- [x] Add "לא נמצאו עבודות בטווח X ק"מ" as a slide in EmptyStateCarousel (with expand radius buttons 20/50 ק"מ)
- [x] Remove the standalone geo no-results card from FindJobs

## Carousel Swipe Gesture
- [x] Add drag/swipe gesture to EmptyStateCarousel using framer-motion (left/right swipe changes slide)
- [x] Pause auto-rotate on drag, resume after release

## Chip Row Fade-Out Edge Effect
- [x] Wrap chip scroll row in a relative container with CSS mask-image fade on the left edge
- [x] Dynamically show/hide fade based on whether there is overflow content to the left (scroll position)
- [x] Ensure RTL-correct fade direction (fade on the left = end of scroll direction in RTL)

## Clear All Filters Chip Button Redesign
- [x] Replace small X-only clear button with a full chip styled like other filter chips
- [x] Show "נקה סינונים" label + X icon, styled as inactive chip (white bg, C_BORDER border)
- [x] Move to end of chip row (after all other chips)
- [x] Show when activeFilterCount > 0 (any filter active, not just urgent)
- [x] Clicking it resets all filters (categories, cities, urgent, date, time slots, days, location)

## Move Clear Filters Button
- [x] Remove "נקה סינונים" chip from the top chip row (FindJobs toolbar)
- [x] Add "נקה סינונים" button at the bottom of the active filters section in SmartEmptyState

## FindJobs Top Section Simplification
- [x] Shrink hero from 180px to 110px
- [x] Slim profile banner to compact single-line strip (icon + short text + arrow)
- [x] Remove geo card block with radius buttons
- [x] Add inline radius selector inside the "קרוב אלי" chip (expand on tap)

## Radius Picker Outside-Click Close
- [x] Add radiusPickerRef and mousedown/touchstart listener to close showRadiusPicker when clicking outside

## Job Card Redesign (MyApplications-inspired)
- [x] Move urgent/today/status badge to top-left corner of card (absolute positioned pill)
- [x] Increase card padding from p-4 to p-5 for more breathing room
- [x] Add employer name row with briefcase icon below title (like MyApplications)
- [x] Increase gap between cards in FindJobs list

## Search Field Design Token Alignment
- [x] Apply AvodaNow TOKENS to search input: white bg, 10px radius, brand border on focus, ring shadow, correct placeholder color

## Filter Button Design Alignment
- [x] Match filter button to search input: borderRadius 10px, same height (37px), white bg, consistent border color

## FindJobs Hero Alignment with MyApplications
- [x] Match hero background: dark olive gradient + image at opacity 0.75
- [ ] Match overlay: left-directional gradient (RTL-aware) instead of bottom-fade
- [ ] Match title alignment: right-aligned, text-xl, same shadow
- [ ] Match hero height: padding-based (pt-5 pb-5) instead of fixed 110px
- [ ] Add back button pill (white translucent) like MyApplications

## Hero Section & Profile Completion Redesign
- [x] Hero image height 320px, objectPosition center 10% for mobile waiter image
- [x] Top gradient overlay (rgba 0.52 → transparent at 55%) for title contrast
- [x] Bottom gradient overlay (rgba 0.55 → 0.20 → transparent at 45%) for search bar contrast
- [x] Title changed to "מצא עבודה זמנית באזורך" (centered, white)
- [x] Profile completion icon (UserCircle + red dot) with pulsing glow animation
- [x] Frosted-glass profile completion card (percentage, progress bar, missing chips, CTA)
- [x] Card auto-closes on scroll >30px
- [x] Profile data invalidates when returning from /worker-profile
- [x] Success toast "פרופיל הושלם!" when score reaches 100%
- [x] Search bar moved into hero with transparent frosted-glass background
- [x] Filter buttons transparent background
- [x] Missing item chips: #986600 background, #f4efe4 text, staggered entrance animation
- [x] CTA button background #7a5200, label "השלם"
- [x] Profile icon fixed positioning (top: 76px, left: 16px)
- [x] Unified profile completion score: extracted shared/profileScore.ts (7 fields)
- [x] FindJobs uses calcProfileScore from shared/profileScore.ts
- [x] WorkerProfile uses calcProfileScore from shared/profileScore.ts (replaced inline IIFE)
- [x] Profile card: move CTA button to its own row below chips row, label → "השלם לחשיפה מוגדלת"
- [x] Filter button: keep constant style when active filters exist — only show red badge, no background/border change
- [x] Search input: add 200ms debounce via split state (searchText raw + debouncedSearchText for filtering)
- [x] Add sort chips row below filter chips: מיון label + תאריך עבודה / שכר / עיר buttons
- [x] Sort chips: add asc/desc toggle — click1=select↓, click2=reverse↑, click3=deselect
- [x] EmptyStateCarousel: add "נקה סינון" button to general empty state slide when hasAnyFilter is true
- [x] Vitest unit tests for calcProfileScore and calcProfileMissingItems (empty, full, partial, edge cases)
- [x] Fix tRPC "Unable to transform response from server" error on /find-jobs page
- [x] Fix blank /find-jobs page — was transient 502 on sandbox wake-up; resolved by auto-retry logic
- [x] Add smart auto-retry to tRPC client: retry on 502/503 (server down) but not on 4xx (client errors)
- [x] Fix recurring blank /find-jobs page — root cause: system_settings table missing (blocked migration 0001/0002); fixed by marking migrations as applied + db:push; added loading guard in Router for maintenanceQuery
- [x] Add startup DB health-check: verify all required tables exist, report missing ones, fail fast before accepting traffic
- [x] Fix: no jobs shown on /find-jobs page — jobs were outside user's radius; added 100km fallback with banner
- [x] Fix: UPDATE jobs set closedReason/status fails — Drizzle ORM 0.44.x enum cast bug; fixed with sql`'expired'::job_status` explicit casts
- [x] Fallback search: when no jobs in user's radius, expand to 100km and show nearest jobs with "אין משרות בקרבתך" banner
- [x] Fix: no jobs shown when navigating to /find-jobs via menu — added useEffect to load workerLatitude/Longitude from profile when no location cache exists
- [x] Fix: "נקה סינון" does not clear URL query params (e.g. ?filter=today stays in URL after clearing)
- [x] Fix: "נקה סינון" does not clear the "קרוב אלי" radius/location filter chip
- [x] Bug: after applying filters, results are empty until sort chip (שכר/תאריך) is clicked — fixed: replaced eager setAccumulatedJobs([]) with pendingResetRef to avoid stale-data race condition
- [x] Bug: profile completion sparkling icon missing from FindJobs search screen — fixed: isProfileComplete was using a simplified 2-field check; now uses calcProfileScore < 100%
- [x] Bug: when no results with active filters, notifications card shown instead of EmptyStateCarousel with "נקה סינון" button — fixed: notifications slide now only appears when hasAnyFilter is false; added hasGeoFilter prop so userLat (קרוב אלי) is included in hasAnyFilter
- [x] Bug: FindJobs screen is blank when navigating from worker home via bottom nav bar — fixed: added mount-time effect to seed accumulatedJobs from tRPC cache when activeQueryData is already available on first render
- [x] Bug: search bar and filter button appear above the filter panel bottom sheet — fixed: raised filter panel backdrop/sheet z-index from 60/61 to 200/201 to overcome framer-motion stacking contexts; same fix applied to calendar sheet
- [x] Bug: date filter (תאריך) does not filter job results — fixed: toISOString() was returning UTC date (one day behind for Israel UTC+3); replaced with local date formatting using getFullYear/getMonth/getDate in both calendar panels
- [x] Feature: replace shared job card component with new design from כרטיסעבודהרגיל.zip (worker home + FindJobs) — new design: large bold title, inline badges, 2x2 details grid, rounded bookmark/share icons, full-width "הגישו אותי" button
- [ ] Update skeleton loading cards to match new JobCard 2x2 grid layout (FindJobs + HomeWorker)
- [x] UI: move "היום"/"דחוף" status badges to appear below the bookmark/share buttons row in JobCard
- [x] Bug: status badges (היום/דחוף) not visible on job card — confirmed not a bug: badges only show when conditions are met (isJobDateToday, isUrgent, isNew, etc.)
- [x] Fix: hide businessName in JobCard when it is an empty string
- [x] UI: add Hebrew category badge below job title/business name in JobCard default variant
- [x] UI: add skeleton pill row (20px height, 80px width) for category badge in JobCardSkeleton
- [x] UI: per-category color map for category badge in JobCard (getCategoryColor helper in shared/categories)
- [x] Feature: click on category badge in JobCard filters FindJobs by that category (onCategoryClick prop)
- [x] UX: show toast "מסנן לפי: <category>" when category pill is clicked in FindJobs (handleCategoryFromCard)
- [x] Fix: remove sticky positioning from search bar and filter/sort chip toolbar in FindJobs (should scroll with page)
- [x] Bug: search bar overlaps filter/calendar bottom sheet — moved both panels to createPortal(document.body) to escape framer-motion stacking contexts300 and sheet to z-301
- [x] Accessibility: close filter panel and calendar panel on Escape key press in FindJobs
- [x] UI: highlight active category pill in JobCard when that category is in selectedCategories (bold border + checkmark)
- [x] Bug: share button SharePopover was clipped by overflow-hidden on JobCard root — removed overflow-hidden, fixed urgent accent border-radius to compensate
- [x] Feature: add share button (WhatsApp + copy link) to JobBottomSheet action area
- [x] Feature: coming-soon overlay that covers FindJobs page and blocks all user interaction (FIND_JOBS_OPEN flag in shared/const.ts)
- [x] Feature: admin bypass for FindJobs coming-soon overlay (role === 'admin' skips the overlay)
- [x] Bug: coming-soon overlay not visible on mobile — added solid rgba background as primary layer, backdrop-filter is additive
- [x] Fix: moved coming-soon overlay to App.tsx (global) so it covers all pages via createPortal
- [x] Fix: coming-soon overlay scoped back to /find-jobs only via createPortal in FindJobs.tsx
- [x] Content: update coming-soon overlay body text — המערכת טרם נפתחה למעסיקים + מומלץ להגדיר קבלת התראות
- [x] Feature: add "הגדר התראות" button to coming-soon overlay — navigates to /worker-profile?tab=settings; WorkerProfile reads ?tab query param to auto-activate the settings tab
- [x] Content: replace worker home page hero image with new provided image (optimized WebP, 70KB, objectPosition 50% 15%)
- [x] UI: increase mobile hero height from 380px to 440px to prevent face cutoff
- [x] UI: verified mobile hero gradient overlay after 440px height change — absolute inset-0 covers 100% regardless of height, no adjustment needed
- [x] Content: update hero image alt text to "עובד צעיר מחזיק מטאטא במטבח" (both mobile + desktop img tags)
- [x] UI: move mobile hero headline above worker's face (top: 44% → 20%), update gradient for upper-area text readability
- [x] UI: split mobile hero headline — white line ("מחפש עבודה זמנית?") positioned above worker's head (top: 18%), yellow line ("מצא אחת תוך דקות") + subtitle positioned below worker's head (top: 56%), dual-band gradient for readability
- [x] Architecture: add desktop-wrapper + mobile-wrapper CSS (420px centered column on desktop, full-screen on mobile)
- [x] Architecture: wrap App root in mobile-wrapper in main.tsx / index.html
- [x] Architecture: fix portals (modals, bottom sheets, overlays) to constrain within mobile-wrapper on desktop — getMobileRoot() utility, CSS @media constraint for fixed.inset-0
- [x] Architecture: audit and fix any fixed large widths that break out of 420px container — overflow-x: hidden on mobile-wrapper, CSS constraints on fixed overlays
- [x] Bug: Navbar and Footer overflow outside 420px mobile-wrapper on desktop — removed max-w-2xl/max-w-4xl from inner containers, removed left-0 right-0 from MobileBottomNav, CSS @media constraint handles fixed overlays
- [x] Bug: Navbar shows desktop layout on desktop — forced always-mobile layout by removing md: breakpoints (flex md:hidden → flex, hidden md:flex → hidden)
- [x] Bug: Footer uses sm: breakpoints (sm:flex-row, sm:grid-cols-2) that cause incorrect layout in 420px wrapper — replaced with flex-col and grid-cols-1
- [x] Feature: add GenderDisclaimer shared component with "לשון זכר בפלטפורמה נועדה מטעמי נוחות בלבד ומתייחסת לכל המינים" — placed above MobileBottomNav in App.tsx, visible on all screens mobile+desktop
- [x] Bug: GenderDisclaimer hidden by fixed MobileBottomNav on mobile — moved inside <main> before </AnimatePresence>, pb-16 → pb-24 to clear both disclaimer and bottom nav
- [ ] DB: add birth_date (date) to workerProfiles table
- [ ] DB: verify/add end_time column to jobs table
- [ ] DB: create legal_acknowledgements table (user_id, worker_id, job_id, ack_type, approved, created_at)
- [ ] Backend: calcAge(birth_date) + isMinor(age) utility in shared/ageUtils.ts
- [ ] Backend: job visibility filter — minors see only jobs with end_time <= 22:00
- [ ] Backend: saveBirthDate tRPC procedure (worker only, validates age >= 16)
- [ ] Backend: log legal_acknowledgement when worker submits birth_date modal
- [ ] Frontend: BirthDateModal shared component (date picker + declaration checkbox)
- [ ] Frontend: apply-job gate — check birth_date before applying, show BirthDateModal if missing, block if age < 16 or job end_time > 22:00 for minors
- [ ] Frontend: employer warning in PostJob when end_time > 22:00
- [ ] Frontend: minor badge on PublicWorkerProfile ("עובד קטין (גיל X)")
- [ ] Tests: vitest for age calculation, is_minor flag, job visibility filter

## Minor Worker Age Verification (Completed)
- [x] DB: add birthDate (date, nullable) to users table
- [x] DB: add legal_acknowledgements table (userId, type, jobId, ipAddress, userAgent, createdAt)
- [x] DB: db:push migration applied
- [x] Backend: shared/ageUtils.ts — calcAge, isMinor, isTooYoung, isJobAccessibleToMinor, shouldWarnLateJob (single source of truth)
- [x] Backend: saveBirthDate, getWorkerBirthDate, logLegalAcknowledgement helpers in db.ts
- [x] Backend: saveBirthDate tRPC procedure (validates age >= 16, saves birthDate, logs legal ack)
- [x] Backend: getBirthDateInfo tRPC procedure (returns birthDate, age, isMinor)
- [x] Backend: checkJobAgeAccess tRPC procedure (returns accessible, reason)
- [x] Frontend: BirthDateModal shared component (date picker + declaration checkbox + error handling)
- [x] Frontend: age-gate in FindJobs.tsx — no birth_date → show BirthDateModal before applying; after save → proceed with apply
- [x] Tests: server/ageUtils.test.ts — 34 test files, 666 tests all passing

## Age Verification Extensions
- [x] Server: add age gate to applyToJob procedure (check birthDate + workEndTime before allowing application)
- [x] Frontend: add age gate + BirthDateModal to JobDetails page
- [x] Frontend: minor badge (16-17) on PublicWorkerProfile (isMinor from getPublicProfile) and MatchedWorkers (getWorkersMinorStatus batch query)
- [x] Frontend: late-job warning in PostJob when workEndTime > 22:00 (shouldWarnLateJob from ageUtils)
- [x] Tests: updated db mocks in applications.test.ts and bottomsheet.test.ts — 666/666 passing

## Minor Worker Extensions (Round 2)
- [x] DB: add minAge (integer, nullable, default null) to jobs table — values: null=no restriction, 16=16+, 18=18+
- [x] Backend: minAge in createJob/updateJob procedures
- [x] Backend: server-side age enforcement in applyToJob — block if worker age < job.minAge
- [x] Backend: filter getWorkersMatchingJob to exclude workers younger than job.minAge
- [x] Frontend: minAge selector in PostJob form (null / 16+ / 18+)
- [x] Frontend: minAge badge on job cards and JobDetails ("גיל מינימלי: 18+")
- [x] Frontend: age gate warning in WorkerAvailability (HomeWorker duration dialog) when end time > 22:00 for minors
- [x] Frontend: legal link in BirthDateModal — "תנאי עבודה לנוער" → חוק עבודת נוער
- [x] Tests: meetsMinAgeRequirement + minAgeLabel tests added — 681/681 passing

## Auto minAge Filter in Job Search (Round 3)
- [x] DB helpers: workerAge param added to getActiveJobs, getJobsNearLocation, getUrgentJobs, getTodayJobs (backward-compat)
- [x] Backend: resolve workerAge from ctx.user in list, search, nearby, listToday, listUrgent procedures
- [x] Frontend: filtering is server-side — no frontend changes needed (ctx.user is resolved automatically)
- [x] Tests: queryJobs age-gate predicate tests added to ageUtils.test.ts

## DB Refactor — Unified queryJobs() (Round 3b)
- [x] DB: thin wrappers over queryJobs() for getActiveJobs, getJobsNearLocation, getUrgentJobs, getTodayJobs
- [x] DB: queryJobs accepts optional workerAge and filters WHERE minAge IS NULL OR minAge <= workerAge
- [x] Backend: all 5 call-sites in routers.ts updated to resolve and pass workerAge
- [x] Frontend: server-side only — no client changes needed
- [x] Tests: 689/689 passing (postgis-radius + contactphone.privacy mocks updated)

## Bug Fix — BirthDateModal not shown before apply (Round 3c)
- [x] Created useApplyWithAgeGate hook — centralises birthDate check, BirthDateModal trigger, and retry logic
- [x] JobBottomSheet: replaced inline applyMutation with useApplyWithAgeGate
- [x] CarouselJobCard: replaced inline applyMutation with useApplyWithAgeGate
- [x] SearchJobCard: replaced inline applyMutation with useApplyWithAgeGate
- [x] TypeScript: 0 errors, 689/689 tests passing

## UX Fix — BirthDateModal Mobile Layout
- [x] Bottom-sheet style on mobile (slides up from bottom, rounded top corners)
- [x] Full-width buttons on mobile (stacked, height 50px)
- [x] Proper padding and font sizes for small screens (font-size: 16 prevents iOS zoom)
- [x] Touch-friendly date input (height 48px) and checkbox (20x20)

## useApplyWithAgeGate Improvements (Round 3d)
- [x] Cache invalidation: utils.user.getBirthDateInfo.invalidate() called in handleBirthDateSuccess
- [x] Loading toast: toast.loading("מאמת פרטים...") shown when birthDateInfo is still loading on apply click
- [x] FindJobs: replaced inline applyToJob mutation with useApplyWithAgeGate hook — 689/689 tests passing

## Bug Fix — getBirthDateInfo DB query error (Round 3e)
- [x] Fix: birthDate column was missing from production DB (TiDB) — added via ALTER TABLE
- [x] Fix: minAge column was also missing from jobs table — added via ALTER TABLE
- [x] pnpm db:push run to sync Drizzle migration state — 689/689 tests passing

## Feature — BirthDate Change (Round 3f)
- [x] Schema: birthdateChanges audit table added to drizzle/schema.ts
- [x] DB migration: birthdate_changes table created in production TiDB via ALTER TABLE
- [x] Backend: updateBirthDate procedure — 30-day rate limit, IP logging, legal acknowledgement
- [x] Backend: getBirthDateInfo extended to return lastChangedAt + canChangeAfter
- [x] Frontend: birthDate card in WorkerProfile settings tab with date picker + current value display
- [x] Frontend: confirmation bottom-sheet dialog with declaration checkbox
- [x] Frontend: rate-limit banner when canChangeAfter is set
- [x] Frontend: utils.user.getBirthDateInfo.invalidate() called on success
- [x] Tests: 689/689 passing (TypeScript 0 errors)

## Fix — BirthDate Modal Truncated + Admin Audit View (Round 3g)
- [x] Fix: confirmation dialog in WorkerProfile truncated by mobile nav bar — add pb-safe / padding-bottom
- [x] Backend: getBirthdateChanges admin procedure (paginated, with user name/email)
- [x] Frontend: birthdate_changes audit table in Admin Panel (user, old date, new date, changed_at, IP)

## Bug Fix — MobileBottomNav "חיפוש עבודה" opens profile modal (Round 3h)
- [x] Diagnose: find conflicting click handler between MobileBottomNav nav item and FindJobs profile modal
- [x] Fix: filterInitialized now backed by sessionStorage so it persists across remounts
- [x] Test: 689/689 tests passing, TypeScript 0 errors

## Legal — הוספת סעיף העסקת קטינים לתנאים (Round 3i)
- [x] הוסף סעיף "העסקת קטינים (גילאי 16–18)" לדף Terms.tsx

## Legal — עדכון מדיניות פרטיות סעיף 11 קטינים (Round 3j)
- [x] עדכן סעיף 11 (קטינים) במדיניות הפרטיות מגיל 18 לגיל 16

## Fix — קישורי תנאי שימוש ומדיניות פרטיות במודל הרשמה (Round 3k)
- [x] עדכן קישורי "תנאי השימוש" ו"מדיניות הפרטיות" במודל ההרשמה לנתיבים /terms ו-/privacy (כבר היו תקינים)
- [x] שנה checkbox אישור גיל מ-18 ל-16 בטופס ההרשמה

## Fix — החלפת תמונה בדף my-applications (Round 3l)
- [x] העלה תמונת גבר על ספה ל-CDN והחלף את תמונת האשה בדף MyApplications

## Feature — Cookie Consent Banner (Round 3m)
- [x] Build CookieConsentBanner component (Accept + Settings modal, localStorage)
- [x] Integrate banner into App.tsx
- [x] Gate analytics script loading on analyticsConsent
- [x] Write vitest tests for consent logic (11 tests)
