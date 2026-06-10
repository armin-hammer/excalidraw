import {
  KEYS,
  THEME,
  applyDarkModeFilter,
  getFontFamilyString,
  getFontString,
  getLineHeight,
  isTestEnv,
} from "@excalidraw/common";
import { pointFrom, pointRotateRads } from "@excalidraw/math";

import { computeTableLayout } from "@excalidraw/element";

import type {
  ExcalidrawTableElement,
  TableCell,
} from "@excalidraw/element/types";

import type App from "../components/App";
import type { AppState } from "../types";

type SubmitHandler = () => void;

const getTransform = (
  width: number,
  height: number,
  angle: number,
  appState: AppState,
) => {
  const { zoom } = appState;
  const degree = (180 * angle) / Math.PI;
  const translateX = (width * (zoom.value - 1)) / 2;
  const translateY = (height * (zoom.value - 1)) / 2;

  return `translate(${translateX}px, ${translateY}px) scale(${zoom.value}) rotate(${degree}deg)`;
};

export const tableWysiwyg = ({
  id,
  cell,
  onChange,
  onSubmit,
  getViewportCoords,
  canvas,
  excalidrawContainer,
  app,
}: {
  id: ExcalidrawTableElement["id"];
  cell: Pick<TableCell, "rowId" | "colId">;
  onChange?: (text: string) => void;
  onSubmit: (data: { viaKeyboard: boolean; text: string }) => void;
  getViewportCoords: (x: number, y: number) => [number, number];
  canvas: HTMLCanvasElement;
  excalidrawContainer: HTMLDivElement | null;
  app: App;
}): SubmitHandler => {
  const editable = document.createElement("textarea");
  editable.dir = "auto";
  editable.tabIndex = 0;
  editable.dataset.type = "wysiwyg";
  editable.wrap = "soft";
  editable.classList.add("excalidraw-wysiwyg");

  const updateWysiwygStyle = () => {
    const element = app.scene.getElement<ExcalidrawTableElement>(id);
    if (!element || element.type !== "table") {
      return;
    }

    const layoutCell = computeTableLayout(element).cells.find(
      (layoutCell) =>
        layoutCell.rowId === cell.rowId && layoutCell.colId === cell.colId,
    );

    if (!layoutCell) {
      return;
    }

    const elementCenter = pointFrom(
      element.x + element.width / 2,
      element.y + element.height / 2,
    );
    const cellCenter = pointRotateRads(
      pointFrom(
        element.x + layoutCell.textBox.x + layoutCell.textBox.width / 2,
        element.y + layoutCell.textBox.y + layoutCell.textBox.height / 2,
      ),
      elementCenter,
      element.angle,
    );
    const [viewportCenterX, viewportCenterY] = getViewportCoords(
      cellCenter[0],
      cellCenter[1],
    );
    const { zoom } = app.state;

    Object.assign(editable.style, {
      font: getFontString({
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
      }),
      fontFamily: getFontFamilyString({ fontFamily: element.fontFamily }),
      lineHeight: getLineHeight(element.fontFamily),
      width: `${layoutCell.textBox.width}px`,
      height: `${layoutCell.textBox.height}px`,
      left: `${
        viewportCenterX - (layoutCell.textBox.width * zoom.value) / 2
      }px`,
      top: `${
        viewportCenterY - (layoutCell.textBox.height * zoom.value) / 2
      }px`,
      transform: getTransform(
        layoutCell.textBox.width,
        layoutCell.textBox.height,
        element.angle,
        app.state,
      ),
      textAlign: element.textAlign,
      color:
        app.state.theme === THEME.DARK
          ? applyDarkModeFilter(element.textColor)
          : element.textColor,
      opacity: element.opacity / 100,
    });

    if (isTestEnv()) {
      editable.style.fontFamily = getFontFamilyString({
        fontFamily: element.fontFamily,
      });
    }
  };

  Object.assign(editable.style, {
    position: "absolute",
    display: "inline-block",
    minHeight: "1em",
    backfaceVisibility: "hidden",
    margin: 0,
    padding: 0,
    border: 0,
    outline: 0,
    resize: "none",
    background: "transparent",
    overflow: "hidden",
    zIndex: "var(--zIndex-wysiwyg)",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    boxSizing: "content-box",
  });

  const initialElement = app.scene.getElement<ExcalidrawTableElement>(id);
  const initialCell =
    initialElement?.type === "table"
      ? computeTableLayout(initialElement).cells.find(
          (layoutCell) =>
            layoutCell.rowId === cell.rowId && layoutCell.colId === cell.colId,
        )
      : null;
  editable.value = initialCell?.text || "";
  updateWysiwygStyle();

  const cleanup = () => {
    editable.onblur = null;
    editable.oninput = null;
    editable.onkeydown = null;
    editable.onpointerdown = null;
    window.removeEventListener("resize", updateWysiwygStyle);
    editable.remove();
  };

  let submitted = false;
  const submit = (viaKeyboard = false) => {
    if (submitted) {
      return;
    }
    submitted = true;
    cleanup();
    onSubmit({ viaKeyboard, text: editable.value });
  };

  editable.oninput = () => {
    onChange?.(editable.value);
  };

  editable.onkeydown = (event) => {
    if (
      event.key === KEYS.ESCAPE ||
      ((event[KEYS.CTRL_OR_CMD] || event.shiftKey) && event.key === KEYS.ENTER)
    ) {
      event.preventDefault();
      submit(true);
    }
  };

  editable.onblur = () => submit(false);
  editable.onpointerdown = (event) => event.stopPropagation();
  window.addEventListener("resize", updateWysiwygStyle);

  excalidrawContainer
    ?.querySelector(".excalidraw-textEditorContainer")
    ?.appendChild(editable);

  editable.select();
  canvas.focus();

  return () => submit(false);
};
