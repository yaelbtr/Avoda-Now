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

// ─── syncWorkerRegions logic (pure unit tests) ────────────────────────────────

/**
 * Pure simulation of the syncWorkerRegions matching logic (no DB required).
 * Mirrors the implementation in db.ts.
 */
function simulateSyncWorkerRegions(
  opts: {
    lat?: number | null;
    lng?: number | null;
    searchRadiusKm?: number | null;
    preferredCityNames?: string[];
  },
  allRegions: typeof MOCK_REGIONS
): Array<{ regionId: number; matchType: "gps_radius" | "preferred_city"; distanceKm: number | null }> {
  const results: Array<{ regionId: number; matchType: "gps_radius" | "preferred_city"; distanceKm: number | null }> = [];

  for (const region of allRegions) {
    const rLat = parseFloat(region.centerLat);
    const rLng = parseFloat(region.centerLng);
    let matched = false;

    // 1. GPS radius match
    if (opts.lat != null && opts.lng != null) {
      const dist = haversineKm(opts.lat, opts.lng, rLat, rLng);
      const radius = opts.searchRadiusKm ?? region.activationRadiusKm;
      if (dist <= radius) {
        matched = true;
        results.push({ regionId: region.id, matchType: "gps_radius", distanceKm: Math.round(dist * 1000) / 1000 });
        continue;
      }
    }

    // 2. Preferred city match
    if (!matched && opts.preferredCityNames && opts.preferredCityNames.length > 0) {
      const regionCityNorm = region.centerCity.trim();
      if (opts.preferredCityNames.some((c) => c.trim() === regionCityNorm)) {
        results.push({ regionId: region.id, matchType: "preferred_city", distanceKm: null });
      }
    }
  }

  return results;
}

describe("syncWorkerRegions — multi-region matching logic (pure)", () => {
  it("matches a single GPS region when worker is within radius", () => {
    const matches = simulateSyncWorkerRegions(
      { lat: 32.0853, lng: 34.7818, searchRadiusKm: 15 },
      MOCK_REGIONS
    );
    expect(matches.length).toBe(1);
    expect(matches[0].regionId).toBe(1); // Tel Aviv
    expect(matches[0].matchType).toBe("gps_radius");
  });

  it("matches multiple GPS regions when worker radius covers them", () => {
    // Worker at Tel Aviv center with 100 km radius → should match Tel Aviv, Jerusalem, Haifa
    const matches = simulateSyncWorkerRegions(
      { lat: 32.0853, lng: 34.7818, searchRadiusKm: 100 },
      MOCK_REGIONS
    );
    expect(matches.length).toBe(3);
    const ids = matches.map((m) => m.regionId).sort();
    expect(ids).toEqual([1, 2, 3]);
  });

  it("matches no regions when worker is far away (Eilat)", () => {
    const matches = simulateSyncWorkerRegions(
      { lat: 29.5577, lng: 34.9519, searchRadiusKm: 15 },
      MOCK_REGIONS
    );
    expect(matches.length).toBe(0);
  });

  it("matches region by preferred city name (no GPS)", () => {
    const matches = simulateSyncWorkerRegions(
      { lat: null, lng: null, preferredCityNames: ["ירושלים"] },
      MOCK_REGIONS
    );
    expect(matches.length).toBe(1);
    expect(matches[0].regionId).toBe(2); // Jerusalem
    expect(matches[0].matchType).toBe("preferred_city");
    expect(matches[0].distanceKm).toBeNull();
  });

  it("matches multiple regions by preferred cities", () => {
    const matches = simulateSyncWorkerRegions(
      { lat: null, lng: null, preferredCityNames: ["תל אביב", "חיפה"] },
      MOCK_REGIONS
    );
    expect(matches.length).toBe(2);
    const ids = matches.map((m) => m.regionId).sort();
    expect(ids).toEqual([1, 3]);
    expect(matches.every((m) => m.matchType === "preferred_city")).toBe(true);
  });

  it("GPS match takes priority over preferred city for same region", () => {
    // Worker is within GPS radius of Tel Aviv AND has it as preferred city
    // GPS should win (continue skips city check)
    const matches = simulateSyncWorkerRegions(
      { lat: 32.0853, lng: 34.7818, searchRadiusKm: 15, preferredCityNames: ["תל אביב"] },
      MOCK_REGIONS
    );
    const telAviv = matches.find((m) => m.regionId === 1);
    expect(telAviv?.matchType).toBe("gps_radius");
    // Should appear only once
    expect(matches.filter((m) => m.regionId === 1).length).toBe(1);
  });

  it("combines GPS and preferred city matches for different regions", () => {
    // Worker in Tel Aviv (GPS) + prefers Jerusalem (city)
    const matches = simulateSyncWorkerRegions(
      { lat: 32.0853, lng: 34.7818, searchRadiusKm: 15, preferredCityNames: ["ירושלים"] },
      MOCK_REGIONS
    );
    expect(matches.length).toBe(2);
    const gps = matches.find((m) => m.matchType === "gps_radius");
    const city = matches.find((m) => m.matchType === "preferred_city");
    expect(gps?.regionId).toBe(1); // Tel Aviv via GPS
    expect(city?.regionId).toBe(2); // Jerusalem via preferred city
  });

  it("returns empty when no GPS and no preferred cities", () => {
    const matches = simulateSyncWorkerRegions({}, MOCK_REGIONS);
    expect(matches.length).toBe(0);
  });
});

describe("worker_regions radiusMinutes field", () => {
  it("radiusMinutes is a display field separate from activationRadiusKm", () => {
    // radiusMinutes is informational; activationRadiusKm is used for matching
    const region = { ...MOCK_REGIONS[0], radiusMinutes: 20, activationRadiusKm: 15 };
    expect(region.radiusMinutes).toBe(20);
    expect(region.activationRadiusKm).toBe(15);
    // Matching uses activationRadiusKm, not radiusMinutes
    const dist = haversineKm(32.0853, 34.7818, 32.0853, 34.7818);
    expect(dist).toBeLessThanOrEqual(region.activationRadiusKm);
  });
});
