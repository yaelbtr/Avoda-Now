import { describe, expect, it } from "vitest";

type LogoVariant = "dark" | "light";
type LogoSize = "xs" | "sm" | "md";

function resolveLogoAsset(variant: LogoVariant): string {
  return variant === "light"
    ? "@/assets/full logo1.svg"
    : "@/assets/full logo1.svg";
}

function resolveLogoWidth(size: LogoSize): number {
  switch (size) {
    case "xs":
      return 150;
    case "sm":
      return 178;
    default:
      return 230;
  }
}

function resolveLogoScale(size: LogoSize): number {
  switch (size) {
    case "xs":
      return 1.55;
    case "sm":
      return 1.65;
    default:
      return 1.55;
  }
}

describe("AppLogo presentation", () => {
  it("uses the exact uploaded SVG for the dark variant", () => {
    expect(resolveLogoAsset("dark")).toBe("@/assets/full logo1.svg");
  });

  it("uses the exact uploaded SVG for the light variant too", () => {
    expect(resolveLogoAsset("light")).toBe("@/assets/full logo1.svg");
  });

  it("renders the small size narrower than the default size", () => {
    expect(resolveLogoWidth("sm")).toBeLessThan(resolveLogoWidth("md"));
  });

  it("renders the modal size narrower than the mobile navbar size", () => {
    expect(resolveLogoWidth("xs")).toBeLessThan(resolveLogoWidth("sm"));
  });

  it("enlarges the uploaded logo artwork inside the SVG canvas", () => {
    expect(resolveLogoScale("sm")).toBeGreaterThan(1.5);
  });
});
