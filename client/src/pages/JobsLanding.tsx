/**
 * JobsLanding — SEO landing page for /jobs/{city}, /jobs/{category}, /jobs/{category}/{city}
 *
 * Route patterns (handled in App.tsx):
 *   /jobs/:slug          → could be a city name or a category slug
 *   /jobs/:category/:city → category + city combo
 *
 * Renders the same FindJobs UI but with:
 *   - Dynamic <h1> derived from URL params
 *   - Dynamic <title> / <meta description> / canonical
 *   - noindex when no active jobs exist for this combo
 *   - Internal SEO links section at the bottom (popular cities + categories)
 */
import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { JOB_CATEGORIES, getCategoryLabel } from "@shared/categories";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import JobBottomSheet from "@/components/JobBottomSheet";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { MapPin, Briefcase, Search } from "lucide-react";
import { toast } from "sonner";
import { saveReturnPath } from "@/const";

// ─── Popular cities shown in SEO link section ────────────────────────────────
const SEO_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
  "חולון", "רחובות", "אשקלון", "בת ים", "הרצליה",
];

// ─── All category slugs ───────────────────────────────────────────────────────
const ALL_CATEGORY_SLUGS = JOB_CATEGORIES.map((c) => c.value);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isCategorySlug(slug: string): boolean {
  return ALL_CATEGORY_SLUGS.includes(slug as (typeof ALL_CATEGORY_SLUGS)[number]);
}

function buildH1(city?: string, category?: string): string {
  if (city && category) {
    return `עבודות ${getCategoryLabel(category)} ב${city}`;
  }
  if (city) return `עבודות ב${city}`;
  if (category) return `עבודות ${getCategoryLabel(category)}`;
  return "חיפוש עבודה";
}

function buildDescription(city?: string, category?: string): string {
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

function buildCanonical(city?: string, category?: string): string {
  if (city && category) return `/jobs/${encodeURIComponent(category)}/${encodeURIComponent(city)}`;
  if (city) return `/jobs/${encodeURIComponent(city)}`;
  if (category) return `/jobs/${encodeURIComponent(category)}`;
  return "/find-jobs";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function JobsLanding() {
  const params = useParams<{ slug?: string; category?: string; city?: string }>();
  const { isAuthenticated, user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | undefined>();
  type BottomSheetJobType = JobCardJob & { contactPhone: string | null };
  const [bottomSheetJob, setBottomSheetJob] = useState<BottomSheetJobType | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // Resolve city / category from URL params
  const { resolvedCity, resolvedCategory } = useMemo(() => {
    // Pattern: /jobs/:category/:city
    if (params.category && params.city) {
      return { resolvedCity: params.city, resolvedCategory: params.category };
    }
    // Pattern: /jobs/:slug — could be city or category
    if (params.slug) {
      if (isCategorySlug(params.slug)) {
        return { resolvedCity: undefined, resolvedCategory: params.slug };
      }
      return { resolvedCity: params.slug, resolvedCategory: undefined };
    }
    return { resolvedCity: undefined, resolvedCategory: undefined };
  }, [params]);

  const h1 = buildH1(resolvedCity, resolvedCategory);
  const description = buildDescription(resolvedCity, resolvedCategory);
  const canonical = buildCanonical(resolvedCity, resolvedCategory);

  // Fetch jobs for this city/category combo
  const jobsQuery = trpc.jobs.list.useQuery(
    {
      category: resolvedCategory ?? undefined,
      city: resolvedCity ?? undefined,
      limit: 50,
    },
    { staleTime: 5 * 60 * 1000 }
  );
  const jobs = jobsQuery.data ?? [];
  const isLoading = jobsQuery.isLoading;

  // noindex when no jobs found (and not still loading)
  const noIndex = !isLoading && jobs.length === 0;

  useSEO({
    title: h1,
    description,
    canonical,
    noIndex,
  });

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

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f8]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)",
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

        {/* ── Internal SEO links ── */}
        <div className="mt-16 border-t border-gray-200 pt-8">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  עבודות ב{city}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular categories */}
          <div>
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
