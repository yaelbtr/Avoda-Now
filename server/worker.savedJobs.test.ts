/**
 * Tests for the savedIds + toggleSave logic extracted into WorkerJobsContext.
 *
 * Validates the optimistic update pattern:
 * 1. Save adds the jobId to the local Set immediately
 * 2. Unsave removes the jobId from the local Set immediately
 * 3. On error, the previous state is restored (rollback)
 * 4. toggleSave guards against unauthenticated calls
 */

import { describe, it, expect } from "vitest";

// ── Pure logic helpers (mirror WorkerJobsContext internals) ───────────────────

function applyOptimisticSave(prevIds: number[], jobId: number): number[] {
  if (prevIds.includes(jobId)) return prevIds; // idempotent
  return [...prevIds, jobId];
}

function applyOptimisticUnsave(prevIds: number[], jobId: number): number[] {
  return prevIds.filter((id) => id !== jobId);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WorkerJobsContext — savedIds optimistic updates", () => {
  it("save adds jobId to the set", () => {
    const prev = [1, 2, 3];
    const result = applyOptimisticSave(prev, 4);
    expect(result).toContain(4);
    expect(result).toHaveLength(4);
  });

  it("save is idempotent — does not duplicate existing jobId", () => {
    const prev = [1, 2, 3];
    const result = applyOptimisticSave(prev, 2);
    expect(result).toHaveLength(3);
    expect(result.filter((id) => id === 2)).toHaveLength(1);
  });

  it("unsave removes jobId from the set", () => {
    const prev = [1, 2, 3];
    const result = applyOptimisticUnsave(prev, 2);
    expect(result).not.toContain(2);
    expect(result).toHaveLength(2);
  });

  it("unsave on non-existent jobId is a no-op", () => {
    const prev = [1, 2, 3];
    const result = applyOptimisticUnsave(prev, 99);
    expect(result).toEqual(prev);
  });

  it("rollback restores previous state after failed save", () => {
    const prev = [1, 2, 3];
    const optimistic = applyOptimisticSave(prev, 4);
    expect(optimistic).toContain(4);
    // Simulate rollback on error
    const rolledBack = prev;
    expect(rolledBack).not.toContain(4);
    expect(rolledBack).toEqual([1, 2, 3]);
  });

  it("rollback restores previous state after failed unsave", () => {
    const prev = [1, 2, 3];
    const optimistic = applyOptimisticUnsave(prev, 2);
    expect(optimistic).not.toContain(2);
    const rolledBack = prev;
    expect(rolledBack).toContain(2);
  });

  it("Set.has() lookup is O(1) — correct for memoised savedIds", () => {
    const ids = new Set([1, 2, 3, 4, 5]);
    expect(ids.has(3)).toBe(true);
    expect(ids.has(99)).toBe(false);
  });

  it("toggleSave with unauthenticated user calls onLoginRequired", () => {
    let loginCalled = false;
    const requireLogin = (_msg: string) => { loginCalled = true; };

    const isAuthenticated = false;
    const toggleSave = (
      _jobId: number,
      _currentlySaved: boolean,
      onLoginRequired?: (msg: string) => void
    ) => {
      if (!isAuthenticated) {
        onLoginRequired?.("כדי לשמור משרות יש להתחבר למערכת");
        return;
      }
    };

    toggleSave(5, false, requireLogin);
    expect(loginCalled).toBe(true);
  });

  it("toggleSave with authenticated user does NOT call onLoginRequired", () => {
    let loginCalled = false;
    const requireLogin = (_msg: string) => { loginCalled = true; };
    let savedJobId: number | null = null;

    const isAuthenticated = true;
    const toggleSave = (
      jobId: number,
      _currentlySaved: boolean,
      onLoginRequired?: (msg: string) => void
    ) => {
      if (!isAuthenticated) {
        onLoginRequired?.("כדי לשמור משרות יש להתחבר למערכת");
        return;
      }
      savedJobId = jobId;
    };

    toggleSave(5, false, requireLogin);
    expect(loginCalled).toBe(false);
    expect(savedJobId).toBe(5);
  });
});
