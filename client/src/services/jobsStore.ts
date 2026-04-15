// ── Jobs snapshot store ──────────────────────────────────────────────────────
// Module-level singleton — שורד navigation בין עמודים.
// מאחסן את רשימת המשרות שנטענה ב-FindJobs + filter key, TTL: 5 דקות.

const SNAPSHOT_TTL = 5 * 60 * 1000;

export interface CachedJob {
  id: number;
  title: string;
  description: string;
  category: string;
  address: string;
  city?: string | null;
  salary?: string | null;
  salaryType: string;
  contactPhone: null;
  businessName?: string | null;
  startTime: string;
  startDateTime?: Date | string | null;
  isUrgent?: boolean | null;
  workersNeeded: number;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  distance?: number;
  latitude?: number | string | null;
  longitude?: number | string | null;
  workingHours?: string | null;
  jobDate?: string | null;
  images?: string[] | null;
}

interface JobsSnapshot {
  filterKey: string;
  jobs: CachedJob[];
  total: number;
  page: number;
  savedAt: number;
}

type NewJobListener = (job: CachedJob) => void;

// ── State ────────────────────────────────────────────────────────────────────

let snapshot: JobsSnapshot | null = null;
const listeners = new Set<NewJobListener>();

// ── Snapshot API ─────────────────────────────────────────────────────────────

export function saveSnapshot(
  filterKey: string,
  jobs: CachedJob[],
  total: number,
  page: number,
): void {
  snapshot = { filterKey, jobs, total, page, savedAt: Date.now() };
}

export function restoreSnapshot(filterKey: string): JobsSnapshot | null {
  if (!snapshot) return null;
  if (snapshot.filterKey !== filterKey) return null;
  if (Date.now() - snapshot.savedAt > SNAPSHOT_TTL) return null;
  return snapshot;
}

// ── Event bus — עדכוני SSE ───────────────────────────────────────────────────

export function subscribeToNewJobs(listener: NewJobListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyNewJob(job: CachedJob): void {
  // עדכון ה-snapshot אם קיים
  if (snapshot) {
    if (!snapshot.jobs.some(j => j.id === job.id)) {
      snapshot = {
        ...snapshot,
        jobs: [job, ...snapshot.jobs],
        total: snapshot.total + 1,
      };
    }
  }
  // הודעה לכל המנויים (FindJobs אם מאונט כרגע)
  listeners.forEach(listener => listener(job));
}

// ── Filter key ───────────────────────────────────────────────────────────────

export interface FilterKeyParams {
  categories: string[];
  cities: string[];
  geoMode: boolean;
  lat?: number | null;
  lng?: number | null;
  radiusKm: number;
  dateFilter?: string | null;
  days: string[];
}

/** מחשב מחרוזת ייחודית מהפילטרים הפעילים */
export function computeFilterKey(params: FilterKeyParams): string {
  return JSON.stringify({
    cat: [...params.categories].sort(),
    cit: [...params.cities].sort(),
    geo: params.geoMode,
    // עיגול ל-1 ספרה עשרונית (~10 ק"מ) כדי שתנועה קטנה לא תבטל את הקאש
    lat: params.geoMode && params.lat != null ? Math.round(params.lat * 10) / 10 : null,
    lng: params.geoMode && params.lng != null ? Math.round(params.lng * 10) / 10 : null,
    rad: params.geoMode ? params.radiusKm : null,
    df: params.dateFilter ?? null,
    days: [...params.days].sort(),
  });
}
