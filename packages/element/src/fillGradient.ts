import { applyDarkModeFilter, isTransparent } from "@excalidraw/common";

import { getDiamondPoints } from "./bounds";
import { getCornerRadius, isPathALoop } from "./utils";

import type {
  ExcalidrawElement,
  FillGradient,
  NonDeletedExcalidrawElement,
} from "./types";

export type { FillGradient };

export const MIN_GRADIENT_COLORS = 2;
export const MAX_GRADIENT_COLORS = 4;

export const hasFillGradient = (
  element: Pick<ExcalidrawElement, "fillGradient">,
): element is ExcalidrawElement & { fillGradient: FillGradient } =>
  element.fillGradient != null &&
  element.fillGradient.colors.length >= MIN_GRADIENT_COLORS;

export const hasElementFill = (element: ExcalidrawElement): boolean =>
  hasFillGradient(element) ||
  (hasBackgroundFill(element.type) && !isTransparent(element.backgroundColor));

const hasBackgroundFill = (type: ExcalidrawElement["type"]) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "line" ||
  type === "freedraw";

export const normalizeFillGradient = (
  fillGradient: unknown,
): FillGradient | null => {
  if (
    !fillGradient ||
    typeof fillGradient !== "object" ||
    (fillGradient as FillGradient).type !== "linear"
  ) {
    return null;
  }
  const { angle, colors } = fillGradient as FillGradient;
  if (!Array.isArray(colors)) {
    return null;
  }
  const validColors = colors
    .filter((c): c is string => typeof c === "string" && !isTransparent(c))
    .slice(0, MAX_GRADIENT_COLORS);
  if (validColors.length < MIN_GRADIENT_COLORS) {
    return null;
  }
  const normalizedAngle =
    typeof angle === "number" && Number.isFinite(angle)
      ? ((angle % 360) + 360) % 360
      : 0;
  return {
    type: "linear",
    angle: normalizedAngle,
    colors: validColors,
  };
};

export const getFillGradientColors = (
  gradient: FillGradient,
  isDarkMode: boolean,
): string[] =>
  gradient.colors.map((color) =>
    isDarkMode ? applyDarkModeFilter(color) : color,
  );

export const createLinearCanvasGradient = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  gradient: FillGradient,
  isDarkMode: boolean,
): CanvasGradient => {
  const angleRad = (gradient.angle * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const length = Math.sqrt(width * width + height * height) / 2;
  const x0 = cx - Math.cos(angleRad) * length;
  const y0 = cy - Math.sin(angleRad) * length;
  const x1 = cx + Math.cos(angleRad) * length;
  const y1 = cy + Math.sin(angleRad) * length;
  const canvasGradient = context.createLinearGradient(x0, y0, x1, y1);
  const colors = getFillGradientColors(gradient, isDarkMode);
  colors.forEach((color, index) => {
    canvasGradient.addColorStop(
      colors.length === 1 ? 0 : index / (colors.length - 1),
      color,
    );
  });
  return canvasGradient;
};

const addRoundedRectPath = (
  path: Path2D,
  width: number,
  height: number,
  radius: number,
) => {
  if (typeof path.roundRect === "function") {
    path.roundRect(0, 0, width, height, radius);
    return;
  }
  const w = width;
  const h = height;
  const r = radius;
  const svgPath = `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${
    h - r
  } Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${
    h - r
  } L 0 ${r} Q 0 0, ${r} 0 Z`;
  const subPath = new Path2D(svgPath);
  path.addPath(subPath);
};

const addRoundedDiamondPath = (
  path: Path2D,
  element: ExcalidrawElement & { width: number; height: number },
) => {
  const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
    getDiamondPoints(element);
  const verticalRadius = getCornerRadius(Math.abs(topX - leftX), element);
  const horizontalRadius = getCornerRadius(Math.abs(rightY - topY), element);
  const svgPath = `M ${topX + verticalRadius} ${topY + horizontalRadius} L ${
    rightX - verticalRadius
  } ${rightY - horizontalRadius}
    C ${rightX} ${rightY}, ${rightX} ${rightY}, ${rightX - verticalRadius} ${
    rightY + horizontalRadius
  }
    L ${bottomX + verticalRadius} ${bottomY - horizontalRadius}
    C ${bottomX} ${bottomY}, ${bottomX} ${bottomY}, ${
    bottomX - verticalRadius
  } ${bottomY - horizontalRadius}
    L ${leftX + verticalRadius} ${leftY + horizontalRadius}
    C ${leftX} ${leftY}, ${leftX} ${leftY}, ${leftX + verticalRadius} ${
    leftY - horizontalRadius
  }
    L ${topX - verticalRadius} ${topY + horizontalRadius}
    C ${topX} ${topY}, ${topX} ${topY}, ${topX + verticalRadius} ${
    topY + horizontalRadius
  } Z`;
  path.addPath(new Path2D(svgPath));
};

export const buildElementFillClipPath = (
  element: NonDeletedExcalidrawElement,
): Path2D | null => {
  const path = new Path2D();

  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable": {
      if (element.roundness) {
        const r = getCornerRadius(
          Math.min(element.width, element.height),
          element,
        );
        addRoundedRectPath(path, element.width, element.height, r);
      } else {
        path.rect(0, 0, element.width, element.height);
      }
      return path;
    }
    case "ellipse": {
      path.ellipse(
        element.width / 2,
        element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      return path;
    }
    case "diamond": {
      if (element.roundness) {
        addRoundedDiamondPath(path, element);
      } else {
        const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
          getDiamondPoints(element);
        path.moveTo(topX, topY);
        path.lineTo(rightX, rightY);
        path.lineTo(bottomX, bottomY);
        path.lineTo(leftX, leftY);
        path.closePath();
      }
      return path;
    }
    case "line":
    case "freedraw": {
      if (!isPathALoop(element.points) || element.points.length < 2) {
        return null;
      }
      const points = element.points;
      path.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i][0], points[i][1]);
      }
      path.closePath();
      return path;
    }
    default:
      return null;
  }
};

export const drawElementFillGradient = (
  context: CanvasRenderingContext2D,
  element: NonDeletedExcalidrawElement,
  isDarkMode: boolean,
) => {
  if (!hasFillGradient(element)) {
    return;
  }

  const clipPath = buildElementFillClipPath(element);
  if (!clipPath) {
    return;
  }

  context.save();
  context.clip(clipPath);
  context.fillStyle = createLinearCanvasGradient(
    context,
    element.width,
    element.height,
    element.fillGradient,
    isDarkMode,
  );
  context.fillRect(0, 0, element.width, element.height);
  context.restore();
};

export const getSvgLinearGradientDef = (
  element: ExcalidrawElement & { fillGradient: FillGradient },
  gradientId: string,
  isDarkMode: boolean,
): SVGLinearGradientElement => {
  const gradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient",
  ) as SVGLinearGradientElement;
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("gradientUnits", "objectBoundingBox");
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0.5");
  gradient.setAttribute("x2", "1");
  gradient.setAttribute("y2", "0.5");
  gradient.setAttribute(
    "gradientTransform",
    `rotate(${element.fillGradient.angle} 0.5 0.5)`,
  );

  const colors = getFillGradientColors(element.fillGradient, isDarkMode);
  colors.forEach((color, index) => {
    const stop = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop",
    );
    stop.setAttribute(
      "offset",
      `${colors.length === 1 ? 0 : (index / (colors.length - 1)) * 100}%`,
    );
    stop.setAttribute("stop-color", color);
    gradient.appendChild(stop);
  });

  return gradient;
};

export const getSvgFillPathD = (
  element: NonDeletedExcalidrawElement,
): string | null => {
  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable": {
      if (element.roundness) {
        const w = element.width;
        const h = element.height;
        const r = getCornerRadius(Math.min(w, h), element);
        return `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${
          h - r
        } Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${
          h - r
        } L 0 ${r} Q 0 0, ${r} 0 Z`;
      }
      return `M 0 0 H ${element.width} V ${element.height} H 0 Z`;
    }
    case "ellipse": {
      const rx = element.width / 2;
      const ry = element.height / 2;
      return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${element.height} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`;
    }
    case "diamond": {
      const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
        getDiamondPoints(element);
      return `M ${topX} ${topY} L ${rightX} ${rightY} L ${bottomX} ${bottomY} L ${leftX} ${leftY} Z`;
    }
    case "line":
    case "freedraw": {
      if (!isPathALoop(element.points) || element.points.length < 2) {
        return null;
      }
      const points = element.points;
      return (
        points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") +
        " Z"
      );
    }
    default:
      return null;
  }
};
