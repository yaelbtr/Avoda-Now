/**
 * AEORoutes — thin route wrappers that resolve slug → AEOPage data
 * and render AEOPageComponent.
 *
 * Routes handled:
 *   /questions/:slug   → QuestionPage
 *   /compare/:slug     → ComparePage
 *   /for/:slug         → AudiencePage
 *   /about             → AboutPage  (slug="about")
 *   /faq-general       → FAQGeneralPage (slug="general")
 *   /reviews           → ReviewsPage (slug="reviews")
 *
 * Hub pages (index lists):
 *   /questions         → QuestionsHub
 *   /compare           → CompareHub
 *   /for               → AudienceHub
 */
import { useParams, Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import AEOPageComponent from "./AEOPage";
import {
  AEO_PAGES,
  getAEOPage,
  getAEOPagesByType,
  type AEOPage,
} from "@/data/aeoContent";
import NotFound from "./NotFound";

// ── Slug-based route wrappers ─────────────────────────────────────────────────

export function QuestionPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getAEOPage("question", slug ?? "");
  if (!page) return <NotFound />;
  return <AEOPageComponent page={page} />;
}

export function ComparePage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getAEOPage("compare", slug ?? "");
  if (!page) return <NotFound />;
  return <AEOPageComponent page={page} />;
}

export function AudiencePage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getAEOPage("audience", slug ?? "");
  if (!page) return <NotFound />;
  return <AEOPageComponent page={page} />;
}

export function AboutPage() {
  const page = getAEOPage("trust", "about");
  if (!page) return <NotFound />;
  return <AEOPageComponent page={page} />;
}

export function FAQGeneralPage() {
  const page = getAEOPage("trust", "general");
  if (!page) return <NotFound />;
  return <AEOPageComponent page={page} />;
}

export function ReviewsPage() {
  const page = getAEOPage("trust", "reviews");
  if (!page) return <NotFound />;
  return <AEOPageComponent page={page} />;
}

// ── Hub page component ────────────────────────────────────────────────────────

function HubCard({ page, basePath }: { page: AEOPage; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${page.slug}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <h2 className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug mb-2">
        {page.h1}
      </h2>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
        {page.metaDescription}
      </p>
      <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 font-medium">
        קרא עוד
        <ChevronRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

export function QuestionsHub() {
  useSEO({
    title: "שאלות ותשובות על עבודה זמנית בישראל | AvodaNow",
    description:
      "תשובות לשאלות הנפוצות ביותר על עבודה זמנית בישראל — כמה מרוויחים, איך מוצאים עבודה, ומה הזכויות.",
  });
  const pages = getAEOPagesByType("question");
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4">
            <ChevronRight className="h-3 w-3" /> דף הבית
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            שאלות ותשובות על עבודה זמנית
          </h1>
          <p className="text-sm text-gray-600">
            תשובות מפורטות לשאלות הנפוצות ביותר על עבודה זמנית בישראל.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pages.map((page) => (
            <HubCard key={page.slug} page={page} basePath="/questions" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CompareHub() {
  useSEO({
    title: "השוואות פלטפורמות עבודה זמנית | AvodaNow",
    description:
      "השוואות מפורטות בין AvodaNow לחלופות — יד2, פייסבוק, חברות כוח אדם.",
  });
  const pages = getAEOPagesByType("compare");
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4">
            <ChevronRight className="h-3 w-3" /> דף הבית
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            השוואות — AvodaNow לעומת חלופות
          </h1>
          <p className="text-sm text-gray-600">
            השוואות מפורטות בין AvodaNow לפלטפורמות אחרות למציאת עבודה זמנית.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pages.map((page) => (
            <HubCard key={page.slug} page={page} basePath="/compare" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AudienceHub() {
  useSEO({
    title: "AvodaNow — למי זה מיועד | AvodaNow",
    description:
      "AvodaNow מתאימה לעובדים, מעסיקים, סטודנטים, הורים ועוד — גלה איך הפלטפורמה עוזרת לך.",
  });
  const pages = getAEOPagesByType("audience");
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4">
            <ChevronRight className="h-3 w-3" /> דף הבית
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            AvodaNow — למי זה מיועד?
          </h1>
          <p className="text-sm text-gray-600">
            AvodaNow מתאימה לכל מי שמחפש עבודה זמנית או צריך עובד זמני.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pages.map((page) => (
            <HubCard key={page.slug} page={page} basePath="/for" />
          ))}
        </div>
      </div>
    </div>
  );
}
