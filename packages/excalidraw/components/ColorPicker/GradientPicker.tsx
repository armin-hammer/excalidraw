import clsx from "clsx";
import type { CSSProperties } from "react";

import { COLOR_PALETTE } from "@excalidraw/common";
import {
  getDefaultBackgroundGradient,
  getGradientPreviewCss,
  MAX_GRADIENT_STOPS,
  MIN_GRADIENT_STOPS,
} from "@excalidraw/element";

import type { BackgroundGradient } from "@excalidraw/element/types";

import { t } from "../../i18n";
import { Range } from "../Range";

import PickerHeading from "./PickerHeading";

import "./ColorPicker.scss";

type FillMode = "solid" | "gradient";

interface GradientPickerProps {
  color: string | null;
  gradient: BackgroundGradient | null;
  activeStopIndex: number;
  onActiveStopIndexChange: (index: number) => void;
  onColorChange: (color: string) => void;
  onGradientChange: (gradient: BackgroundGradient | null) => void;
}

export const GradientPicker = ({
  color,
  gradient,
  activeStopIndex,
  onActiveStopIndexChange,
  onColorChange,
  onGradientChange,
}: GradientPickerProps) => {
  const fillMode: FillMode = gradient ? "gradient" : "solid";

  const currentGradient =
    gradient ??
    getDefaultBackgroundGradient(
      color && color !== "transparent" ? color : COLOR_PALETTE.blue[2],
      "#a5d8ff",
    );

  const setFillMode = (mode: FillMode) => {
    if (mode === "solid") {
      onGradientChange(null);
      return;
    }
    onGradientChange(
      getDefaultBackgroundGradient(
        color && color !== "transparent" ? color : COLOR_PALETTE.blue[2],
        "#a5d8ff",
      ),
    );
    onActiveStopIndexChange(0);
  };

  const updateGradient = (partial: Partial<BackgroundGradient>) => {
    onGradientChange({
      ...currentGradient,
      ...partial,
    });
  };

  const addStop = () => {
    if (currentGradient.colors.length >= MAX_GRADIENT_STOPS) {
      return;
    }
    const lastColor =
      currentGradient.colors[currentGradient.colors.length - 1];
    updateGradient({
      colors: [...currentGradient.colors, lastColor] as unknown as BackgroundGradient["colors"],
    });
    onActiveStopIndexChange(currentGradient.colors.length);
  };

  const removeStop = (index: number) => {
    if (currentGradient.colors.length <= MIN_GRADIENT_STOPS) {
      return;
    }
    const colors = currentGradient.colors.filter((_, i) => i !== index);
    updateGradient({
      colors: colors as unknown as BackgroundGradient["colors"],
    });
    onActiveStopIndexChange(Math.max(0, index - 1));
  };

  return (
    <div className="color-picker__gradient-section">
      <PickerHeading>{t("colorPicker.fillType")}</PickerHeading>
      <div className="color-picker__fill-mode" role="group">
        <button
          type="button"
          className={clsx("color-picker__fill-mode-btn", {
            active: fillMode === "solid",
          })}
          onClick={() => setFillMode("solid")}
        >
          {t("colorPicker.solid")}
        </button>
        <button
          type="button"
          className={clsx("color-picker__fill-mode-btn", {
            active: fillMode === "gradient",
          })}
          onClick={() => setFillMode("gradient")}
        >
          {t("colorPicker.gradient")}
        </button>
      </div>

      {fillMode === "gradient" && (
        <>
          <div
            className="color-picker__gradient-preview"
            style={
              { background: getGradientPreviewCss(currentGradient) } as CSSProperties
            }
            aria-hidden="true"
          />
          <PickerHeading>{t("colorPicker.gradientStops")}</PickerHeading>
          <div className="color-picker__gradient-stops">
            {currentGradient.colors.map((stopColor, index) => (
              <div key={index} className="color-picker__gradient-stop">
                <button
                  type="button"
                  className={clsx("color-picker__button", {
                    active: activeStopIndex === index,
                  })}
                  style={{ "--swatch-color": stopColor } as CSSProperties}
                  aria-label={t("colorPicker.gradientStop", {
                    index: index + 1,
                  })}
                  onClick={() => onActiveStopIndexChange(index)}
                />
                {currentGradient.colors.length > MIN_GRADIENT_STOPS && (
                  <button
                    type="button"
                    className="color-picker__gradient-stop-remove"
                    aria-label={t("colorPicker.removeColorStop")}
                    onClick={() => removeStop(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {currentGradient.colors.length < MAX_GRADIENT_STOPS && (
              <button
                type="button"
                className="color-picker__gradient-stop-add"
                aria-label={t("colorPicker.addColorStop")}
                onClick={addStop}
              >
                +
              </button>
            )}
          </div>
          <Range
            label={t("colorPicker.gradientAngle")}
            value={currentGradient.angle}
            onChange={(angle) => updateGradient({ angle })}
            min={0}
            max={360}
            step={1}
            minLabel="0°"
            hasCommonValue
          />
        </>
      )}
    </div>
  );
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
