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
import JobsToday from "./pages/JobsToday";
import AvailableWorkers from "./pages/AvailableWorkers";
import WorkerProfile from "./pages/WorkerProfile";
import PublicWorkerProfile from "./pages/PublicWorkerProfile";
import ApplicationView from "./pages/ApplicationView";
import JobApplications from "./pages/JobApplications";
import MyApplications from "./pages/MyApplications";
import { useState, useEffect } from "react";
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
  const { needsRoleSelection, setLocalModeOnly, userMode } = useUserMode();
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // Track whether the role selection screen should be visible.
  // We keep it true until the exit animation completes (via onExitComplete).
  const isRootPath = location === "/" || location === "";
  const guestHasRole = !isAuthenticated && userMode !== null;
  const shouldShowRoleSelection = needsRoleSelection || (isRootPath && !guestHasRole);

  // showRoleSelection is the "display" flag — it stays true while animating out.
  // We use a separate state so we can delay removal until animation ends.
  const [showRoleSelection, setShowRoleSelection] = useState(shouldShowRoleSelection);

  // When the logical condition becomes true again (e.g. user resets role), show it.
  useEffect(() => {
    if (shouldShowRoleSelection) {
      setShowRoleSelection(true);
    }
  }, [shouldShowRoleSelection]);

  const handleRoleSelected = (mode: "worker" | "employer") => {
    // Update the mode immediately — this makes shouldShowRoleSelection false.
    setLocalModeOnly(mode);
    if (location !== "/" && location !== "") {
      navigate("/");
    }
    // showRoleSelection stays true until onExitComplete fires.
  };

  const handleExitComplete = () => {
    // Animation finished — now actually remove RoleSelectionScreen from DOM.
    setShowRoleSelection(false);
  };

  // Derive a stable segment key so that /job/1 and /job/2 share the same
  // transition group (no re-mount flash), while distinct top-level routes
  // each get their own animation.
  const routeKey = location.split("/")[1] || "home";

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Navbar />
      <GuestLoginBanner />

      <main className="flex-1" style={{ overflow: "hidden" }}>
        {showRoleSelection ? (
          <AnimatePresence onExitComplete={handleExitComplete}>
            {shouldShowRoleSelection && (
              <RoleSelectionScreen
                key="role-selection"
                onSelected={handleRoleSelected}
              />
            )}
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition routeKey={routeKey}>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/find-jobs" component={FindJobs} />
                <Route path="/job/:id" component={JobDetails} />
                <Route path="/post-job" component={PostJob} />
                <Route path="/my-jobs" component={MyJobs} />
                <Route path="/terms" component={Terms} />
                <Route path="/privacy" component={Privacy} />
                <Route path="/admin" component={Admin} />
                <Route path="/jobs-today" component={JobsToday} />
                <Route path="/available-workers" component={AvailableWorkers} />
                <Route path="/worker-profile" component={WorkerProfile} />
                <Route path="/worker/:id" component={PublicWorkerProfile} />
                <Route path="/applications/:id" component={ApplicationView} />
                <Route path="/jobs/:id/applications" component={JobApplications} />
                <Route path="/my-applications" component={MyApplications} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </PageTransition>
          </AnimatePresence>
        )}
      </main>

      <Footer />
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
