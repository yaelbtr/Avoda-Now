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
  { value: "volunteer", label: "התנדבות", icon: "💚" },
  { value: "other", label: "אחר", icon: "💼" },
] as const;

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
 * Checks both the exact startDateTime timestamp and the legacy startTime enum.
 */
export function isJobToday(
  startDateTime: Date | string | null | undefined,
  startTime: string
): boolean {
  if (startTime === "today") return true;
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
