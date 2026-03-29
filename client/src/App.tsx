import { Toaster } from "@/components/ui/sonner";
import React, { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserModeProvider, useUserMode } from "./contexts/UserModeContext";
import Navbar from "./components/Navbar";
import MobileBottomNav from "./components/MobileBottomNav";
import EmployerBottomNav from "./components/EmployerBottomNav";
import Footer from "./components/Footer";
import GenderDisclaimer from "./components/GenderDisclaimer";
import GuestLoginBanner from "./components/GuestLoginBanner";
import RoleSelectionScreen from "./components/RoleSelectionScreen";
import PageTransition from "./components/PageTransition";
import SkipToContent from "./components/SkipToContent";
import ReConsentModal from "./components/ReConsentModal";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { IdleLogoutManager } from "./components/IdleLogoutManager";
import { useEffect, useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { trpc } from "./lib/trpc";
import { PENDING_GOOGLE_REG_KEY, REFERRAL_SOURCE_KEY, UTM_CAMPAIGN_KEY, UTM_MEDIUM_KEY } from "@shared/const";

// ─── Critical pages (loaded eagerly — needed on first paint) ─────────────────
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import MaintenancePage from "./pages/MaintenancePage";

// ─── Lazy-loaded pages (code-split into separate chunks) ─────────────────────
// Core user flows
const FindJobs = lazy(() => import("./pages/FindJobs"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const PostJob = lazy(() => import("./pages/PostJob"));
const MyJobs = lazy(() => import("./pages/MyJobs"));

// Profile pages
const WorkerProfile = lazy(() => import("./pages/WorkerProfile"));
const EmployerProfile = lazy(() => import("./pages/EmployerProfile"));
const PublicWorkerProfile = lazy(() => import("./pages/PublicWorkerProfile"));

// Application flow
const ApplicationView = lazy(() => import("./pages/ApplicationView"));
const JobApplications = lazy(() => import("./pages/JobApplications"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const MatchedWorkers = lazy(() => import("./pages/MatchedWorkers"));

// Discovery / SEO landing pages
const JobsLanding = lazy(() => import("./pages/JobsLanding"));
const KeywordLandingPage = lazy(() => import("./pages/KeywordLandingPage"));
const CityLandingPage = lazy(() => import("./pages/CityLandingPage"));
const PassoverLandingPage = lazy(() => import("./pages/PassoverLandingPage"));
const WorkerLandingPage = lazy(() => import("./pages/WorkerLandingPage"));
const BestJobsPage = lazy(() => import("./pages/BestJobsPage"));
const AvailableWorkers = lazy(() => import("./pages/AvailableWorkers"));

// Guide / FAQ
const GuideHub = lazy(() => import("./pages/GuideHub"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const GuideTopicPage = lazy(() => import("./pages/GuideTopicPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));

// Legal / static pages (rarely visited, no rush to load)
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const JobPostingPolicy = lazy(() => import("./pages/JobPostingPolicy"));
const SafetyPolicy = lazy(() => import("./pages/SafetyPolicy"));
const UserContentPolicy = lazy(() => import("./pages/UserContentPolicy"));
const ReviewsPolicy = lazy(() => import("./pages/ReviewsPolicy"));
const Legal = lazy(() => import("./pages/Legal"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

// Admin panel (heavy, admin-only)
const Admin = lazy(() => import("./pages/Admin"));
const AdminRegionsPage = lazy(() => import("./pages/AdminRegionsPage"));
const AdminRegionDetailPage = lazy(() => import("./pages/AdminRegionDetailPage"));

// Misc
const MyReferrals = lazy(() => import("./pages/MyReferrals"));

// ─── Shared route-level loading fallback ─────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

const REFERRAL_KEY = "avodanow_ref";
const MANUS_BYPASS_KEY = "avodanow_manus_bypass";

/**
 * Captures UTM/referral params on first visit and stores in localStorage.
 * Each key is captured independently and never overwritten on subsequent visits.
 *
 * referralSource: fbclid → "facebook", gclid → "google", utm_source → raw value
 * utmCampaign   : utm_campaign raw value (e.g. "summer_promo")
 * utmMedium     : utm_medium raw value (e.g. "cpc", "social", "email")
 *
 * All three are read at OTP verification and sent to the server for attribution.
 * Cleared from localStorage after successful new-user registration.
 */
function ReferralSourceCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Capture referral source once — never overwrite
    if (!localStorage.getItem(REFERRAL_SOURCE_KEY)) {
      let source: string | null = null;
      // ?ref=<code> from managed referral links (/r/:code redirect) takes highest priority
      const refCode = params.get("ref");
      if (refCode) source = refCode.slice(0, 64);
      else if (params.has("fbclid")) source = "facebook";
      else if (params.has("gclid")) source = "google";
      else if (params.get("utm_source")) source = params.get("utm_source")!.slice(0, 64);
      if (source) localStorage.setItem(REFERRAL_SOURCE_KEY, source);
    }
    // Capture utm_campaign once — never overwrite
    if (!localStorage.getItem(UTM_CAMPAIGN_KEY)) {
      const campaign = params.get("utm_campaign");
      if (campaign) localStorage.setItem(UTM_CAMPAIGN_KEY, campaign.slice(0, 128));
    }
    // Capture utm_medium once — never overwrite
    if (!localStorage.getItem(UTM_MEDIUM_KEY)) {
      const medium = params.get("utm_medium");
      if (medium) localStorage.setItem(UTM_MEDIUM_KEY, medium.slice(0, 64));
    }
  }, []);
  return null;
}

/**
 * Redirects /jobs/:id (numeric) → /job/:id.
 * Fixes browser-back from /jobs/:id/applications landing on JobsLanding with a numeric slug.
 */
function NumericJobRedirect({ params }: { params?: { id?: string } }) {
  const id = params?.id ?? "";
  if (/^\d+$/.test(id)) {
    window.location.replace(`/job/${id}`);
    return null;
  }
  // Non-numeric: fall through to JobsLanding
  return (
    <Suspense fallback={<PageLoader />}>
      <JobsLanding />
    </Suspense>
  );
}

/**
 * Sets the manus bypass flag ONLY when running on the Manus sandbox/dev
 * domain (*.manus.computer). On any production domain (avodanow.co.il,
 * *.manus.space, etc.) the flag is explicitly cleared so that stale values
 * from previous dev sessions never leak through to real users.
 */
(function initManusMaintenanceBypass() {
  try {
    const hostname = window.location.hostname || "";
    // Only the internal sandbox preview domain gets the bypass
    const isSandbox = hostname.endsWith(".manus.computer");
    if (isSandbox) {
      localStorage.setItem(MANUS_BYPASS_KEY, "1");
    } else {
      // Explicitly remove any stale bypass key on production
      localStorage.removeItem(MANUS_BYPASS_KEY);
    }
  } catch (_) { /* localStorage may be unavailable in some environments */ }
})();

// Kept as a no-op component so the JSX reference below still compiles
function ManusMaintenanceBypass() { return null; }

/** Captures ?ref=userId from the URL and stores it in localStorage. */
function ReferralCapture() {
  const { user, isAuthenticated } = useAuth();
  const applied = useRef(false);
  const applyRef = trpc.referral.applyRef.useMutation();

  // Step 1: On any page load, capture ?ref= param and store it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^\d+$/.test(ref)) {
      localStorage.setItem(REFERRAL_KEY, ref);
    }
  }, []);

  // Step 2: After login, apply the stored referral code once
  useEffect(() => {
    if (!isAuthenticated || !user || applied.current) return;
    const stored = localStorage.getItem(REFERRAL_KEY);
    if (!stored) return;
    const referrerId = parseInt(stored, 10);
    if (!referrerId || referrerId === user.id) return;
    applied.current = true;
    applyRef.mutate({ referrerId }, {
      onSuccess: () => localStorage.removeItem(REFERRAL_KEY),
    });
  }, [isAuthenticated, user, applyRef]);

  return null;
}

/**
 * Invisible component that completes a Google OAuth registration when the
 * user chose "Continue with Google" on the channel-selection screen.
 *
 * Flow:
 *  1. User fills in name/phone/terms on the registration screen.
 *  2. On the channel step they click "Continue with Google".
 *  3. LoginModal saves {name, phone, termsAccepted, age18Accepted} to
 *     localStorage under PENDING_GOOGLE_REG_KEY before the redirect (localStorage survives OAuth redirects; sessionStorage does not).
 *  4. After OAuth callback the user is authenticated; this component fires
 *     user.completeGoogleRegistration once to persist the data server-side.
 *  5. localStorage entry is removed so the mutation never fires again.
 */
function PostGoogleRegistration() {
  const { isAuthenticated, user } = useAuth();
  const fired = useRef(false);
  const utils = trpc.useUtils();
  const completeReg = trpc.user.completeGoogleRegistration.useMutation({
    onSuccess: () => {
      // Refresh auth.me so the UI reflects the updated profile
      utils.auth.me.invalidate();
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user || fired.current) return;
    // Only applicable for Google OAuth users who haven't completed registration
    if (user.loginMethod !== "google_oauth" || user.termsAcceptedAt) return;

    const raw = localStorage.getItem(PENDING_GOOGLE_REG_KEY);
    if (!raw) return;

    let payload: { name?: string; phone?: string; email?: string; termsAccepted?: boolean; age18Accepted?: boolean };
    try {
      payload = JSON.parse(raw);
    } catch {
      localStorage.removeItem(PENDING_GOOGLE_REG_KEY);
      return;
    }

    // Only proceed if the user actually accepted terms
    // Phone is optional here — CompleteProfileModal will prompt for it if missing
    if (!payload.termsAccepted) {
      localStorage.removeItem(PENDING_GOOGLE_REG_KEY);
      return;
    }

    fired.current = true;
    localStorage.removeItem(PENDING_GOOGLE_REG_KEY);

    // Use Google-provided email as fallback if user left the field blank
    const emailToSave = payload.email || user.email || undefined;

    completeReg.mutate({
      phone: payload.phone || undefined,
      name: payload.name || undefined,
      email: emailToSave,
    });
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Router() {
  const { needsRoleSelection, setUserMode, userMode } = useUserMode();
  const [location, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Maintenance mode gate: show MaintenancePage to all non-admin users
  const maintenanceQuery = trpc.maintenance.status.useQuery(undefined, {
    // Poll every 60 seconds so the page auto-unblocks when admin turns off maintenance
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const isAdmin = user?.role === "admin";
  const isTestUser = user?.role === "test";
  const hasManusSessionBypass = localStorage.getItem(MANUS_BYPASS_KEY) === "1";
  const isMaintenanceActive = maintenanceQuery.data?.active === true;

  // Maintenance gate: non-blocking — render the page immediately.
  // Only redirect to MaintenancePage once we have a confirmed active=true response.
  // Errors and loading states are treated as "not in maintenance" to avoid
  // blocking the initial render on a DB round-trip (Step 4 of perf skill).
  if (isMaintenanceActive && !isAdmin && !isTestUser && !hasManusSessionBypass) {
    return <MaintenancePage />;
  }

  // Show RoleSelectionScreen when:
  // 1. Authenticated user has no role yet (needsRoleSelection), OR
  // 2. Guest is on the root path AND has no saved session role
  // Exception: admins and test users navigating to /admin routes bypass role selection
  const isRootPath = location === "/" || location === "";
  const hasRole = userMode !== null;
  const isAdminRoute = location.startsWith("/admin");
  const showRoleSelection = !isAdminRoute && (needsRoleSelection || (isRootPath && !hasRole));

  const handleRoleSelected = (mode: "worker" | "employer") => {
    setUserMode(mode);
    if (location !== "/" && location !== "") {
      navigate("/");
    }
  };

  // Derive a stable segment key so that /job/1 and /job/2 share the same
  // transition group (no re-mount flash), while distinct top-level routes
  // each get their own animation.
  const routeKey = location.split("/")[1] || "home";

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <SkipToContent />
      <Navbar />
      <GuestLoginBanner />
      <ReConsentModal />

      <main id="main-content" className="flex-1 pb-24 md:pb-0" style={{ overflow: "hidden" }} aria-label="תוכן ראשי">
        <AnimatePresence mode="wait">
          {showRoleSelection ? (
            <RoleSelectionScreen
              key="role-selection"
              onSelected={handleRoleSelected}
            />
          ) : (
            <PageTransition key={routeKey} routeKey={routeKey}>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/find-jobs" component={FindJobs} />
                  <Route path="/job/:id" component={JobDetails} />
                  <Route path="/post-job" component={PostJob} />
                  <Route path="/my-jobs" component={MyJobs} />
                  <Route path="/terms" component={Terms} />
                  <Route path="/privacy" component={Privacy} />
                  <Route path="/cookies" component={Cookies} />
                  <Route path="/job-posting-policy" component={JobPostingPolicy} />
                  <Route path="/safety-policy" component={SafetyPolicy} />
                  <Route path="/user-content-policy" component={UserContentPolicy} />
                  <Route path="/reviews-policy" component={ReviewsPolicy} />
                  <Route path="/legal" component={Legal} />
                  <Route path="/accessibility" component={Accessibility} />
                  <Route path="/unsubscribe" component={Unsubscribe} />
                  <Route path="/admin" component={Admin} />
                  <Route path="/admin/regions" component={AdminRegionsPage} />
                  <Route path="/admin/regions/:id" component={AdminRegionDetailPage} />
                  <Route path="/jobs-today">{() => { window.location.replace("/find-jobs?filter=today"); return null; }}</Route>
                  <Route path="/available-workers" component={AvailableWorkers} />
                  <Route path="/worker-profile" component={WorkerProfile} />
                  <Route path="/employer-profile" component={EmployerProfile} />
                  <Route path="/worker/:id" component={PublicWorkerProfile} />
                  <Route path="/applications/:id" component={ApplicationView} />
                  <Route path="/jobs/:id/applications" component={JobApplications} />
                  <Route path="/jobs/today/:city" component={JobsLanding} />
                  <Route path="/jobs/today" component={JobsLanding} />
                  <Route path="/jobs/evening/:city" component={JobsLanding} />
                  <Route path="/jobs/evening" component={JobsLanding} />
                  <Route path="/jobs/weekend/:city" component={JobsLanding} />
                  <Route path="/jobs/weekend" component={JobsLanding} />
                  <Route path="/jobs/immediate/:city" component={JobsLanding} />
                  <Route path="/jobs/immediate" component={JobsLanding} />
                  <Route path="/jobs/ניקיון-לפסח" component={PassoverLandingPage} />
                  <Route path="/jobs/מנקה-לפסח" component={PassoverLandingPage} />
                  <Route path="/jobs/:category/:city" component={JobsLanding} />
                  {/* Redirect /jobs/:id (numeric job ID) → /job/:id to fix browser-back from /jobs/:id/applications */}
                  <Route path="/jobs/:id" component={NumericJobRedirect} />
                  <Route path="/jobs/:slug" component={JobsLanding} />
                  <Route path="/guide/temporary-jobs/:category" component={GuidePage} />
                  <Route path="/guide/temporary-jobs" component={GuideHub} />
                  <Route path="/guide/:topic" component={GuideTopicPage} />
                  <Route path="/faq/:slug" component={FAQPage} />
                  <Route path="/best/:slug" component={BestJobsPage} />
                  <Route path="/work/:slug" component={WorkerLandingPage} />
                  {/* Hebrew keyword SEO landing pages */}
                  {/* City-specific: MUST be before /עבודה-זמנית to avoid path conflict */}
                  <Route path="/עבודה-זמנית/:city">{() => <CityLandingPage />}</Route>
                  <Route path="/עבודה-זמנית">{() => <KeywordLandingPage />}</Route>
                  <Route path="/עבודה-מיידית">{() => <KeywordLandingPage />}</Route>
                  <Route path="/עבודות-מזדמנות">{() => <KeywordLandingPage />}</Route>
                  <Route path="/עבודה-עונתית">{() => <KeywordLandingPage />}</Route>
                  <Route path="/עבודה-לסטודנטים">{() => <KeywordLandingPage />}</Route>
                  <Route path="/עבודה-לנוער">{() => <KeywordLandingPage />}</Route>
                  <Route path="/משרות-זמניות">{() => <KeywordLandingPage />}</Route>
                  <Route path="/מנקה-לבית">{() => <KeywordLandingPage />}</Route>
                  <Route path="/עוזרת-בית">{() => <KeywordLandingPage />}</Route>
                  <Route path="/דרושה-מנקה-מהיום">{() => <KeywordLandingPage />}</Route>
                  <Route path="/כמה-עולה-עוזרת-בית">{() => <KeywordLandingPage />}</Route>
                  <Route path="/מנקה-לבית-חד-פעמי">{() => <KeywordLandingPage />}</Route>
                  <Route path="/my-applications" component={MyApplications} />
                  <Route path="/matched-workers" component={MatchedWorkers} />
                  <Route path="/my-referrals" component={MyReferrals} />
                  <Route path="/profile">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                  <Route path="/worker-signup">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                  <Route path="/worker-preferences">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                  <Route path="/404" component={NotFound} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </PageTransition>
          )}
        </AnimatePresence>
        <GenderDisclaimer />
      </main>
      <MobileBottomNav />
      <EmployerBottomNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <AuthProvider>
            <UserModeProvider>
              <Toaster position="top-center" dir="rtl" />
              <ReferralCapture />
              <ReferralSourceCapture />
              <PostGoogleRegistration />
              <IdleLogoutManager />
              <Router />
              <CookieConsentBanner />
            </UserModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
