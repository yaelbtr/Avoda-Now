import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import {
  Zap, Users, Briefcase, HardHat, ChevronLeft, Loader2,
  Plus, CheckCircle2, Phone, MessageCircle, Eye, Pencil,
} from "lucide-react";
import ActivityTicker from "@/components/ActivityTicker";
import LiveStats from "@/components/LiveStats";

const HOW_IT_WORKS_EMPLOYER = [
  { icon: Plus, step: "1", title: "פרסם משרה", desc: "מלא פרטי המשרה — סוג עבודה, מיקום, שכר ושעות" },
  { icon: Phone, step: "2", title: "קבל פניות", desc: "עובדים יצרו איתך קשר ישירות — ללא תיווך" },
  { icon: CheckCircle2, step: "3", title: "בחר עובד", desc: "בחר את המתאים ביותר ותתחיל לעבוד מיד" },
];

export default function HomeEmployer() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resetUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const requireLogin = (msg: string) => { setLoginMessage(msg); setLoginOpen(true); };

  const handlePostJob = () => {
    if (!isAuthenticated) { requireLogin("כדי לפרסם משרה יש להתחבר למערכת"); return; }
    navigate("/post-job");
  };

  // My active jobs
  const myJobsQuery = trpc.jobs.myJobs.useQuery(undefined, { enabled: isAuthenticated });

  // Nearby available workers
  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm: 20, limit: 6 },
    { staleTime: 60_000 }
  );

  const myJobs = myJobsQuery.data ?? [];
  const workers = workersQuery.data ?? [];

  return (
    <div dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-gradient text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Briefcase className="h-4 w-4 text-blue-200" />
            מצב מעסיק — מחפש עובדים
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
            מצא עובד תוך דקות
            <br />
            <span className="text-yellow-300">– פרסם עכשיו</span>
          </h1>
          <p className="text-base text-white/80 mb-7 max-w-md mx-auto">
            פרסם משרה דחופה ומצא עובדים זמינים באזורך — ללא עמלות, ללא תיווך
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-4">
            <Button
              size="lg"
              className="flex-1 bg-white text-primary hover:bg-white/90 font-bold text-base h-12 gap-2"
              onClick={handlePostJob}
            >
              <Zap className="h-5 w-5" /> פרסם עבודה דחופה
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-white/40 text-white hover:bg-white/15 font-bold text-base h-12 gap-2"
              onClick={() => navigate("/available-workers")}
            >
              <Users className="h-5 w-5" /> עובדים זמינים
            </Button>
          </div>

          <button
            onClick={() => {
              const message = encodeURIComponent(`שלום, אני רוצה לפרסם עבודה:\n\nשם העסק:\nסוג העבודה:\nמיקום:\nשכר:\nטלפון ליצירת קשר:`);
              window.open(`https://wa.me/?text=${message}`, "_blank");
            }}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-xs font-medium transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-green-400" />
            פרסם עבודה דרך WhatsApp
          </button>
        </div>
      </section>

      <ActivityTicker />
      <LiveStats />

      {/* ── My Active Jobs ───────────────────────────────────────────────── */}
      {isAuthenticated && (
        <section className="max-w-2xl mx-auto px-4 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                המשרות שלי
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-jobs")}
                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-xs"
              >
                כל המשרות
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            {myJobsQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-10 w-10 mx-auto mb-2 text-blue-300 opacity-60" />
                <p className="text-sm text-blue-700 mb-3">עדיין לא פרסמת משרות</p>
                <Button size="sm" onClick={handlePostJob} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  פרסם משרה ראשונה
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myJobs.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.city}
                        {job.salary ? ` · ₪${job.salary}` : ""}
                        <span className={`mr-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                          job.status === "active" ? "bg-green-100 text-green-700" :
                          job.status === "closed" ? "bg-gray-100 text-gray-600" :
                          job.status === "expired" ? "bg-red-100 text-red-600" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {job.status === "active" ? "פעיל" : job.status === "closed" ? "סגור" : job.status === "expired" ? "פג" : "בבדיקה"}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                        title="צפה"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => navigate(`/edit-job/${job.id}`)}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                        title="ערוך"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
                {myJobs.length > 3 && (
                  <button
                    onClick={() => navigate("/my-jobs")}
                    className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-2 font-medium"
                  >
                    + עוד {myJobs.length - 3} משרות
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-blue-100">
              <Button size="sm" onClick={handlePostJob} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                פרסם משרה חדשה
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Available Workers ────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              עובדים זמינים עכשיו
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/available-workers")}
              className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-100 text-xs"
            >
              כל העובדים
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>

          {workersQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-6">
              <HardHat className="h-10 w-10 mx-auto mb-2 text-green-300 opacity-60" />
              <p className="text-sm text-green-700">אין עובדים זמינים כרגע באזורך</p>
              <p className="text-xs text-muted-foreground mt-1">פרסם משרה ועובדים יפנו אליך</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {workers.slice(0, 6).map((worker) => (
                <div
                  key={worker.userId}
                  className="bg-white border border-green-100 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <HardHat className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {worker.userName ?? "עובד זמין"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {worker.city ?? "אזור לא ידוע"}
                      {worker.note ? ` · ${worker.note}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    זמין
                  </span>
                </div>
              ))}
            </div>
          )}

          {workers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/available-workers")}
                className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <Users className="h-4 w-4" />
                צפה בכל העובדים הזמינים
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works for employers ───────────────────────────────────── */}
      <section className="bg-muted/50 border-y border-border mt-6">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">איך מפרסמים משרה?</h2>
          <div className="grid grid-cols-3 gap-4">
            {HOW_IT_WORKS_EMPLOYER.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 relative">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick post CTA ───────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">צריך עובד עכשיו?</h2>
        <p className="text-muted-foreground mb-4 text-sm">פרסם משרה דחופה ומצא עובדים תוך דקות — ללא עמלות</p>
        <Button size="lg" onClick={handlePostJob} className="gap-2">
          <Zap className="h-5 w-5" />
          פרסם עבודה דחופה
        </Button>
      </section>

      {/* ── Switch to worker ─────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">גם מחפש עבודה? עבור למצב עובד</p>
        <Button variant="outline" size="sm" onClick={resetUserMode} className="gap-2">
          🔄 שנה תפקיד
        </Button>
      </section>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </div>
  );
}
