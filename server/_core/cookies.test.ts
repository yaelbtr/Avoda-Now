import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";

describe("getSessionCookieOptions", () => {
  it("returns SameSite=None with Secure on HTTPS requests", () => {
    const req = {
      protocol: "https",
      headers: {},
    } as Request;

    expect(getSessionCookieOptions(req)).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("returns SameSite=Lax without Secure on local HTTP requests", () => {
    const req = {
      protocol: "http",
      headers: {},
    } as Request;

    expect(getSessionCookieOptions(req)).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });
});
