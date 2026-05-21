import { simplify } from "points-on-curve";

import {
  applyDarkModeFilter,
  isTransparent,
  normalizeInputColor,
  SVG_NS,
} from "@excalidraw/common";
import { degreesToRadians } from "@excalidraw/math";

import type { Mutable } from "@excalidraw/common/utility-types";
import type { LocalPoint } from "@excalidraw/math";

import { getDiamondPoints } from "./bounds";
import { hasBackground } from "./comparisons";
import { getCornerRadius, isPathALoop } from "./utils";

import type {
  BackgroundGradient,
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "./types";

export const MAX_GRADIENT_STOPS = 4;
export const MIN_GRADIENT_STOPS = 2;

export const hasBackgroundGradient = (
  element: ExcalidrawElement,
): element is ExcalidrawElement & {
  backgroundGradient: BackgroundGradient;
} => {
  const gradient = element.backgroundGradient;
  return (
    gradient != null &&
    (gradient.type === "linear" || gradient.type === "radial") &&
    gradient.colors.length >= MIN_GRADIENT_STOPS
  );
};

export const isElementFilled = (element: ExcalidrawElement): boolean => {
  if (hasBackgroundGradient(element)) {
    if (!hasBackground(element.type)) {
      return false;
    }
    if (
      (element.type === "line" || element.type === "freedraw") &&
      !isPathALoop(element.points)
    ) {
      return false;
    }
    return true;
  }
  return !isTransparent(element.backgroundColor);
};

const normalizeFraction = (
  value: unknown,
  fallback: number,
  min = -10,
  max = 10,
): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
};

const normalizePoint = (raw: unknown): { x: number; y: number } | undefined => {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const p = raw as { x?: unknown; y?: unknown };
  if (typeof p.x !== "number" || typeof p.y !== "number") {
    return undefined;
  }
  if (Number.isNaN(p.x) || Number.isNaN(p.y)) {
    return undefined;
  }
  return {
    x: normalizeFraction(p.x, 0.5),
    y: normalizeFraction(p.y, 0.5),
  };
};

export const normalizeBackgroundGradient = (
  raw: unknown,
): BackgroundGradient | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const gradient = raw as Partial<BackgroundGradient>;
  if (
    (gradient.type !== "linear" && gradient.type !== "radial") ||
    !Array.isArray(gradient.colors)
  ) {
    return null;
  }

  const colors = gradient.colors
    .slice(0, MAX_GRADIENT_STOPS)
    .map((c) => (typeof c === "string" ? normalizeInputColor(c) : null))
    .filter((c): c is string => c != null && !isTransparent(c));

  if (colors.length < MIN_GRADIENT_STOPS) {
    return null;
  }

  const angle =
    typeof gradient.angle === "number" && !Number.isNaN(gradient.angle)
      ? ((gradient.angle % 360) + 360) % 360
      : 0;

  const start = normalizePoint(gradient.start);
  const end = normalizePoint(gradient.end);
  const center = normalizePoint(gradient.center);
  const radius =
    typeof gradient.radius === "number" && !Number.isNaN(gradient.radius)
      ? Math.max(0.01, Math.min(gradient.radius, 4))
      : undefined;

  return {
    type: gradient.type,
    colors: colors as unknown as BackgroundGradient["colors"],
    angle,
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    ...(center ? { center } : {}),
    ...(radius != null ? { radius } : {}),
  };
};

/** Focal point as percentage for CSS radial-gradient preview. */
export const getRadialGradientFocalPointPercent = (
  width: number,
  height: number,
  angleDeg: number,
): { x: number; y: number } => {
  const cx = width / 2;
  const cy = height / 2;
  const angleRad = degreesToRadians(
    angleDeg as import("@excalidraw/math").Degrees,
  );
  const maxOffset = (Math.min(width, height) / 2) * 0.7;
  return {
    x: ((cx + Math.cos(angleRad) * maxOffset) / width) * 100,
    y: ((cy + Math.sin(angleRad) * maxOffset) / height) * 100,
  };
};

export const getGradientPreviewCss = (gradient: BackgroundGradient): string => {
  const stops = gradient.colors.join(", ");
  if (gradient.type === "radial") {
    const { x, y } = getRadialGradientFocalPointPercent(
      100,
      100,
      gradient.angle,
    );
    return `radial-gradient(ellipse at ${x}% ${y}%, ${stops})`;
  }
  return `linear-gradient(${gradient.angle}deg, ${stops})`;
};

export const getGradientColorsForRender = (
  gradient: BackgroundGradient,
  isDarkMode: boolean,
): string[] => {
  return gradient.colors.map((color) =>
    isDarkMode ? applyDarkModeFilter(color) : color,
  );
};

/** Gradient line endpoints in element-local coordinates (0,0 top-left).
 *  Accepts either a `BackgroundGradient` (preferred — uses explicit `start`/`end`
 *  if present), or a numeric `angleDeg` for backward compatibility. */
export const getLinearGradientEndpoints = (
  width: number,
  height: number,
  gradientOrAngle: BackgroundGradient | number,
): { x0: number; y0: number; x1: number; y1: number } => {
  if (
    typeof gradientOrAngle !== "number" &&
    gradientOrAngle.start &&
    gradientOrAngle.end
  ) {
    const { start, end } = gradientOrAngle;
    return {
      x0: start.x * width,
      y0: start.y * height,
      x1: end.x * width,
      y1: end.y * height,
    };
  }
  const angleDeg =
    typeof gradientOrAngle === "number"
      ? gradientOrAngle
      : gradientOrAngle.angle;
  const cx = width / 2;
  const cy = height / 2;
  const angleRad = degreesToRadians(
    angleDeg as import("@excalidraw/math").Degrees,
  );
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);

  const halfDiagonal = Math.abs(width * dx) / 2 + Math.abs(height * dy) / 2;

  return {
    x0: cx - dx * halfDiagonal,
    y0: cy - dy * halfDiagonal,
    x1: cx + dx * halfDiagonal,
    y1: cy + dy * halfDiagonal,
  };
};

/** Radial gradient circle params in element-local coordinates.
 *  Accepts either a `BackgroundGradient` (preferred — uses explicit `center`/`radius`
 *  if present), or a numeric `angleDeg` for backward compatibility. */
export const getRadialGradientCircleParams = (
  width: number,
  height: number,
  gradientOrAngle: BackgroundGradient | number,
): {
  fx: number;
  fy: number;
  fr: number;
  cx: number;
  cy: number;
  r: number;
} => {
  if (
    typeof gradientOrAngle !== "number" &&
    (gradientOrAngle.center || gradientOrAngle.radius != null)
  ) {
    const center = gradientOrAngle.center ?? { x: 0.5, y: 0.5 };
    const halfDiagonal = Math.hypot(width, height) / 2;
    const radius = (gradientOrAngle.radius ?? 1) * halfDiagonal;
    const cx = center.x * width;
    const cy = center.y * height;
    return {
      fx: cx,
      fy: cy,
      fr: 0,
      cx,
      cy,
      r: Math.max(radius, 0.0001),
    };
  }
  const angleDeg =
    typeof gradientOrAngle === "number"
      ? gradientOrAngle
      : gradientOrAngle.angle;
  const cx = width / 2;
  const cy = height / 2;
  const angleRad = degreesToRadians(
    angleDeg as import("@excalidraw/math").Degrees,
  );
  const radius = Math.hypot(width, height) / 2;
  const focalOffset = radius * 0.7;
  return {
    fx: cx + Math.cos(angleRad) * focalOffset,
    fy: cy + Math.sin(angleRad) * focalOffset,
    fr: 0,
    cx,
    cy,
    r: radius,
  };
};

export const updateGradientStopColor = (
  gradient: BackgroundGradient,
  index: number,
  newColor: string,
): BackgroundGradient => {
  const colors = [...gradient.colors] as string[];
  colors[index] = newColor;
  return {
    ...gradient,
    colors: colors as unknown as BackgroundGradient["colors"],
  };
};

export const getDefaultBackgroundGradient = (
  firstColor: string,
  secondColor?: string,
  type: BackgroundGradient["type"] = "radial",
): BackgroundGradient => {
  const base = {
    type,
    colors: [
      firstColor,
      secondColor ?? "#a5d8ff",
    ] as unknown as BackgroundGradient["colors"],
    angle: 0,
  };
  if (type === "linear") {
    return {
      ...base,
      start: { x: 0, y: 0.5 },
      end: { x: 1, y: 0.5 },
    };
  }
  return {
    ...base,
    center: { x: 0.5, y: 0.5 },
    radius: 1,
  };
};

export const shouldRenderBackgroundGradient = (
  element: ExcalidrawElement,
): boolean => {
  if (!hasBackgroundGradient(element)) {
    return false;
  }
  if (!hasBackground(element.type)) {
    return false;
  }
  if (element.type === "line" || element.type === "freedraw") {
    return isPathALoop(element.points);
  }
  return true;
};

const clipElementShape = (
  context: CanvasRenderingContext2D,
  element: NonDeletedExcalidrawElement,
) => {
  context.beginPath();

  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable": {
      const radius = getCornerRadius(
        Math.min(element.width, element.height),
        element,
      );
      if (element.roundness && context.roundRect && radius > 0) {
        context.roundRect(0, 0, element.width, element.height, radius);
      } else {
        context.rect(0, 0, element.width, element.height);
      }
      break;
    }
    case "ellipse": {
      context.ellipse(
        element.width / 2,
        element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      break;
    }
    case "diamond": {
      const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
        getDiamondPoints(element);
      context.moveTo(topX, topY);
      context.lineTo(rightX, rightY);
      context.lineTo(bottomX, bottomY);
      context.lineTo(leftX, leftY);
      context.closePath();
      break;
    }
    case "line": {
      const points = element.points.length
        ? element.points
        : ([[0, 0]] as LocalPoint[]);
      context.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i][0], points[i][1]);
      }
      context.closePath();
      break;
    }
    case "freedraw": {
      const simplifiedPoints = simplify(
        element.points as Mutable<LocalPoint[]>,
        0.75,
      );
      if (simplifiedPoints.length) {
        context.moveTo(simplifiedPoints[0][0], simplifiedPoints[0][1]);
        for (let i = 1; i < simplifiedPoints.length; i++) {
          context.lineTo(simplifiedPoints[i][0], simplifiedPoints[i][1]);
        }
        context.closePath();
      }
      break;
    }
    default:
      context.rect(0, 0, element.width, element.height);
  }
};

export const drawBackgroundGradientFill = (
  context: CanvasRenderingContext2D,
  element: NonDeletedExcalidrawElement,
  isDarkMode: boolean,
  opacity: number = 1,
) => {
  if (!shouldRenderBackgroundGradient(element) || !element.backgroundGradient) {
    return;
  }

  const gradient = element.backgroundGradient;
  const canvasGradient =
    gradient.type === "radial"
      ? (() => {
          const { fx, fy, fr, cx, cy, r } = getRadialGradientCircleParams(
            element.width,
            element.height,
            gradient,
          );
          return context.createRadialGradient(fx, fy, fr, cx, cy, r);
        })()
      : (() => {
          const { x0, y0, x1, y1 } = getLinearGradientEndpoints(
            element.width,
            element.height,
            gradient,
          );
          return context.createLinearGradient(x0, y0, x1, y1);
        })();
  const colors = getGradientColorsForRender(gradient, isDarkMode);
  const step = colors.length > 1 ? 1 / (colors.length - 1) : 1;

  colors.forEach((color, index) => {
    canvasGradient.addColorStop(index * step, color);
  });

  context.save();
  clipElementShape(context, element);
  context.clip();
  context.globalAlpha = opacity;
  context.fillStyle = canvasGradient;
  context.fill("evenodd");
  context.restore();
};

export const ensureSvgGradientDef = (
  svgRoot: SVGElement,
  elementId: string,
  gradient: BackgroundGradient,
  width: number,
  height: number,
  isDarkMode: boolean,
): string => {
  const doc = svgRoot.ownerDocument!;
  let defs = svgRoot.querySelector("defs");
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, "defs");
    svgRoot.prepend(defs);
  }

  const id = `element-fill-gradient-${elementId}`;
  defs.querySelector(`#${id}`)?.remove();

  const colors = getGradientColorsForRender(gradient, isDarkMode);
  const step = colors.length > 1 ? 1 / (colors.length - 1) : 1;

  if (gradient.type === "radial") {
    const { fx, fy, fr, cx, cy, r } = getRadialGradientCircleParams(
      width,
      height,
      gradient,
    );
    const radialGradient = doc.createElementNS(SVG_NS, "radialGradient");
    radialGradient.setAttribute("id", id);
    radialGradient.setAttribute("gradientUnits", "userSpaceOnUse");
    radialGradient.setAttribute("cx", `${cx}`);
    radialGradient.setAttribute("cy", `${cy}`);
    radialGradient.setAttribute("r", `${r}`);
    radialGradient.setAttribute("fx", `${fx}`);
    radialGradient.setAttribute("fy", `${fy}`);
    radialGradient.setAttribute("fr", `${fr}`);
    colors.forEach((color, index) => {
      const stop = doc.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", `${index * step}`);
      stop.setAttribute("stop-color", color);
      radialGradient.appendChild(stop);
    });
    defs.appendChild(radialGradient);
    return id;
  }

  const { x0, y0, x1, y1 } = getLinearGradientEndpoints(
    width,
    height,
    gradient,
  );
  const linearGradient = doc.createElementNS(SVG_NS, "linearGradient");
  linearGradient.setAttribute("id", id);
  linearGradient.setAttribute("gradientUnits", "userSpaceOnUse");
  linearGradient.setAttribute("x1", `${x0}`);
  linearGradient.setAttribute("y1", `${y0}`);
  linearGradient.setAttribute("x2", `${x1}`);
  linearGradient.setAttribute("y2", `${y1}`);
  colors.forEach((color, index) => {
    const stop = doc.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", `${index * step}`);
    stop.setAttribute("stop-color", color);
    linearGradient.appendChild(stop);
  });

  defs.appendChild(linearGradient);
  return id;
};

export const createSvgGradientFillShape = (
  doc: Document,
  element: NonDeletedExcalidrawElement,
  gradientUrl: string,
): SVGElement | null => {
  if (!shouldRenderBackgroundGradient(element)) {
    return null;
  }

  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable": {
      const rect = doc.createElementNS(SVG_NS, "rect");
      rect.setAttribute("width", `${element.width}`);
      rect.setAttribute("height", `${element.height}`);
      const radius = getCornerRadius(
        Math.min(element.width, element.height),
        element,
      );
      if (element.roundness && radius > 0) {
        rect.setAttribute("rx", `${radius}`);
        rect.setAttribute("ry", `${radius}`);
      }
      rect.setAttribute("fill", gradientUrl);
      rect.setAttribute("stroke", "none");
      return rect;
    }
    case "ellipse": {
      const ellipse = doc.createElementNS(SVG_NS, "ellipse");
      ellipse.setAttribute("cx", `${element.width / 2}`);
      ellipse.setAttribute("cy", `${element.height / 2}`);
      ellipse.setAttribute("rx", `${element.width / 2}`);
      ellipse.setAttribute("ry", `${element.height / 2}`);
      ellipse.setAttribute("fill", gradientUrl);
      ellipse.setAttribute("stroke", "none");
      return ellipse;
    }
    case "diamond": {
      const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
        getDiamondPoints(element);
      const polygon = doc.createElementNS(SVG_NS, "polygon");
      polygon.setAttribute(
        "points",
        `${topX},${topY} ${rightX},${rightY} ${bottomX},${bottomY} ${leftX},${leftY}`,
      );
      polygon.setAttribute("fill", gradientUrl);
      polygon.setAttribute("stroke", "none");
      return polygon;
    }
    case "line": {
      const points = element.points.length
        ? element.points
        : ([[0, 0]] as LocalPoint[]);
      const polygon = doc.createElementNS(SVG_NS, "polygon");
      polygon.setAttribute(
        "points",
        points.map((p) => `${p[0]},${p[1]}`).join(" "),
      );
      polygon.setAttribute("fill", gradientUrl);
      polygon.setAttribute("stroke", "none");
      return polygon;
    }
    case "freedraw": {
      const simplifiedPoints = simplify(
        element.points as Mutable<LocalPoint[]>,
        0.75,
      );
      if (!simplifiedPoints.length) {
        return null;
      }
      const path = doc.createElementNS(SVG_NS, "path");
      const d = `M ${simplifiedPoints[0][0]} ${
        simplifiedPoints[0][1]
      } ${simplifiedPoints
        .slice(1)
        .map((p) => `L ${p[0]} ${p[1]}`)
        .join(" ")} Z`;
      path.setAttribute("d", d);
      path.setAttribute("fill", gradientUrl);
      path.setAttribute("stroke", "none");
      return path;
    }
    default:
      return null;
  }
};

export const renderSvgBackgroundGradientFill = (
  svgRoot: SVGElement,
  element: NonDeletedExcalidrawElement,
  transform: string | null,
  fillOpacity: number,
  isDarkMode: boolean,
): SVGElement | null => {
  if (!shouldRenderBackgroundGradient(element) || !element.backgroundGradient) {
    return null;
  }

  const gradientId = ensureSvgGradientDef(
    svgRoot,
    element.id,
    element.backgroundGradient,
    element.width,
    element.height,
    isDarkMode,
  );
  const doc = svgRoot.ownerDocument!;
  const fillNode = createSvgGradientFillShape(
    doc,
    element,
    `url(#${gradientId})`,
  );
  if (!fillNode) {
    return null;
  }

  if (transform) {
    fillNode.setAttribute("transform", transform);
  }
  if (fillOpacity !== 1) {
    fillNode.setAttribute("fill-opacity", `${fillOpacity}`);
  }
  return fillNode;
};
