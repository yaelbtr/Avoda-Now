/**
 * usePostJobDraft
 *
 * Persists the PostJob multi-tab form to localStorage with debounced auto-save.
 * Single source of truth for draft key and schema — never duplicated in PostJob.tsx.
 *
 * Usage:
 *   const { draft, saveDraft, clearDraft, hasDraft } = usePostJobDraft();
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const DRAFT_KEY = "postjob_draft_v2";
const DEBOUNCE_MS = 800;

export interface PostJobDraft {
  // react-hook-form fields
  title?: string;
  description?: string;
  category?: string;
  address?: string;
  salary?: string;
  salaryType?: string;
  hourlyRate?: string;
  estimatedHours?: string;
  contactName?: string;
  businessName?: string;
  workingHours?: string;
  startTime?: string;
  startDateTime?: string;
  workersNeeded?: string;
  activeDuration?: "1" | "3" | "7";
  isUrgent?: boolean;
  isLocalBusiness?: boolean;
  isVolunteer?: boolean;
  showPhone?: boolean;
  // extra component state
  lat?: number | null;
  lng?: number | null;
  jobLocationMode?: "radius" | "city";
  jobSearchRadiusKm?: number;
  jobCity?: string;
  jobDate?: string;
  workStartTime?: string;
  workEndTime?: string;
  minAge?: 16 | 18 | null;
  jobImages?: string[];
  activeTab?: string;
  locationSubTab?: "search" | "address";
  // metadata
  savedAt?: number; // Unix ms
}

function readDraft(): PostJobDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PostJobDraft;
  } catch {
    return null;
  }
}

function writeDraft(draft: PostJobDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage quota exceeded or private browsing — fail silently
  }
}

function removeDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Returns a human-readable age string for the draft (e.g. "לפני 5 דקות") */
export function draftAge(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "לפני פחות מדקה";
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `לפני ${diffH} שעות`;
  return `לפני ${Math.floor(diffH / 24)} ימים`;
}

interface UsePostJobDraftReturn {
  /** The draft loaded from storage on mount (null if none). */
  draft: PostJobDraft | null;
  /** Whether a non-empty draft exists in storage. */
  hasDraft: boolean;
  /** Debounced save — call on every form change. */
  saveDraft: (data: PostJobDraft) => void;
  /** Immediate save — use when navigating tabs. */
  saveDraftNow: (data: PostJobDraft) => void;
  /** Remove draft from storage (call on successful submit or discard). */
  clearDraft: () => void;
}

export function usePostJobDraft(): UsePostJobDraftReturn {
  const [draft] = useState<PostJobDraft | null>(() => readDraft());
  const hasDraft = !!(draft && Object.keys(draft).length > 1); // more than just savedAt
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const saveDraftNow = useCallback((data: PostJobDraft) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeDraft(data);
  }, []);

  const saveDraft = useCallback((data: PostJobDraft) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => writeDraft(data), DEBOUNCE_MS);
  }, []);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    removeDraft();
  }, []);

  return { draft, hasDraft, saveDraft, saveDraftNow, clearDraft };
}
