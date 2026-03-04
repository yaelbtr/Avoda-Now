import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { Search, Briefcase, MapPin, Loader2, ChevronLeft, MessageCircle, Flame, Zap, CheckCircle2, Users, Phone, Map, List } from "lucide-react";
import ActivityTicker from "@/components/ActivityTicker";
import LiveStats from "@/components/LiveStats";
import NearbyJobsMap from "@/components/NearbyJobsMap";

const CATEGORIES = [
  { value: "kitchen", label: "מסעדות", icon: "🍳" },
  { value: "warehouse", label: "מחסנים", icon: "📦" },
  { value: "delivery", label: "שליחויות", icon: "🚴" },
  { value: "events", label: "אירועים", icon: "🎉" },
  { value: "retail", label: "חנויות", icon: "🛍️" },
  { value: "cleaning", label: "ניקיון", icon: "🧹" },
  { value: "construction", label: "בנייה", icon: "🏗️" },
  { value: "agriculture", label: "חקלאות", icon: "🌾" },
];

const HOW_IT_WORKS = [
  { icon: Search, step: "1", title: "מצא עבודה", desc: "חפש לפי קטגוריה, מיקום, או עיין בעבודות הדחופות" },
  { icon: Phone, step: "2", title: "צור קשר", desc: "התקשר ישירות למעסיק או שלח הודעת WhatsApp בלחיצה אחת" },
  { icon: CheckCircle2, step: "3", title: "התחל לעבוד", desc: "הגע למקום ותתחיל לעבוד — לרוב עוד באותו יום" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { userMode } = useUserMode();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(5);
  const [showMap, setShowMap] = useState(false);
  const [geoRequested, setGeoRequested] = useState(false);

  const requireLogin = (message: string) => {
    setLoginMessage(message);
    setLoginOpen(true);
  };

  const handlePostJob = () => {
    if (!isAuthenticated) { requireLogin("כדי לפרסם משרה יש להתחבר למערכת"); return; }
    navigate("/post-job");
  };

  const handleWhatsAppPublish = () => {
    const message = encodeURIComponent(`שלום, אני רוצה לפרסם עבודה:\n\nשם העסק:\nסוג העבודה:\nמיקום:\nשכר:\nטלפון ליצירת קשר:`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const urgentQuery = trpc.jobs.listUrgent.useQuery({ limit: 4 });
  const todayQuery = trpc.jobs.listToday.useQuery({ limit: 4 });
  const nearbyQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm: nearbyRadius, limit: 12 },
    { enabled: !!userLat }
  );
  const latestQuery = trpc.jobs.list.useQuery({ limit: 6 });
  const workerStatusQuery = trpc.workers.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const setAvailableMutation = trpc.workers.setAvailable.useMutation({
    onSuccess: () => { workerStatusQuery.refetch(); setAvailabilityLoading(false); },
    onError: () => setAvailabilityLoading(false),
  });
  const setUnavailableMutation = trpc.workers.setUnavailable.useMutation({
    onSuccess: () => { workerStatusQuery.refetch(); setAvailabilityLoading(false); },
    onError: () => setAvailabilityLoading(false),
  });

  const urgentJobs = urgentQuery.data ?? [];
  const todayJobs = todayQuery.data ?? [];
  const jobs = userLat ? (nearbyQuery.data ?? []) : (latestQuery.data ?? []);
  const isLoading = userLat ? nearbyQuery.isLoading : latestQuery.isLoading;
  const isAvailable = !!workerStatusQuery.data;

  const requestGeo = () => {
    setGeoRequested(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  };

  const handleAvailabilityToggle = () => {
    if (!isAuthenticated) { requireLogin("כדי לסמן זמינות יש להתחבר למערכת"); return; }
    setAvailabilityLoading(true);
    if (isAvailable) {
      setUnavailableMutation.mutate();
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setAvailableMutation.mutate({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              city: undefined,
              durationHours: 4,
            });
          },
          () => {
            // Fallback: use default Israel center
            setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: 4 });
          }
        );
      } else {
        setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: 4 });
      }
    }
  };

  return (
    <div dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-gradient text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            לוח דרושים פעיל — עבודות מיידיות
          </div>
          {/* Role-specific title */}
          {userMode === "worker" ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
                מצא עבודה היום
                <br />
                <span className="text-yellow-300">– תתחיל לעבוד עכשיו</span>
              </h1>
              <p className="text-base text-white/80 mb-7 max-w-md mx-auto">
                עבודות זמניות ודחופות באזורך — צור קשר ישיר עם המעסיק
              </p>
            </>
          ) : userMode === "employer" ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
                מצא עובד תוך דקות
                <br />
                <span className="text-yellow-300">– פרסם עכשיו</span>
              </h1>
              <p className="text-base text-white/80 mb-7 max-w-md mx-auto">
                פרסם משרה דחופה ומצא עובדים זמינים באזורך — ללא עמלות
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
                עבודות זמניות באזור שלך
                <br />
                <span className="text-yellow-300">– להתחיל היום</span>
              </h1>
              <p className="text-base text-white/80 mb-7 max-w-md mx-auto">
                חבר בין מעסיקים שצריכים עובדים עכשיו לאנשים שפנויים לעבוד עכשיו
              </p>
            </>
          )}

          {/* Role-specific CTA buttons */}
          {userMode === "worker" ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-4">
              <Button size="lg" className="flex-1 bg-white text-primary hover:bg-white/90 font-bold text-base h-12 gap-2" onClick={() => navigate("/find-jobs")}>
                <Search className="h-5 w-5" /> חפש עבודה עכשיו
              </Button>
              <Button size="lg" variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/15 font-bold text-base h-12 gap-2" onClick={() => navigate("/jobs-today")}>
                <Flame className="h-5 w-5" /> עבודות להיום
              </Button>
            </div>
          ) : userMode === "employer" ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-4">
              <Button size="lg" className="flex-1 bg-white text-primary hover:bg-white/90 font-bold text-base h-12 gap-2" onClick={handlePostJob}>
                <Zap className="h-5 w-5" /> פרסם עבודה דחופה
              </Button>
              <Button size="lg" variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/15 font-bold text-base h-12 gap-2" onClick={() => navigate("/available-workers")}>
                <Users className="h-5 w-5" /> עובדים זמינים
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-4">
              <Button size="lg" className="flex-1 bg-white text-primary hover:bg-white/90 font-bold text-base h-12 gap-2" onClick={() => navigate("/find-jobs")}>
                <Search className="h-5 w-5" /> אני מחפש עבודה עכשיו
              </Button>
              <Button size="lg" variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/15 font-bold text-base h-12 gap-2" onClick={handlePostJob}>
                <Zap className="h-5 w-5" /> פרסם עבודה דחופה
              </Button>
            </div>
          )}

          {/* Availability toggle — workers only */}
          {userMode !== "employer" && (
            <button
              onClick={handleAvailabilityToggle}
              disabled={availabilityLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border-2 ${
                isAvailable
                  ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/30"
                  : "bg-white/10 border-white/30 text-white hover:bg-white/20"
              }`}
            >
              {availabilityLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? "bg-white animate-pulse" : "bg-white/50"}`} />
              )}
              {isAvailable ? "✅ אני פנוי לעבוד עכשיו — לחץ לביטול" : "🟢 אני פנוי לעבוד עכשיו"}
            </button>
          )}

          {/* WhatsApp shortcut — employers only */}
          {userMode !== "worker" && (
            <div className="mt-3">
              <button
                onClick={handleWhatsAppPublish}
                className="inline-flex items-center gap-2 text-white/70 hover:text-white text-xs font-medium transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5 text-green-400" />
                פרסם עבודה דרך WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

       {/* ── Activity Ticker ───────────────────────────────────────────────── */}
      <ActivityTicker />

      {/* ── Live Stats ───────────────────────────────────────────────────── */}
      <LiveStats />

      {/* ── Urgent Jobs — shown to workers and guests, hidden for employers ── */}
      {userMode !== "employer" && (urgentJobs.length > 0 || urgentQuery.isLoading) && (
        <section className="max-w-2xl mx-auto px-4 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <Zap className="h-5 w-5 text-red-500 fill-red-500" />
                עבודות שצריך אליהן עובדים עכשיו
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/find-jobs?urgent=1")}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-100 text-xs"
              >
                כל הדחופות
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
            {urgentQuery.isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-red-500" /></div>
            ) : (
              <div className="space-y-2">
                {urgentJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={{ ...job, salary: job.salary ?? null, businessName: job.businessName ?? null }}
                    onLoginRequired={requireLogin}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Jobs for Today — shown to workers and guests, hidden for employers ── */}
      {userMode !== "employer" && todayJobs.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-orange-700 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                עבודות להיום
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/jobs-today")}
                className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-100 text-xs"
              >
                כל העבודות להיום
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {todayJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={{ ...job, salary: job.salary ?? null, businessName: job.businessName ?? null }}
                  onLoginRequired={requireLogin}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Wartime & Passover — shown to workers and guests, hidden for employers ── */}
      {userMode !== "employer" && <section className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-gradient-to-br from-purple-50 to-amber-50 border border-purple-200 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
            🆘 סיוע בזמן חירום ועבודות לפסח
          </h2>
          <p className="text-sm text-purple-700 mb-4">
            עבודות התנדבותיות ובתשלום לסיוע לקהילה, למשפחות מילואימניקים, ולקראת הפסח
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "emergency_support", label: "סיוע בזמן חירום", icon: "🆘", desc: "חלוקת מזון, אריזה לחיילים, עזרה לקשישים", color: "purple" },
              { value: "reserve_families", label: "משפחות מילואימניקים", icon: "🪖", desc: "עזרה למשפחות שבניהן במילואים", color: "purple" },
              { value: "passover_jobs", label: "עבודות לפסח", icon: "🫓", desc: "ניקוי, אריזה, מחסן, משלוחים", color: "amber" },
              { value: "volunteer", label: "התנדבות", icon: "💚", desc: "עבודה ללא תשלום — למען הקהילה", color: "green" },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => navigate(`/find-jobs?category=${cat.value}`)}
                className={`flex items-start gap-2 p-3 rounded-xl border-2 text-right transition-all hover:scale-[1.02] ${
                  cat.color === "purple" ? "bg-purple-50 border-purple-200 hover:border-purple-400" :
                  cat.color === "amber" ? "bg-amber-50 border-amber-200 hover:border-amber-400" :
                  "bg-green-50 border-green-200 hover:border-green-400"
                }`}
              >
                <span className="text-2xl shrink-0">{cat.icon}</span>
                <div>
                  <p className={`text-xs font-bold leading-tight ${
                    cat.color === "purple" ? "text-purple-800" :
                    cat.color === "amber" ? "text-amber-800" : "text-green-800"
                  }`}>{cat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 gap-1.5"
              onClick={() => navigate("/find-jobs?help=1")}
            >
              🆘 צריך עזרה היום
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-green-300 text-green-700 hover:bg-green-50 gap-1.5"
              onClick={handlePostJob}
            >
              💚 פרסם משרת התנדבות
            </Button>
          </div>
        </div>
      </section>}

      {/* ── Employer section: Available Workers ─────────────────────────── */}
      {userMode === "employer" && (
        <section className="max-w-2xl mx-auto px-4 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                עובדים זמינים עכשיו
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/available-workers")}
                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-xs"
              >
                כל העובדים
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              מצא עובדים זמינים באזורך ופרסם משרה — ללא עמלות
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                onClick={handlePostJob}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4" />
                פרסם משרה דחופה
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/available-workers")}
                className="flex-1 gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Users className="h-4 w-4" />
                עובדים זמינים
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-foreground mb-4 text-right">חפש לפי קטגוריה</h2>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => navigate(`/find-jobs?category=${cat.value}`)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-primary leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Nearby / Latest jobs — shown to workers and guests, hidden for employers ── */}
      {userMode !== "employer" && <section className="max-w-2xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {userLat ? (
              <><MapPin className="h-5 w-5 text-primary" />עבודות קרובות אליך עכשיו</>
            ) : (
              <><Briefcase className="h-5 w-5 text-primary" />משרות אחרונות</>
            )}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/find-jobs")} className="gap-1 text-primary">
            כל המשרות
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Geo permission prompt */}
        {!userLat && !geoRequested && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-center">
            <MapPin className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-blue-800 mb-1">רוצה לראות עבודות קרובות אליך?</p>
            <p className="text-xs text-blue-600 mb-3">אפשר גישה למיקום להצגת עבודות באזור שלך</p>
            <Button size="sm" onClick={requestGeo} className="gap-2">
              <MapPin className="h-4 w-4" />
              אפשר גישה למיקום
            </Button>
          </div>
        )}

        {/* Radius selector + map toggle (only when location is available) */}
        {userLat && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-muted-foreground">רדיוס:</span>
            {[1, 3, 5].map((km) => (
              <button
                key={km}
                onClick={() => setNearbyRadius(km)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  nearbyRadius === km
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {km} ק"מ
              </button>
            ))}
            <div className="mr-auto flex gap-1">
              <button
                onClick={() => setShowMap(false)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  !showMap ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                }`}
                title="רשימה"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowMap(true)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showMap ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                }`}
                title="מפה"
              >
                <Map className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין משרות בטווח {nearbyRadius} ק"מ</p>
            <p className="text-xs mt-1">נסה להרחיב את הרדיוס או לחפש בכל המשרות</p>
            <Button className="mt-4" onClick={() => navigate("/find-jobs")}>כל המשרות</Button>
          </div>
        ) : showMap && userLat ? (
          <NearbyJobsMap jobs={jobs} userLat={userLat} userLng={userLng!} />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={{
                  ...job,
                  salary: job.salary ?? null,
                  businessName: job.businessName ?? null,
                  distance: "distance" in job ? (job as { distance: number }).distance : undefined,
                }}
                showDistance={!!userLat}
                onLoginRequired={requireLogin}
              />
            ))}
          </div>
        )}

        {!isLoading && !showMap && jobs.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => navigate("/find-jobs")} className="gap-2">
              <Search className="h-4 w-4" />
              חפש עוד משרות
            </Button>
          </div>
        )}
      </section>}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-muted/50 border-y border-border">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">איך זה עובד?</h2>
          <div className="grid grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
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

      {/* ── CTA for employers — shown to employers and guests, hidden for workers ── */}
      {userMode !== "worker" && (
        <section className="max-w-2xl mx-auto px-4 py-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">צריך עובד עכשיו?</h2>
          <p className="text-muted-foreground mb-4 text-sm">פרסם משרה דחופה ומצא עובדים תוך דקות</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
            <Button size="lg" onClick={handlePostJob} className="gap-2 flex-1">
              <Zap className="h-5 w-5" />
              פרסם עבודה דחופה
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/available-workers")} className="gap-2 flex-1">
              <Users className="h-5 w-5" />
              עובדים זמינים
            </Button>
          </div>
        </section>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </div>
  );
}
