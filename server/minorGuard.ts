/**
 * minorGuard.ts
 *
 * Single-source-of-truth for minor eligibility checks on a job.
 * Used by:
 *   - applyToJob   (worker submits application)
 *   - updateApplicationStatus "accept"  (employer accepts a worker)
 *
 * Rules (per Israeli Youth Labour Law):
 *   1. If the worker's age is null → birthdate not declared → block.
 *   2. If the worker is too young (< 16) → block.
 *   3. If the worker is a minor (16–17) AND the job's category is marked
 *      allowedForMinors=false → block.
 *   4. If the worker is a minor AND the job ends after 22:00 → block.
 *
 * The function throws TRPCError on any violation and returns void on success,
 * so callers can simply `await assertMinorEligible(...)` with no extra branching.
 */

import { TRPCError } from "@trpc/server";
import { calcAge, isMinor, isTooYoung } from "@shared/ageUtils";
import { getWorkerBirthDate } from "./db";

export interface JobEligibilityInput {
  /** The job's category slug (e.g. "security", "bar") */
  category: string;
  /** The job's work end time string, e.g. "23:00" */
  workEndTime: string | null | undefined;
}

/**
 * Asserts that a worker (identified by userId) is eligible to be associated
 * with the given job.  Throws TRPCError if any rule is violated.
 *
 * @param userId   - The worker's user ID
 * @param job      - Minimal job fields needed for the check
 */
export async function assertMinorEligible(
  userId: number,
  job: JobEligibilityInput
): Promise<void> {
  // 1. Fetch birth date and compute age
  const birthDate = await getWorkerBirthDate(userId);
  const age = calcAge(birthDate);

  // If no birthdate on record the age gate cannot be evaluated — block.
  if (age === null) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "יש לאמת את גילך לפני הגשת מועמדות",
    });
  }

  // 2. Under-16 → always blocked
  if (isTooYoung(age)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "אין באפשרותך להגיש מועמדות לפני גיל 16",
    });
  }

  // 3. Minor (age 16–17) — blocked until parental approval feature is live
  if (isMinor(age)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "דרוש אישור הורי — הפיצ'ר יושק בקרוב",
      cause: { code: "parental_approval_required" },
    });
  }
}
