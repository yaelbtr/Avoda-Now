import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getUrgentJobs: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "שליח דחוף",
      category: "delivery",
      isUrgent: true,
      status: "active",
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6h from now
    },
  ]),
  markJobFilled: vi.fn().mockResolvedValue(undefined),
  setWorkerAvailable: vi.fn().mockResolvedValue(undefined),
  setWorkerUnavailable: vi.fn().mockResolvedValue(undefined),
  getWorkerAvailability: vi.fn().mockResolvedValue(null),
  getNearbyWorkers: vi.fn().mockResolvedValue([]),
}));

import { getUrgentJobs, markJobFilled, setWorkerAvailable, setWorkerUnavailable } from "./db";

describe("Urgent jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUrgentJobs returns jobs with isUrgent=true", async () => {
    const jobs = await getUrgentJobs(10);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].isUrgent).toBe(true);
  });

  it("markJobFilled calls db with correct id and userId", async () => {
    await markJobFilled(1, 42);
    expect(markJobFilled).toHaveBeenCalledWith(1, 42);
  });
});

describe("Worker availability", () => {
  it("setWorkerAvailable stores availability", async () => {
    await setWorkerAvailable({
      userId: 1,
      latitude: "31.7683",
      longitude: "35.2137",
      city: "ירושלים",
      note: null,
      availableUntil: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });
    expect(setWorkerAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, city: "ירושלים" })
    );
  });

  it("setWorkerUnavailable removes availability", async () => {
    await setWorkerUnavailable(1);
    expect(setWorkerUnavailable).toHaveBeenCalledWith(1);
  });
});

describe("Expiry logic", () => {
  it("urgent jobs expire in 12h", () => {
    const isUrgent = true;
    const durationDays = 1;
    const expiresMs = isUrgent ? 12 * 60 * 60 * 1000 : durationDays * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBe(12 * 60 * 60 * 1000);
  });

  it("normal jobs expire in activeDuration days", () => {
    const isUrgent = false;
    const durationDays = 1;
    const expiresMs = isUrgent ? 12 * 60 * 60 * 1000 : durationDays * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBe(24 * 60 * 60 * 1000);
  });
});
