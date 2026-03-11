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
import Admin from "./pages/Admin";
import AdminCategories from "./pages/AdminCategories";
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
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { ensureMapsLoaded } from "@/lib/mapsLoader";

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

function Router() {
  const { needsRoleSelection, setUserMode, userMode } = useUserMode();
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // Show RoleSelectionScreen when:
  // 1. Authenticated user has no role yet (needsRoleSelection), OR
  // 2. Guest is on the root path AND has no saved session role
  const isRootPath = location === "/" || location === "";
  const hasRole = userMode !== null;
  const showRoleSelection = needsRoleSelection || (isRootPath && !hasRole);

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
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Navbar />
      <GuestLoginBanner />

      <main className="flex-1 pb-16 md:pb-0" style={{ overflow: "hidden" }}>
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
                <Route path="/admin" component={Admin} />
                <Route path="/admin/categories" component={AdminCategories} />
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
                <Route path="/jobs/:category/:city" component={JobsLanding} />
                <Route path="/jobs/:slug" component={JobsLanding} />
                <Route path="/guide/temporary-jobs/:category" component={GuidePage} />
                <Route path="/guide/temporary-jobs" component={GuideHub} />
                <Route path="/guide/:topic" component={GuideTopicPage} />
                <Route path="/faq/:slug" component={FAQPage} />
                <Route path="/best/:slug" component={BestJobsPage} />
                <Route path="/my-applications" component={MyApplications} />
                <Route path="/matched-workers" component={MatchedWorkers} />
                <Route path="/worker-signup">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                <Route path="/worker-preferences">{() => { window.location.replace("/worker-profile"); return null; }}</Route>
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </PageTransition>
          )}
        </AnimatePresence>
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <UserModeProvider>
              <Toaster position="top-center" dir="rtl" />
              <MapsPreloader />
              <Router />
            </UserModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
