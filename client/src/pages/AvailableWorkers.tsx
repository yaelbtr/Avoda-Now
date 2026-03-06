import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import LoginModal from "@/components/LoginModal";
import { MapPin, Phone, Users, Clock, MessageCircle, AlertCircle, LocateFixed, Loader2 } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { formatDistance } from "@shared/categories";
import { toast } from "sonner";

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "זמין עכשיו";
  if (mins < 60) return `זמין מלפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  return `זמין מלפני ${hrs === 1 ? "שעה" : hrs + " שעות"}`;
}

function availableUntilText(until: Date | string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "פג תוקף";
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs === 0) return `פנוי עוד ${mins} דקות`;
  return `פנוי עוד ${hrs} שעות`;
}

export default function AvailableWorkers() {
  const { isAuthenticated } = useAuth();
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

  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm, limit: 50 },
    { enabled: true, refetchInterval: 60000 }
  );

  const workers = workersQuery.data ?? [];

  const contactWorker = (phone: string | null, name: string) => {
    if (!isAuthenticated) { setLoginOpen(true); return; }
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const intl = clean.startsWith("0") ? "972" + clean.slice(1) : clean;
    const text = encodeURIComponent(`שלום ${name}, ראיתי שאתה/את פנוי/ה לעבוד עכשיו. יש לי עבודה מתאימה — אפשר לדבר?`);
    window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
  };

  const callWorker = (phone: string | null) => {
    if (!isAuthenticated) { setLoginOpen(true); return; }
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
        <Button
          variant="outline"
          size="sm"
          onClick={getLocation}
          disabled={locating}
          className="gap-2"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {userLat ? "עדכן מיקום" : "אתר מיקום"}
        </Button>

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

      {/* Workers list */}
      {workersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <BrandLoader size="md" />
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">אין עובדים זמינים באזור כרגע</p>
          <p className="text-sm mt-1">נסה להרחיב את הרדיוס או לחזור מאוחר יותר</p>
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
                        {worker.availableUntil && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">
                            {availableUntilText(worker.availableUntil)}
                          </p>
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
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 text-xs text-white"
                          style={{ backgroundColor: "#25D366" }}
                          onClick={() => contactWorker(worker.userPhone, worker.userName ?? "עובד")}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => callWorker(worker.userPhone)}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          התקשר
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs border-dashed text-muted-foreground"
                        onClick={() => setLoginOpen(true)}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        התחבר לראות פרטי קשר
                      </Button>
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
