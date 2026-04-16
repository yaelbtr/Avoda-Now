import { describe, expect, it } from "vitest";
import { matchWorkerToJob } from "./jobMatching";

describe("matchWorkerToJob", () => {
  it("matches a city-mode worker by preferred city IDs", () => {
    const result = matchWorkerToJob(
      {
        preferredCategories: ["delivery"],
        preferredCity: null,
        preferredCities: [5, 8],
        locationMode: "city",
      },
      {
        category: "delivery",
        city: "תל אביב",
        cityId: 8,
      },
    );

    expect(result.matches).toBe(true);
  });

  it("matches a radius-mode worker only inside the search radius", () => {
    const inside = matchWorkerToJob(
      {
        preferredCategories: ["delivery"],
        preferredCities: [],
        locationMode: "radius",
        workerLatitude: "32.0853",
        workerLongitude: "34.7818",
        searchRadiusKm: 6,
      },
      {
        category: "delivery",
        city: "תל אביב",
        cityId: 8,
        latitude: 32.1005,
        longitude: 34.7933,
      },
    );

    const outside = matchWorkerToJob(
      {
        preferredCategories: ["delivery"],
        preferredCities: [],
        locationMode: "radius",
        workerLatitude: "32.0853",
        workerLongitude: "34.7818",
        searchRadiusKm: 3,
      },
      {
        category: "delivery",
        city: "חיפה",
        cityId: 12,
        latitude: 32.7940,
        longitude: 34.9896,
      },
    );

    expect(inside.matches).toBe(true);
    expect(outside.matches).toBe(false);
  });

  it("filters by preferred work day when the job date is known", () => {
    const matches = matchWorkerToJob(
      {
        preferredCategories: ["cleaning"],
        preferredDays: ["monday"],
      },
      {
        category: "cleaning",
        jobDate: "2026-04-20",
      },
    );

    const misses = matchWorkerToJob(
      {
        preferredCategories: ["cleaning"],
        preferredDays: ["tuesday"],
      },
      {
        category: "cleaning",
        jobDate: "2026-04-20",
      },
    );

    expect(matches.matches).toBe(true);
    expect(misses.matches).toBe(false);
  });

  it("filters by preferred time slots when the job has work hours", () => {
    const matches = matchWorkerToJob(
      {
        preferredCategories: ["warehouse"],
        preferredTimeSlots: ["morning"],
      },
      {
        category: "warehouse",
        workStartTime: "08:00",
        workEndTime: "11:00",
      },
    );

    const misses = matchWorkerToJob(
      {
        preferredCategories: ["warehouse"],
        preferredTimeSlots: ["evening"],
      },
      {
        category: "warehouse",
        workStartTime: "08:00",
        workEndTime: "11:00",
      },
    );

    expect(matches.matches).toBe(true);
    expect(misses.matches).toBe(false);
  });

  it("blocks minors from adult-only categories and late jobs", () => {
    const blockedCategory = matchWorkerToJob(
      {
        preferredCategories: ["security"],
        birthDate: "2009-01-01",
      },
      {
        category: "security",
        categoryAllowedForMinors: false,
        workEndTime: "18:00",
      },
    );

    const blockedHours = matchWorkerToJob(
      {
        preferredCategories: ["cleaning"],
        birthDate: "2009-01-01",
      },
      {
        category: "cleaning",
        categoryAllowedForMinors: true,
        workEndTime: "23:30",
      },
    );

    expect(blockedCategory.matches).toBe(false);
    expect(blockedHours.matches).toBe(false);
  });

  it("blocks jobs whose minAge is above the worker age", () => {
    const result = matchWorkerToJob(
      {
        preferredCategories: ["delivery"],
        birthDate: "2009-01-01",
      },
      {
        category: "delivery",
        minAge: 18,
      },
    );

    expect(result.matches).toBe(false);
  });
});
