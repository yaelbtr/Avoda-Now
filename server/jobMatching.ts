import {
  calcAge,
  isJobAccessibleToMinor,
  isMinor as calcIsMinor,
  meetsMinAgeRequirement,
} from "../shared/ageUtils";

export interface WorkerMatchingProfile {
  preferredCategories?: string[] | null;
  preferredCity?: string | null;
  preferredCities?: number[] | null;
  locationMode?: "city" | "radius" | null;
  workerLatitude?: string | number | null;
  workerLongitude?: string | number | null;
  searchRadiusKm?: number | null;
  preferredDays?: string[] | null;
  preferredTimeSlots?: string[] | null;
  birthDate?: string | null;
}

export interface JobMatchingTarget {
  category?: string | null;
  city?: string | null;
  cityId?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  startTime?: string | null;
  startDateTime?: Date | string | null;
  jobDate?: string | null;
  workStartTime?: string | null;
  workEndTime?: string | null;
  minAge?: number | null;
  categoryAllowedForMinors?: boolean | null;
}

export interface WorkerJobMatchResult {
  matches: boolean;
  distanceKm: number | null;
  score: number;
}

const DAY_VALUES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const SLOT_RANGES: Record<string, Array<{ start: number; end: number }>> = {
  morning: [{ start: 6 * 60, end: 12 * 60 }],
  afternoon: [{ start: 12 * 60, end: 17 * 60 }],
  evening: [{ start: 17 * 60, end: 22 * 60 }],
  night: [
    { start: 22 * 60, end: 24 * 60 },
    { start: 0, end: 6 * 60 },
  ],
};

function normalizeCityName(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function parseCoordinate(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getJobDayValue(job: JobMatchingTarget): string | null {
  const fromJobDate = job.jobDate
    ? new Date(`${job.jobDate}T00:00:00`)
    : null;

  if (fromJobDate && !Number.isNaN(fromJobDate.getTime())) {
    return DAY_VALUES[fromJobDate.getDay()] ?? null;
  }

  if (job.startDateTime) {
    const fromStartDateTime = new Date(job.startDateTime);
    if (!Number.isNaN(fromStartDateTime.getTime())) {
      return DAY_VALUES[fromStartDateTime.getDay()] ?? null;
    }
  }

  if (job.startTime === "today" || job.startTime === "tomorrow") {
    const relativeDate = new Date();
    if (job.startTime === "tomorrow") {
      relativeDate.setDate(relativeDate.getDate() + 1);
    }
    return DAY_VALUES[relativeDate.getDay()] ?? null;
  }

  return null;
}

function getJobTimeRanges(job: JobMatchingTarget): Array<{ start: number; end: number }> {
  const start = parseTimeToMinutes(job.workStartTime);
  const end = parseTimeToMinutes(job.workEndTime);

  if (start == null || end == null || start === end) {
    return [];
  }

  if (end > start) {
    return [{ start, end }];
  }

  return [
    { start, end: 24 * 60 },
    { start: 0, end },
  ];
}

function getWorkerDistanceKm(
  worker: WorkerMatchingProfile,
  job: JobMatchingTarget,
): number | null {
  const workerLat = parseCoordinate(worker.workerLatitude);
  const workerLng = parseCoordinate(worker.workerLongitude);
  const jobLat = parseCoordinate(job.latitude);
  const jobLng = parseCoordinate(job.longitude);

  if (workerLat == null || workerLng == null || jobLat == null || jobLng == null) {
    return null;
  }

  return haversineKm(workerLat, workerLng, jobLat, jobLng);
}

function matchesWorkerLocation(worker: WorkerMatchingProfile, job: JobMatchingTarget): boolean {
  const normalizedPreferredCity = normalizeCityName(worker.preferredCity);
  const normalizedJobCity = normalizeCityName(job.city);
  const preferredCities = Array.isArray(worker.preferredCities) ? worker.preferredCities : [];
  const hasCityPreferences = !!normalizedPreferredCity || preferredCities.length > 0;
  const distanceKm = getWorkerDistanceKm(worker, job);
  const effectiveLocationMode =
    worker.locationMode ?? (distanceKm != null ? "radius" : "city");

  if (effectiveLocationMode === "radius" && distanceKm != null) {
    return distanceKm <= (worker.searchRadiusKm ?? 5);
  }

  if (!hasCityPreferences) {
    return true;
  }

  if (normalizedPreferredCity && normalizedPreferredCity === normalizedJobCity) {
    return true;
  }

  return job.cityId != null && preferredCities.includes(job.cityId);
}

function matchesWorkerDayPreferences(worker: WorkerMatchingProfile, job: JobMatchingTarget): boolean {
  const preferredDays = Array.isArray(worker.preferredDays) ? worker.preferredDays : [];
  if (preferredDays.length === 0) return true;

  const jobDay = getJobDayValue(job);
  if (!jobDay) return true;

  return preferredDays.includes(jobDay);
}

function matchesWorkerTimePreferences(worker: WorkerMatchingProfile, job: JobMatchingTarget): boolean {
  const preferredTimeSlots = Array.isArray(worker.preferredTimeSlots) ? worker.preferredTimeSlots : [];
  if (preferredTimeSlots.length === 0) return true;

  const jobRanges = getJobTimeRanges(job);
  if (jobRanges.length === 0) return true;

  return preferredTimeSlots.some((slot) => {
    const slotRanges = SLOT_RANGES[slot] ?? [];
    return slotRanges.some((slotRange) =>
      jobRanges.some((jobRange) => rangesOverlap(slotRange, jobRange))
    );
  });
}

function matchesWorkerAge(worker: WorkerMatchingProfile, job: JobMatchingTarget): boolean {
  const age = calcAge(worker.birthDate);

  if (!meetsMinAgeRequirement(age, job.minAge)) {
    return false;
  }

  if (calcIsMinor(age)) {
    if (job.categoryAllowedForMinors === false) {
      return false;
    }

    if (!isJobAccessibleToMinor(job.workEndTime)) {
      return false;
    }
  }

  return true;
}

function calculateMatchScore(
  worker: WorkerMatchingProfile,
  job: JobMatchingTarget,
  distanceKm: number | null,
): number {
  const preferredCategories = Array.isArray(worker.preferredCategories) ? worker.preferredCategories : [];
  const preferredDays = Array.isArray(worker.preferredDays) ? worker.preferredDays : [];
  const preferredTimeSlots = Array.isArray(worker.preferredTimeSlots) ? worker.preferredTimeSlots : [];
  const hasCityPreferences =
    !!normalizeCityName(worker.preferredCity) ||
    (Array.isArray(worker.preferredCities) && worker.preferredCities.length > 0);

  let score = preferredCategories.length > 0 ? 0.28 : 0.18;

  if (distanceKm != null && (worker.locationMode ?? "city") === "radius") {
    const radius = Math.max(worker.searchRadiusKm ?? 5, 1);
    const closeness = Math.max(0, 1 - distanceKm / radius);
    score += 0.22 + closeness * 0.22;
  } else if (hasCityPreferences) {
    score += 0.34;
  } else {
    score += 0.18;
  }

  score += preferredDays.length > 0 && getJobDayValue(job) ? 0.12 : 0.06;
  score += preferredTimeSlots.length > 0 && getJobTimeRanges(job).length > 0 ? 0.12 : 0.06;

  return Math.min(1, Number(score.toFixed(3)));
}

export function matchWorkerToJob(
  worker: WorkerMatchingProfile,
  job: JobMatchingTarget,
): WorkerJobMatchResult {
  const preferredCategories = Array.isArray(worker.preferredCategories) ? worker.preferredCategories : [];
  const distanceKm = getWorkerDistanceKm(worker, job);

  if (preferredCategories.length > 0 && job.category && !preferredCategories.includes(job.category)) {
    return { matches: false, distanceKm, score: 0 };
  }

  if (!matchesWorkerLocation(worker, job)) {
    return { matches: false, distanceKm, score: 0 };
  }

  if (!matchesWorkerAge(worker, job)) {
    return { matches: false, distanceKm, score: 0 };
  }

  if (!matchesWorkerDayPreferences(worker, job)) {
    return { matches: false, distanceKm, score: 0 };
  }

  if (!matchesWorkerTimePreferences(worker, job)) {
    return { matches: false, distanceKm, score: 0 };
  }

  return {
    matches: true,
    distanceKm,
    score: calculateMatchScore(worker, job, distanceKm),
  };
}
