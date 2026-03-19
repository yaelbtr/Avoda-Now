import { Briefcase, Mail, Zap, Users } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { trpc } from "@/lib/trpc";
import { BrandName } from "@/components/ui";

const FG_PRIMARY  = "oklch(0.9904 0.0107 95.3 / 0.85)";
const FG_MUTED    = "oklch(0.9904 0.0107 95.3 / 0.45)";
const ACCENT      = "var(--citrus)";
const DIVIDER     = "oklch(1 0 0 / 0.08)";

// SEO cities — real Hebrew city names used as URL params
const SEO_CITIES = [
  "תל אביב",
  "ירושלים",
  "חיפה",
  "ראשון לציון",
  "פתח תקווה",
  "אשדוד",
  "נתניה",
  "באר שבע",
  "בני ברק",
  "רמת גן",
  "הרצליה",
  "רחובות",
];



export default function Footer() {
  const { categories: seoCategories } = useCategories();

  // Dynamic badge: show active jobs if >50, closed if >50, workers if >100, else null
  const { data: hs } = trpc.live.heroStats.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const jobsBadge: string | null = (() => {
    if (!hs) return null;
    if (hs.activeJobs > 50)         return `${hs.activeJobs}+ משרות פעילות`;
    if (hs.closedJobs > 50)         return `${hs.closedJobs}+ משרות שנסגרו`;
    if (hs.registeredWorkers > 100) return `${hs.registeredWorkers}+ עובדים רשומים`;
    return null;
  })();

  return (
    <footer
      dir="rtl"
      style={{
        background: "var(--footer-bg)",
        borderTop: `1px solid ${DIVIDER}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.44 0.07 124.9 / 0.15) 0%, transparent 70%)",
        }}
      />

      <div className="w-full px-4 pt-10 pb-6 relative z-10">

        {/* ── Brand row ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
                boxShadow:
                  "0 4px 12px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)",
              }}
            >
              <Briefcase className="h-4 w-4" style={{ color: ACCENT }} />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-black text-[18px]"
                style={{
                  color: "var(--header-fg)",
                  fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
                  letterSpacing: "-0.03em",
                }}
              >
                Avoda<span style={{ color: ACCENT }}>Now</span>
              </span>
              <span className="text-[9px] font-bold uppercase" style={{ color: FG_MUTED, letterSpacing: "0.14em" }}>
                עובדים תוך דקות
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {jobsBadge && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: FG_MUTED }}>
                <Zap className="h-3 w-3" style={{ color: ACCENT }} />
                <span>{jobsBadge}</span>
              </div>
            )}
            {hs && hs.registeredWorkers > 0 && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: FG_MUTED }}>
                <Users className="h-3 w-3" style={{ color: ACCENT }} />
                <span>{hs.registeredWorkers}+ עובדים רשומים</span>
              </div>
            )}
            <a
              href="mailto:info@avodanow.co.il"
              className="inline-flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: FG_MUTED }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_MUTED)}
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span lang="en">info@avodanow.co.il</span>
            </a>
          </div>
        </div>

        {/* ── SEO divider ── */}
        <div style={{ borderTop: `1px solid ${DIVIDER}` }} className="mb-8" />

        {/* ── SEO Link Groups ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">

          {/* Group 1 – Jobs by city */}
          <div>
            <h2
              className="font-bold text-[11px] uppercase mb-3 text-right"
              style={{ color: ACCENT, letterSpacing: "0.12em" }}
            >
              משרות לפי עיר
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
              {SEO_CITIES.map((city) => (
                <li key={city}>
                  <a
                    href={`/jobs/${encodeURIComponent(city)}`}
                    className="text-[13px] transition-colors"
                    style={{ color: FG_PRIMARY }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                  >
                    עבודות ב{city}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Group 2 – Jobs by category */}
          <div>
            <h2
              className="font-bold text-[11px] uppercase mb-3 text-right"
              style={{ color: ACCENT, letterSpacing: "0.12em" }}
            >
              משרות לפי קטגוריה
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
              {seoCategories.map((cat) => (
                <li key={cat.slug}>
                  <a
                    href={`/jobs/${cat.slug}`}
                    className="text-[13px] transition-colors"
                    style={{ color: FG_PRIMARY }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                  >
                    עבודות {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Time-based SEO links ── */}
        <div className="mb-6" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          <h2
            className="font-bold text-[11px] uppercase mb-3 mt-6 text-right"
            style={{ color: ACCENT, letterSpacing: "0.12em" }}
          >
            משרות לפי זמן
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
            {[
              { href: "/jobs/today", label: "עבודות להיום" },
              { href: "/jobs/immediate", label: "עבודות מיידיות" },
              { href: "/jobs/evening", label: "עבודות ערב" },
              { href: "/jobs/weekend", label: "עבודות סוף שבוע" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[13px] transition-colors"
                  style={{ color: FG_PRIMARY }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Best Jobs + FAQ links ── */}
        <div className="mb-6" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          <h2
            className="font-bold text-[11px] uppercase mb-3 mt-6 text-right"
            style={{ color: ACCENT, letterSpacing: "0.12em" }}
          >
            משרות מומלצות
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
            {[
              { href: "/best/delivery-jobs", label: "עבודות שליחויות הטובות" },
              { href: "/best/student-jobs", label: "עבודות לסטודנטים" },
              { href: "/best/evening-jobs", label: "עבודות ערב הטובות" },
              { href: "/best/weekend-jobs", label: "עבודות סוף שבוע" },
              { href: "/best/immediate-jobs", label: "עבודות מיידיות" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[13px] transition-colors"
                  style={{ color: FG_PRIMARY }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <h2
            className="font-bold text-[11px] uppercase mb-3 mt-5 text-right"
            style={{ color: ACCENT, letterSpacing: "0.12em" }}
          >
            שאלות נפוצות
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
            {[
              { href: "/faq/jobs", label: "שאלות נפוצות על עבודה" },
              { href: "/faq/delivery-jobs", label: "שאלות על שליחויות" },
              { href: "/faq/student-jobs", label: "שאלות על עבודות לסטודנטים" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[13px] transition-colors"
                  style={{ color: FG_PRIMARY }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Guide links ── */}
        <div className="mb-8" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          <h2
            className="font-bold text-[11px] uppercase mb-3 mt-6 text-right"
            style={{ color: ACCENT, letterSpacing: "0.12em" }}
          >
            מדריכים לעבודות זמניות
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
            {seoCategories.map((cat) => (
              <li key={cat.slug}>
                <a
                  href={`/guide/temporary-jobs/${cat.slug}`}
                  className="text-[13px] transition-colors"
                  style={{ color: FG_PRIMARY }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                >
                  מדריך: {cat.name}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/guide/student-jobs"
                className="text-[13px] transition-colors"
                style={{ color: FG_PRIMARY }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
              >
                מדריך: עבודות לסטודנטים
              </a>
            </li>
            <li>
              <a
                href="/guide/delivery-salary"
                className="text-[13px] transition-colors"
                style={{ color: FG_PRIMARY }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
              >
                מדריך: שכר שליח
              </a>
            </li>
            <li>
              <a
                href="/guide/passover-jobs"
                className="text-[13px] transition-colors"
                style={{ color: FG_PRIMARY }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
              >
                מדריך: עבודות לפסח
              </a>
            </li>
            <li>
              <a
                href="/guide/temporary-jobs"
                className="text-[13px] font-semibold transition-colors"
                style={{ color: ACCENT }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = ACCENT)}
              >
                כל המדריכים →
              </a>
            </li>
          </ul>
        </div>

        {/* ── Legal footer ── */}
        <div
          className="pt-5 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${DIVIDER}` }}
        >
          {/* Legal section header */}
          <h2
            className="font-bold text-[11px] uppercase text-right"
            style={{ color: ACCENT, letterSpacing: "0.12em" }}
          >
            מסמכים משפטיים
          </h2>
          {/* Legal links row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {([
              { href: "/legal", label: "כל המסמכים המשפטיים" },
              { href: "/terms", label: "תנאי שימוש" },
              { href: "/privacy", label: "מדיניות פרטיות" },
              { href: "/job-posting-policy", label: "מדיניות פרסום משרות" },
              { href: "/safety-policy", label: "מדיניות בטיחות" },
              { href: "/user-content-policy", label: "מדיניות תוכן" },
              { href: "/reviews-policy", label: "מדיניות ביקורות" },
            ] as { href: string; label: string }[]).map((link, i, arr) => (
              <span key={link.href} className="flex items-center gap-4">
                <a
                  href={link.href}
                  className="text-[12px] transition-colors"
                  style={{ color: ACCENT }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = ACCENT as string)}
                >
                  {link.label}
                </a>
                {i < arr.length - 1 && <span style={{ color: FG_MUTED }}>·</span>}
              </span>
            ))}
          </div>
          <p className="text-[11px] font-medium" style={{ color: FG_MUTED }}>
            © {new Date().getFullYear()} <BrandName /> · כל הזכויות שמורות
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: FG_MUTED }}>
          <BrandName /> אינה סוכנת תיווך. הפלטפורמה מספקת עובדים תוך דקות לעבודות בית ואירועים. הפלטפורמה אינה אחראית לתנאי העסקה בין הצדדים.
        </p>
        {/* Gender disclaimer */}
        <p className="text-[11px] text-center mt-1 leading-relaxed" style={{ color: FG_MUTED }}>
          לשון זכר בפלטפורמה נועדה מטעמי נוחות בלבד ומתייחסת לכל המינים.
        </p>
      </div>
    </footer>
  );
}
