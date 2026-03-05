import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import {
  Search, MapPin, Loader2, ChevronLeft, Flame, Zap,
  CheckCircle2, Phone, Map, List, ArrowLeft, Briefcase, Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ActivityTicker from "@/components/ActivityTicker";
import CarouselJobCard from "@/components/CarouselJobCard";
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

interface HomeWorkerProps {
  onLoginRequired: (msg: string) => void;
}

export default function HomeWorker({ onLoginRequired }: HomeWorkerProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resetUserMode } = useUserMode();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(5);
  const [showMap, setShowMap] = useState(false);
  const [geoRequested, setGeoRequested] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<2 | 4 | 8>(4);
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);

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
    if (!isAuthenticated) { onLoginRequired("כדי לסמן זמינות יש להתחבר למערכת"); return; }
    if (isAvailable) {
      setAvailabilityLoading(true);
      setUnavailableMutation.mutate();
    } else {
      // Show duration picker before marking available
      setDurationOpen(true);
    }
  };

  const confirmAvailability = (hours: 2 | 4 | 8) => {
    setSelectedDuration(hours);
    setDurationOpen(false);
    setAvailabilityLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAvailableMutation.mutate({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: undefined,
            durationHours: hours,
          });
        },
        () => {
          setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: hours });
        }
      );
    } else {
      setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: hours });
    }
  };

  return (
    <div dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(135deg, oklch(0.30 0.16 265) 0%, oklch(0.22 0.20 280) 60%, oklch(0.18 0.22 300) 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.18 200) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.20 75) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-8">
          {/* Top label */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Briefcase className="h-4 w-4 text-blue-300" />
              מצא עבודה זמנית באזורך — היום
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-3">
              עבודות דחופות
              <br />
              <span
                className="inline-block mt-1"
                style={{
                  background: "linear-gradient(90deg, oklch(0.92 0.18 75), oklch(0.85 0.22 55))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                מחכות לך עכשיו
              </span>
            </h1>
            <p className="text-white/70 text-base max-w-sm mx-auto leading-relaxed">
              קשר ישיר עם מעסיקים — ללא תיווך, ללא עמלות
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto mb-6">
            <Button
              size="lg"
              className="flex-1 font-bold text-base h-13 gap-2 shadow-lg shadow-black/20"
              style={{ background: "linear-gradient(135deg, oklch(0.75 0.20 75), oklch(0.68 0.22 55))", color: "oklch(0.15 0.01 250)", border: "none" }}
              onClick={() => navigate("/find-jobs")}
            >
              <Search className="h-5 w-5" />
              חפש עבודה עכשיו
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold text-base h-13 gap-2 backdrop-blur-sm"
              onClick={() => navigate("/jobs-today")}
            >
              <Flame className="h-5 w-5 text-orange-300" />
              עבודות להיום
            </Button>
          </div>

          {/* Availability card */}
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              {/* Main toggle */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleAvailabilityToggle}
                      disabled={availabilityLoading}
                      className={`flex-1 flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all duration-200 ${
                        isAvailable
                          ? "bg-green-500/20 border-green-400/50 hover:bg-green-500/30"
                          : "bg-white/8 border-white/20 hover:bg-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {availabilityLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                        ) : (
                          <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAvailable ? "bg-green-400" : "bg-white/40"}`} />
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isAvailable ? "bg-green-400" : "bg-white/40"}`} />
                          </span>
                        )}
                        <span className="font-semibold text-sm text-white">
                          {isAvailable ? `פנוי לעבוד — ${selectedDuration}ש'` : "סמן את עצמך כזמין"}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isAvailable ? "bg-green-400/30 text-green-200" : "bg-white/15 text-white/70"}`}>
                        {isAvailable ? "פעיל" : "לחץ"}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {/* Desktop tooltip */}
                  <TooltipContent side="bottom" className="max-w-xs text-right leading-relaxed p-3" dir="rtl">
                    <p className="font-semibold mb-1 text-sm">{isAvailable ? "אתה מסומן כזמין" : "מה זה אומר?"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAvailable
                        ? `מעסיקים באזורך רואים אותך. הזמינות תתבטל אוטומטית לאחר ${selectedDuration} שעות, או לחץ שוב לביטול.`
                        : "תבחר כמה שעות אתה פנוי ותוסף לרשימת העובדים הזמינים."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Info button — opens Dialog (works on mobile too) */}
              <button
                onClick={() => setInfoOpen(true)}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                aria-label="מידע נוסף"
              >
                <Info className="h-4 w-4 text-white/70" />
              </button>
            </div>
          </div>

          {/* Profile shortcut */}
          {isAuthenticated && (
            <div className="text-center mt-3">
              <button
                onClick={() => navigate("/worker-profile")}
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
              >
                עדכן קטגוריות מועדפות לקבלת התראות
                <ArrowLeft className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </section>

      <ActivityTicker />
      <LiveStats mode="worker" />

      {/* ── Urgent Jobs ──────────────────────────────────────────────────── */}
      {(urgentJobs.length > 0 || todayJobs.length > 0 || urgentQuery.isLoading || todayQuery.isLoading) && (() => {
        const allCarouselJobs = [
          ...urgentJobs.map((j) => ({ job: j, badge: "urgent" as const })),
          ...todayJobs
            .filter((j) => !urgentJobs.some((u) => u.id === j.id))
            .map((j) => ({ job: j, badge: "today" as const })),
        ];
        const total = allCarouselJobs.length;
        return (
          <section className="pt-6">
            {/* Section header */}
            <div className="max-w-2xl mx-auto px-4 flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-red-500 fill-red-500" />
                עבודות דחופות ולהיום
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/find-jobs?urgent=1")}
                className="gap-1 text-muted-foreground hover:text-foreground text-xs"
              >
                כל העבודות
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Carousel with arrows */}
            {(urgentQuery.isLoading || todayQuery.isLoading) ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="relative">
                {/* Left arrow (prev in RTL = next visually) */}
                {activeCarouselIdx < total - 1 && (
                  <button
                    onClick={() => {
                      const el = document.getElementById("job-carousel");
                      if (el) el.scrollBy({ left: -300, behavior: "smooth" });
                      setActiveCarouselIdx((i) => Math.min(i + 1, total - 1));
                    }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors"
                    aria-label="הקודם"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {/* Right arrow (next in RTL = prev visually) */}
                {activeCarouselIdx > 0 && (
                  <button
                    onClick={() => {
                      const el = document.getElementById("job-carousel");
                      if (el) el.scrollBy({ left: 300, behavior: "smooth" });
                      setActiveCarouselIdx((i) => Math.max(i - 1, 0));
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors"
                    aria-label="הבא"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </button>
                )}

                {/* Scrollable track */}
                <div
                  id="job-carousel"
                  className="flex gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const cardWidth = el.scrollWidth / total;
                    const idx = Math.round(el.scrollLeft / cardWidth);
                    setActiveCarouselIdx(idx);
                  }}
                >
                  {allCarouselJobs.map(({ job, badge }) => (
                    <div key={`${badge}-${job.id}`} className="snap-start shrink-0 w-[78vw] max-w-[300px]">
                      <CarouselJobCard
                        job={{ ...job, salary: job.salary ?? null, businessName: job.businessName ?? null }}
                        badge={badge}
                        onLoginRequired={onLoginRequired}
                      />
                    </div>
                  ))}
                </div>

                {/* Dot indicators */}
                {total > 1 && (
                  <div className="flex justify-center gap-1.5 mt-2">
                    {allCarouselJobs.map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block rounded-full transition-all duration-200 ${
                          i === activeCarouselIdx
                            ? "w-4 h-2 bg-primary"
                            : "w-2 h-2 bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })()}

      {/* ── Wartime & Passover ───────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pt-4">
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
        </div>
      </section>

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

      {/* ── Nearby / Latest jobs ─────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {userLat ? (
              <><MapPin className="h-5 w-5 text-primary" />עבודות קרובות אליך עכשיו</>
            ) : (
              <><Search className="h-5 w-5 text-primary" />משרות אחרונות</>
            )}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/find-jobs")} className="gap-1 text-primary">
            כל המשרות
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

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
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowMap(true)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showMap ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                }`}
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
                onLoginRequired={onLoginRequired}
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
      </section>

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

      {/* ── Switch to employer ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">גם מעסיק? עבור למצב מעסיק</p>
        <Button variant="outline" size="sm" onClick={resetUserMode} className="gap-2">
          🔄 שנה תפקיד
        </Button>
      </section>

      {/* ── Info Dialog (mobile-friendly) ──────────────────────────────────────────── */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">
              {isAvailable ? "אתה מסומן כזמין כעת" : 'מה זה "סמן עצמך כזמין"?'}
            </DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              {isAvailable ? (
                <span>
                  מעסיקים באזורך רואים אותך ברשימת העובדים הזמינים ויכולים לפנות אליך ישירות.
                  הזמינות תתבטל אוטומטית לאחר {selectedDuration} שעות, או לחץ שוב על הכפתור לביטול מיידי.
                </span>
              ) : (
                <span>
                  לחיצה תוסיף אותך לרשימת העובדים הזמינים שמעסיקים רואים.
                  <br /><br />
                  כשתסמן זמינות:
                  <br />• המיקום שלך יישמר כדי שמעסיקים באזורך יראו אותך ראשון
                  <br />• תבחר כמה שעות אתה פנוי (2, 4, או 8 שעות)
                  <br />• מעסיקים יוכלו לפנות אליך ישירות דרך הטלפון
                  <br />• הזמינות תתבטל אוטומטית בסוף הזמן שבחרת
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-2">
            <Button onClick={() => setInfoOpen(false)} size="sm">סגור</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Duration Picker Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={durationOpen} onOpenChange={setDurationOpen}>
        <DialogContent dir="rtl" className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-right">כמה שעות אתה פנוי?</DialogTitle>
            <DialogDescription className="text-right">
              בחר את משך הזמינות. הזמינות תתבטל אוטומטית בסוף הזמן.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {([2, 4, 8] as const).map((h) => (
              <button
                key={h}
                onClick={() => confirmAvailability(h)}
                className="flex flex-col items-center justify-center py-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all font-bold text-foreground"
              >
                <span className="text-2xl font-extrabold text-primary">{h}</span>
                <span className="text-xs text-muted-foreground mt-1">שעות</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setDurationOpen(false)}>ביטול</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
