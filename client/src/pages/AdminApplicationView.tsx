/**
 * /admin/applications/:id
 *
 * Admin-only view of a job application.
 * Shows ALL fields (including worker phone) without employer role restriction.
 * Reuses the existing jobs.getApplication procedure — the server already allows
 * admin access (ctx.user.role === "admin" bypasses the employer ownership check).
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { AppButton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Briefcase,
  Phone,
  MessageCircle,
  User,
  Lock,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

const OLIVE = "#4F583B";
const OLIVE_LIGHT = "#f0f4eb";
const OLIVE_BORDER = "#c8d4b8";

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  viewed: "נצפה",
  offered: "הוצע",
  accepted: "התקבל",
  rejected: "נדחה",
  offer_rejected: "ההצעה נדחתה",
  withdrawn: "בוטל",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  viewed: "bg-blue-100 text-blue-800",
  offered: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  offer_rejected: "bg-orange-100 text-orange-800",
  withdrawn: "bg-gray-100 text-gray-700",
};

export default function AdminApplicationView() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const applicationId = parseInt(params.id ?? "0");

  // ALL hooks called unconditionally before any early returns
  const appQuery = trpc.jobs.getApplication.useQuery(
    { id: applicationId },
    { enabled: !!applicationId && !isNaN(applicationId) && !!user && user.role === "admin" }
  );

  const { categories: dbCategories } = useCategories();

  // ── Auth loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  // ── Not admin ───────────────────────────────────────────────────────────────
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">גישה נדחתה</h2>
        <p className="text-muted-foreground mb-6 text-sm">דף זה נגיש לאדמינים בלבד.</p>
        <AppButton variant="brand" onClick={() => navigate("/")}>חזרה לדף הבית</AppButton>
      </div>
    );
  }

  // ── Invalid ID ──────────────────────────────────────────────────────────────
  if (isNaN(applicationId) || !applicationId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">מועמדות לא תקינה</p>
        <AppButton variant="brand" className="mt-4" onClick={() => navigate("/admin")}>
          חזרה לפאנל ניהול
        </AppButton>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (appQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (appQuery.error || !appQuery.data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">מועמדות לא נמצאה</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {appQuery.error?.message ?? "המועמדות לא קיימת או שהקישור אינו תקין."}
        </p>
        <AppButton variant="brand" onClick={() => navigate("/admin")}>
          חזרה לפאנל ניהול
        </AppButton>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const app = appQuery.data;
  const workerCategorySlugs = (app.workerPreferredCategories as string[] | null) ?? [];
  const matchedCategories = dbCategories.filter((c) => workerCategorySlugs.includes(c.slug));

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

  const handleCall = () => {
    if (app.workerPhone) window.location.href = `tel:${app.workerPhone}`;
  };

  const handleWhatsApp = () => {
    if (!app.workerPhone) return;
    const clean = app.workerPhone.replace(/\D/g, "");
    const intl = clean.startsWith("0") ? "972" + clean.slice(1) : clean;
    const text = encodeURIComponent(
      `שלום ${app.workerName ?? "עובד"}, ניצור קשר בנוגע למועמדות שלך למשרה "${app.jobTitle ?? ""}".`
    );
    window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/admin")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">פרטי מועמדות #{app.id}</h1>
          <p className="text-sm text-muted-foreground">{app.jobTitle}</p>
        </div>
        <Badge className={STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-700"}>
          {STATUS_LABELS[app.status] ?? app.status}
        </Badge>
      </div>

      {/* Meta row */}
      <div
        style={{
          background: OLIVE_LIGHT,
          border: `1px solid ${OLIVE_BORDER}`,
          borderRadius: 14,
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={14} color={OLIVE} />
          <span style={{ color: OLIVE, fontSize: 12, fontWeight: 600 }}>
            הוגשה ב-{appliedDate}
          </span>
        </div>
        {app.contactRevealed && app.revealedAt && (
          <div className="flex items-center gap-2">
            <Eye size={14} color={OLIVE} />
            <span style={{ color: OLIVE, fontSize: 12, fontWeight: 600 }}>
              פרטים נחשפו ב-
              {new Date(app.revealedAt).toLocaleDateString("he-IL", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock size={14} color={OLIVE} />
          <span style={{ color: OLIVE, fontSize: 12, fontWeight: 600 }}>
            ID: {app.id} | Job ID: {app.jobId}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Worker profile card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #e8e4dc",
            overflow: "hidden",
          }}
        >
          {/* Avatar + name header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${OLIVE} 0%, #6b7a50 100%)`,
              padding: "20px 20px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              👤
            </div>
            <div>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 900, margin: 0 }}>
                {app.workerName ?? "עובד"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <Calendar size={11} color="rgba(255,255,255,0.7)" />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
                  חבר מאז {joinedDate}
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px 18px" }}>
            {/* Location */}
            {app.workerPreferredCity && (
              <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl" style={{ background: "#f9f7f3" }}>
                <MapPin size={14} color={OLIVE} />
                <div>
                  <p style={{ color: "#999", fontSize: 10, fontWeight: 600, margin: 0 }}>אזור מועדף</p>
                  <p style={{ color: OLIVE, fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {app.workerPreferredCity}
                  </p>
                </div>
              </div>
            )}

            {/* Application message */}
            {app.message && (
              <div style={{ background: "#f9f7f3", borderRadius: 10, padding: "10px 12px", marginBottom: 12, border: "1px solid #e8e4dc" }}>
                <p style={{ color: "#888", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>הודעה מהמועמד</p>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{app.message}</p>
              </div>
            )}

            {/* Bio */}
            {app.workerBio && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: "#888", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>אודות</p>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{app.workerBio}</p>
              </div>
            )}

            {/* Categories */}
            {matchedCategories.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase size={12} color={OLIVE} />
                  <p style={{ color: "#888", fontSize: 11, fontWeight: 600, margin: 0 }}>תחומי עיסוק</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchedCategories.map((cat) => (
                    <span
                      key={cat.slug}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: OLIVE_LIGHT,
                        color: OLIVE,
                        fontSize: 11,
                        fontWeight: 600,
                        border: `1px solid ${OLIVE_BORDER}`,
                      }}
                    >
                      {cat.icon ?? "💼"} {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!app.workerPreferredCity && !app.workerBio && matchedCategories.length === 0 && !app.message && (
              <p style={{ color: "#aaa", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
                המועמד טרם מילא פרטי פרופיל
              </p>
            )}
          </div>
        </div>

        {/* Contact + admin info card */}
        <div className="flex flex-col gap-4">
          {/* Phone — always visible for admin */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              border: "1px solid #e8e4dc",
              padding: "18px 20px",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Phone size={15} color={OLIVE} />
              <h3 style={{ color: OLIVE, fontSize: 14, fontWeight: 800, margin: 0 }}>פרטי התקשרות</h3>
              <Badge variant="outline" className="text-xs mr-auto">Admin Only</Badge>
            </div>

            {app.workerPhone ? (
              <div>
                <div
                  style={{
                    background: OLIVE_LIGHT,
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={14} color={OLIVE} />
                  <div>
                    <p style={{ color: "#888", fontSize: 10, fontWeight: 600, margin: 0 }}>מספר טלפון</p>
                    <a
                      href={`tel:${app.workerPhone}`}
                      style={{ color: OLIVE, fontSize: 15, fontWeight: 800, textDecoration: "none" }}
                      dir="ltr"
                    >
                      {app.workerPhone}
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCall}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      background: OLIVE,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <Phone size={13} />
                    התקשר
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      background: "#e8f5e9",
                      color: "#2e7d32",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">אין מספר טלפון רשום</p>
            )}
          </div>

          {/* Admin metadata */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              border: "1px solid #e8e4dc",
              padding: "18px 20px",
            }}
          >
            <h3 style={{ color: OLIVE, fontSize: 14, fontWeight: 800, margin: "0 0 12px" }}>מידע טכני</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application ID</span>
                <span className="font-mono font-semibold">{app.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job ID</span>
                <span className="font-mono font-semibold">{app.jobId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Worker ID</span>
                <span className="font-mono font-semibold">{app.workerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">סטטוס</span>
                <Badge className={`text-xs ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {STATUS_LABELS[app.status] ?? app.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">פרטים נחשפו</span>
                <span className={app.contactRevealed ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                  {app.contactRevealed ? "כן" : "לא"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">קטגוריית משרה</span>
                <span className="font-semibold">{app.jobCategory ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="mt-6">
        <AppButton
          variant="outline"
          className="w-full"
          onClick={() => navigate("/admin")}
        >
          חזרה לפאנל ניהול
        </AppButton>
      </div>
    </div>
  );
}
