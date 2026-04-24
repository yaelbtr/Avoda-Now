/**
 * PassoverLandingPage — SEO landing page for Passover cleaning job keywords.
 *
 * Route patterns (registered in App.tsx):
 *   /jobs/ניקיון-לפסח   → "ניקיון לפסח" keyword landing
 *   /jobs/מנקה-לפסח     → "מנקה לפסח" keyword landing
 *
 * Renders job listings (cleaning category) with:
 *   - Dedicated <h1> and meta tags for each keyword variant
 *   - FAQ JSON-LD (FAQPage schema) for rich snippets
 *   - BreadcrumbList + Article JSON-LD
 *   - Internal SEO links to guide and related pages
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useBreadcrumbSchema } from "@/hooks/useStructuredData";
import { trpc } from "@/lib/trpc";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import JobBottomSheet from "@/components/JobBottomSheet";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { Briefcase, ChevronRight, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { saveReturnPath } from "@/const";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

const BASE_URL = "https://avodanow.co.il";

// ─── FAQ data shared across both keyword variants ─────────────────────────────
const PASSOVER_FAQ = [
  {
    question: "כמה משתכרת מנקה לפסח?",
    answer: "שכר מנקה לפסח עומד בדרך כלל על 45–70 ₪ לשעה, תלוי באזור ובסוג העבודה. בעבודות ניקיון יסודי לפסח השכר יכול להגיע ל-80–90 ₪ לשעה.",
  },
  {
    question: "מתי מתחילות עבודות ניקיון לפסח?",
    answer: "עבודות ניקיון לפסח מתחילות בדרך כלל 3–4 שבועות לפני החג. המעסיקים מתחילים לגייס מוקדם, ומומלץ להירשם מוקדם כדי להבטיח עבודה.",
  },
  {
    question: "האם צריך ניסיון לעבודת ניקיון לפסח?",
    answer: "לא, בדרך כלל לא נדרש ניסיון קודם. כלי ניקיון לרוב מסופקים על ידי המעסיק. חשוב להגיע עם בגדים שניתן ללכלך וזמינות גבוהה.",
  },
  {
    question: "איפה מוצאים עבודות ניקיון לפסח?",
    answer: "אפשר למצוא עבודות ניקיון לפסח באתר YallaAvoda, בחברות ניקיון מקומיות, ובדפי מדיה חברתיים. הירשמו מוקדם כי העבודות מתמלאות מהר.",
  },
  {
    question: "כמה שעות עובדים בניקיון לפסח?",
    answer: "בדרך כלל 4–8 שעות ביום, לפי הסכמה עם המעסיק. חלק מהעבודות הן חד-פעמיות (ניקיון יסודי לבית אחד) וחלק הן מספר ימים רצופים.",
  },
];

// ─── City list for SEO links ──────────────────────────────────────────────────
const PASSOVER_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
];

// ─── Slug → content mapping ───────────────────────────────────────────────────
type PassoverSlug = "ניקיון-לפסח" | "מנקה-לפסח";

interface SlugContent {
  h1: string;
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  intro: string;
}

const SLUG_CONTENT: Record<PassoverSlug, SlugContent> = {
  "ניקיון-לפסח": {
    h1: "עבודות ניקיון לפסח",
    title: "עבודות ניקיון לפסח | מצא עבודה עכשיו",
    description: "מצא עבודות ניקיון לפסח קרוב אליך. שכר 45–90 ₪ לשעה, עבודה מיידית. לוח דרושים מהיר לניקיון לפסח — ללא עמלות.",
    keywords: "ניקיון לפסח, עבודות ניקיון לפסח, עבודת ניקיון לפסח, ניקיון לפסח דרושים, עובדי ניקיון לפסח",
    canonical: "/jobs/ניקיון-לפסח",
    intro: "מחפשים עבודת ניקיון לפסח? אלפי בתים ועסקים בישראל מחפשים עובדי ניקיון לפני הפסח. מצא עבודה קרוב אליך — שכר טוב, עבודה מיידית.",
  },
  "מנקה-לפסח": {
    h1: "דרוש/ה מנקה לפסח",
    title: "מנקה לפסח — דרושים | YallaAvoda",
    description: "דרוש/ה מנקה לפסח? מצא עבודות ניקיון לפסח קרוב אליך. שכר 45–90 ₪ לשעה, עבודה מיידית. הירשם עכשיו — ללא עמלות.",
    keywords: "מנקה לפסח, דרוש מנקה לפסח, דרושה מנקה לפסח, עוזרת בית לפסח, עבודות מנקה לפסח",
    canonical: "/jobs/מנקה-לפסח",
    intro: "מחפשים עבודה כמנקה לפסח? עבודות ניקיון לפסח מתחילות כבר 3–4 שבועות לפני החג. הירשם עכשיו ומצא עבודה קרוב אליך — שכר טוב, ללא ניסיון נדרש.",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PassoverLandingPage() {
  const params = useParams<{ slug?: string }>();
  const slug = (params.slug ?? "ניקיון-לפסח") as PassoverSlug;
  const content = SLUG_CONTENT[slug] ?? SLUG_CONTENT["ניקיון-לפסח"];

  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | undefined>();
  type BottomSheetJobType = JobCardJob & { contactPhone: string | null };
  const [bottomSheetJob, setBottomSheetJob] = useState<BottomSheetJobType | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // Fetch cleaning jobs
  const jobsQuery = trpc.jobs.list.useQuery(
    { category: "cleaning", limit: 50 },
    { staleTime: 5 * 60 * 1000 }
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobs: JobCardJob[] = ((jobsQuery.data as any)?.jobs ?? []) as JobCardJob[];
  const isLoading = jobsQuery.isLoading;
  const noIndex = !isLoading && jobs.length === 0;

  useSEO({
    title: content.h1,
    description: content.description,
    canonical: content.canonical,
    keywords: content.keywords,
    noIndex,
  });

  // BreadcrumbList JSON-LD
  useBreadcrumbSchema([
    { name: "בית", path: "/" },
    { name: "משרות", path: "/find-jobs" },
    { name: "עבודות ניקיון", path: "/jobs/cleaning" },
    { name: content.h1, path: content.canonical },
  ]);

  // Article + FAQPage JSON-LD
  useEffect(() => {
    const id = `passover-landing-jsonld-${slug}`;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: content.h1,
          description: content.description,
          url: `${BASE_URL}${content.canonical}`,
          publisher: { "@type": "Organization", name: "YallaAvoda", url: BASE_URL },
          inLanguage: "he",
          keywords: content.keywords,
        },
        {
          "@type": "FAQPage",
          mainEntity: PASSOVER_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ],
    });
    return () => { document.getElementById(id)?.remove(); };
  }, [slug, content]);

  // Saved jobs
  const savedIdsQuery = trpc.savedJobs.getSavedIds.useQuery(undefined, authQuery());
  const savedIds = new Set(savedIdsQuery.data?.ids ?? []);
  const utils = trpc.useUtils();
  const saveMutation = trpc.savedJobs.save.useMutation({ onSuccess: () => utils.savedJobs.getSavedIds.invalidate() });
  const unsaveMutation = trpc.savedJobs.unsave.useMutation({ onSuccess: () => utils.savedJobs.getSavedIds.invalidate() });

  // Applications
  const myAppsQuery = trpc.jobs.myApplications.useQuery(undefined, authQuery());
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

        {/* ── Visual Breadcrumb ── */}
        <nav
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-5 flex-wrap text-gray-400"
          dir="rtl"
        >
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/find-jobs" className="hover:text-gray-700 transition-colors">משרות</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/jobs/cleaning" className="hover:text-gray-700 transition-colors">ניקיון</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium">{content.h1}</span>
        </nav>

        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)",
                boxShadow: "0 4px 16px rgba(60,131,246,0.3)",
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">{content.h1}</h1>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{content.intro}</p>
        </div>

        {/* ── Passover info banner ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🌾</span>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">עונת הניקיון לפסח</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                עבודות ניקיון לפסח מתחילות כ-4 שבועות לפני החג ומסתיימות ערב פסח.
                הירשם עכשיו — העבודות מתמלאות מהר!
              </p>
            </div>
          </div>
        </div>

        {/* ── Job list ── */}
        {isLoading ? (
          <JobCardSkeletonList count={5} />
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-semibold">אין משרות ניקיון כרגע</p>
            <p className="text-sm mt-1">נסה לחפש בקטגוריות נוספות</p>
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
        {!isLoading && jobs.length > 0 && (
          <div className="mt-4 mb-2">
            <PushNotificationBanner category="cleaning" compact />
          </div>
        )}

        {/* ── FAQ Section ── */}
        <div className="mt-10 mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            שאלות נפוצות על עבודות ניקיון לפסח
          </h2>
          <div className="space-y-3">
            {PASSOVER_FAQ.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-800 mb-1.5">{item.question}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Internal SEO links ── */}
        <div className="border-t border-gray-200 pt-8">

          {/* Passover cities */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-700 mb-3">ניקיון לפסח לפי עיר</h2>
            <div className="flex flex-wrap gap-2">
              {PASSOVER_CITIES.map((city) => (
                <Link
                  key={city}
                  href={`/jobs/cleaning/${encodeURIComponent(city)}`}
                  className="city-chip"
                >
                  ניקיון לפסח ב{city}
                </Link>
              ))}
            </div>
          </div>

          {/* Related links */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-700 mb-3">קישורים קשורים</h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/jobs/cleaning"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                🧹 כל עבודות הניקיון
              </Link>
              <Link
                href="/guide/passover-jobs"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
              >
                📖 מדריך עבודות פסח
              </Link>
              <Link
                href="/jobs/immediate"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                🚨 עבודות מיידיות
              </Link>
              <Link
                href="/jobs/today"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                🌅 עבודות להיום
              </Link>
              {slug === "ניקיון-לפסח" ? (
                <Link
                  href="/jobs/מנקה-לפסח"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  דרוש/ה מנקה לפסח
                </Link>
              ) : (
                <Link
                  href="/jobs/ניקיון-לפסח"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  עבודות ניקיון לפסח
                </Link>
              )}
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