import { Popover } from "radix-ui";
import clsx from "clsx";
import { useRef, useState } from "react";

import {
  COLOR_OUTLINE_CONTRAST_THRESHOLD,
  COLOR_PALETTE,
  DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE,
  DEFAULT_ELEMENT_BACKGROUND_PICKS,
  isColorDark,
  isWritableElement,
} from "@excalidraw/common";

import {
  MAX_GRADIENT_COLORS,
  MIN_GRADIENT_COLORS,
} from "@excalidraw/element";

import type { FillGradient } from "@excalidraw/element/types";

import { useAtom } from "../../editor-jotai";
import { t } from "../../i18n";
import { useExcalidrawContainer, useStylesPanelMode } from "../App";
import { activeEyeDropperAtom } from "../EyeDropper";
import { PropertiesPopover } from "../PropertiesPopover";
import { Range } from "../Range";
import { ColorInput } from "../ColorPicker/ColorInput";
import { Picker } from "../ColorPicker/Picker";
import PickerHeading from "../ColorPicker/PickerHeading";
import { TopPicks } from "../ColorPicker/TopPicks";
import { activeColorPickerSectionAtom } from "../ColorPicker/colorPickerUtils";

import "./GradientFillPicker.scss";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "../../types";

const DEFAULT_GRADIENT_COLORS = [
  COLOR_PALETTE.blue[4],
  COLOR_PALETTE.violet[4],
] as const;

export const createDefaultFillGradient = (): FillGradient => ({
  type: "linear",
  angle: 0,
  colors: [...DEFAULT_GRADIENT_COLORS],
});

const getGradientPreviewStyle = (
  gradient: FillGradient | null,
): React.CSSProperties => {
  if (!gradient || gradient.colors.length < MIN_GRADIENT_COLORS) {
    return {};
  }
  const stops = gradient.colors
    .map((color, i) => {
      const offset =
        gradient.colors.length === 1
          ? 0
          : (i / (gradient.colors.length - 1)) * 100;
      return `${color} ${offset}%`;
    })
    .join(", ");
  return {
    background: `linear-gradient(${gradient.angle}deg, ${stops})`,
  };
};

const GradientColorStopPicker = ({
  color,
  label,
  isOpen,
  onOpenChange,
  onChange,
  elements,
  appState,
}: {
  color: string;
  label: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (color: string) => void;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
}) => {
  const { container } = useExcalidrawContainer();
  const stylesPanelMode = useStylesPanelMode();
  const isCompactMode = stylesPanelMode !== "full";
  const isMobileMode = stylesPanelMode === "mobile";
  const [, setActiveColorPickerSection] = useAtom(activeColorPickerSectionAtom);
  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);
  const colorPickerContentRef = useRef<HTMLDivElement>(null);
  const palette = DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE;

  const focusPickerContent = () => {
    colorPickerContentRef.current?.focus();
  };

  // #region agent log
  if (isOpen) {
    fetch('http://127.0.0.1:7436/ingest/ecfc0c69-2d4a-415c-bafe-a407cc643b6a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fdbd05'},body:JSON.stringify({sessionId:'fdbd05',location:'GradientFillPicker.tsx:renderOpen',message:'gradient stop popover open',data:{label,hasContainer:!!container},timestamp:Date.now(),hypothesisId:'F'})}).catch(()=>{});
  }
  // #endregion

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(open) => {
        // #region agent log
        fetch('http://127.0.0.1:7436/ingest/ecfc0c69-2d4a-415c-bafe-a407cc643b6a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fdbd05'},body:JSON.stringify({sessionId:'fdbd05',location:'GradientFillPicker.tsx:onOpenChange',message:'gradient stop onOpenChange',data:{label,open},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        onOpenChange(open);
      }}
    >
      <Popover.Trigger
        type="button"
        className={clsx(
          "color-picker__button active-color properties-trigger gradient-fill-picker__swatch",
          {
            "is-transparent": !color || color === "transparent",
            "has-outline":
              !color || !isColorDark(color, COLOR_OUTLINE_CONTRAST_THRESHOLD),
            "compact-sizing": isCompactMode,
            "mobile-border": isMobileMode,
          },
        )}
        aria-label={label}
        style={{ "--swatch-color": color } as React.CSSProperties}
        title={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          // #region agent log
          fetch('http://127.0.0.1:7436/ingest/ecfc0c69-2d4a-415c-bafe-a407cc643b6a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fdbd05'},body:JSON.stringify({sessionId:'fdbd05',location:'GradientFillPicker.tsx:triggerClick',message:'gradient stop trigger clicked',data:{label,isOpenBefore:isOpen,willOpen:!isOpen,hasContainer:!!container},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
          // #endregion
          onOpenChange(!isOpen);
        }}
      />
      {isOpen && (
        <PropertiesPopover
          container={container}
          style={{ maxWidth: "13rem" }}
          preventAutoFocusOnTouch={!!appState.editingTextElement}
          onFocusOutside={(event) => {
            if (!isWritableElement(event.target)) {
              focusPickerContent();
            }
            event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (eyeDropperState) {
              event.preventDefault();
            }
          }}
          onClose={() => {
            onOpenChange(false);
            setActiveColorPickerSection(null);
          }}
        >
          <div
            className={clsx("color-picker-container", {
              "color-picker-container--no-top-picks": isCompactMode,
            })}
          >
            {!isCompactMode && (
              <TopPicks
                activeColor={color}
                onChange={onChange}
                type="elementBackground"
                topPicks={DEFAULT_ELEMENT_BACKGROUND_PICKS}
              />
            )}
            <Picker
              ref={colorPickerContentRef}
              palette={palette}
              color={color}
              onChange={onChange}
              onEyeDropperToggle={(force) => {
                setEyeDropperState((state) => {
                  if (force) {
                    state = state || {
                      keepOpenOnAlt: true,
                      onSelect: onChange,
                      colorPickerType: "elementBackground",
                    };
                    state.keepOpenOnAlt = true;
                    return state;
                  }
                  return force === false || state
                    ? null
                    : {
                        keepOpenOnAlt: false,
                        onSelect: onChange,
                        colorPickerType: "elementBackground",
                      };
                });
              }}
              onEscape={() => {
                if (eyeDropperState) {
                  setEyeDropperState(null);
                } else {
                  onOpenChange(false);
                }
              }}
              type="elementBackground"
              elements={elements}
              updateData={() => {}}
              showTitle={isCompactMode}
              showHotKey={!isMobileMode}
            >
              <div>
                <PickerHeading>{t("colorPicker.hexCode")}</PickerHeading>
                <ColorInput
                  color={color}
                  label={label}
                  onChange={onChange}
                  colorPickerType="elementBackground"
                  placeholder={t("colorPicker.color")}
                />
              </div>
            </Picker>
          </div>
        </PropertiesPopover>
      )}
    </Popover.Root>
  );
};

interface GradientFillPickerProps {
  fillGradient: FillGradient | null;
  onChange: (fillGradient: FillGradient | null) => void;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
}

export const GradientFillPicker = ({
  fillGradient,
  onChange,
  elements,
  appState,
}: GradientFillPickerProps) => {
  const isEnabled = fillGradient != null;
  const gradient = fillGradient ?? createDefaultFillGradient();
  const [openStopIndex, setOpenStopIndex] = useState<number | null>(null);

  // #region agent log
  fetch('http://127.0.0.1:7436/ingest/ecfc0c69-2d4a-415c-bafe-a407cc643b6a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fdbd05'},body:JSON.stringify({sessionId:'fdbd05',location:'GradientFillPicker.tsx:render',message:'GradientFillPicker render',data:{isEnabled,colorCount:gradient.colors.length,openStopIndex},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  const updateGradient = (patch: Partial<FillGradient>) => {
    onChange({
      ...gradient,
      ...patch,
    });
  };

  const updateColorAt = (index: number, color: string) => {
    const colors = [...gradient.colors];
    colors[index] = color;
    updateGradient({ colors });
  };

  const addColorStop = () => {
    if (gradient.colors.length >= MAX_GRADIENT_COLORS) {
      return;
    }
    const lastColor = gradient.colors[gradient.colors.length - 1];
    updateGradient({ colors: [...gradient.colors, lastColor] });
  };

  const removeColorStop = () => {
    if (gradient.colors.length <= MIN_GRADIENT_COLORS) {
      return;
    }
    setOpenStopIndex(null);
    updateGradient({ colors: gradient.colors.slice(0, -1) });
  };

  return (
    <div className="gradient-fill-picker">
      <label className="gradient-fill-picker__toggle">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(event) => {
            setOpenStopIndex(null);
            onChange(event.target.checked ? createDefaultFillGradient() : null);
          }}
        />
        <span
          className="gradient-fill-picker__preview"
          style={getGradientPreviewStyle(isEnabled ? gradient : null)}
        />
        {t("labels.gradientFill")}
      </label>

      {isEnabled && (
        <>
          <div className="gradient-fill-picker__colors">
            {gradient.colors.map((color, index) => (
              <div
                key={index}
                className="gradient-fill-picker__color-stop"
              >
                <GradientColorStopPicker
                  color={color}
                  label={t("labels.gradientColor", { index: index + 1 })}
                  isOpen={openStopIndex === index}
                  onOpenChange={(open) =>
                    setOpenStopIndex(open ? index : null)
                  }
                  onChange={(newColor) => updateColorAt(index, newColor)}
                  elements={elements}
                  appState={appState}
                />
              </div>
            ))}
            <div className="gradient-fill-picker__add-remove">
              {gradient.colors.length < MAX_GRADIENT_COLORS && (
                <button
                  type="button"
                  className="zIndexButton"
                  title={t("labels.addGradientColor")}
                  onClick={addColorStop}
                >
                  +
                </button>
              )}
              {gradient.colors.length > MIN_GRADIENT_COLORS && (
                <button
                  type="button"
                  className="zIndexButton"
                  title={t("labels.removeGradientColor")}
                  onClick={removeColorStop}
                >
                  −
                </button>
              )}
            </div>
          </div>

          <div className="gradient-fill-picker__angle">
            <Range
              label={t("labels.gradientAngle")}
              value={gradient.angle}
              onChange={(angle) => updateGradient({ angle })}
              min={0}
              max={360}
              step={1}
              minLabel="0°"
              testId="gradient-angle"
            />
          </div>
        </>
      )}
    </div>
  );
};
