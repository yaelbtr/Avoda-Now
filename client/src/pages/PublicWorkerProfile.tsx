import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES } from "@shared/categories";
import { User, MapPin, Briefcase, Phone, ArrowRight, Calendar } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

const ALL_CATEGORIES = [
  ...JOB_CATEGORIES,
  ...SPECIAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon })),
];

const OLIVE = "#4F583B";

export default function PublicWorkerProfile() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const userId = parseInt(params.id ?? "0");

  const profileQuery = trpc.user.getPublicProfile.useQuery(
    { userId },
    { enabled: !!userId && !isNaN(userId) }
  );

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

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">פרופיל עובד</h1>
      </div>

      {/* Profile card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e8e4dc",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {/* Avatar + name header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${OLIVE} 0%, #6b7a50 100%)`,
            padding: "28px 24px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>
              {profile.name ?? "עובד"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Calendar size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                חבר מאז {joinedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Profile details */}
        <div style={{ padding: "20px 24px" }}>
          {/* Location */}
          {profile.preferredCity && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                padding: "10px 14px",
                background: "#f9f7f3",
                borderRadius: 12,
              }}
            >
              <MapPin size={16} color={OLIVE} />
              <div>
                <p style={{ color: "#999", fontSize: 11, fontWeight: 600, margin: 0 }}>אזור מועדף</p>
                <p style={{ color: OLIVE, fontSize: 14, fontWeight: 700, margin: 0 }}>{profile.preferredCity}</p>
              </div>
            </div>
          )}

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
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Briefcase size={14} color={OLIVE} />
                <p style={{ color: "#888", fontSize: 12, fontWeight: 600, margin: 0 }}>תחומי עיסוק</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {matchedCategories.map((cat) => (
                  <span
                    key={cat.value}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 12px",
                      borderRadius: 20,
                      background: "#f0f4eb",
                      color: OLIVE,
                      fontSize: 12,
                      fontWeight: 600,
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
          {!profile.preferredCity && !profile.workerBio && matchedCategories.length === 0 && (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              העובד טרם מילא פרטי פרופיל
            </p>
          )}
        </div>
      </div>

      {/* Contact note */}
      <div
        style={{
          background: "#f9f7f3",
          borderRadius: 14,
          padding: "14px 16px",
          border: "1px solid #e8e4dc",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Phone size={16} color={OLIVE} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ color: OLIVE, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>
            ליצירת קשר עם העובד
          </p>
          <p style={{ color: "#666", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            העובד הגיש מועמדות דרך Job-Now. ניתן לחזור אליו דרך מספר הטלפון שהשאיר בעת ההרשמה.
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
