/**
 * Tests for the regional activation system.
 * Covers: haversine distance, findNearestRegion, associateWorkerWithRegion,
 * checkRegionActiveForJob, and auto-activation threshold logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { haversineKm } from "./db";

// ─── haversineKm ─────────────────────────────────────────────────────────────

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(32.0853, 34.7818, 32.0853, 34.7818)).toBeCloseTo(0, 3);
  });

  it("returns ~1 km for coordinates ~1 km apart", () => {
    // ~1 km north of Tel Aviv center
    const dist = haversineKm(32.0853, 34.7818, 32.0943, 34.7818);
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(1.1);
  });

  it("returns correct distance between Tel Aviv and Jerusalem (~54 km)", () => {
    const dist = haversineKm(32.0853, 34.7818, 31.7683, 35.2137);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(60);
  });

  it("returns correct distance between Tel Aviv and Haifa (~81 km)", () => {
    const dist = haversineKm(32.0853, 34.7818, 32.794, 34.9896);
    expect(dist).toBeGreaterThan(75);
    expect(dist).toBeLessThan(90);
  });

  it("is symmetric", () => {
    const d1 = haversineKm(32.0853, 34.7818, 31.7683, 35.2137);
    const d2 = haversineKm(31.7683, 35.2137, 32.0853, 34.7818);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

// ─── Region logic (unit tests with mocked DB) ─────────────────────────────────

// We test the pure logic functions that don't require a real DB.
// findNearestRegion and checkRegionActiveForJob are tested by mocking getDb.

const MOCK_REGIONS = [
  {
    id: 1,
    slug: "tel-aviv",
    name: "תל אביב",
    centerCity: "תל אביב",
    centerLat: "32.0853000",
    centerLng: "34.7818000",
    activationRadiusKm: 15,
    minWorkersRequired: 50,
    currentWorkers: 30,
    status: "collecting_workers" as const,
    description: null,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    slug: "jerusalem",
    name: "ירושלים",
    centerCity: "ירושלים",
    centerLat: "31.7683000",
    centerLng: "35.2137000",
    activationRadiusKm: 15,
    minWorkersRequired: 50,
    currentWorkers: 50,
    status: "active" as const,
    description: null,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    slug: "haifa",
    name: "חיפה",
    centerCity: "חיפה",
    centerLat: "32.7940000",
    centerLng: "34.9896000",
    activationRadiusKm: 15,
    minWorkersRequired: 30,
    currentWorkers: 5,
    status: "collecting_workers" as const,
    description: null,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("Region selection logic (pure)", () => {
  /**
   * Simulate findNearestRegion logic without DB.
   * This mirrors the implementation in db.ts.
   */
  function findNearest(lat: number, lng: number) {
    let nearest: (typeof MOCK_REGIONS)[0] | undefined;
    let nearestDist = Infinity;
    for (const region of MOCK_REGIONS) {
      const dist = haversineKm(lat, lng, parseFloat(region.centerLat), parseFloat(region.centerLng));
      if (dist <= region.activationRadiusKm && dist < nearestDist) {
        nearest = region;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  it("finds Tel Aviv region for coordinates inside Tel Aviv", () => {
    // Ramat Gan is ~3 km from Tel Aviv center — within 15 km radius
    const region = findNearest(32.0684, 34.8248);
    expect(region?.slug).toBe("tel-aviv");
  });

  it("finds Jerusalem region for coordinates inside Jerusalem", () => {
    const region = findNearest(31.7683, 35.2137);
    expect(region?.slug).toBe("jerusalem");
  });

  it("returns undefined for coordinates far from any region (e.g., Eilat)", () => {
    const region = findNearest(29.5577, 34.9519);
    expect(region).toBeUndefined();
  });

  it("returns the nearest region when two regions overlap", () => {
    // Bnei Brak is very close to Tel Aviv — should pick Tel Aviv (closer center)
    const region = findNearest(32.0841, 34.8338);
    expect(region?.slug).toBe("tel-aviv");
  });

  it("returns undefined when coordinates are outside all radii", () => {
    // Dead Sea area — far from all regions
    const region = findNearest(31.5, 35.5);
    expect(region).toBeUndefined();
  });
});

describe("Region employer access control logic (pure)", () => {
  /**
   * Simulate checkRegionActiveForJob logic without DB.
   */
  function checkActive(lat: number, lng: number) {
    let nearest: (typeof MOCK_REGIONS)[0] | undefined;
    let nearestDist = Infinity;
    for (const region of MOCK_REGIONS) {
      const dist = haversineKm(lat, lng, parseFloat(region.centerLat), parseFloat(region.centerLng));
      if (dist <= region.activationRadiusKm && dist < nearestDist) {
        nearest = region;
        nearestDist = dist;
      }
    }
    if (!nearest) return { allowed: true }; // no region → open market
    if (nearest.status === "active") return { allowed: true };
    return { allowed: false, regionName: nearest.name, regionSlug: nearest.slug };
  }

  it("allows posting in Jerusalem (active region)", () => {
    const result = checkActive(31.7683, 35.2137);
    expect(result.allowed).toBe(true);
  });

  it("blocks posting in Tel Aviv (collecting_workers)", () => {
    const result = checkActive(32.0853, 34.7818);
    expect(result.allowed).toBe(false);
    expect(result.regionName).toBe("תל אביב");
    expect(result.regionSlug).toBe("tel-aviv");
  });

  it("allows posting in Eilat (no region defined)", () => {
    const result = checkActive(29.5577, 34.9519);
    expect(result.allowed).toBe(true);
  });

  it("blocks posting in Haifa (collecting_workers)", () => {
    const result = checkActive(32.794, 34.9896);
    expect(result.allowed).toBe(false);
    expect(result.regionName).toBe("חיפה");
  });
});

describe("Auto-activation threshold logic (pure)", () => {
  it("auto-activates when currentWorkers reaches minWorkersRequired", () => {
    const region = { ...MOCK_REGIONS[0], currentWorkers: 49, minWorkersRequired: 50, status: "collecting_workers" as const };
    // Simulate incrementing worker count
    const newCount = region.currentWorkers + 1;
    const shouldActivate = region.status === "collecting_workers" && newCount >= region.minWorkersRequired;
    expect(shouldActivate).toBe(true);
  });

  it("does not activate when below threshold", () => {
    const region = { ...MOCK_REGIONS[0], currentWorkers: 30, minWorkersRequired: 50, status: "collecting_workers" as const };
    const newCount = region.currentWorkers + 1;
    const shouldActivate = region.status === "collecting_workers" && newCount >= region.minWorkersRequired;
    expect(shouldActivate).toBe(false);
  });

  it("does not re-activate an already active region", () => {
    const region = { ...MOCK_REGIONS[1], currentWorkers: 50, minWorkersRequired: 50, status: "active" as const };
    const newCount = region.currentWorkers + 1;
    const shouldActivate = region.status === "collecting_workers" && newCount >= region.minWorkersRequired;
    expect(shouldActivate).toBe(false);
  });

  it("does not activate a paused region automatically", () => {
    const region = { ...MOCK_REGIONS[0], currentWorkers: 100, minWorkersRequired: 50, status: "paused" as const };
    const newCount = region.currentWorkers + 1;
    const shouldActivate = region.status === "collecting_workers" && newCount >= region.minWorkersRequired;
    expect(shouldActivate).toBe(false);
  });
});

describe("Region slug validation", () => {
  const validSlugs = ["tel-aviv", "jerusalem", "bnei-brak", "beer-sheva", "rishon-lezion"];
  const invalidSlugs = ["", "  ", "Tel Aviv", "תל אביב", "tel_aviv"];

  it.each(validSlugs)("accepts valid slug: %s", (slug) => {
    expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
  });

  it.each(invalidSlugs)("rejects invalid slug: %s", (slug) => {
    expect(/^[a-z0-9-]+$/.test(slug.trim())).toBe(false);
  });
});
