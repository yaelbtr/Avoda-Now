/**
 * ProgrammaticPageWrapper
 *
 * Route-level adapter: receives categorySlug + rawCitySlug from the wouter
 * route params, derives the intent from the city slug suffix
 * (-בדחיפות → urgent, -מחיר → price, no suffix → how_to), looks up the
 * matching ProgrammaticPage data from the static content engine, and renders
 * ProgrammaticPage (or NotFound).
 *
 * Design note: wouter + regexparam cannot distinguish /:city from
 * /:city-בדחיפות at the routing level (both produce the same regex).
 * Therefore we use a single route per category and parse the intent here.
 */
import { lazy, Suspense } from "react";
import NotFound from "./NotFound";
import { PROGRAMMATIC_PAGES } from "@/data/programmaticContent";
import type { Intent } from "@/data/programmaticContent";

const ProgrammaticPage = lazy(() => import("./ProgrammaticPage"));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

interface Props {
  /** Category slug as used in the URL (e.g. "cleaning", "dog-walker") */
  categorySlug: string;
  /**
   * Raw city slug from the URL param — may include an intent suffix:
   *   "תל-אביב"          → how_to
   *   "תל-אביב-בדחיפות"  → urgent
   *   "תל-אביב-מחיר"     → price
   */
  rawCitySlug: string;
}

/** Derive intent and clean city slug from the raw URL segment. */
function parseIntentFromSlug(raw: string): { citySlug: string; intent: Intent } {
  if (raw.endsWith("-בדחיפות")) {
    return { citySlug: raw.slice(0, -"-בדחיפות".length), intent: "urgent" };
  }
  if (raw.endsWith("-מחיר")) {
    return { citySlug: raw.slice(0, -"-מחיר".length), intent: "price" };
  }
  return { citySlug: raw, intent: "how_to" };
}

export default function ProgrammaticPageWrapper({ categorySlug, rawCitySlug }: Props) {
  const { citySlug, intent } = parseIntentFromSlug(rawCitySlug);

  const page = PROGRAMMATIC_PAGES.find(
    (p) =>
      p.category.slug === categorySlug &&
      p.city.slug === citySlug &&
      p.intent === intent
  );

  if (!page) return <NotFound />;

  return (
    <Suspense fallback={<PageLoader />}>
      <ProgrammaticPage page={page} />
    </Suspense>
  );
}
