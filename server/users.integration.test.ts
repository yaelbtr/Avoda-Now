/**
 * server/users.integration.test.ts
 *
 * Integration tests for user-related DB operations.
 *
 * These tests run against the ISOLATED local test database (jobnow_test).
 * They use real Drizzle queries — no mocks for DB layer.
 *
 * Run with:
 *   pnpm test:integration
 *
 * Prerequisites:
 *   - Local PostgreSQL running (pnpm db:setup:test)
 *   - Test DB seeded (pnpm db:seed:test)
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { getTestDb, closeTestDb } from "./test-db";
import * as schema from "../drizzle/schema";

afterAll(() => closeTestDb());

describe("Integration: Test DB isolation", () => {
  it("connects to the test database (not production)", async () => {
    const db = getTestDb();
    // Verify we're on the test DB by checking synthetic test users exist
    const users = await db
      .select({ openId: schema.users.openId })
      .from(schema.users)
      .where(eq(schema.users.openId, "test-worker-001"));

    expect(users).toHaveLength(1);
    expect(users[0].openId).toBe("test-worker-001");
  });

  it("contains only synthetic test data (no real emails)", async () => {
    const db = getTestDb();
    const users = await db
      .select({ email: schema.users.email })
      .from(schema.users);

    // All emails must use .invalid TLD (RFC 2606) — never real inboxes
    for (const user of users) {
      if (user.email) {
        expect(user.email).toMatch(/\.invalid$/);
      }
    }
  });

  it("contains only synthetic test phone numbers", async () => {
    const db = getTestDb();
    const users = await db
      .select({ phone: schema.users.phone })
      .from(schema.users);

    // All phones must be synthetic test numbers (+9725x1234xxx)
    for (const user of users) {
      if (user.phone) {
        expect(user.phone).toMatch(/^\+9725[0-9]1234/);
      }
    }
  });
});

describe("Integration: Users table", () => {
  it("has exactly 5 seeded test users", async () => {
    const db = getTestDb();
    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(5);
  });

  it("has 1 admin user", async () => {
    const db = getTestDb();
    const admins = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "admin"));
    expect(admins).toHaveLength(1);
    expect(admins[0].openId).toBe("test-admin-001");
  });

  it("has 4 regular users", async () => {
    const db = getTestDb();
    const regular = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "user"));
    expect(regular).toHaveLength(4);
  });

  it("has 1 incomplete signup (email user)", async () => {
    const db = getTestDb();
    const incomplete = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.signupCompleted, false));
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].loginMethod).toBe("email_otp");
  });

  it("can insert and retrieve a new test user", async () => {
    const db = getTestDb();

    const inserted = await db
      .insert(schema.users)
      .values({
        openId: "test-transient-user-999",
        name: "Transient Test User",
        email: "transient.999@test.invalid",
        phone: "+972501234999",
        phonePrefix: "050",
        phoneNumber: "1234999",
        loginMethod: "phone_otp",
        role: "user",
        signupCompleted: true,
      })
      .returning();

    expect(inserted[0].openId).toBe("test-transient-user-999");

    // Cleanup — remove transient test user
    await db
      .delete(schema.users)
      .where(eq(schema.users.openId, "test-transient-user-999"));

    // Verify deletion
    const after = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, "test-transient-user-999"));
    expect(after).toHaveLength(0);
  });
});

describe("Integration: Jobs table", () => {
  it("has exactly 3 seeded test jobs", async () => {
    const db = getTestDb();
    const jobs = await db.select().from(schema.jobs);
    expect(jobs).toHaveLength(3);
  });

  it("has 2 active jobs and 1 closed job", async () => {
    const db = getTestDb();
    const active = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.status, "active"));
    const closed = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.status, "closed"));

    expect(active).toHaveLength(2);
    expect(closed).toHaveLength(1);
  });

  it("all job titles contain TEST marker", async () => {
    const db = getTestDb();
    const jobs = await db
      .select({ title: schema.jobs.title })
      .from(schema.jobs);

    for (const job of jobs) {
      // Titles contain TEST marker (with optional em-dash suffix)
      expect(job.title).toMatch(/\(TEST/);
    }
  });
});

describe("Integration: Applications table", () => {
  it("has exactly 1 seeded test application", async () => {
    const db = getTestDb();
    const apps = await db.select().from(schema.applications);
    expect(apps).toHaveLength(1);
  });

  it("application belongs to test worker 001", async () => {
    const db = getTestDb();
    const worker = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.openId, "test-worker-001"));

    const apps = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.workerId, worker[0].id));

    expect(apps).toHaveLength(1);
    expect(apps[0].status).toBe("pending");
  });
});
