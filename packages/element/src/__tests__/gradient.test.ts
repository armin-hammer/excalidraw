import { describe, expect, it } from "vitest";

import { COLOR_PALETTE } from "@excalidraw/common";

import {
  getLinearGradientEndpoints,
  getRadialGradientCircleParams,
  getRadialGradientFocalPointPercent,
  getGradientPreviewCss,
  hasBackgroundGradient,
  isElementFilled,
  normalizeBackgroundGradient,
} from "../gradient";

import type { ExcalidrawElement } from "../types";

const baseElement = {
  id: "test",
  type: "rectangle" as const,
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  strokeColor: "#000",
  backgroundColor: COLOR_PALETTE.transparent,
  backgroundGradient: null,
  fillStyle: "solid" as const,
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  roughness: 1,
  opacity: 100,
  angle: 0 as ExcalidrawElement["angle"],
  seed: 1,
  version: 1,
  versionNonce: 1,
  index: null,
  isDeleted: false,
  groupIds: [],
  frameId: null,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
  roundness: null,
};

describe("gradient utils", () => {
  it("normalizeBackgroundGradient validates colors and angle", () => {
    expect(
      normalizeBackgroundGradient({
        type: "linear",
        colors: ["#ff0000", "#0000ff"],
        angle: 370,
      }),
    ).toEqual({
      type: "linear",
      colors: ["#ff0000", "#0000ff"],
      angle: 10,
    });
  });

  it("normalizeBackgroundGradient rejects invalid input", () => {
    expect(normalizeBackgroundGradient(null)).toBeNull();
    expect(
      normalizeBackgroundGradient({ type: "linear", colors: ["transparent"] }),
    ).toBeNull();
  });

  it("hasBackgroundGradient requires at least two colors", () => {
    expect(
      hasBackgroundGradient({
        ...baseElement,
        backgroundGradient: {
          type: "linear",
          colors: ["#ff0000", "#00ff00"],
          angle: 45,
        },
      }),
    ).toBe(true);
  });

  it("isElementFilled detects gradient fills", () => {
    expect(isElementFilled(baseElement)).toBe(false);
    expect(
      isElementFilled({
        ...baseElement,
        backgroundGradient: {
          type: "linear",
          colors: ["#ff0000", "#00ff00"],
          angle: 0,
        },
      }),
    ).toBe(true);
  });

  it("getLinearGradientEndpoints spans element bounds", () => {
    const { x0, y0, x1, y1 } = getLinearGradientEndpoints(100, 50, 0);
    expect(x0).toBeLessThan(x1);
    expect(y0).toBeCloseTo(y1, 5);
  });

  it("getGradientPreviewCss builds linear-gradient string", () => {
    expect(
      getGradientPreviewCss({
        type: "linear",
        colors: ["#ff0000", "#0000ff"],
        angle: 90,
      }),
    ).toBe("linear-gradient(90deg, #ff0000, #0000ff)");
  });

  it("normalizeBackgroundGradient accepts radial type", () => {
    expect(
      normalizeBackgroundGradient({
        type: "radial",
        colors: ["#ff0000", "#0000ff"],
        angle: 45,
      }),
    ).toEqual({
      type: "radial",
      colors: ["#ff0000", "#0000ff"],
      angle: 45,
    });
  });

  it("getGradientPreviewCss builds radial-gradient string with angle", () => {
    const css = getGradientPreviewCss({
      type: "radial",
      colors: ["#ff0000", "#0000ff"],
      angle: 90,
    });
    expect(css).toMatch(/^radial-gradient\(ellipse at /);
    expect(css).toContain("#ff0000");
    expect(css).toContain("#0000ff");
    const { x, y } = getRadialGradientFocalPointPercent(100, 100, 90);
    expect(css).toContain(`at ${x}% ${y}%`);
  });

  it("getRadialGradientCircleParams offsets focal point by angle", () => {
    const at0 = getRadialGradientCircleParams(100, 50, 0);
    const at90 = getRadialGradientCircleParams(100, 50, 90);
    expect(at0.fx).not.toBeCloseTo(at90.fx, 0);
    expect(at0.fy).not.toBeCloseTo(at90.fy, 0);
  });

  it("getLinearGradientEndpoints respects explicit start/end fractions", () => {
    const { x0, y0, x1, y1 } = getLinearGradientEndpoints(200, 100, {
      type: "linear",
      colors: ["#000", "#fff"],
      angle: 0,
      start: { x: 0.25, y: 0.5 },
      end: { x: 0.75, y: 0.5 },
    });
    expect(x0).toBeCloseTo(50, 5);
    expect(y0).toBeCloseTo(50, 5);
    expect(x1).toBeCloseTo(150, 5);
    expect(y1).toBeCloseTo(50, 5);
  });

  it("getRadialGradientCircleParams respects explicit center/radius fractions", () => {
    const params = getRadialGradientCircleParams(200, 100, {
      type: "radial",
      colors: ["#000", "#fff"],
      angle: 0,
      center: { x: 0.25, y: 0.75 },
      radius: 0.5,
    });
    expect(params.cx).toBeCloseTo(50, 5);
    expect(params.cy).toBeCloseTo(75, 5);
    // halfDiagonal = sqrt(200^2 + 100^2) / 2 ≈ 111.8 * 0.5 ≈ 55.9
    expect(params.r).toBeCloseTo(Math.hypot(200, 100) / 2 / 2, 5);
    expect(params.fx).toBeCloseTo(params.cx, 5);
    expect(params.fy).toBeCloseTo(params.cy, 5);
  });

  it("normalizeBackgroundGradient preserves geometry fields", () => {
    const normalized = normalizeBackgroundGradient({
      type: "linear",
      colors: ["#ff0000", "#0000ff"],
      angle: 45,
      start: { x: 0.1, y: 0.2 },
      end: { x: 0.8, y: 0.9 },
    });
    expect(normalized?.start).toEqual({ x: 0.1, y: 0.2 });
    expect(normalized?.end).toEqual({ x: 0.8, y: 0.9 });

    const radial = normalizeBackgroundGradient({
      type: "radial",
      colors: ["#ff0000", "#0000ff"],
      angle: 0,
      center: { x: 0.3, y: 0.4 },
      radius: 0.6,
    });
    expect(radial?.center).toEqual({ x: 0.3, y: 0.4 });
    expect(radial?.radius).toBeCloseTo(0.6, 5);
  });
});
