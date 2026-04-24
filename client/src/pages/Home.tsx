import { lazy, Suspense, useState } from "react";
import { useOrganizationSchema, useWebSiteSchema, useLocalBusinessSchema } from "@/hooks/useStructuredData";
import { useSEO } from "@/hooks/useSEO";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import ActivityTicker from "@/components/ActivityTicker";
import LiveStats from "@/components/LiveStats";
import { useLocation } from "wouter";
import { AppButton } from "@/components/ui";
import { Search, Zap } from "lucide-react";
import { SectionLoader } from "@/components/BrandLoader";

// Fix 2 (perf): lazy-load HomeWorker and HomeEmployer so they are NOT in the
// initial JS bundle. They are only fetched when the user's role is known.
// This removes ~136KB from the critical path (85KB HomeWorker + 51KB HomeEmployer).
const HomeWorker = lazy(() => import("./HomeWorker"));
const HomeEmployer = lazy(() => import("./HomeEmployer"));

/** Shown while userMode is still loading (null) */
function HomeLoading() {
  return <SectionLoader label="טוען..." />;
}

/** Shown when userMode is undefined — user hasn't chosen a role yet (shouldn't normally appear) */
function HomeGuest() {
  const [, navigate] = useLocation();
  return (
    <div dir="rtl">
      <section className="hero-gradient text-white">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
            עבודות זמניות באזור שלך
            <br />
            <span className="text-yellow-300">– להתחיל היום</span>
          </h1>
          <p className="text-base text-white/80 mb-8 max-w-md mx-auto">
            חבר בין מעסיקים שצריכים עובדים עכשיו לאנשים שפנויים לעבוד עכשיו
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            <AppButton
              variant="secondary"
              size="xl"
              className="flex-1 text-primary hover:bg-white/90"
              onClick={() => navigate("/find-jobs")}
            >
              <Search className="h-5 w-5" /> אני מחפש עבודה
            </AppButton>
            <AppButton
              variant="outline"
              size="xl"
              className="flex-1 border-white/40 text-white hover:bg-white/15"
              onClick={() => navigate("/post-job")}
            >
              <Zap className="h-5 w-5" /> אני מעסיק
            </AppButton>
          </div>
        </div>
      </section>
      {/* SEO: H2 introduces the two main user paths — required for on-page keyword structure */}
      <section className="bg-background py-6 px-4 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
          מצא עבודה זמנית קרוב אליך — או פרסם משרה ומצא עובדים עכשיו
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          YallaAvoda מחברת בין עובדים פנויים למעסיקים בכל רחבי ישראל, ללא עמלות ובלי בירוקרטיה.
        </p>
      </section>
      <ActivityTicker />
      <LiveStats />
    </div>
  );
}

export default function Home() {
  const { userMode, isLoadingMode: modeLoading } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  // Page-level SEO: title (30-60 chars), description, keywords
  useSEO({
    title: "YallaAvoda — עבודות זמניות בישראל",
    description: "מצא עבודות זמניות, עבודה מיידית ומשרות לסטודנטים באזור שלך בלי עמלות. מעסיקים — פרסם משרה ומצא עובדים זמינים קרוב אליך.",
    keywords: "עבודה זמנית, עבודה מיידית, משרות זמניות, עבודות לסטודנטים, עבודה לנוער, עבודות מזדמנות, פרסום משרה, חיפוש עבודה בישראל",
    canonical: "/",
  });
  // JSON-LD schemas for Google Rich Results
  useOrganizationSchema();
  useWebSiteSchema();
  useLocalBusinessSchema();

  const handleLoginRequired = (msg: string) => {
    setLoginMessage(msg);
    setLoginOpen(true);
  };

  if (modeLoading) return <HomeLoading />;

  return (
    <>
      {userMode === "worker" && (
        <Suspense fallback={<SectionLoader label="טוען..." />}>
          <HomeWorker onLoginRequired={handleLoginRequired} />
        </Suspense>
      )}
      {userMode === "employer" && (
        <Suspense fallback={<SectionLoader label="טוען..." />}>
          <HomeEmployer />
        </Suspense>
      )}
      {!userMode && (
        <HomeGuest />
      )}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </>
  );
}