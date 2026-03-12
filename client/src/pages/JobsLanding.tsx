/**
 * JobsLanding — SEO landing page for all /jobs/* routes.
 *
 * Route patterns (handled in App.tsx):
 *   /jobs/:slug              → city name or category slug
 *   /jobs/:category/:city    → category + city combo
 *   /jobs/today              → jobs starting today
 *   /jobs/today/:city        → jobs starting today in a city
 *   /jobs/evening            → evening-shift jobs
 *   /jobs/evening/:city      → evening-shift jobs in a city
 *   /jobs/weekend            → weekend jobs
 *   /jobs/weekend/:city      → weekend jobs in a city
 *   /jobs/immediate          → urgent/immediate jobs
 *   /jobs/immediate/:city    → urgent/immediate jobs in a city
 *
 * Renders the same FindJobs UI but with:
 *   - Dynamic <h1> derived from URL params
 *   - Dynamic <title> / <meta description> / canonical
 *   - noindex when no active jobs exist for this combo
 *   - Internal SEO links section at the bottom (popular cities + categories)
 */
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useJobListingSchema, useBreadcrumbSchema } from "@/hooks/useStructuredData";
import { trpc } from "@/lib/trpc";
import { JOB_CATEGORIES, getCategoryLabel } from "@shared/categories";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import JobBottomSheet from "@/components/JobBottomSheet";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { MapPin, Briefcase, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { saveReturnPath } from "@/const";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

// ─── Popular cities shown in SEO link section ────────────────────────────────
const SEO_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
  "חולון", "רחובות", "אשקלון", "בת ים", "הרצליה",
];

// ─── All category slugs ───────────────────────────────────────────────────────
const ALL_CATEGORY_SLUGS = JOB_CATEGORIES.map((c) => c.value);

// ─── Time-based filter types ──────────────────────────────────────────────────
type TimeFilter = "today" | "evening" | "weekend" | "immediate";
const TIME_SLUGS: TimeFilter[] = ["today", "evening", "weekend", "immediate"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isCategorySlug(slug: string): boolean {
  return ALL_CATEGORY_SLUGS.includes(slug as (typeof ALL_CATEGORY_SLUGS)[number]);
}

function isTimeSlug(slug: string): slug is TimeFilter {
  return TIME_SLUGS.includes(slug as TimeFilter);
}

function buildH1(city?: string, category?: string, time?: TimeFilter): string {
  if (time === "today") {
    return city ? `עבודות להיום ב${city}` : "עבודות להיום";
  }
  if (time === "evening") {
    return city ? `עבודות ערב ב${city}` : "עבודות ערב";
  }
  if (time === "weekend") {
    return city ? `עבודות סוף שבוע ב${city}` : "עבודות סוף שבוע";
  }
  if (time === "immediate") {
    return city ? `עבודות מיידיות ב${city}` : "עבודות מיידיות";
  }
  if (city && category) {
    return `עבודות ${getCategoryLabel(category)} ב${city}`;
  }
  if (city) return `עבודות ב${city}`;
  if (category) return `עבודות ${getCategoryLabel(category)}`;
  return "חיפוש עבודה";
}

function buildDescription(city?: string, category?: string, time?: TimeFilter): string {
  if (time === "today") {
    return city
      ? `מצא עבודות דחופות להיום ב${city}. משרות שמתחילות היום — שליחויות, מטבח, מחסן ועוד.`
      : "משרות דחופות שמתחילות היום. לוח דרושים מהיר ופשוט — ללא עמלות.";
  }
  if (time === "evening") {
    return city
      ? `עבודות ערב ב${city} — משמרות ערב, שירות, אירועים ועוד. מצא עבודה לשעות הערב.`
      : "עבודות ערב בכל הארץ — משמרות ערב, שירות, אירועים ועוד. לוח דרושים מהיר.";
  }
  if (time === "weekend") {
    return city
      ? `עבודות סוף שבוע ב${city} — עבודות לשישי ושבת, אירועים, מסעדות ועוד.`
      : "עבודות סוף שבוע בכל הארץ — עבודות לשישי ושבת, אירועים, מסעדות ועוד.";
  }
  if (time === "immediate") {
    return city
      ? `עבודות מיידיות ב${city} — מעסיקים שצריכים עובד עכשיו. התחל לעבוד היום.`
      : "עבודות מיידיות — מעסיקים שצריכים עובד עכשיו. מצא עבודה ותתחיל היום.";
  }
  if (city && category) {
    return `מצא עבודות ${getCategoryLabel(category)} ב${city}. לוח דרושים מהיר ופשוט — משרות להיום, ללא עמלות.`;
  }
  if (city) {
    return `מצא עבודות זמניות ב${city}. שליחויות, מחסן, מטבח, ניקיון ועוד — לוח דרושים מהיר.`;
  }
  if (category) {
    return `מצא עבודות ${getCategoryLabel(category)} קרוב אליך. לוח דרושים מהיר ופשוט — ללא עמלות.`;
  }
  return "לוח דרושים מהיר ופשוט. מצא עבודות זמניות קרוב אליך.";
}

function buildCanonical(city?: string, category?: string, time?: TimeFilter): string {
  if (time) {
    return city ? `/jobs/${time}/${encodeURIComponent(city)}` : `/jobs/${time}`;
  }
  if (city && category) return `/jobs/${encodeURIComponent(category)}/${encodeURIComponent(city)}`;
  if (city) return `/jobs/${encodeURIComponent(city)}`;
  if (category) return `/jobs/${encodeURIComponent(category)}`;
  return "/find-jobs";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function JobsLanding() {
  const params = useParams<{ slug?: string; category?: string; city?: string }>();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | undefined>();
  type BottomSheetJobType = JobCardJob & { contactPhone: string | null };
  const [bottomSheetJob, setBottomSheetJob] = useState<BottomSheetJobType | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // Resolve city / category / time from URL params
  const { resolvedCity, resolvedCategory, resolvedTime } = useMemo(() => {
    // Pattern: /jobs/:category/:city (also handles /jobs/today/:city, /jobs/evening/:city, etc.)
    if (params.category && params.city) {
      if (isTimeSlug(params.category)) {
        return { resolvedCity: params.city, resolvedCategory: undefined, resolvedTime: params.category };
      }
      return { resolvedCity: params.city, resolvedCategory: params.category, resolvedTime: undefined };
    }
    // Pattern: /jobs/:slug — could be city, category, or time filter
    if (params.slug) {
      if (isTimeSlug(params.slug)) {
        return { resolvedCity: undefined, resolvedCategory: undefined, resolvedTime: params.slug };
      }
      if (isCategorySlug(params.slug)) {
        return { resolvedCity: undefined, resolvedCategory: params.slug, resolvedTime: undefined };
      }
      return { resolvedCity: params.slug, resolvedCategory: undefined, resolvedTime: undefined };
    }
    return { resolvedCity: undefined, resolvedCategory: undefined, resolvedTime: undefined };
  }, [params]);

  const h1 = buildH1(resolvedCity, resolvedCategory, resolvedTime);
  const description = buildDescription(resolvedCity, resolvedCategory, resolvedTime);
  const canonical = buildCanonical(resolvedCity, resolvedCategory, resolvedTime);

  // Fetch jobs for this city/category combo
  const jobsQuery = trpc.jobs.list.useQuery(
    {
      category: resolvedCategory ?? undefined,
      city: resolvedCity ?? undefined,
      limit: 50,
    },
    { staleTime: 5 * 60 * 1000 }
  );
  const todayQuery = trpc.jobs.listToday.useQuery({}, {
    enabled: resolvedTime === "today",
    staleTime: 5 * 60 * 1000,
  });
  const urgentQuery = trpc.jobs.listUrgent.useQuery({}, {
    enabled: resolvedTime === "immediate",
    staleTime: 5 * 60 * 1000,
  });

  // Extract jobs array from paginated response (jobs.list returns { jobs, total, page, limit })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawJobsData: JobCardJob[] = ((jobsQuery.data as any)?.jobs ?? []) as JobCardJob[];

  // Filter jobs based on time filter
  let jobs: JobCardJob[] = rawJobsData;
  if (resolvedTime === "today") {
    const todayIds = new Set((todayQuery.data ?? []).map((j: { id: number }) => j.id));
    jobs = rawJobsData.filter(j => todayIds.has(j.id));
  } else if (resolvedTime === "immediate") {
    // Use urgent jobs list, filtered by city if needed
    const urgentJobs = (urgentQuery.data ?? []) as JobCardJob[];
    jobs = resolvedCity
      ? urgentJobs.filter((j: JobCardJob) => j.city === resolvedCity)
      : urgentJobs;
  } else if (resolvedTime === "evening") {
    // Evening: jobs with workingHours containing "ערב" or "לילה" or "18" or "19" or "20"
    jobs = rawJobsData.filter((j: JobCardJob & { workingHours?: string | null }) => {
      const hours = (j.workingHours ?? "").toLowerCase();
      return hours.includes("ערב") || hours.includes("לילה") ||
             hours.includes("18") || hours.includes("19") || hours.includes("20") || hours.includes("21");
    });
    // If no evening-specific jobs found, show all jobs (better UX than empty page)
    if (jobs.length === 0) jobs = rawJobsData;
  } else if (resolvedTime === "weekend") {
    // Weekend: jobs with workingHours or title containing weekend keywords
    jobs = rawJobsData.filter((j: JobCardJob & { workingHours?: string | null }) => {
      const hours = (j.workingHours ?? "").toLowerCase();
      const title = (j.title ?? "").toLowerCase();
      return hours.includes("שישי") || hours.includes("שבת") || hours.includes("סוף שבוע") ||
             title.includes("שישי") || title.includes("שבת") || title.includes("סוף שבוע");
    });
    // If no weekend-specific jobs found, show all jobs
    if (jobs.length === 0) jobs = rawJobsData;
  }

  const isLoading = jobsQuery.isLoading ||
    (resolvedTime === "today" && todayQuery.isLoading) ||
    (resolvedTime === "immediate" && urgentQuery.isLoading);

  // noindex when no jobs found (and not still loading)
  const noIndex = !isLoading && jobs.length === 0;

  useSEO({
    title: h1,
    description,
    canonical,
    noIndex,
  });

  // JSON-LD BreadcrumbList structured data
  const breadcrumbItems = [
    { name: "בית", path: "/" },
    { name: "משרות", path: "/find-jobs" },
  ];
  if (resolvedTime === "today") breadcrumbItems.push({ name: "עבודות להיום", path: "/jobs/today" });
  if (resolvedTime === "evening") breadcrumbItems.push({ name: "עבודות ערב", path: "/jobs/evening" });
  if (resolvedTime === "weekend") breadcrumbItems.push({ name: "עבודות סוף שבוע", path: "/jobs/weekend" });
  if (resolvedTime === "immediate") breadcrumbItems.push({ name: "עבודות מיידיות", path: "/jobs/immediate" });
  if (resolvedCategory) breadcrumbItems.push({ name: getCategoryLabel(resolvedCategory), path: `/jobs/${encodeURIComponent(resolvedCategory)}` });
  if (resolvedCity) breadcrumbItems.push({ name: resolvedCity, path: canonical });

  useBreadcrumbSchema(breadcrumbItems);

  // JSON-LD ItemList + JobPosting structured data
  useJobListingSchema(
    jobs.map((j: JobCardJob) => ({
      id: j.id,
      title: j.title,
      description: j.title,
      city: j.city,
      salary: j.salary as string | null,
      salaryType: j.salaryType as "hourly" | "daily" | "monthly" | "volunteer" | null,
      isUrgent: j.isUrgent ?? undefined,
    })),
    h1,
    canonical
  );

  // Saved jobs
  const savedIdsQuery = trpc.savedJobs.getSavedIds.useQuery(undefined, { enabled: isAuthenticated });
  const savedIds = new Set(savedIdsQuery.data?.ids ?? []);
  const utils = trpc.useUtils();
  const saveMutation = trpc.savedJobs.save.useMutation({ onSuccess: () => utils.savedJobs.getSavedIds.invalidate() });
  const unsaveMutation = trpc.savedJobs.unsave.useMutation({ onSuccess: () => utils.savedJobs.getSavedIds.invalidate() });

  // Applications
  const myAppsQuery = trpc.jobs.myApplications.useQuery(undefined, { enabled: isAuthenticated });
  const appliedJobIds = new Set((myAppsQuery.data ?? []).map((a: { jobId: number }) => a.jobId));
  const applyMutation = trpc.jobs.applyToJob.useMutation({
    onSuccess: () => { utils.jobs.myApplications.invalidate(); toast.success("מועמדות הוגשה בהצלחה!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const requireLogin = (msg?: string) => {
    setLoginMessage(msg);
    saveReturnPath(window.location.pathname);
    setLoginOpen(true);
  };

  const handleApply = (jobId: number, message: string | undefined, origin: string) => {
    if (!isAuthenticated) { requireLogin("כדי להגיש מועמדות יש להתחבר"); return; }
    applyMutation.mutate({ jobId, message, origin });
  };

  const handleSaveToggle = (jobId: number, save: boolean) => {
    if (!isAuthenticated) { requireLogin("כדי לשמור משרות יש להתחבר למערכת"); return; }
    if (save) saveMutation.mutate({ jobId }); else unsaveMutation.mutate({ jobId });
  };

  // Time filter label for breadcrumb display
  const timeBreadcrumbLabel: Record<TimeFilter, string> = {
    today: "עבודות להיום",
    evening: "עבודות ערב",
    weekend: "עבודות סוף שבוע",
    immediate: "עבודות מיידיות",
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f8]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Visual Breadcrumb ── */}
        <nav
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-5 flex-wrap text-gray-400"
          dir="rtl"
        >
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/find-jobs" className="hover:text-gray-700 transition-colors">משרות</Link>
          {resolvedTime && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              <Link href={`/jobs/${resolvedTime}`} className="hover:text-gray-700 transition-colors">
                {timeBreadcrumbLabel[resolvedTime]}
              </Link>
            </>
          )}
          {resolvedCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              <Link
                href={`/jobs/${encodeURIComponent(resolvedCategory)}`}
                className="hover:text-gray-700 transition-colors"
              >
                {getCategoryLabel(resolvedCategory)}
              </Link>
            </>
          )}
          {resolvedCity && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              <span className="text-gray-600 font-medium">{resolvedCity}</span>
            </>
          )}
        </nav>

        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: resolvedTime === "immediate"
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : resolvedTime === "evening"
                  ? "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
                  : resolvedTime === "weekend"
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)",
                boxShadow: "0 4px 16px rgba(60,131,246,0.3)",
              }}
            >
              <Search className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">{h1}</h1>
          </div>
          <p className="text-sm text-gray-500">{description}</p>
        </div>

        {/* ── Job list ── */}
        {isLoading ? (
          <JobCardSkeletonList count={5} />
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-semibold">אין משרות כרגע</p>
            <p className="text-sm mt-1">נסה לחפש בעיר אחרת או קטגוריה אחרת</p>
            <Link
              href="/find-jobs"
              className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)" }}
            >
              לחיפוש כללי
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={{
                  ...job,
                  salary: job.salary ?? null,
                  businessName: job.businessName ?? null,
                  contactPhone: null as null,
                }}
                showDistance={false}
                isSaved={savedIds.has(job.id)}
                onSaveToggle={handleSaveToggle}
                onLoginRequired={requireLogin}
                onCardClick={(j) => { setBottomSheetJob({ ...j, contactPhone: j.contactPhone ?? null }); setBottomSheetOpen(true); }}
                onApply={handleApply}
                isApplied={appliedJobIds.has(job.id)}
                isApplyPending={applyMutation.isPending && applyMutation.variables?.jobId === job.id}
              />
            ))}
          </div>
        )}

        {/* ── Push Notification Banner ── */}
        {!jobsQuery.isLoading && jobs.length > 0 && (
          <div className="mt-4 mb-2">
            <PushNotificationBanner
              category={resolvedCategory}
              city={resolvedCity}
              compact
            />
          </div>
        )}

        {/* ── Internal SEO links ── */}
        <div className="mt-16 border-t border-gray-200 pt-8">

          {/* Time-based filter links */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">⏰</span>
              <h2 className="text-sm font-bold text-gray-700">חיפוש לפי זמן</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/jobs/today"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                🌅 עבודות להיום
              </Link>
              <Link
                href="/jobs/immediate"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                🚨 עבודות מיידיות
              </Link>
              <Link
                href="/jobs/evening"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
              >
                🌙 עבודות ערב
              </Link>
              <Link
                href="/jobs/weekend"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-600 transition-colors"
              >
                📅 עבודות סוף שבוע
              </Link>
            </div>
          </div>

          {/* Popular cities */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-gray-700">חיפוש לפי עיר</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEO_CITIES.map((city) => (
                <Link
                  key={city}
                  href={`/jobs/${encodeURIComponent(city)}`}
                  className="city-chip"
                >
                  עבודות ב{city}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular categories */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-gray-700">חיפוש לפי קטגוריה</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/jobs/${cat.value}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {cat.icon} עבודות {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Guide links */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">📖</span>
              <h2 className="text-sm font-bold text-gray-700">מדריכים לעבודות זמניות</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.filter((c) => c.value !== "other").map((cat) => (
                <Link
                  key={cat.value}
                  href={`/guide/temporary-jobs/${cat.value}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
                >
                  מדריך: {cat.label}
                </Link>
              ))}
              <Link
                href="/guide/temporary-jobs"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
              >
                כל המדריכים →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
      <JobBottomSheet
        job={bottomSheetJob}
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onLoginRequired={requireLogin}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
