export const JOB_CATEGORIES = [
  { value: "delivery", label: "שליחויות", icon: "🚴" },
  { value: "warehouse", label: "מחסן", icon: "📦" },
  { value: "agriculture", label: "חקלאות", icon: "🌾" },
  { value: "kitchen", label: "מטבח", icon: "🍳" },
  { value: "cleaning", label: "ניקיון", icon: "🧹" },
  { value: "security", label: "אבטחה", icon: "🛡️" },
  { value: "construction", label: "בנייה", icon: "🏗️" },
  { value: "childcare", label: "טיפול בילדים", icon: "👶" },
  { value: "eldercare", label: "טיפול בקשישים", icon: "🧓" },
  { value: "retail", label: "קמעונאות", icon: "🛍️" },
  { value: "events", label: "אירועים", icon: "🎉" },
  { value: "other", label: "אחר", icon: "💼" },
] as const;

// Special categories shown separately with highlighted styling
export const SPECIAL_CATEGORIES = [
  { value: "emergency_support", label: "סיוע בזמן חירום", icon: "🆘", color: "purple" },
  { value: "reserve_families", label: "משפחות מילואימניקים", icon: "🪖", color: "purple" },
  { value: "passover_jobs", label: "עבודות לפסח", icon: "🫓", color: "amber" },
  { value: "volunteer", label: "התנדבות", icon: "💚", color: "green" },
] as const;

// Categories that are wartime/emergency related — shown with priority banner
export const WARTIME_CATEGORIES = ["emergency_support", "reserve_families"] as const;

// Categories that are seasonal (Passover) — shown with seasonal banner
export const SEASONAL_CATEGORIES = ["passover_jobs"] as const;

export type CategoryValue = (typeof JOB_CATEGORIES)[number]["value"];

export const SALARY_TYPES = [
  { value: "hourly", label: "לשעה" },
  { value: "daily", label: "ליום" },
  { value: "monthly", label: "לחודש" },
  { value: "volunteer", label: "התנדבות" },
] as const;

export const START_TIMES = [
  { value: "today", label: "היום" },
  { value: "tomorrow", label: "מחר" },
  { value: "this_week", label: "השבוע" },
  { value: "flexible", label: "גמיש" },
] as const;

export const RADIUS_OPTIONS = [
  { value: 5, label: "5 ק\"מ" },
  { value: 10, label: "10 ק\"מ" },
  { value: 20, label: "20 ק\"מ" },
  { value: 50, label: "50 ק\"מ" },
] as const;

// Per-category color tokens: { bg, text, border } in OKLCH
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  delivery:     { bg: "oklch(0.92 0.06 230)",  text: "oklch(0.28 0.10 230)",  border: "oklch(0.80 0.08 230)" },
  warehouse:    { bg: "oklch(0.93 0.04 60)",   text: "oklch(0.33 0.08 60)",   border: "oklch(0.82 0.06 60)" },
  agriculture:  { bg: "oklch(0.92 0.08 145)",  text: "oklch(0.28 0.12 145)",  border: "oklch(0.78 0.10 145)" },
  kitchen:      { bg: "oklch(0.93 0.07 50)",   text: "oklch(0.33 0.12 50)",   border: "oklch(0.80 0.10 50)" },
  cleaning:     { bg: "oklch(0.93 0.05 200)",  text: "oklch(0.30 0.09 200)",  border: "oklch(0.80 0.07 200)" },
  security:     { bg: "oklch(0.91 0.04 280)",  text: "oklch(0.28 0.08 280)",  border: "oklch(0.78 0.06 280)" },
  construction: { bg: "oklch(0.92 0.06 40)",   text: "oklch(0.31 0.10 40)",   border: "oklch(0.80 0.08 40)" },
  childcare:    { bg: "oklch(0.93 0.07 340)",  text: "oklch(0.31 0.12 340)",  border: "oklch(0.80 0.10 340)" },
  eldercare:    { bg: "oklch(0.92 0.04 260)",  text: "oklch(0.30 0.08 260)",  border: "oklch(0.79 0.06 260)" },
  retail:       { bg: "oklch(0.93 0.07 160)",  text: "oklch(0.30 0.11 160)",  border: "oklch(0.79 0.09 160)" },
  events:       { bg: "oklch(0.93 0.07 300)",  text: "oklch(0.31 0.12 300)",  border: "oklch(0.80 0.10 300)" },
  other:        { bg: "oklch(0.93 0.03 84)",   text: "oklch(0.38 0.06 84)",   border: "oklch(0.87 0.04 84)" },
};

export function getCategoryColor(value: string): { bg: string; text: string; border: string } {
  return CATEGORY_COLORS[value] ?? CATEGORY_COLORS["other"];
}

export function getCategoryLabel(value: string): string {
  return JOB_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getCategoryIcon(value: string): string {
  return JOB_CATEGORIES.find((c) => c.value === value)?.icon ?? "💼";
}

export function getSalaryTypeLabel(value: string): string {
  return SALARY_TYPES.find((s) => s.value === value)?.label ?? value;
}

export function getStartTimeLabel(value: string): string {
  return START_TIMES.find((s) => s.value === value)?.label ?? value;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ'`;
  return `${km.toFixed(1)} ק"מ`;
}

/**
 * Returns true if the job is starting within the next 24 hours.
 * Checks the jobDate field, startDateTime timestamp, and the legacy startTime enum.
 */
export function isJobToday(
  startDateTime: Date | string | null | undefined,
  startTime: string,
  jobDate?: string | null
): boolean {
  if (startTime === "today") return true;
  // Check jobDate (YYYY-MM-DD) — most reliable for scheduled jobs
  if (jobDate) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (jobDate === todayStr) return true;
  }
  if (!startDateTime) return false;
  const dt = startDateTime instanceof Date ? startDateTime : new Date(startDateTime);
  if (isNaN(dt.getTime())) return false;
  const now = Date.now();
  const diff = dt.getTime() - now;
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

export function formatSalary(salary: string | null | undefined, salaryType: string): string {
  if (!salary || salaryType === "volunteer") return "התנדבות";
  const num = parseFloat(salary);
  const typeLabel = getSalaryTypeLabel(salaryType);
  return `₪${num.toLocaleString("he-IL")} ${typeLabel}`;
}
