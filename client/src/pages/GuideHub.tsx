import { Link } from "wouter";
import { ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { GUIDE_ENTRIES } from "@/data/guideContent";
import { getCategoryIcon } from "@shared/categories";

const CATEGORY_COLORS: Record<string, string> = {
  delivery: "#3b82f6",
  warehouse: "#f59e0b",
  kitchen: "#ef4444",
  cleaning: "#10b981",
  childcare: "#8b5cf6",
  eldercare: "#ec4899",
  security: "#6b7280",
  construction: "#f97316",
  retail: "#06b6d4",
  events: "#a855f7",
  agriculture: "#84cc16",
  other: "#64748b",
};

export default function GuideHub() {
  useSEO({
    title: "מדריך עבודות זמניות — כל מה שצריך לדעת | AvodaNow",
    description:
      "המדריך המקיף לעבודות זמניות בישראל: שליחויות, מטבח, ניקיון, בנייה, טיפול בילדים ועוד. טיפים מעשיים, שכר ריאלי ולינקים למשרות פעילות.",
    canonical: "https://avodanow.co.il/guide/temporary-jobs",
  });

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f8]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Breadcrumb ── */}
        <nav
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-6 flex-wrap text-gray-400"
        >
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium">מדריכים</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium">עבודות זמניות</span>
        </nav>

        {/* ── Hero ── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3c83f6 0%, #1d4ed8 100%)",
                boxShadow: "0 4px 20px rgba(60,131,246,0.35)",
              }}
            >
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                מדריך עבודות זמניות
              </h1>
              <p className="text-sm text-gray-500">כל מה שצריך לדעת לפני שמתחילים</p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed">
            בחרו קטגוריה כדי לקרוא מדריך מפורט עם טיפים מעשיים, מידע על שכר ריאלי, ציוד נדרש
            וקישורים ישירים למשרות פעילות באזורכם.
          </p>
        </div>

        {/* ── Category grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {GUIDE_ENTRIES.filter((e) => e.slug !== "other").map((entry) => {
            const color = CATEGORY_COLORS[entry.category] ?? "#64748b";
            return (
              <Link
                key={entry.slug}
                href={`/guide/temporary-jobs/${entry.slug}`}
                className="group block bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${color}18`, border: `1.5px solid ${color}30` }}
                  >
                    {getCategoryIcon(entry.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {entry.title.replace(" — המדריך המלא", "")}
                      </h2>
                      <ArrowLeft className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {entry.metaDescription}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Bottom CTA ── */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)",
          }}
        >
          <p className="text-white font-bold text-lg mb-1">מוכנים להתחיל לעבוד?</p>
          <p className="text-blue-200 text-sm mb-4">
            אלפי משרות זמניות מחכות לכם — הגישו מועמדות תוך דקות
          </p>
          <Link
            href="/find-jobs"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)" }}
          >
            חפש עבודה עכשיו
          </Link>
        </div>
      </div>
    </div>
  );
}
