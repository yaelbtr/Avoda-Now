import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserModeProvider, useUserMode } from "./contexts/UserModeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RoleSelectionScreen from "./components/RoleSelectionScreen";
import WelcomeScreen from "./components/WelcomeScreen";
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
import { useState } from "react";

function Router() {
  const { needsRoleSelection, setUserMode, userMode } = useUserMode();
  // Track whether to show the welcome screen after role selection
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<"worker" | "employer" | null>(null);

  const handleRoleSelected = (mode: "worker" | "employer") => {
    setUserMode(mode);
    setWelcomeMode(mode);
    setShowWelcome(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      {/* Role selection overlay — shown when authenticated but no mode chosen */}
      {needsRoleSelection && (
        <RoleSelectionScreen onSelected={handleRoleSelected} />
      )}

      {/* Welcome screen — shown once after role selection */}
      {showWelcome && welcomeMode && (
        <WelcomeScreen
          mode={welcomeMode}
          onDismiss={() => {
            setShowWelcome(false);
            setWelcomeMode(null);
          }}
        />
      )}

      <Navbar />
      <main className="flex-1">
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
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
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
              <Router />
            </UserModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
