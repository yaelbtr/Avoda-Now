/**
 * ProgrammaticPageWrapper
 *
 * Route-level adapter: receives categorySlug + citySlug + intent from the
 * wouter route params, looks up the matching ProgrammaticPage data from the
 * static content engine, and renders ProgrammaticPage (or NotFound).
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
  categorySlug: string;
  citySlug: string;
  intent: Intent;
}

export default function ProgrammaticPageWrapper({ categorySlug, citySlug, intent }: Props) {
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
