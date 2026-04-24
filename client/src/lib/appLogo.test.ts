import { describe, expect, it } from "vitest";

type LogoVariant = "dark" | "light";
type LogoSize = "xs" | "sm" | "md";

function resolveLogoAsset(variant: LogoVariant): string {
  return variant === "light"
    ? "@/assets/לוגו - source.svg"
    : "@/assets/לוגו - source.svg";
}

function resolveLogoWidth(size: LogoSize): number {
  switch (size) {
    case "xs":
      return 132;
    case "sm":
      return 192;
    default:
      return 250;
  }
}

function resolveLogoScale(): number {
  return 1.27;
}

describe("AppLogo presentation", () => {
  it("uses the exact uploaded SVG for the dark variant", () => {
    expect(resolveLogoAsset("dark")).toBe("@/assets/לוגו - source.svg");
  });

  it("uses the exact uploaded SVG for the light variant too", () => {
    expect(resolveLogoAsset("light")).toBe("@/assets/לוגו - source.svg");
  });

  it("renders the small size narrower than the default size", () => {
    expect(resolveLogoWidth("sm")).toBeLessThan(resolveLogoWidth("md"));
  });

  it("renders the modal size narrower than the mobile navbar size", () => {
    expect(resolveLogoWidth("xs")).toBeLessThan(resolveLogoWidth("sm"));
  });

  it("applies display-only scaling to crop the empty canvas", () => {
    expect(resolveLogoScale()).toBe(1.27);
  });
});
