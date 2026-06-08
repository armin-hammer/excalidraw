import {
  getFontString,
  getLineHeight,
  MIN_TABLE_COL_WIDTH,
  MIN_TABLE_ROW_HEIGHT,
  randomId,
} from "@excalidraw/common";

import { pointFrom, type LocalPoint } from "@excalidraw/math";

import { newTextElement } from "./newElement";
import {
  getLineHeightInPx,
  measureText,
  normalizeText,
} from "./textMeasurements";
import { getTableLayout } from "./tableLayout";

import type {
  ExcalidrawTableElement,
  ExcalidrawTextElement,
  TableCell,
} from "./types";

export type TableCellRef = {
  rowId: string;
  colId: string;
};

export const getTableCellText = (
  element: ExcalidrawTableElement,
  cellRef: TableCellRef,
): string => {
  const cell = element.cells.find(
    (entry) => entry.rowId === cellRef.rowId && entry.colId === cellRef.colId,
  );
  return cell?.text ?? "";
};

export const setTableCellText = (
  element: ExcalidrawTableElement,
  cellRef: TableCellRef,
  text: string,
): ExcalidrawTableElement => {
  const existingIndex = element.cells.findIndex(
    (entry) => entry.rowId === cellRef.rowId && entry.colId === cellRef.colId,
  );

  if (!text) {
    if (existingIndex === -1) {
      return element;
    }
    return {
      ...element,
      cells: element.cells.filter((_, index) => index !== existingIndex),
    };
  }

  const nextCell: TableCell = {
    rowId: cellRef.rowId,
    colId: cellRef.colId,
    text,
  };

  if (existingIndex === -1) {
    return {
      ...element,
      cells: [...element.cells, nextCell],
    };
  }

  const cells = [...element.cells];
  cells[existingIndex] = nextCell;
  return {
    ...element,
    cells,
  };
};

export const resizeTableElementDimensions = (
  element: ExcalidrawTableElement,
  nextWidth: number,
  nextHeight: number,
): Pick<ExcalidrawTableElement, "width" | "height" | "rows" | "columns"> => {
  const rows = element.rows.map((row, index, array) => {
    if (index !== array.length - 1) {
      return row;
    }
    const otherHeight = array
      .slice(0, -1)
      .reduce((sum, entry) => sum + entry.height, 0);
    return {
      ...row,
      height: Math.max(MIN_TABLE_ROW_HEIGHT, nextHeight - otherHeight),
    };
  });

  const columns = element.columns.map((column, index, array) => {
    if (index !== array.length - 1) {
      return column;
    }
    const otherWidth = array
      .slice(0, -1)
      .reduce((sum, entry) => sum + entry.width, 0);
    return {
      ...column,
      width: Math.max(MIN_TABLE_COL_WIDTH, nextWidth - otherWidth),
    };
  });

  return {
    width: nextWidth,
    height: nextHeight,
    rows,
    columns,
  };
};

export const createTableCellTextElement = (
  table: ExcalidrawTableElement,
  cellRef: TableCellRef,
): ExcalidrawTextElement => {
  const layout = getTableLayout(table);
  const cellLayout = layout.cells.find(
    (cell) => cell.rowId === cellRef.rowId && cell.colId === cellRef.colId,
  );

  if (!cellLayout) {
    throw new Error("Table cell not found");
  }

  const text = getTableCellText(table, cellRef);
  const normalizedText = normalizeText(text);
  const lineHeight = getLineHeight(table.fontFamily);
  const fontString = getFontString({
    fontFamily: table.fontFamily,
    fontSize: table.fontSize,
  });
  const metrics = measureText(normalizedText, fontString, lineHeight);

  const width = Math.max(cellLayout.textBox.width, metrics.width);
  const height = Math.max(
    cellLayout.textBox.height,
    metrics.height || getLineHeightInPx(table.fontSize, lineHeight),
  );

  let x = table.x + cellLayout.textBox.x;
  let y = table.y + cellLayout.textBox.y;

  if (table.textAlign === "center") {
    x += (cellLayout.textBox.width - width) / 2;
  } else if (table.textAlign === "right") {
    x += cellLayout.textBox.width - width;
  }

  if (table.verticalAlign === "middle") {
    y += (cellLayout.textBox.height - height) / 2;
  } else if (table.verticalAlign === "bottom") {
    y += cellLayout.textBox.height - height;
  }

  const textElement = newTextElement({
    x,
    y,
    width,
    height,
    text: normalizedText,
    originalText: normalizedText,
    fontFamily: table.fontFamily,
    fontSize: table.fontSize,
    textAlign: table.textAlign,
    verticalAlign: table.verticalAlign,
    strokeColor: table.textColor,
    lineHeight,
    autoResize: false,
    angle: table.angle,
    opacity: table.opacity,
    frameId: table.frameId,
  });

  return {
    ...textElement,
    id: randomId(),
  };
};

export const scenePointToTableLocalPoint = (
  table: ExcalidrawTableElement,
  sceneX: number,
  sceneY: number,
): LocalPoint => {
  return pointFrom<LocalPoint>(sceneX - table.x, sceneY - table.y);
};
