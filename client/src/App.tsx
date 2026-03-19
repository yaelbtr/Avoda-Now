import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserModeProvider, useUserMode } from "./contexts/UserModeContext";
import Navbar from "./components/Navbar";
import MobileBottomNav from "./components/MobileBottomNav";
import Footer from "./components/Footer";
import GenderDisclaimer from "./components/GenderDisclaimer";
import GuestLoginBanner from "./components/GuestLoginBanner";
import RoleSelectionScreen from "./components/RoleSelectionScreen";
import PageTransition from "./components/PageTransition";
import Home from "./pages/Home";
import FindJobs from "./pages/FindJobs";
import JobDetails from "./pages/JobDetails";
import PostJob from "./pages/PostJob";
import MyJobs from "./pages/MyJobs";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import JobPostingPolicy from "./pages/JobPostingPolicy";
import SafetyPolicy from "./pages/SafetyPolicy";
import UserContentPolicy from "./pages/UserContentPolicy";
import ReviewsPolicy from "./pages/ReviewsPolicy";
import Legal from "./pages/Legal";
import Accessibility from "./pages/Accessibility";
import Admin from "./pages/Admin";
import JobsToday from "./pages/JobsToday";
import AvailableWorkers from "./pages/AvailableWorkers";
import WorkerProfile from "./pages/WorkerProfile";
import PublicWorkerProfile from "./pages/PublicWorkerProfile";
import ApplicationView from "./pages/ApplicationView";
import JobApplications from "./pages/JobApplications";
import MyApplications from "./pages/MyApplications";
import MatchedWorkers from "./pages/MatchedWorkers";
import JobsLanding from "./pages/JobsLanding";
import GuideHub from "./pages/GuideHub";
import GuidePage from "./pages/GuidePage";
import GuideTopicPage from "./pages/GuideTopicPage";
import FAQPage from "./pages/FAQPage";
import BestJobsPage from "./pages/BestJobsPage";
import WorkerLandingPage from "./pages/WorkerLandingPage";
import AdminRegionsPage from "./pages/AdminRegionsPage";
import AdminRegionDetailPage from "./pages/AdminRegionDetailPage";
import MyReferrals from "./pages/MyReferrals";
import PassoverLandingPage from "./pages/PassoverLandingPage";
import MaintenancePage from "./pages/MaintenancePage";
import SkipToContent from "./components/SkipToContent";
import ReConsentModal from "./components/ReConsentModal";
import { useEffect, useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { ensureMapsLoaded } from "@/lib/mapsLoader";
import { trpc } from "./lib/trpc";
import { PENDING_GOOGLE_REG_KEY, FIND_JOBS_OPEN } from "@shared/const";
import { createPortal } from "react-dom";
import FindJobsComingSoonOverlay from "./components/FindJobsComingSoonOverlay";

const REFERRAL_KEY = "avodanow_ref";
const MANUS_BYPASS_KEY = "avodanow_manus_bypass";

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
 * Invisible component that preloads the Google Maps script in the background
 * as soon as the user is authenticated. This ensures the script is already
 * cached when the user navigates to /post-job or any map-enabled page.
 */
function MapsPreloader() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) return;
    ensureMapsLoaded().catch(() => {});
  }, [isAuthenticated]);
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

  // While the maintenance check is in-flight (first load only, no cached data),
  // show a minimal full-screen loader so the page never flashes blank.
  // Once we have any data (or an error), we proceed normally — errors are treated
  // as "not in maintenance" to avoid blocking the app on DB issues.
  if (maintenanceQuery.isLoading && !maintenanceQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/find-jobs" component={FindJobs} />
                <Route path="/job/:id" component={JobDetails} />
                <Route path="/post-job" component={PostJob} />
                <Route path="/my-jobs" component={MyJobs} />
                <Route path="/terms" component={Terms} />
                <Route path="/privacy" component={Privacy} />
                <Route path="/job-posting-policy" component={JobPostingPolicy} />
                <Route path="/safety-policy" component={SafetyPolicy} />
                <Route path="/user-content-policy" component={UserContentPolicy} />
                <Route path="/reviews-policy" component={ReviewsPolicy} />
                <Route path="/legal" component={Legal} />
                <Route path="/accessibility" component={Accessibility} />
                <Route path="/admin" component={Admin} />
                <Route path="/admin/regions" component={AdminRegionsPage} />
                <Route path="/admin/regions/:id" component={AdminRegionDetailPage} />
                <Route path="/jobs-today">{() => { window.location.replace("/find-jobs?filter=today"); return null; }}</Route>
                <Route path="/available-workers" component={AvailableWorkers} />
                <Route path="/worker-profile" component={WorkerProfile} />
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
                <Route path="/jobs/:slug" component={JobsLanding} />
                <Route path="/guide/temporary-jobs/:category" component={GuidePage} />
                <Route path="/guide/temporary-jobs" component={GuideHub} />
                <Route path="/guide/:topic" component={GuideTopicPage} />
                <Route path="/faq/:slug" component={FAQPage} />
                <Route path="/best/:slug" component={BestJobsPage} />
                <Route path="/work/:slug" component={WorkerLandingPage} />
                <Route path="/my-applications" component={MyApplications} />
                <Route path="/matched-workers" component={MatchedWorkers} />
                <Route path="/my-referrals" component={MyReferrals} />
                <Route path="/profile">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                <Route path="/worker-signup">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                <Route path="/worker-preferences">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </PageTransition>
          )}
        </AnimatePresence>
        <GenderDisclaimer />
      </main>
      <MobileBottomNav />
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
              <MapsPreloader />
              <ReferralCapture />
              <PostGoogleRegistration />
              <Router />

            </UserModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
