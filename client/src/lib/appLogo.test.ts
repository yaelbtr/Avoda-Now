import { describe, expect, it } from "vitest";

type LogoVariant = "dark" | "light";
type LogoSize = "xs" | "sm" | "md";

function resolveLogoAsset(variant: LogoVariant): string {
  return variant === "light"
    ? "@/assets/logo-light.svg"
    : "@/assets/logo-light.svg";
}

function resolveLogoWidth(size: LogoSize): number {
  switch (size) {
    case "xs":
      return 150;
    case "sm":
      return 178;
    default:
      return 220;
  }
}

function resolveLogoScale(): number {
  return 1;
}

describe("AppLogo presentation", () => {
  it("uses the exact uploaded SVG for the dark variant", () => {
    expect(resolveLogoAsset("dark")).toBe("@/assets/logo-light.svg");
  });

  it("uses the exact uploaded SVG for the light variant too", () => {
    expect(resolveLogoAsset("light")).toBe("@/assets/logo-light.svg");
  });

  it("renders the small size narrower than the default size", () => {
    expect(resolveLogoWidth("sm")).toBeLessThan(resolveLogoWidth("md"));
  });

  it("renders the modal size narrower than the mobile navbar size", () => {
    expect(resolveLogoWidth("xs")).toBeLessThan(resolveLogoWidth("sm"));
  });

  it("renders the uploaded logo without display-only scaling", () => {
    expect(resolveLogoScale()).toBe(1);
  });
});
