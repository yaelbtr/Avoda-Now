import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/ui";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import { MapPin, Phone, Users, Clock, MessageCircle, AlertCircle, LocateFixed, Loader2, ShieldCheck, Timer } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { formatDistance } from "@shared/categories";
import { toast } from "sonner";
import { C_WHATSAPP } from "@/lib/colors";
import { useCountdown } from "@/hooks/useCountdown";

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "זמין עכשיו";
  if (mins < 60) return `זמין מלפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  return `זמין מלפני ${hrs === 1 ? "שעה" : hrs + " שעות"}`;
}

/**
 * Live countdown badge for a worker card.
 * Shows "נשאר HH:MM:SS" ticking every second.
 * Renders nothing once the time has expired.
 */
function WorkerCountdownBadge({ availableUntil }: { availableUntil: Date | string | null | undefined }) {
  const countdown = useCountdown(availableUntil);
  if (!countdown) return null;

  // Determine urgency: < 30 minutes remaining → amber, < 10 min → red
  const msLeft = availableUntil ? new Date(availableUntil).getTime() - Date.now() : 0;
  const isUrgent = msLeft < 30 * 60_000;
  const isCritical = msLeft < 10 * 60_000;

  const color = isCritical
    ? "oklch(0.55 0.20 25)"   // red
    : isUrgent
    ? "oklch(0.60 0.18 60)"   // amber
    : "oklch(0.42 0.18 150)"; // green

  const bg = isCritical
    ? "oklch(0.97 0.04 25)"
    : isUrgent
    ? "oklch(0.97 0.04 60)"
    : "oklch(0.97 0.04 150)";

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums"
      style={{ color, background: bg, border: `1px solid ${color}33` }}
      title="זמן שנותר לזמינות"
    >
      <Timer className="h-2.5 w-2.5 shrink-0" style={{ color }} />
      {countdown}
    </span>
  );
}

export default function AvailableWorkers() {
  const { isAuthenticated } = useAuth();
  const { userMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  // Fetch employer profile to get minWorkerAge preference.
  // Only enabled when the user is authenticated and in employer mode.
  const isEmployer = isAuthenticated && userMode === "employer";
  const employerProfileQuery = trpc.user.getEmployerProfile.useQuery(undefined, {
    enabled: isEmployer,
    staleTime: 60_000,
  });
  const minWorkerAge = isEmployer ? (employerProfileQuery.data?.minWorkerAge ?? null) : null;
  // Initialize radiusKm from employer's saved preference (user can still change it manually)
  const savedRadiusKm = isEmployer ? (employerProfileQuery.data?.workerSearchRadiusKm ?? null) : null;
  useEffect(() => {
    if (savedRadiusKm !== null) setRadiusKm(savedRadiusKm);
  }, [savedRadiusKm]);
  // Use employer's saved search coordinates as fallback (preferred over Jerusalem default)
  const savedLat = isEmployer && employerProfileQuery.data?.workerSearchLatitude
    ? parseFloat(employerProfileQuery.data.workerSearchLatitude)
    : null;
  const savedLng = isEmployer && employerProfileQuery.data?.workerSearchLongitude
    ? parseFloat(employerProfileQuery.data.workerSearchLongitude)
    : null;

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
        toast.success("מיקום עודכן");
      },
      () => { setLocating(false); toast.error("לא ניתן לאתר מיקום"); }
    );
  };

  // Priority: live GPS > employer saved location > Jerusalem default
  const effectiveLat = userLat ?? savedLat ?? 31.7683;
  const effectiveLng = userLng ?? savedLng ?? 35.2137;
  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: effectiveLat, lng: effectiveLng, radiusKm, limit: 50, minWorkerAge },
    { enabled: true, refetchInterval: 60000 }
  );

  const workers = workersQuery.data ?? [];

  const contactWorker = (phone: string | null, name: string) => {
    if (!isAuthenticated) { saveReturnPath(); setLoginOpen(true); return; }
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const intl = clean.startsWith("0") ? "972" + clean.slice(1) : clean;
    const text = encodeURIComponent(`שלום ${name}, ראיתי שאתה/את פנוי/ה לעבוד עכשיו. יש לי עבודה מתאימה — אפשר לדבר?`);
    window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
  };

  const callWorker = (phone: string | null) => {
    if (!isAuthenticated) { saveReturnPath(); setLoginOpen(true); return; }
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const calcDistance = (workerLat: string, workerLng: string) => {
    if (!userLat || !userLng) return null;
    const R = 6371;
    const lat1 = userLat * Math.PI / 180;
    const lat2 = parseFloat(workerLat) * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = (parseFloat(workerLng) - userLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          עובדים זמינים עכשיו
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          אנשים שסימנו שהם פנויים לעבוד — ניתן ליצור איתם קשר ישירות
        </p>
      </div>

      {/* Location + radius controls */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4 flex flex-wrap items-center gap-3">
        <AppButton
          variant="outline"
          size="sm"
          onClick={getLocation}
          disabled={locating}
          className="gap-2"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {userLat ? "עדכן מיקום" : "אתר מיקום"}
        </AppButton>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">רדיוס:</span>
          {[5, 10, 20, 50].map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                radiusKm === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r} ק"מ
            </button>
          ))}
        </div>

        {userLat && (
          <span className="text-xs text-green-600 flex items-center gap-1 mr-auto">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            מיקום פעיל
          </span>
        )}
      </div>

      {/* Age filter indicator — shown only when employer has set a minWorkerAge */}
      {minWorkerAge && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm text-amber-800">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            מסנן גיל פעיל: מוצגים רק עובדים בני <strong>{minWorkerAge}+</strong> (לפי הגדרות הפרופיל שלך)
          </span>
        </div>
      )}

      {/* Workers list */}
      {workersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <BrandLoader size="md" />
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">אין עובדים זמינים באזור כרגע</p>
          <p className="text-sm mt-1">
            {minWorkerAge
              ? `לא נמצאו עובדים בני ${minWorkerAge}+ בטווח ${radiusKm} ק"מ. נסה להרחיב את הרדיוס.`
              : `נסה להרחיב את הרדיוס או לחזור מאוחר יותר`}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            נמצאו <strong className="text-foreground">{workers.length}</strong> עובדים זמינים בטווח {radiusKm} ק"מ
          </p>
          <div className="space-y-3">
            {workers.map((worker) => {
              const dist = calcDistance(worker.latitude, worker.longitude);
              return (
                <div key={worker.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                        {worker.userName?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {worker.userName ?? "עובד"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {worker.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {worker.city}
                            </span>
                          )}
                          {dist !== null && (
                            <span className="text-primary font-medium">{formatDistance(dist)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {relativeTime(worker.createdAt)}
                          </span>
                        </div>
                        {/* Live countdown badge */}
                        {worker.availableUntil && (
                          <div className="mt-1">
                            <WorkerCountdownBadge availableUntil={worker.availableUntil} />
                          </div>
                        )}
                        {worker.note && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{worker.note}"</p>
                        )}
                      </div>
                    </div>

                    {/* Availability indicator */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 font-medium">פנוי</span>
                    </div>
                  </div>

                  {/* Contact buttons */}
                  <div className="flex gap-2 mt-3">
                    {isAuthenticated && worker.userPhone ? (
                      <>
                        <AppButton
                          size="sm"
                          className="flex-1 gap-1.5 text-xs"
                          style={{ backgroundColor: C_WHATSAPP }}
                          onClick={() => contactWorker(worker.userPhone, worker.userName ?? "עובד")}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </AppButton>
                        <AppButton
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => callWorker(worker.userPhone)}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          התקשר
                        </AppButton>
                      </>
                    ) : (
                      <AppButton
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs border-dashed text-muted-foreground"
                        onClick={() => setLoginOpen(true)}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        התחבר לראות פרטי קשר
                      </AppButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Info notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">כיצד להופיע ברשימה?</p>
          <p className="mt-0.5">עובדים יכולים ללחוץ על "אני פנוי לעבוד עכשיו" בדף הבית כדי להופיע ברשימה זו.</p>
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message="כדי ליצור קשר עם עובדים יש להתחבר למערכת" />
    </div>
  );
}
