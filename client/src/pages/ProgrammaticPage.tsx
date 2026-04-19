/**
 * ProgrammaticPage — Hybrid SEO/AEO page template.
 *
 * Static content (H1, intro, sections, FAQ, schema.org) is rendered
 * immediately from the content engine, making it fully crawlable.
 * Live workers widget loads client-side via tRPC after first paint.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Phone, ChevronLeft, Users } from "lucide-react";
import type { ProgrammaticPage as PageData } from "@/data/programmaticContent";
import { PROGRAMMATIC_PAGES } from "@/data/programmaticContent";
import { useAuth } from "@/contexts/AuthContext";

// ─── Schema.org JSON-LD ───────────────────────────────────────────────────────

function SchemaLD({ page }: { page: PageData }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": page.faq.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "בית", "item": "/" },
      { "@type": "ListItem", "position": 2, "name": page.category.nameHe, "item": `/${page.category.slug.replace("_", "-")}` },
      { "@type": "ListItem", "position": 3, "name": page.city.name, "item": `/${page.slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

// ─── Live Workers Widget ──────────────────────────────────────────────────────

function LiveWorkersWidget({ page }: { page: PageData }) {
  const { isAuthenticated } = useAuth();
  const openLoginModal = () => window.dispatchEvent(new CustomEvent("avodanow:phone-required"));

  const { data, isLoading } = trpc.workers.nearby.useQuery(
    { lat: page.city.lat, lng: page.city.lng, radiusKm: 15, limit: 6 },
    { staleTime: 2 * 60 * 1000 }
  );

  const workers = data ?? [];

  return (
    <section className="my-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <h2 className="text-lg font-bold text-card-foreground">
          עובדים זמינים עכשיו ב{page.city.name}
        </h2>
        {workers.length > 0 && (
          <Badge variant="secondary" className="mr-auto">
            {workers.length} זמינים
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && workers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          אין עובדים זמינים כרגע ב{page.city.name}. פרסם משרה ועובדים יפנו אליך.
        </p>
      )}

      {!isLoading && workers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {workers.map(w => (
            <Card key={w.id} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {(w.userName ?? "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-card-foreground truncate">
                    {w.userName ?? "עובד"}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{w.city ?? page.city.name}</span>
                    {w.distance != null && (
                      <span className="mr-1">· {w.distance} ק"מ</span>
                    )}
                  </div>
                  {w.note && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{w.note}</p>
                  )}
                </div>
                {isAuthenticated && w.userPhone ? (
                  <a
                    href={`tel:${w.userPhone}`}
                    className="shrink-0"
                    aria-label="התקשר לעובד"
                  >
                    <Button size="sm" variant="outline" className="gap-1 text-xs">
                      <Phone className="h-3 w-3" />
                      התקשר
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 text-xs"
                    onClick={() => openLoginModal()}
                  >
                    <Phone className="h-3 w-3" />
                    צור קשר
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 text-center">
        <Link href="/post-job">
          <Button className="gap-2">
            <Users className="h-4 w-4" />
            {page.category.ctaLabel}
          </Button>
        </Link>
      </div>
    </section>
  );
}

// ─── Related Pages Sidebar ────────────────────────────────────────────────────

function RelatedPages({ slugs }: { slugs: string[] }) {
  const related = slugs
    .map(s => PROGRAMMATIC_PAGES.find(p => p.slug === s))
    .filter(Boolean) as PageData[];

  if (related.length === 0) return null;

  return (
    <aside className="rounded-2xl border border-border bg-muted/30 p-5">
      <h3 className="font-bold text-sm text-foreground mb-3">מאמרים קשורים</h3>
      <ul className="space-y-2">
        {related.map(p => (
          <li key={p.slug}>
            <Link
              href={`/${p.slug}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ChevronLeft className="h-3 w-3 shrink-0" />
              <span>{p.h1}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  page: PageData;
}

export default function ProgrammaticPage({ page }: Props) {
  // Update document title and meta description
  useEffect(() => {
    document.title = page.metaTitle;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = page.metaDescription;
  }, [page.metaTitle, page.metaDescription]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SchemaLD page={page} />

      {/* Breadcrumb */}
      <nav className="container py-3 text-sm text-muted-foreground flex items-center gap-1">
        <Link href="/" className="hover:text-foreground">בית</Link>
        <ChevronLeft className="h-3 w-3" />
        <span className="text-foreground">{page.category.nameHe}</span>
        <ChevronLeft className="h-3 w-3" />
        <span className="text-foreground">{page.city.name}</span>
      </nav>

      <main className="container pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{page.category.icon}</span>
              <Badge variant="outline" className="text-xs">
                {page.city.region}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-3">
              {page.h1}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {page.intro}
            </p>
          </div>

          {/* Price badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium text-card-foreground">מחיר ממוצע:</span>
            <span className="text-muted-foreground">{page.category.avgPrice}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            {/* Main content */}
            <div>
              {/* Sections */}
              {page.sections.map((section, i) => (
                <section key={i} className="mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {section.body}
                  </p>
                </section>
              ))}

              {/* Live workers widget */}
              <LiveWorkersWidget page={page} />

              {/* FAQ */}
              <section className="mt-8">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  שאלות נפוצות
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {page.faq.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-right text-sm font-medium">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>

              {/* CTA */}
              <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
                <p className="font-bold text-foreground mb-2">
                  מוכנים למצוא {page.category.nameHeWithArticle} ב{page.city.name}?
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  פרסמו משרה בחינם — עובדים יפנו אליכם תוך דקות
                </p>
                <Link href="/post-job">
                  <Button size="lg" className="gap-2">
                    {page.category.ctaLabel}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <RelatedPages slugs={page.relatedSlugs} />

              {/* Quick facts */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-bold text-sm text-card-foreground mb-3">
                  עובדות מהירות
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="shrink-0">💰</span>
                    <span>{page.category.avgPrice}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0">📍</span>
                    <span>{page.city.name}, {page.city.region}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0">⚡</span>
                    <span>תגובה תוך 15–60 דקות</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
