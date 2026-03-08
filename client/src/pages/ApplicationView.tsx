/**
 * /applications/:id
 *
 * Employer-only page. Accessible via the SMS link sent when a worker applies.
 * Shows the worker's public profile in read-only mode.
 * Phone number is hidden until the employer clicks "הצג פרטי התקשרות",
 * which logs contactRevealed=true + revealedAt in the DB.
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { AppButton } from "@/components/AppButton";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES } from "@shared/categories";
import {
  User,
  MapPin,
  Briefcase,
  Phone,
  MessageCircle,
  ArrowRight,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";

const ALL_CATEGORIES = [
  ...JOB_CATEGORIES,
  ...SPECIAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon })),
];

const OLIVE = "#4F583B";
const OLIVE_LIGHT = "#f0f4eb";
const OLIVE_BORDER = "#c8d4b8";

export default function ApplicationView() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const applicationId = parseInt(params.id ?? "0");

  const [contactRevealed, setContactRevealed] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  const appQuery = trpc.jobs.getApplication.useQuery(
    { id: applicationId },
    {
      enabled: isAuthenticated && !!applicationId && !isNaN(applicationId),
    }
  );

  // Sync reveal state from server when data first loads
  const serverData = appQuery.data;
  if (serverData && serverData.contactRevealed && serverData.workerPhone && !contactRevealed) {
    setContactRevealed(true);
    setRevealedPhone(serverData.workerPhone);
  }

  const revealMutation = trpc.jobs.revealContact.useMutation({
    onSuccess: (data) => {
      setContactRevealed(true);
      setRevealedPhone(data.workerPhone ?? null);
      appQuery.refetch();
      toast.success("פרטי הקשר נחשפו");
    },
    onError: (err) => {
      toast.error(err.message ?? "שגיאה בחשיפת פרטי הקשר");
    },
  });

  const handleReveal = () => {
    revealMutation.mutate({ id: applicationId });
  };

  const handleCall = () => {
    if (revealedPhone) window.location.href = `tel:${revealedPhone}`;
  };

  const handleWhatsApp = () => {
    if (!revealedPhone) return;
    const clean = revealedPhone.replace(/\D/g, "");
    const intl = clean.startsWith("0") ? "972" + clean.slice(1) : clean;
    const workerName = appQuery.data?.workerName ?? "עובד";
    const jobTitle = appQuery.data?.jobTitle ?? "המשרה";
    const text = encodeURIComponent(
      `שלום ${workerName}, ראיתי את מועמדותך למשרה "${jobTitle}" ב-Job-Now. אשמח לדבר איתך.`
    );
    window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
  };

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold text-foreground mb-2">נדרשת התחברות</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          דף זה נגיש רק למפרסם המשרה. יש להתחבר כדי לצפות במועמדות.
        </p>
        <AppButton
          variant="brand"
          onClick={() => {
            window.location.href = getLoginUrl(`/applications/${applicationId}`);
          }}
        >
          התחבר לצפייה
        </AppButton>
      </div>
    );
  }

  // ── Invalid ID ─────────────────────────────────────────────────────────────
  if (isNaN(applicationId) || !applicationId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">מועמדות לא תקינה</p>
        <AppButton variant="brand" className="mt-4" onClick={() => navigate("/my-jobs")}>
          לניהול המשרות
        </AppButton>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (appQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  // ── Error / not found / forbidden ─────────────────────────────────────────
  if (appQuery.error) {
    const code = appQuery.error.data?.code;
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          {code === "FORBIDDEN" ? "אין גישה" : "מועמדות לא נמצאה"}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {code === "FORBIDDEN"
            ? "דף זה נגיש רק למפרסם המשרה."
            : "המועמדות לא קיימת או שהקישור אינו תקין."}
        </p>
        <AppButton variant="brand" onClick={() => navigate("/my-jobs")}>
          לניהול המשרות
        </AppButton>
      </div>
    );
  }

  const app = appQuery.data!;
  const categories = (app.workerPreferredCategories as string[] | null) ?? [];
  const matchedCategories = ALL_CATEGORIES.filter((c) => categories.includes(c.value));
  const joinedDate = new Date(app.workerCreatedAt).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
  });
  const appliedDate = new Date(app.createdAt).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Sync reveal state from server (already revealed on a previous visit)
  const isAlreadyRevealed = contactRevealed || (app.contactRevealed && !!app.workerPhone);
  const displayPhone = revealedPhone ?? (app.contactRevealed ? app.workerPhone : null);

  return (
    <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/my-jobs")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">מועמדות למשרה</h1>
          <p className="text-sm text-muted-foreground">{app.jobTitle}</p>
        </div>
      </div>

      {/* Application meta */}
      <div
        style={{
          background: OLIVE_LIGHT,
          border: `1px solid ${OLIVE_BORDER}`,
          borderRadius: 14,
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Calendar size={14} color={OLIVE} />
        <span style={{ color: OLIVE, fontSize: 12, fontWeight: 600 }}>
          הוגשה ב-{appliedDate}
        </span>
        {app.contactRevealed && app.revealedAt && (
          <>
            <span style={{ color: "#aaa", fontSize: 12 }}>·</span>
            <Eye size={14} color={OLIVE} />
            <span style={{ color: OLIVE, fontSize: 12, fontWeight: 600 }}>
              פרטים נחשפו ב-
              {new Date(app.revealedAt).toLocaleDateString("he-IL", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </>
        )}
      </div>

      {/* Worker profile card */}
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
              {app.workerName ?? "עובד"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Calendar size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                חבר מאז {joinedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Profile body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Location */}
          {app.workerPreferredCity && (
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
                <p style={{ color: OLIVE, fontSize: 14, fontWeight: 700, margin: 0 }}>
                  {app.workerPreferredCity}
                </p>
              </div>
            </div>
          )}

          {/* Application message */}
          {app.message && (
            <div
              style={{
                background: "#f9f7f3",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 16,
                border: "1px solid #e8e4dc",
              }}
            >
              <p style={{ color: "#888", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                הודעה מהמועמד
              </p>
              <p style={{ color: "#444", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {app.message}
              </p>
            </div>
          )}

          {/* Bio */}
          {app.workerBio && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#888", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>אודות</p>
              <p style={{ color: "#444", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {app.workerBio}
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
                      background: OLIVE_LIGHT,
                      color: OLIVE,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${OLIVE_BORDER}`,
                    }}
                  >
                    {cat.icon} {cat.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!app.workerPreferredCity && !app.workerBio && matchedCategories.length === 0 && !app.message && (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              המועמד טרם מילא פרטי פרופיל
            </p>
          )}
        </div>
      </div>

      {/* Contact reveal section */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e8e4dc",
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Phone size={16} color={OLIVE} />
          <h3 style={{ color: OLIVE, fontSize: 15, fontWeight: 800, margin: 0 }}>
            פרטי התקשרות
          </h3>
        </div>

        {isAlreadyRevealed && displayPhone ? (
          /* ── Contact revealed ─────────────────────────────────────────── */
          <div>
            <div
              style={{
                background: OLIVE_LIGHT,
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle2 size={16} color={OLIVE} />
              <div>
                <p style={{ color: "#888", fontSize: 11, fontWeight: 600, margin: 0 }}>
                  מספר טלפון
                </p>
                <a
                  href={`tel:${displayPhone}`}
                  style={{ color: OLIVE, fontSize: 16, fontWeight: 800, textDecoration: "none" }}
                  dir="ltr"
                >
                  {displayPhone}
                </a>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCall}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 14,
                  background: OLIVE,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 4px 14px rgba(79,88,59,0.25)",
                }}
              >
                <Phone size={15} />
                התקשר
              </button>
              <button
                onClick={handleWhatsApp}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 14,
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <MessageCircle size={15} />
                WhatsApp
              </button>
            </div>
          </div>
        ) : (
          /* ── Contact hidden ───────────────────────────────────────────── */
          <div>
            <div
              style={{
                background: "#f9f7f3",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px dashed #d1cdc4",
              }}
            >
              <EyeOff size={16} color="#aaa" />
              <div>
                <p style={{ color: "#888", fontSize: 11, fontWeight: 600, margin: 0 }}>
                  מספר טלפון
                </p>
                <p style={{ color: "#ccc", fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: 2 }}>
                  ••• ••• ••••
                </p>
              </div>
            </div>

            <p style={{ color: "#888", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
              לחץ על הכפתור כדי לחשוף את מספר הטלפון של המועמד ולאפשר יצירת קשר ישיר.
              פעולה זו תירשם במערכת.
            </p>

            <button
              onClick={handleReveal}
              disabled={revealMutation.isPending}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                background: OLIVE,
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                border: "none",
                cursor: revealMutation.isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: revealMutation.isPending ? 0.7 : 1,
                boxShadow: "0 4px 14px rgba(79,88,59,0.3)",
              }}
            >
              {revealMutation.isPending ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Eye size={16} />
              )}
              הצג פרטי התקשרות
            </button>
          </div>
        )}
      </div>

      {/* Back link */}
      <AppButton
        variant="outline"
        className="w-full"
        onClick={() => navigate("/my-jobs")}
      >
        חזרה לניהול המשרות
      </AppButton>
    </div>
  );
}
