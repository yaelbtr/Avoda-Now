import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, type Variants } from "framer-motion";
import {
  Search,
  MapPin,
  Zap,
  Star,
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  ArrowLeft,
  Phone,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
  Bell,
} from "lucide-react";

// ─── אנימציות כניסה ──────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── נתוני קטגוריות ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "ניקיון", href: "/jobs/ניקיון", icon: <ShieldCheck className="w-5 h-5" /> },
  { label: "בייביסיטר", href: "/jobs/בייביסיטר", icon: <Users className="w-5 h-5" /> },
  { label: "הובלות", href: "/jobs/הובלות", icon: <Briefcase className="w-5 h-5" /> },
  { label: "אירועים", href: "/jobs/אירועים", icon: <Star className="w-5 h-5" /> },
  { label: "שליחויות", href: "/jobs/שליחויות", icon: <Zap className="w-5 h-5" /> },
  { label: "טיפול בכלבים", href: "/jobs/טיפול-בכלבים", icon: <MapPin className="w-5 h-5" /> },
];

// ─── שלבי "איך זה עובד" ────────────────────────────────────────────────────────
const WORKER_STEPS = [
  {
    icon: <Phone className="w-6 h-6" />,
    title: "נרשמים תוך שניות",
    desc: "הכנסת מספר טלפון ואישור — ללא שם משתמש וסיסמה.",
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "מגלים עבודות קרובות",
    desc: "רואים משרות לפי מיקום, שעה ושכר — בלחיצה אחת.",
  },
  {
    icon: <CheckCircle className="w-6 h-6" />,
    title: "מגישים מועמדות",
    desc: "לוחצים ״אני מעוניין/ת״ והמעסיק מקבל הודעה מיידית.",
  },
];

const EMPLOYER_STEPS = [
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: "מפרסמים משרה",
    desc: "כותבים תיאור, מגדירים שכר ושעות — תוך 2 דקות.",
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: "מקבלים מועמדים",
    desc: "המערכת שולחת SMS ל-עובדים רלוונטיים בסביבה.",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "בוחרים ומאשרים",
    desc: "צפייה בפרופילים, בחירה ותיאום ישיר דרך WhatsApp.",
  },
];

// ─── יתרונות ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Zap className="w-7 h-7" />,
    title: "גיוס בזמן אמת",
    desc: "עובדים רואים את המשרה שלך מיד לאחר הפרסום.",
  },
  {
    icon: <MapPin className="w-7 h-7" />,
    title: "לפי מיקום",
    desc: "התאמה לפי קרבה גיאוגרפית — רק עובדים שבאזורך.",
  },
  {
    icon: <ShieldCheck className="w-7 h-7" />,
    title: "ללא עמלות",
    desc: "פרסום ומציאת עבודה חינמיים לחלוטין.",
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    title: "מעקב בזמן אמת",
    desc: "רואים כמה אנשים ראו ומי הגיש מועמדות.",
  },
];

// ─── סטטיסטיקות ──────────────────────────────────────────────────────────────
const STATS = [
  { value: "10,000+", label: "עובדים רשומים" },
  { value: "500+", label: "מעסיקים פעילים" },
  { value: "45 ₪+", label: "שכר ממוצע לשעה" },
  { value: "< 2 דק׳", label: "זמן ממוצע לגיוס" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg-gradient)" }}>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 text-center">
        {/* עיגולי רקע דקורטיביים */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: "var(--brand)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-8"
          style={{ background: "var(--citrus)" }}
        />

        <motion.div
          className="relative mx-auto max-w-2xl"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* תגית */}
          <motion.div variants={fadeUp} className="mb-6 flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                background: "var(--brand-light)",
                color: "var(--brand)",
                border: "1px solid",
                borderColor: "var(--brand)",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              עבודות זמניות — קרוב אליך
            </span>
          </motion.div>

          {/* כותרת ראשית */}
          <motion.h1
            variants={fadeUp}
            className="mb-4 text-4xl font-bold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            מצא עובדים או עבודה{" "}
            <span style={{ color: "var(--citrus-on-light)" }}>תוך דקות</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mb-10 text-lg leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            AvodaGo מחברת בין עובדים למעסיקים לעבודות זמניות — ניקיון, בייביסיטינג,
            הובלות, אירועים ועוד. מהיר, פשוט, בלי עמלות.
          </motion.p>

          {/* CTA כפולה */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={() => navigate("/find-jobs")}
              className="flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background: "var(--brand)",
                color: "oklch(0.99 0.01 91.6)",
              }}
            >
              <Search className="w-5 h-5" />
              אני מחפש עבודה
            </button>
            <button
              onClick={() => navigate("/post-job")}
              className="flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background: "var(--citrus)",
                color: "var(--text-primary)",
              }}
            >
              <Briefcase className="w-5 h-5" />
              אני מחפש עובד
            </button>
          </motion.div>

          {/* סטטיסטיקות מהירות */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {STATS.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="rounded-xl p-4 text-center"
                style={{ background: "oklch(1 0 0 / 0.7)", border: "1px solid var(--border)" }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--brand)", fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── קטגוריות ─────────────────────────────────────────────────────────── */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2
            className="mb-6 text-center text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            תחומי עיסוק פופולריים
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => navigate(cat.href)}
                className="flex flex-col items-center gap-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-[1.03] active:scale-95"
                style={{
                  background: "oklch(1 0 0 / 0.85)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ color: "var(--brand)" }}>{cat.icon}</span>
                <span className="text-xs font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── איך זה עובד ──────────────────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ── יתרונות ────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            למה AvodaGo?
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex gap-4 rounded-2xl p-5"
                style={{ background: "oklch(1 0 0 / 0.85)", border: "1px solid var(--border)" }}
              >
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--brand-light)", color: "var(--brand)" }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3
                    className="mb-1 font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA סופי ─────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-xl rounded-3xl p-10 text-center"
          style={{ background: "var(--brand)", color: "oklch(0.99 0.01 91.6)" }}
        >
          <Clock className="mx-auto mb-4 w-10 h-10 opacity-80" />
          <h2
            className="mb-3 text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            מוכן/ת להתחיל?
          </h2>
          <p className="mb-7 text-sm leading-relaxed opacity-80">
            הצטרפות חינמית — ללא כרטיס אשראי, ללא עמלות. עשרות עבודות מחכות לך עכשיו.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/find-jobs")}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: "var(--citrus)", color: "var(--text-primary)" }}
            >
              <Search className="w-4 h-4" />
              מצא עבודה עכשיו
            </button>
            <button
              onClick={() => navigate("/post-job")}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-white/20 active:scale-95"
              style={{
                background: "oklch(1 0 0 / 0.12)",
                color: "oklch(0.99 0.01 91.6)",
                border: "1.5px solid oklch(1 0 0 / 0.3)",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              פרסם משרה
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

// ─── סקציית "איך זה עובד" עם טאב עובד/מעסיק ────────────────────────────────
function HowItWorksSection() {
  const [tab, setTab] = useState<"worker" | "employer">("worker");
  const steps = tab === "worker" ? WORKER_STEPS : EMPLOYER_STEPS;

  return (
    <section className="px-4 py-16" style={{ background: "oklch(1 0 0 / 0.4)" }}>
      <div className="mx-auto max-w-2xl">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          איך זה עובד?
        </motion.h2>

        {/* Tab selector */}
        <div
          className="mx-auto mb-10 flex w-fit rounded-xl p-1"
          style={{ background: "var(--muted)" }}
        >
          {(["worker", "employer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-lg px-6 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200"
              style={
                tab === t
                  ? { background: "var(--brand)", color: "oklch(0.99 0.01 91.6)" }
                  : { color: "var(--text-secondary)" }
              }
            >
              {t === "worker" ? "אני עובד/ת" : "אני מעסיק/ה"}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-start gap-4 rounded-2xl p-5"
              style={{ background: "oklch(1 0 0 / 0.9)", border: "1px solid var(--border)" }}
            >
              {/* מספר שלב */}
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "var(--brand)", color: "oklch(0.99 0.01 91.6)" }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span style={{ color: "var(--brand-mid)" }}>{step.icon}</span>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

