# AvodaNow — Architecture Reference

> **Stack:** React 19 + Tailwind 4 · Node.js + Express · tRPC 11 · PostgreSQL + Drizzle ORM + PostGIS  
> **Last updated:** March 2026 · **Tests:** 532 passing

---

## Table of Contents

1. [Backend Folder Structure](#1-backend-folder-structure)
2. [Client Folder Structure](#2-client-folder-structure)
3. [Database Schema](#3-database-schema)
4. [API Routes (tRPC)](#4-api-routes-trpc)
5. [Client Routes (Frontend Pages)](#5-client-routes-frontend-pages)
6. [Entity Relationship Summary](#6-entity-relationship-summary)
7. [Key Design Patterns](#7-key-design-patterns)

---

## 1. Backend Folder Structure

```
server/
├── _core/                     # Framework plumbing — do not edit unless extending infra
│   ├── context.ts             # tRPC context builder (injects ctx.user)
│   ├── cookies.ts             # Signed cookie helpers
│   ├── dataApi.ts             # Manus built-in data API wrapper
│   ├── email.ts               # Transactional email helper (SMTP)
│   ├── env.ts                 # Centralised env-var registry (single source of truth)
│   ├── imageGeneration.ts     # AI image generation helper
│   ├── index.ts               # Express app bootstrap + tRPC adapter mount
│   ├── llm.ts                 # LLM (Forge) invocation helper
│   ├── map.ts                 # Google Maps backend proxy helper
│   ├── notification.ts        # Owner notification helper
│   ├── googleAuth.ts          # Google OAuth routes (/api/auth/google/*)
│   ├── sdk.ts                 # Manus platform SDK wrapper
│   ├── systemRouter.ts        # Built-in system tRPC procedures
│   ├── trpc.ts                # tRPC init: publicProcedure / protectedProcedure / adminProcedure
│   ├── vite.ts                # Vite dev-server bridge (SSR pass-through)
│   ├── voiceTranscription.ts  # Whisper transcription helper
│   └── types/
│       ├── cookie.d.ts
│       └── manusTypes.ts
│
├── routers.ts                 # All tRPC routers merged into appRouter
├── db.ts                      # Drizzle query helpers (reused across procedures)
├── adminDb.ts                 # Admin-only query helpers
├── storage.ts                 # S3 storagePut / storageGet wrappers
├── security.ts                # Rate-limiting, input sanitisation middleware
├── sanitize.ts                # HTML/text sanitisation utilities
├── logger.ts                  # Structured request/error logger
├── sms.ts                     # SMS dispatch (Twilio)
├── smsProvider.ts             # SMS provider abstraction layer
├── webPush.ts                 # Web Push notification dispatch (VAPID)
├── notificationBatcher.ts     # Batches applicant alerts → single SMS per job
├── supportEmail.ts            # Support ticket email helper
├── backup.ts                  # DB backup utilities
│
└── *.test.ts                  # Vitest unit/integration tests (one file per feature)
```

**Key conventions:**
- All environment variables are accessed exclusively through `server/_core/env.ts`.
- Query logic lives in `server/db.ts` / `server/adminDb.ts`; procedures in `server/routers.ts` call these helpers and never contain raw SQL.
- Routers exceeding ~150 lines should be split into `server/routers/<feature>.ts`.

---

## 2. Client Folder Structure

```
client/
├── index.html                 # Entry HTML — Google Fonts CDN, meta tags
└── src/
    ├── main.tsx               # React root — QueryClientProvider, ThemeProvider, tRPC
    ├── App.tsx                # Route definitions (wouter) + layout shells
    ├── index.css              # Global Tailwind theme tokens + CSS variables
    ├── const.ts               # App-wide constants: getLoginUrl(), APP_ID, etc.
    │
    ├── pages/                 # Route-level page components
    │   ├── Home.tsx                   # Role-selector landing (redirects to HomeWorker/HomeEmployer)
    │   ├── HomeWorker.tsx             # Worker dashboard / hero
    │   ├── HomeEmployer.tsx           # Employer dashboard / hero
    │   ├── FindJobs.tsx               # Job search with infinite scroll + toolbar
    │   ├── JobDetails.tsx             # Single job detail + apply
    │   ├── PostJob.tsx                # Employer: create/edit job posting
    │   ├── MyJobs.tsx                 # Employer: manage own job posts
    │   ├── JobApplications.tsx        # Employer: view applicants per job
    │   ├── MatchedWorkers.tsx         # Employer: AI-matched worker list
    │   ├── AvailableWorkers.tsx       # Employer: workers available now
    │   ├── MyApplications.tsx         # Worker: applied jobs history
    │   ├── ApplicationView.tsx        # Worker: single application detail
    │   ├── WorkerProfile.tsx          # Worker: edit own profile
    │   ├── PublicWorkerProfile.tsx    # Public worker profile (employer view)
    │   ├── Admin.tsx                  # Admin panel
    │   ├── AdminCategories.tsx        # Admin: manage job categories
    │   ├── AdminRegions.tsx           # Admin: manage regions
    │   ├── AdminRegionsPage.tsx       # Admin: region list
    │   ├── AdminRegionDetailPage.tsx  # Admin: region detail
    │   ├── MyReferrals.tsx            # Referral programme stats
    │   ├── JobsToday.tsx              # Jobs starting today
    │   ├── JobsLanding.tsx            # SEO landing for job category/city
    │   ├── BestJobsPage.tsx           # Curated best jobs
    │   ├── WorkerLandingPage.tsx      # Regional worker landing
    │   ├── PassoverLandingPage.tsx    # Seasonal landing page
    │   ├── GuideHub.tsx               # Help centre hub
    │   ├── GuidePage.tsx              # Single guide article
    │   ├── GuideTopicPage.tsx         # Guide topic listing
    │   ├── FAQPage.tsx                # FAQ
    │   ├── Legal.tsx                  # Legal hub
    │   ├── Terms.tsx                  # Terms of service
    │   ├── Privacy.tsx                # Privacy policy
    │   ├── JobPostingPolicy.tsx       # Job posting policy
    │   ├── SafetyPolicy.tsx           # Safety policy
    │   ├── ReviewsPolicy.tsx          # Reviews policy
    │   ├── UserContentPolicy.tsx      # User content policy
    │   ├── Accessibility.tsx          # Accessibility statement
    │   ├── MaintenancePage.tsx        # Maintenance mode screen
    │   ├── ComponentShowcase.tsx      # Dev: component library preview
    │   └── NotFound.tsx               # 404
    │
    ├── components/            # Reusable UI components
    │   ├── DashboardLayout.tsx        # Sidebar dashboard shell (admin/employer)
    │   ├── DashboardLayoutSkeleton.tsx
    │   ├── AIChatBox.tsx              # Streaming chat interface
    │   ├── Map.tsx                    # Google Maps (MapView + onMapReady)
    │   ├── JobCard.tsx                # Job listing card
    │   ├── JobCardSkeleton.tsx        # Skeleton for job card
    │   ├── SearchJobCard.tsx          # Compact search result card
    │   ├── WorkerCarouselCard.tsx     # Worker card for employer carousel
    │   ├── WorkerProfilePreviewModal.tsx
    │   ├── NearbyJobsMap.tsx          # Map view of nearby jobs
    │   ├── BottomSheet.tsx            # Mobile bottom sheet
    │   ├── MobileBottomNav.tsx        # Mobile tab bar
    │   ├── MobileDrawer.tsx           # Mobile side drawer
    │   ├── Navbar.tsx                 # Top navigation bar
    │   ├── AppLogo.tsx                # Brand logo component
    │   ├── PageTransition.tsx         # Route transition animation
    │   ├── PushNotificationBanner.tsx # Web Push opt-in banner
    │   ├── TermsUpdateBanner.tsx      # Re-consent banner
    │   ├── ReConsentModal.tsx         # Legal re-consent modal
    │   ├── RateWorkerModal.tsx        # Employer: rate a worker
    │   ├── PhoneChangeModal.tsx       # Phone number change flow
    │   ├── ReportProblemModal.tsx     # Report a problem
    │   ├── RoleSelectionScreen.tsx    # Worker / Employer role picker
    │   ├── WelcomeScreen.tsx          # First-time onboarding screen
    │   ├── WorkerRegionBanner.tsx     # Region activation banner
    │   ├── SkipToContent.tsx          # Accessibility skip link
    │   └── ui/                        # shadcn/ui primitives + custom atoms
    │       ├── BrandName.tsx          # "AvodaNow" brand logotype
    │       ├── GoogleAuthButton.tsx   # Google OAuth button
    │       ├── AppFormField.tsx       # Form field wrapper
    │       ├── button.tsx, card.tsx, dialog.tsx, … (shadcn/ui)
    │
    ├── contexts/
    │   ├── AuthContext.tsx     # useAuth() — current user, login URL, role
    │   ├── ThemeContext.tsx    # Dark/light theme provider
    │   └── UserModeContext.tsx # Worker / Employer mode state
    │
    ├── hooks/
    │   ├── useCategories.ts        # Cached job categories query
    │   ├── useComposition.ts       # IME composition guard for Hebrew input
    │   ├── useMobile.tsx           # Responsive breakpoint detection
    │   ├── usePersistFn.ts         # Stable function reference helper
    │   ├── usePlatformSettings.ts  # Platform-wide settings query
    │   ├── usePushNotifications.ts # Web Push subscription management
    │   ├── useSEO.ts               # Dynamic meta tag injection
    │   └── useStructuredData.ts    # JSON-LD structured data injection
    │
    ├── lib/
    │   ├── trpc.ts            # tRPC client binding (React Query adapter)
    │   ├── utils.ts           # cn() + general utilities
    │   ├── colors.ts          # Design token colour constants
    │   ├── jobSlug.ts         # SEO-friendly job URL slug generator
    │   ├── mapsLoader.ts      # Google Maps JS API loader
    │   └── reverseGeocode.ts  # Lat/lng → city name helper
    │
    └── data/                  # Static content (FAQ, guide topics, best jobs)
        ├── bestJobsData.ts
        ├── faqData.ts
        ├── guideContent.ts
        └── guideTopics.ts
```

---

## 3. Database Schema

All tables use PostgreSQL with Drizzle ORM. Timestamps are stored as UTC with timezone. Geospatial columns use PostGIS `geometry(Point, 4326)`.

### Enums

| Enum | Values |
|---|---|
| `user_status` | `active`, `suspended` |
| `user_role` | `user`, `admin`, `test` |
| `user_mode` | `worker`, `employer` |
| `location_mode` | `city`, `radius` |
| `availability_status` | `available_now`, `available_today`, `available_hours`, `not_available` |
| `notification_prefs` | `both`, `push_only`, `sms_only`, `none` |
| `salary_type` | `hourly`, `daily`, `monthly`, `volunteer` |
| `start_time` | `today`, `tomorrow`, `this_week`, `flexible` |
| `active_duration` | `1`, `3`, `7` (days) |
| `job_status` | `active`, `closed`, `expired`, `under_review` |
| `closed_reason` | `found_worker`, `expired`, `manual` |
| `job_location_mode` | `city`, `radius` |
| `application_status` | `pending`, `viewed`, `accepted`, `rejected` |
| `phone_change_result` | `success`, `failed`, `locked` |
| `region_status` | `collecting_workers`, `active`, `paused` |
| `worker_region_match_type` | `gps_radius`, `preferred_city` |
| `region_notif_type` | `worker`, `employer` |
| `consent_type` | `terms`, `privacy`, `age_18`, `job_posting_policy`, `safety_policy`, `user_content_policy`, `reviews_policy` |
| `job_category` | `delivery`, `warehouse`, `agriculture`, `kitchen`, `cleaning`, `security`, `construction`, `childcare`, `eldercare`, `retail`, `events`, `volunteer`, `emergency_support`, `passover_jobs`, `reserve_families`, `other` |

---

### `users`

Primary identity table. Phone number is the primary auth identifier (E.164). Worker profile fields are embedded (denormalised for query efficiency).

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `openId` | `varchar(64) UNIQUE` | Manus OAuth ID or phone (for SMS auth) |
| `phone` | `varchar(20) UNIQUE` | E.164 format, e.g. `+972501234567` |
| `phonePrefix` | `varchar(5)` | e.g. `"052"` |
| `phoneNumber` | `varchar(7)` | 7-digit suffix |
| `name` | `text` | |
| `email` | `varchar(320)` | |
| `loginMethod` | `varchar(64)` | `"phone"`, `"google"`, etc. |
| `status` | `user_status` | default `active` |
| `role` | `user_role` | default `user` |
| `userMode` | `user_mode` | `worker` or `employer`; null = not chosen |
| `workerTags` | `json[]` | AI matching tags |
| `preferredCategories` | `json[]` | Job category slugs |
| `preferredCity` | `varchar(100)` | Legacy single city |
| `preferredCities` | `json[]` | City IDs from `cities` table |
| `locationMode` | `location_mode` | default `city` |
| `workerLatitude` | `numeric(10,7)` | GPS for radius matching |
| `workerLongitude` | `numeric(10,7)` | GPS for radius matching |
| `searchRadiusKm` | `integer` | default `5` |
| `preferenceText` | `text` | Reserved for future free-text matching; currently ignored by the production matcher |
| `preferredDays` | `json[]` | e.g. `["sunday","monday"]` |
| `preferredTimeSlots` | `json[]` | e.g. `["morning","evening"]` |
| `workerBio` | `text` | |
| `profilePhoto` | `text` | S3 URL |
| `expectedHourlyRate` | `numeric(8,2)` | ILS |
| `availabilityStatus` | `availability_status` | Used for employer ranking/display; not part of hard matching |
| `workerRating` | `numeric(3,2)` | Rolling average (1.0–5.0) |
| `completedJobsCount` | `integer` | default `0` |
| `signupCompleted` | `boolean` | default `false` |
| `regionId` | `integer` | FK → `regions.id` |
| `notificationPrefs` | `notification_prefs` | Controls alert delivery channel after a worker already matches a job; default `both` |
| `referredBy` | `integer` | FK → `users.id` |
| `termsAcceptedAt` | `timestamptz` | |
| `createdAt` / `updatedAt` / `lastSignedIn` | `timestamptz` | |

---

### `jobs`

Job postings created by employers.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `title` | `varchar(200)` | |
| `description` | `text` | |
| `category` | `job_category` | |
| `address` | `varchar(300)` | |
| `city` | `varchar(100)` | |
| `latitude` / `longitude` | `numeric(10,7)` | |
| `location` | `geometry(Point,4326)` | PostGIS — derived from lat/lng |
| `salary` | `numeric(10,2)` | |
| `salaryType` | `salary_type` | |
| `contactPhone` | `varchar(20)` | Concealed from workers in API |
| `contactName` | `varchar(100)` | |
| `businessName` | `varchar(200)` | |
| `workingHours` | `varchar(100)` | |
| `startTime` | `start_time` | |
| `startDateTime` | `timestamptz` | Exact start; within 24h → "עבודה להיום" badge |
| `isUrgent` | `boolean` | |
| `isLocalBusiness` | `boolean` | |
| `workersNeeded` | `integer` | default `1` |
| `postedBy` | `integer` | FK → `users.id` |
| `activeDuration` | `active_duration` | `1`, `3`, or `7` days |
| `expiresAt` | `timestamptz` | `createdAt + activeDuration` |
| `status` | `job_status` | |
| `closedReason` | `closed_reason` | |
| `reportCount` | `integer` | |
| `jobTags` | `json[]` | AI matching tags |
| `jobLocationMode` | `job_location_mode` | |
| `jobSearchRadiusKm` | `integer` | default `5` |
| `hourlyRate` | `numeric(10,2)` | |
| `estimatedHours` | `numeric(5,1)` | |
| `showPhone` | `boolean` | default `false` |
| `jobDate` | `varchar(10)` | `YYYY-MM-DD` |
| `workStartTime` / `workEndTime` | `varchar(5)` | `HH:MM` |
| `imageUrls` | `json[]` | Up to 5 S3 URLs |
| `createdAt` / `updatedAt` | `timestamptz` | |

---

### `applications`

Worker applications to job postings.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `jobId` | `integer` | FK → `jobs.id` |
| `workerId` | `integer` | FK → `users.id` |
| `status` | `application_status` | default `pending` |
| `message` | `text` | Optional cover message |
| `contactRevealed` | `boolean` | Employer revealed worker contact |
| `revealedAt` | `timestamptz` | |
| `createdAt` / `updatedAt` | `timestamptz` | |

---

### `worker_availability`

Tracks workers who are actively available (expires after `availableUntil`).

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `userId` | `integer` | FK → `users.id` |
| `latitude` / `longitude` | `numeric(10,7)` | |
| `location` | `geometry(Point,4326)` | PostGIS |
| `city` | `varchar(100)` | |
| `note` | `varchar(200)` | |
| `availableUntil` | `timestamptz` | Default: now + 4h |
| `reminderSentAt` | `timestamptz` | 30-min expiry reminder |
| `createdAt` / `updatedAt` | `timestamptz` | |

---

### `notification_batches`

Batches applicant alerts per job — employer receives one SMS summary instead of one per applicant.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `jobId` | `integer` | FK → `jobs.id` |
| `employerPhone` | `varchar(20)` | |
| `pendingCount` | `integer` | Applicants in this batch |
| `scheduledAt` | `timestamptz` | Flush time (now + 10 min) |
| `sentAt` | `timestamptz` | |
| `status` | `varchar(20)` | `pending` or `sent` |
| `createdAt` / `updatedAt` | `timestamptz` | |

---

### `push_subscriptions`

Web Push (VAPID) device subscriptions per user.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `userId` | `integer` | FK → `users.id` |
| `endpoint` | `varchar(2048) UNIQUE` | Index: `push_endpoint_idx` |
| `p256dh` | `text` | |
| `auth` | `text` | |
| `createdAt` | `timestamptz` | |

---

### `saved_jobs`

Worker's saved/bookmarked jobs.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `userId` | `integer` | FK → `users.id` |
| `jobId` | `integer` | |
| `savedAt` | `timestamptz` | |

Unique index: `saved_jobs_user_job_idx` on `(userId, jobId)`.

---

### `worker_ratings`

Employer ratings of workers after job completion.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `workerId` | `integer` | FK → `users.id` |
| `employerId` | `integer` | FK → `users.id` |
| `applicationId` | `integer` | Optional FK → `applications.id` |
| `rating` | `integer` | 1–5 |
| `comment` | `text` | |
| `createdAt` | `timestamptz` | |

Unique index: `worker_ratings_employer_worker_idx` on `(employerId, workerId)`.

---

### `categories`

Admin-managed job categories (replaces hardcoded enum for runtime flexibility).

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `slug` | `varchar(64) UNIQUE` | URL-safe, used in filters & SEO |
| `name` | `varchar(100)` | Hebrew display name |
| `icon` | `varchar(16)` | Emoji |
| `groupName` | `varchar(64)` | Logical group |
| `imageUrl` | `text` | CDN URL |
| `isActive` | `boolean` | |
| `sortOrder` | `integer` | |
| `createdAt` / `updatedAt` | `timestamptz` | |

---

### `regions`

Regional activation system — regions become active when enough workers register.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `slug` | `varchar(64) UNIQUE` | e.g. `"tel-aviv"` |
| `name` | `varchar(100)` | Hebrew display name |
| `centerCity` | `varchar(100)` | |
| `centerLat` / `centerLng` | `numeric(10,7)` | Region centre GPS |
| `activationRadiusKm` | `integer` | default `15` |
| `radiusMinutes` | `integer` | Display only |
| `minWorkersRequired` | `integer` | default `50` |
| `currentWorkers` | `integer` | |
| `status` | `region_status` | |
| `description` | `text` | |
| `imageUrl` | `text` | |
| `createdAt` / `updatedAt` | `timestamptz` | |

---

### `worker_regions`

Many-to-many: workers ↔ regions.

| Column | Type | Notes |
|---|---|---|
| `worker_id` | `integer` | FK → `users.id` (cascade delete) |
| `region_id` | `integer` | FK → `regions.id` (cascade delete) |
| `distance_km` | `numeric(8,3)` | Null for city-based matches |
| `match_type` | `worker_region_match_type` | `gps_radius` or `preferred_city` |
| `created_at` | `timestamptz` | |

Primary key: `(worker_id, region_id)`.

---

### `region_notification_requests`

Users who want to be notified when a region activates.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `user_id` | `integer` | FK → `users.id` (cascade delete) |
| `region_id` | `integer` | FK → `regions.id` (cascade delete) |
| `type` | `region_notif_type` | `worker` or `employer` |
| `created_at` | `timestamptz` | |

Unique index: `uniq_user_region_notif` on `(user_id, region_id)`.

---

### `user_consents`

GDPR/legal audit trail — one row per user per consent type.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `user_id` | `integer` | FK → `users.id` (cascade delete) |
| `consent_type` | `consent_type` | |
| `document_version` | `varchar(32)` | e.g. `"2026-03"` |
| `ip_address` | `varchar(45)` | |
| `user_agent` | `varchar(512)` | |
| `created_at` | `timestamptz` | |

Unique index: `uniq_user_consent_type` on `(user_id, consent_type)`.

---

### `otp_rate_limit`

OTP send/verify rate limiting per phone + IP.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `phone` | `varchar(20)` | |
| `ip` | `varchar(45)` | |
| `sendCount` | `integer` | Attempts in current window |
| `verifyAttempts` | `integer` | Wrong-code attempts |
| `windowStart` | `timestamptz` | Reset after 1 hour |
| `updatedAt` | `timestamptz` | |

---

### `phone_change_logs`

Audit log for every phone number change attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `userId` | `integer` | FK → `users.id` |
| `oldPhone` / `newPhone` | `varchar(20)` | E.164 |
| `ipAddress` | `varchar(45)` | |
| `result` | `phone_change_result` | `success`, `failed`, `locked` |
| `createdAt` | `timestamptz` | |

---

### `system_settings`

Key/value store for global runtime configuration flags (e.g. `maintenanceMode`).

| Column | Type |
|---|---|
| `key` | `varchar(64) PK` |
| `value` | `text` |
| `updated_at` | `timestamptz` |

---

### `cities` / `phone_prefixes`

Reference tables seeded once at setup; read-only at runtime.

**`cities`:** `id`, `city_code`, `name_he`, `name_en`, `district`, `latitude`, `longitude`, `is_active`  
**`phone_prefixes`:** `id`, `prefix` (UNIQUE), `description`, `is_active`

---

### `job_reports`

User-submitted job reports (abuse/spam).

| Column | Type |
|---|---|
| `id` | `serial PK` |
| `jobId` | FK → `jobs.id` |
| `reporterPhone` | `varchar(20)` |
| `reporterIp` | `varchar(45)` |
| `reason` | `varchar(200)` |
| `createdAt` | `timestamptz` |

---

## 4. API Routes (tRPC)

All procedures are served under `POST /api/trpc/<namespace>.<procedure>`.  
Access levels: **public** = no auth required · **protected** = authenticated user · **admin** = `role = admin`.

### `auth`

| Procedure | Access | Description |
|---|---|---|
| `me` | public | Returns current session user or null |
| `logout` | public | Clears session cookie |
| `sendOtp` | public | Sends Twilio SMS OTP to phone |
| `verifyOtp` | public | Verifies OTP, creates/updates user, sets session |

---

### `jobs`

| Procedure | Access | Description |
|---|---|---|
| `list` | public | Paginated job list with filters (city, category, radius, time slots, sort) |
| `search` | public | Geo-sorted job search by lat/lng + filters |
| `getById` | public | Single job detail (contactPhone concealed) |
| `listToday` | public | Jobs starting today |
| `listUrgent` | public | Urgent jobs |
| `create` | protected | Create new job posting |
| `update` | protected | Update own job posting |
| `updateStatus` | protected | Change job status (close, reopen) |
| `delete` | protected | Delete own job posting |
| `myJobs` | protected | Employer's own job list |
| `myJobsWithPendingCounts` | protected | Own jobs + pending application counts |
| `totalPendingApplications` | protected | Total unread applications count |
| `markApplicationsViewed` | protected | Mark all applications as viewed |
| `myApplications` | protected | Worker's applied jobs |
| `unreadApplicationsCount` | protected | Unread applications badge count |
| `matchWorkers` | protected | Profile-matched and ranked workers for a job |
| `sendJobOffer` | protected | Send job offer SMS to a worker |
| `markFilled` | protected | Mark job as filled |
| `report` | public | Report a job (abuse/spam) |
| `applyToJob` | protected | Worker applies to a job |
| `getJobApplications` | protected | Employer: all applicants for a job |
| `getApplications` | protected | Worker: own applications |
| `updateApplicationStatus` | protected | Employer: accept/reject applicant |
| `checkApplied` | protected | Check if worker already applied |
| `getApplication` | protected | Single application detail |
| `revealContact` | protected | Employer reveals worker contact details |
| `withdrawApplication` | protected | Worker withdraws application |
| `uploadJobImage` | protected | Upload job image to S3 |

---

### `workers`

| Procedure | Access | Description |
|---|---|---|
| `setAvailable` | protected | Mark worker as available now (creates availability record) |
| `setUnavailable` | protected | Remove availability record |
| `myStatus` | protected | Worker's current availability status |
| `nearby` | public | Workers available near a lat/lng |

---

### `user`

| Procedure | Access | Description |
|---|---|---|
| `me` (via auth) | public | Current user |
| `checkEmailAvailable` | public | Check if email is already registered |
| `getMode` | protected | Worker or employer mode |
| `setMode` | protected | Switch between worker/employer |
| `resetMode` | protected | Clear mode selection |
| `getProfile` | protected | Full own profile |
| `getPhonePrefixes` | public | Israeli phone prefix list |
| `getCities` | public | All active cities |
| `searchCities` | public | City autocomplete search |
| `getPublicProfile` | public | Worker public profile by ID |
| `completeSignup` | protected | Complete onboarding flow |
| `updateProfile` | protected | Update worker/employer profile |
| `uploadProfilePhoto` | protected | Upload profile photo to S3 |
| `getNotificationPrefs` | protected | Notification channel preferences |
| `updateNotificationPrefs` | protected | Update notification preferences |
| `requestPhoneChangeOtp` | protected | Request OTP for phone number change |
| `requestPhoneChangeOtpEmail` | protected | Request phone change via email OTP |
| `verifyPhoneChangeOtp` | protected | Verify OTP and complete phone change |
| `quickUpdateAvailability` | protected | Quick availability toggle |
| `recordConsent` | protected | Record user consent to a legal document |
| `getMyConsents` | protected | All consents given by current user |
| `checkOutdatedConsents` | protected | Check if any consents need renewal |

---

### `admin`

| Procedure | Access | Description |
|---|---|---|
| `stats` | admin | Platform-wide statistics |
| `listJobs` | admin | All jobs with filters |
| `reportedJobs` | admin | Jobs with reports |
| `approveJob` / `rejectJob` | admin | Moderate jobs under review |
| `deleteJob` | admin | Hard-delete a job |
| `setJobStatus` | admin | Override any job status |
| `listReports` / `clearReports` | admin | Manage job reports |
| `listUsers` | admin | All users with filters |
| `blockUser` / `unblockUser` | admin | Suspend/restore user |
| `setUserRole` | admin | Promote/demote user role |
| `createUser` / `updateUser` / `deleteUser` | admin | User CRUD |
| `listApplications` | admin | All applications |
| `listBatches` / `flushBatch` / `cancelBatch` | admin | Notification batch management |
| `getPhoneChangeLockoutStatus` / `clearPhoneChangeLockout` | admin | Phone change lockout |
| `getMaintenanceMode` / `setMaintenanceMode` / `setMaintenanceMessage` | admin | Maintenance mode |
| `getEmployerLock` / `setEmployerLock` | admin | Lock employer job posting |

---

### `workers` / `live` / `savedJobs` / `ratings`

| Namespace | Procedure | Access | Description |
|---|---|---|---|
| `live` | `stats` | public | Platform live stats (active jobs, workers) |
| `live` | `heroStats` | public | Hero section stats |
| `live` | `feed` | public | Live activity feed |
| `savedJobs` | `save` / `unsave` | protected | Bookmark a job |
| `savedJobs` | `getSavedIds` / `getSavedJobs` | protected | Worker's saved jobs |
| `ratings` | `rateWorker` | protected | Employer rates a worker |
| `ratings` | `getMyRating` | protected | Worker's own rating |
| `ratings` | `getWorkerReviews` | public | Worker's public reviews |

---

### `categories`

| Procedure | Access | Description |
|---|---|---|
| `list` | public | All active job categories |
| `adminList` | protected | All categories including inactive |
| `create` | protected | Create new category |
| `update` | protected | Update category fields |
| `toggleActive` | protected | Toggle category active/inactive |
| `delete` | protected | Delete category |
| `seed` | protected | Seed default categories |

---

### `regions`

| Procedure | Access | Description |
|---|---|---|
| `list` | public | All regions |
| `getActiveCities` | public | Cities in active regions |
| `getBySlug` | public | Region by URL slug |
| `checkActive` | public | Check if region is active |
| `updateStatus` | protected | Change region status |
| `update` | protected | Update region details |
| `recount` | protected | Recount workers in region |
| `seed` | protected | Seed default regions |
| `create` | protected | Create new region |
| `delete` | protected | Delete region |
| `getWorkers` | protected | Workers in a region |
| `getById` | protected | Region by ID |
| `requestNotification` | protected | Request activation notification |
| `cancelNotification` | protected | Cancel notification request |
| `myNotifications` | protected | User's notification requests |
| `workerRegionStatus` | protected | Worker's region association status |
| `activateAndNotify` | protected | Activate region + notify waiting users |

---

### `liveStats`

| Procedure | Access | Description |
|---|---|---|
| `stats` | public | Full platform statistics |
| `heroStats` | public | Hero section stats (jobs today, workers available) |
| `feed` | public | Recent activity feed |

---

### `savedJobs`

| Procedure | Access | Description |
|---|---|---|
| `save` | protected | Bookmark a job |
| `unsave` | protected | Remove job from bookmarks |
| `getSavedIds` | protected | List of saved job IDs |
| `getSavedJobs` | protected | Full saved job objects |

---

### `ratings`

| Procedure | Access | Description |
|---|---|---|
| `rateWorker` | protected | Employer rates a worker (1–5 stars + comment) |
| `getMyRating` | protected | Current user's rating for a specific worker |
| `getWorkerReviews` | public | All public reviews for a worker |

---

### `push`

| Procedure | Access | Description |
|---|---|---|
| `subscribe` | protected | Register Web Push subscription |
| `unsubscribe` | protected | Remove Web Push subscription |
| `vapidKey` | public | Get VAPID public key |

---

### `referral`

| Procedure | Access | Description |
|---|---|---|
| `applyRef` | protected | Apply referral code at signup |
| `myStats` | protected | User's referral statistics |
| `adminAll` | protected | Admin view of all referrals |

---

### `seo`

| Procedure | Access | Description |
|---|---|---|
| `cityJobCounts` | public | Job counts per city for SEO landing pages |

---

### `maintenance`

| Procedure | Access | Description |
|---|---|---|
| `status` | public | Current maintenance mode status + message |

---

### `platform`

| Procedure | Access | Description |
|---|---|---|
| `settings` | public | Platform-wide settings |

---

### `support`

| Procedure | Access | Description |
|---|---|---|
| `reportProblem` | public | Submit a user support/problem report |

---

## 5. Client Routes (Frontend Pages)

All routes are defined in `client/src/App.tsx` using [wouter](https://github.com/molefrog/wouter).

| Route | Component | Access | Description |
|---|---|---|---|
| `/` | `Home` → `HomeWorker` / `HomeEmployer` | Public | Role-based home dispatcher |
| `/find-jobs` | `FindJobs` | Public | Job search with infinite scroll + 3-row sticky toolbar |
| `/job/:id` | `JobDetails` | Public | Job detail + apply button |
| `/post-job` | `PostJob` | Employer | Multi-step job posting form |
| `/my-jobs` | `MyJobs` | Employer | Employer's posted jobs |
| `/jobs/:id/applications` | `JobApplications` | Employer | Applicants for a job |
| `/applications/:id` | `ApplicationView` | Employer | Single application detail |
| `/matched-workers` | `MatchedWorkers` | Employer | Profile-matched and ranked workers for a job |
| `/available-workers` | `AvailableWorkers` | Employer | Workers available nearby |
| `/my-applications` | `MyApplications` | Worker | Application history |
| `/worker-profile` | `WorkerProfile` | Worker | Profile edit + availability |
| `/worker/:id` | `PublicWorkerProfile` | Public | Public worker profile |
| `/my-referrals` | `MyReferrals` | Auth | Referral stats + share link |
| `/admin` | `Admin` | Admin | Admin dashboard |
| `/admin/regions` | `AdminRegionsPage` | Admin | Regions management |
| `/admin/regions/:id` | `AdminRegionDetailPage` | Admin | Region detail + worker map |
| `/jobs/:category/:city` | `JobsLanding` | Public | SEO city + category landing |
| `/jobs/:slug` | `JobsLanding` | Public | SEO category landing |
| `/jobs/today/:city` | `JobsLanding` | Public | Today's jobs in city |
| `/jobs/evening/:city` | `JobsLanding` | Public | Evening jobs in city |
| `/jobs/weekend/:city` | `JobsLanding` | Public | Weekend jobs in city |
| `/jobs/immediate/:city` | `JobsLanding` | Public | Immediate jobs in city |
| `/jobs/ניקיון-לפסח` | `PassoverLandingPage` | Public | Passover seasonal campaign |
| `/work/:slug` | `WorkerLandingPage` | Public | Region worker recruitment |
| `/best/:slug` | `BestJobsPage` | Public | SEO "best jobs" pages |
| `/guide/temporary-jobs` | `GuideHub` | Public | Job guides hub |
| `/guide/temporary-jobs/:category` | `GuidePage` | Public | Category guide |
| `/guide/:topic` | `GuideTopicPage` | Public | Topic guide |
| `/faq/:slug` | `FAQPage` | Public | FAQ article |
| `/terms` | `Terms` | Public | Terms of service |
| `/privacy` | `Privacy` | Public | Privacy policy |
| `/job-posting-policy` | `JobPostingPolicy` | Public | Job posting policy |
| `/safety-policy` | `SafetyPolicy` | Public | Safety policy |
| `/user-content-policy` | `UserContentPolicy` | Public | User content policy |
| `/reviews-policy` | `ReviewsPolicy` | Public | Reviews policy |
| `/legal` | `Legal` | Public | Legal hub |
| `/accessibility` | `Accessibility` | Public | Accessibility statement |
| `*` | `NotFound` | Public | 404 |

---

## 6. Entity Relationship Summary

```
users ──< jobs           (postedBy)
users ──< applications   (workerId)
jobs  ──< applications   (jobId)
users ──< worker_availability
users ──< saved_jobs
users ──< worker_ratings (workerId + employerId)
users ──< push_subscriptions
users ──< phone_change_logs
users ──< user_consents
users ──< worker_regions >── regions
users ──< region_notification_requests >── regions
jobs  ──< notification_batches
jobs  ──< job_reports
```

---

## 7. Key Design Patterns

### Authentication Flow

```
Client → auth.sendOtp  → Twilio sends SMS OTP to phone
Client → auth.verifyOtp → Server verifies via Twilio Verify API
                        → Creates/updates user row in DB
                        → Sets signed session cookie (JWT_SECRET)
Client → auth.me        → Server reads cookie → returns ctx.user
```

Google OAuth is handled directly by the backend through `/api/auth/google/start` and `/api/auth/google/callback`.

### tRPC Procedure Access Levels

```ts
publicProcedure    // No auth check — anyone can call
protectedProcedure // ctx.user must exist → throws UNAUTHORIZED otherwise
adminProcedure     // ctx.user.role === 'admin' → throws FORBIDDEN otherwise
```

### PostGIS Spatial Queries

Both `jobs` and `worker_availability` store a `geometry(Point, 4326)` column derived from `latitude`/`longitude`. Spatial queries use:

```sql
-- Find jobs within radius
ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
  :radius_meters
)

-- Sort by distance
ST_Distance(
  location,
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
) AS distance_m
```

### Unified Worker ↔ Job Matching

Worker-to-job matching uses a single shared matcher in `server/jobMatching.ts`. This matcher is the source of truth for all profile-based matching flows.

Current matching inputs come from the worker profile:
- `preferredCategories`
- `preferredCity` / `preferredCities`
- `locationMode`
- `workerLatitude` / `workerLongitude`
- `searchRadiusKm`
- `preferredDays`
- `preferredTimeSlots`
- `birthDate`

Current matching inputs come from the job:
- `category`
- `city`
- `latitude` / `longitude`
- `startTime` / `startDateTime`
- `jobDate`
- `workStartTime` / `workEndTime`
- `minAge`
- category minor eligibility

The same matcher is used for:
- worker-facing job discovery (`jobs.list`, `jobs.search`, `jobs.listToday`, `jobs.listUrgent`)
- worker job alerts sent when a matching job is published
- employer-facing worker matching in `jobs.matchWorkers`

This keeps worker-visible jobs, worker notifications, and employer-visible matched workers consistent with the same profile rules.

Rules currently excluded from filtering:
- `preferenceText` is ignored for now
- `availabilityStatus` is not used as a hard filter

Employer-facing worker ranking happens only after a worker already matches the job. The current ranking priorities are:
1. category specificity: workers who selected only the searched category rank above workers who selected many categories
2. `availabilityStatus`
3. match score
4. distance
5. worker rating
6. completed jobs count

`notificationPrefs` does not affect whether a worker matches a job. It only controls the delivery channel after a match exists:
- `both`
- `sms_only`
- `push_only`
- `none`

### Notification Batching

When a worker applies to a job, `notificationBatcher.ts` upserts a `notification_batches` row and schedules a delayed flush (10 minutes). The flush sends a single summary SMS to the employer instead of one per application. This reduces SMS noise and Twilio costs at high application volume.

### Regional Activation

Regions start in `collecting_workers` status. Workers register interest via `regions.requestNotification`. When an admin calls `regions.activateAndNotify`, the region transitions to `active` and all waiting workers and employers receive push notifications. Worker counts are maintained via the `worker_regions` join table.

### Legal Consent Versioning

`LEGAL_DOCUMENT_VERSIONS` in `shared/const.ts` is the single source of truth for document versions. Bumping a version here causes `user.checkOutdatedConsents` to return `true` for users who consented to an older version. The `ReConsentModal` and `TermsUpdateBanner` components handle the re-consent UX automatically.

### CSS Design Tokens (oklch)

All brand colors are defined in `client/src/index.css` using the oklch color space for perceptual uniformity and WCAG AA compliance:

| Token | Value | Usage |
|---|---|---|
| `--olive` | `oklch(0.42 0.08 130)` | Primary brand (dark olive green) |
| `--citrus` | `oklch(0.82 0.18 95)` | Accent (citrus gold) on dark backgrounds |
| `--citrus-on-light` | `oklch(0.68 0.18 95)` | Citrus on light backgrounds (WCAG AA) |
| `--cream` | `oklch(0.97 0.02 95)` | Light background / text on dark |
| `--sand` | `oklch(0.92 0.04 90)` | Secondary light background |

---

*Re-generate this document with the `architecture-doc` skill after significant schema or router changes.*
