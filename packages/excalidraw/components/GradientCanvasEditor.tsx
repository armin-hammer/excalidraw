import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";

import { hasBackgroundGradient } from "@excalidraw/element";

import type {
  BackgroundGradient,
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { t } from "../i18n";

import "./GradientCanvasEditor.scss";

import type { AppClassProperties, AppState } from "../types";

type Props = {
  appState: AppState;
  selectedElements: readonly NonDeletedExcalidrawElement[];
  app: AppClassProperties;
};

type Drag =
  | { kind: "linear-start" }
  | { kind: "linear-end" }
  | { kind: "linear-mid"; startOffset: { x: number; y: number } }
  | { kind: "radial-center" }
  | { kind: "radial-radius" };

/**
 * Returns the normalized element-local point (in fractions of width/height)
 * for the given viewport (client) coordinates, accounting for the element's
 * rotation around its center.
 */
const viewportToNormalizedElementCoords = (
  clientX: number,
  clientY: number,
  element: ExcalidrawElement,
  appState: AppState,
): { x: number; y: number } => {
  const scene = viewportCoordsToSceneCoords({ clientX, clientY }, appState);
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const cos = Math.cos(-element.angle);
  const sin = Math.sin(-element.angle);
  const dx = scene.x - cx;
  const dy = scene.y - cy;
  const localX = element.width / 2 + dx * cos - dy * sin;
  const localY = element.height / 2 + dx * sin + dy * cos;
  return {
    x: element.width ? localX / element.width : 0.5,
    y: element.height ? localY / element.height : 0.5,
  };
};

/** Converts a local element-fraction point to viewport coords. */
const normalizedToViewport = (
  nx: number,
  ny: number,
  element: ExcalidrawElement,
  appState: AppState,
): { x: number; y: number } => {
  const localX = nx * element.width;
  const localY = ny * element.height;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const ox = localX - element.width / 2;
  const oy = localY - element.height / 2;
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const sceneX = cx + ox * cos - oy * sin;
  const sceneY = cy + ox * sin + oy * cos;
  return sceneCoordsToViewportCoords({ sceneX, sceneY }, appState);
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const getEffectiveLinearEndpoints = (g: BackgroundGradient) => {
  if (g.start && g.end) {
    return { start: g.start, end: g.end };
  }
  // derive from angle fallback (legacy gradients)
  const angleRad = (g.angle * Math.PI) / 180;
  const cx = 0.5;
  const cy = 0.5;
  const halfLen = 0.5;
  return {
    start: {
      x: cx - Math.cos(angleRad) * halfLen,
      y: cy - Math.sin(angleRad) * halfLen,
    },
    end: {
      x: cx + Math.cos(angleRad) * halfLen,
      y: cy + Math.sin(angleRad) * halfLen,
    },
  };
};

const getEffectiveRadial = (g: BackgroundGradient) => {
  const center = g.center ?? { x: 0.5, y: 0.5 };
  const radius = g.radius ?? 1;
  return { center, radius };
};

export const GradientCanvasEditor = ({
  appState,
  selectedElements,
  app,
}: Props) => {
  const isPickerOpen =
    appState.openPopup === "elementBackground" ||
    appState.openPopup === "canvasBackground";

  const targetElement =
    selectedElements.length === 1 ? selectedElements[0] : null;
  const isGradientEligible =
    !!targetElement &&
    hasBackgroundGradient(targetElement) &&
    targetElement.backgroundGradient != null;

  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  // Element id ref so listeners can resolve the latest scene state
  const targetIdRef = useRef<string | null>(targetElement?.id ?? null);
  useEffect(() => {
    targetIdRef.current = targetElement?.id ?? null;
  }, [targetElement]);

  useEffect(() => {
    if (!drag) {
      return;
    }

    const handlePointerMove = (ev: PointerEvent) => {
      const id = targetIdRef.current;
      if (!id) {
        return;
      }
      const el = app.scene.getNonDeletedElements().find((e) => e.id === id) as
        | ExcalidrawElement
        | undefined;
      if (!el || !el.backgroundGradient) {
        return;
      }
      const norm = viewportToNormalizedElementCoords(
        ev.clientX,
        ev.clientY,
        el,
        app.state as AppState,
      );

      const g = el.backgroundGradient;
      let next: BackgroundGradient = g;

      switch (dragRef.current?.kind) {
        case "linear-start":
          next = {
            ...g,
            start: { x: clamp01(norm.x), y: clamp01(norm.y) },
            end: g.end ?? getEffectiveLinearEndpoints(g).end,
          };
          break;
        case "linear-end":
          next = {
            ...g,
            start: g.start ?? getEffectiveLinearEndpoints(g).start,
            end: { x: clamp01(norm.x), y: clamp01(norm.y) },
          };
          break;
        case "linear-mid": {
          const { start, end } = getEffectiveLinearEndpoints(g);
          const midNow = {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
          };
          const dx = norm.x - midNow.x;
          const dy = norm.y - midNow.y;
          next = {
            ...g,
            start: {
              x: clamp01(start.x + dx),
              y: clamp01(start.y + dy),
            },
            end: {
              x: clamp01(end.x + dx),
              y: clamp01(end.y + dy),
            },
          };
          break;
        }
        case "radial-center":
          next = {
            ...g,
            center: { x: clamp01(norm.x), y: clamp01(norm.y) },
            radius: g.radius ?? 1,
          };
          break;
        case "radial-radius": {
          const center = g.center ?? { x: 0.5, y: 0.5 };
          // radius is fraction of half-diagonal (matching gradient.ts)
          const dx = (norm.x - center.x) * el.width;
          const dy = (norm.y - center.y) * el.height;
          const distance = Math.hypot(dx, dy);
          const halfDiag = Math.hypot(el.width, el.height) / 2;
          const newRadius = Math.max(
            0.05,
            Math.min(distance / Math.max(halfDiag, 0.0001), 3),
          );
          next = { ...g, center, radius: newRadius };
          break;
        }
        default:
          return;
      }

      app.scene.mutateElement(el, { backgroundGradient: next });
    };

    const stopDrag = () => {
      setDrag(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [drag, app]);

  const gradient = isGradientEligible
    ? (targetElement!.backgroundGradient as BackgroundGradient)
    : null;

  const handles = useMemo(() => {
    if (!isPickerOpen || !targetElement || !gradient) {
      return null;
    }

    if (gradient.type === "linear") {
      const { start, end } = getEffectiveLinearEndpoints(gradient);
      const startVp = normalizedToViewport(
        start.x,
        start.y,
        targetElement,
        appState,
      );
      const endVp = normalizedToViewport(end.x, end.y, targetElement, appState);
      const midNorm = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const midVp = normalizedToViewport(
        midNorm.x,
        midNorm.y,
        targetElement,
        appState,
      );
      return {
        type: "linear" as const,
        startVp,
        endVp,
        midVp,
        startNorm: start,
        endNorm: end,
        midNorm,
      };
    }

    const { center, radius } = getEffectiveRadial(gradient);
    const centerVp = normalizedToViewport(
      center.x,
      center.y,
      targetElement,
      appState,
    );
    const halfDiag = Math.hypot(targetElement.width, targetElement.height) / 2;
    const radiusInLocal = radius * halfDiag;
    // edge handle along element-local +x axis (in normalized coords); we project
    // it back to viewport space taking rotation into account
    const edgeNorm = {
      x: center.x + radiusInLocal / Math.max(targetElement.width, 0.0001),
      y: center.y,
    };
    const edgeVp = normalizedToViewport(
      edgeNorm.x,
      edgeNorm.y,
      targetElement,
      appState,
    );
    const radiusPx = Math.hypot(edgeVp.x - centerVp.x, edgeVp.y - centerVp.y);
    return {
      type: "radial" as const,
      centerVp,
      edgeVp,
      radiusPx,
    };
  }, [appState, gradient, isPickerOpen, targetElement]);

  if (!isPickerOpen || !targetElement || !gradient || !handles) {
    return null;
  }

  const handlePointerDown =
    (kind: Drag["kind"]) => (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element).setPointerCapture?.(event.pointerId);
      if (kind === "linear-mid" && handles.type === "linear") {
        const offset = {
          x: handles.endNorm.x - handles.startNorm.x,
          y: handles.endNorm.y - handles.startNorm.y,
        };
        setDrag({ kind: "linear-mid", startOffset: offset });
        return;
      }
      setDrag({ kind } as Drag);
    };

  return (
    <svg
      className="gradient-canvas-editor"
      width={appState.width}
      height={appState.height}
      style={{
        left: 0,
        top: 0,
        width: appState.width,
        height: appState.height,
      }}
    >
      {handles.type === "linear" ? (
        <g>
          <line
            x1={handles.startVp.x}
            y1={handles.startVp.y}
            x2={handles.endVp.x}
            y2={handles.endVp.y}
            className="gradient-canvas-editor__line gradient-canvas-editor__line--outline"
          />
          <line
            x1={handles.startVp.x}
            y1={handles.startVp.y}
            x2={handles.endVp.x}
            y2={handles.endVp.y}
            className="gradient-canvas-editor__line"
          />
          <circle
            cx={handles.midVp.x}
            cy={handles.midVp.y}
            r={6}
            className="gradient-canvas-editor__handle gradient-canvas-editor__handle--mid"
            onPointerDown={handlePointerDown("linear-mid")}
            aria-label={t("colorPicker.gradientHandleLinearMid")}
          />
          <circle
            cx={handles.startVp.x}
            cy={handles.startVp.y}
            r={8}
            className="gradient-canvas-editor__handle gradient-canvas-editor__handle--start"
            onPointerDown={handlePointerDown("linear-start")}
            aria-label={t("colorPicker.gradientHandleLinearStart")}
          />
          <circle
            cx={handles.endVp.x}
            cy={handles.endVp.y}
            r={8}
            className="gradient-canvas-editor__handle gradient-canvas-editor__handle--end"
            onPointerDown={handlePointerDown("linear-end")}
            aria-label={t("colorPicker.gradientHandleLinearEnd")}
          />
        </g>
      ) : (
        <g>
          <circle
            cx={handles.centerVp.x}
            cy={handles.centerVp.y}
            r={Math.max(handles.radiusPx, 4)}
            className="gradient-canvas-editor__radius-ring gradient-canvas-editor__line--outline"
          />
          <circle
            cx={handles.centerVp.x}
            cy={handles.centerVp.y}
            r={Math.max(handles.radiusPx, 4)}
            className="gradient-canvas-editor__radius-ring"
          />
          <circle
            cx={handles.centerVp.x}
            cy={handles.centerVp.y}
            r={8}
            className="gradient-canvas-editor__handle gradient-canvas-editor__handle--center"
            onPointerDown={handlePointerDown("radial-center")}
            aria-label={t("colorPicker.gradientHandleRadialCenter")}
          />
          <circle
            cx={handles.edgeVp.x}
            cy={handles.edgeVp.y}
            r={7}
            className="gradient-canvas-editor__handle gradient-canvas-editor__handle--edge"
            onPointerDown={handlePointerDown("radial-radius")}
            aria-label={t("colorPicker.gradientHandleRadialEdge")}
          />
        </g>
      )}
    </svg>
  );
};
