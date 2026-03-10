import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES } from "@shared/categories";
import { User, MapPin, Briefcase, Phone, ArrowRight, Star, Zap, CheckCircle2 } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

const ALL_CATEGORIES = [
  ...JOB_CATEGORIES,
  ...SPECIAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon })),
];

const OLIVE = "#4F583B";

const AVAILABILITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  available_now:   { label: "זמין עכשיו",   color: "#166534", bg: "#dcfce7" },
  available_today: { label: "זמין היום",    color: "#92400e", bg: "#fef3c7" },
  available_hours: { label: "זמין בשעות",   color: "#1e40af", bg: "#dbeafe" },
  not_available:   { label: "לא זמין",      color: "#6b7280", bg: "#f3f4f6" },
};

/** Haversine distance in km between two lat/lng pairs */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          style={{
            color: i <= full ? "#f59e0b" : i === full + 1 && half ? "#f59e0b" : "#d1d5db",
            fill: i <= full ? "#f59e0b" : i === full + 1 && half ? "#fde68a" : "none",
          }}
        />
      ))}
      <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginRight: 4 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default function PublicWorkerProfile() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const userId = parseInt(params.id ?? "0");
  const { user: currentUser } = useAuth();

  const profileQuery = trpc.user.getPublicProfile.useQuery(
    { userId },
    { enabled: !!userId && !isNaN(userId) }
  );

  // Employer's own location from their worker profile (if they have one)
  const myProfileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: !!currentUser,
  });

  const distanceKm = useMemo(() => {
    const p = profileQuery.data;
    const me = myProfileQuery.data;
    if (!p?.workerLatitude || !p?.workerLongitude) return null;
    if (!me?.workerLatitude || !me?.workerLongitude) return null;
    return haversineKm(
      parseFloat(me.workerLatitude),
      parseFloat(me.workerLongitude),
      parseFloat(p.workerLatitude),
      parseFloat(p.workerLongitude)
    );
  }, [profileQuery.data, myProfileQuery.data]);

  if (isNaN(userId) || !userId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">פרופיל לא תקין</p>
        <AppButton variant="brand" className="mt-4" onClick={() => navigate("/")}>
          חזרה לדף הבית
        </AppButton>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">פרופיל לא נמצא</p>
        <AppButton variant="brand" className="mt-4" onClick={() => navigate("/")}>
          חזרה לדף הבית
        </AppButton>
      </div>
    );
  }

  const profile = profileQuery.data;
  const categories = (profile.preferredCategories as string[] | null) ?? [];
  const matchedCategories = ALL_CATEGORIES.filter((c) => categories.includes(c.value));
  const ratingNum = profile.workerRating ? parseFloat(profile.workerRating) : null;
  const avail = profile.availabilityStatus ? AVAILABILITY_MAP[profile.availabilityStatus] : null;
  const completedJobs = profile.completedJobsCount ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1 as any)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">פרופיל עובד</h1>
      </div>

      {/* Profile card */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #e8e4dc",
        overflow: "hidden",
        marginBottom: 16,
        boxShadow: "0 2px 16px rgba(79,88,59,0.08)",
      }}>
        {/* Avatar + name header */}
        <div style={{
          background: `linear-gradient(135deg, ${OLIVE} 0%, #6b7a50 100%)`,
          padding: "24px 20px 20px",
          display: "flex",
          flexDirection: "row-reverse",
          alignItems: "flex-start",
          gap: 16,
        }}>
          {/* Avatar */}
          {profile.profilePhoto ? (
            <img
              src={profile.profilePhoto}
              alt={profile.name ?? ""}
              loading="lazy"
              decoding="async"
              style={{
                width: 72, height: 72, borderRadius: "50%",
                objectFit: "cover", flexShrink: 0,
                border: "3px solid rgba(255,255,255,0.8)",
              }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.4)",
            }}>
              <User size={32} color="rgba(255,255,255,0.9)" />
            </div>
          )}

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
              {profile.name ?? "עובד"}
            </h2>

            {/* Categories summary */}
            {matchedCategories.length > 0 && (
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, margin: "4px 0 0" }}>
                {matchedCategories.slice(0, 2).map((c) => `${c.icon} ${c.label}`).join(" · ")}
                {matchedCategories.length > 2 && ` +${matchedCategories.length - 2}`}
              </p>
            )}

            {/* Stats row */}
            <div style={{
              display: "flex",
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              gap: "6px 14px",
              marginTop: 10,
              alignItems: "center",
            }}>
              {/* Rating */}
              {ratingNum !== null && ratingNum > 0 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} size={13} style={{
                      color: i <= Math.round(ratingNum) ? "#fbbf24" : "rgba(255,255,255,0.4)",
                      fill: i <= Math.round(ratingNum) ? "#fbbf24" : "none",
                    }} />
                  ))}
                  <span style={{ color: "#fde68a", fontSize: 12, fontWeight: 700, marginRight: 2 }}>
                    {ratingNum.toFixed(1)}
                  </span>
                </span>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>אין דירוג</span>
              )}

              {/* Completed jobs */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>
                <CheckCircle2 size={13} />
                {completedJobs} עבודות
              </span>

              {/* Distance */}
              {distanceKm !== null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>
                  <MapPin size={13} />
                  {distanceKm < 1 ? "פחות מ-1 ק\"מ" : `${distanceKm.toFixed(1)} ק"מ`}
                </span>
              )}
            </div>

            {/* Availability badge */}
            {avail && (
              <div style={{ marginTop: 10 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 9999,
                  fontSize: 11, fontWeight: 700,
                  color: avail.color, background: avail.bg,
                }}>
                  <Zap size={11} />
                  {avail.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profile details */}
        <div style={{ padding: "20px 20px" }}>
          {/* Bio */}
          {profile.workerBio && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#888", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>אודות</p>
              <p style={{ color: "#444", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {profile.workerBio}
              </p>
            </div>
          )}

          {/* Categories */}
          {matchedCategories.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Briefcase size={14} color={OLIVE} />
                <p style={{ color: "#888", fontSize: 12, fontWeight: 600, margin: 0 }}>תחומי עיסוק</p>
              </div>
              <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
                {matchedCategories.map((cat) => (
                  <span
                    key={cat.value}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 12px", borderRadius: 20,
                      background: "#f0f4eb", color: OLIVE,
                      fontSize: 12, fontWeight: 600,
                      border: "1px solid #c8d4b8",
                    }}
                  >
                    {cat.icon} {cat.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!profile.workerBio && matchedCategories.length === 0 && (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              העובד טרם מילא פרטי פרופיל
            </p>
          )}
        </div>
      </div>

      {/* Contact note */}
      <div style={{
        background: "#f9f7f3",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1px solid #e8e4dc",
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "flex-start",
        gap: 10,
      }}>
        <Phone size={16} color={OLIVE} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ color: OLIVE, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>
            ליצירת קשר עם העובד
          </p>
          <p style={{ color: "#666", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            העובד הגיש מועמדות דרך AvodaNow. ניתן לחזור אליו דרך מספר הטלפון שהשאיר בעת ההרשמה.
            לצפייה במועמדויות שהתקבלו, כנס לניהול המשרות שלך.
          </p>
        </div>
      </div>

      {/* Back to jobs */}
      <div style={{ marginTop: 20 }}>
        <AppButton
          variant="outline"
          className="w-full"
          onClick={() => navigate("/my-jobs")}
        >
          לניהול המשרות שלי
        </AppButton>
      </div>
    </div>
  );
}
