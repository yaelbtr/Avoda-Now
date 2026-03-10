import { useState } from "react";
import { useOrganizationSchema, useWebSiteSchema, useLocalBusinessSchema } from "@/hooks/useStructuredData";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import HomeWorker from "./HomeWorker";
import HomeEmployer from "./HomeEmployer";
import ActivityTicker from "@/components/ActivityTicker";
import LiveStats from "@/components/LiveStats";
import { useLocation } from "wouter";
import { AppButton } from "@/components/AppButton";
import { Search, Zap } from "lucide-react";
import { SectionLoader } from "@/components/BrandLoader";

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
      <ActivityTicker />
      <LiveStats />
    </div>
  );
}

export default function Home() {
  const { userMode, isLoadingMode: modeLoading } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

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
        <HomeWorker onLoginRequired={handleLoginRequired} />
      )}
      {userMode === "employer" && (
        <HomeEmployer />
      )}
      {!userMode && (
        <HomeGuest />
      )}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </>
  );
}
