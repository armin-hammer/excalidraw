import { describe, expect, it } from "vitest";

import { COLOR_PALETTE } from "@excalidraw/common";

import {
  getLinearGradientEndpoints,
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
});
