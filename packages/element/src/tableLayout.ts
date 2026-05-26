import {
  MIN_TABLE_COLUMN_WIDTH,
  MIN_TABLE_ROW_HEIGHT,
  getLineHeight,
} from "@excalidraw/common";

import {
  type GlobalPoint,
  pointFrom,
  pointRotateRads,
  type Radians,
} from "@excalidraw/math";

import type {
  ExcalidrawTableElement,
  TableCell,
  TableColumn,
  TableRow,
} from "./types";

export type TableCellRef = {
  rowId: string;
  colId: string;
};

export type TableBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TableLayout = {
  frame: TableBox;
  rows: readonly (TableRow & { y: number })[];
  columns: readonly (TableColumn & { x: number })[];
  cells: readonly (TableCellRef & {
    x: number;
    y: number;
    width: number;
    height: number;
    textBox: TableBox;
    text: string;
  })[];
  dividers: {
    horizontal: readonly { x1: number; y1: number; x2: number; y2: number }[];
    vertical: readonly { x1: number; y1: number; x2: number; y2: number }[];
  };
};

const layoutCache = new WeakMap<
  ExcalidrawTableElement,
  {
    key: string;
    layout: TableLayout;
  }
>();

const clampSize = (size: number, min: number) =>
  Number.isFinite(size) && size > min ? size : min;

const normalizeSizes = (
  sizes: readonly number[],
  targetSize: number,
  minSize: number,
) => {
  const clamped = sizes.map((size) => clampSize(size, minSize));
  const minimumTotal = minSize * clamped.length;
  const normalizedTarget = Math.max(
    Number.isFinite(targetSize) && targetSize > 0
      ? Math.abs(targetSize)
      : clamped.reduce((sum, size) => sum + size, 0),
    minimumTotal,
  );
  const currentTotal = clamped.reduce((sum, size) => sum + size, 0);
  const scale = currentTotal > 0 ? normalizedTarget / currentTotal : 1;
  const scaled = clamped.map((size) => Math.max(minSize, size * scale));
  const scaledTotal = scaled.reduce((sum, size) => sum + size, 0);
  scaled[scaled.length - 1] += normalizedTarget - scaledTotal;
  return scaled;
};

export const normalizeTableGeometry = (
  element: ExcalidrawTableElement,
): Pick<ExcalidrawTableElement, "rows" | "columns" | "width" | "height"> => {
  const columnWidths = normalizeSizes(
    element.columns.map((column) => column.width),
    element.width,
    MIN_TABLE_COLUMN_WIDTH,
  );
  const rowHeights = normalizeSizes(
    element.rows.map((row) => row.height),
    element.height,
    MIN_TABLE_ROW_HEIGHT,
  );

  return {
    rows: element.rows.map((row, index) => ({
      ...row,
      height: rowHeights[index],
    })),
    columns: element.columns.map((column, index) => ({
      ...column,
      width: columnWidths[index],
    })),
    width: columnWidths.reduce((sum, width) => sum + width, 0),
    height: rowHeights.reduce((sum, height) => sum + height, 0),
  };
};

const getCellText = (
  cells: readonly TableCell[],
  rowId: string,
  colId: string,
) =>
  cells.find((cell) => cell.rowId === rowId && cell.colId === colId)?.text ??
  "";

export const computeTableLayout = (
  element: ExcalidrawTableElement,
): TableLayout => {
  const key = `${element.version}:${element.versionNonce}`;
  const cached = layoutCache.get(element);
  if (cached?.key === key) {
    return cached.layout;
  }

  const normalized = normalizeTableGeometry(element);
  let y = 0;
  const rows = normalized.rows.map((row) => {
    const positionedRow = { ...row, y };
    y += row.height;
    return positionedRow;
  });
  let x = 0;
  const columns = normalized.columns.map((column) => {
    const positionedColumn = { ...column, x };
    x += column.width;
    return positionedColumn;
  });
  const lineHeight = element.fontSize * getLineHeight(element.fontFamily);
  const padding = Math.max(0, element.cellPadding);
  const cells = rows.flatMap((row) =>
    columns.map((column) => {
      const textBoxHeight = Math.max(0, row.height - padding * 2);
      return {
        rowId: row.id,
        colId: column.id,
        x: column.x,
        y: row.y,
        width: column.width,
        height: row.height,
        textBox: {
          x: column.x + padding,
          y:
            row.y +
            padding +
            (element.verticalAlign === "middle"
              ? Math.max(0, (textBoxHeight - lineHeight) / 2)
              : element.verticalAlign === "bottom"
              ? Math.max(0, textBoxHeight - lineHeight)
              : 0),
          width: Math.max(0, column.width - padding * 2),
          height: textBoxHeight,
        },
        text: getCellText(element.cells, row.id, column.id),
      };
    }),
  );
  const horizontal = rows.slice(1).map((row) => ({
    x1: 0,
    y1: row.y,
    x2: normalized.width,
    y2: row.y,
  }));
  const vertical = columns.slice(1).map((column) => ({
    x1: column.x,
    y1: 0,
    x2: column.x,
    y2: normalized.height,
  }));
  const layout = {
    frame: { x: 0, y: 0, width: normalized.width, height: normalized.height },
    rows,
    columns,
    cells,
    dividers: { horizontal, vertical },
  };

  layoutCache.set(element, { key, layout });
  return layout;
};

export const getCellAtPoint = (
  element: ExcalidrawTableElement,
  layout: TableLayout,
  point: GlobalPoint,
): TableCellRef | null => {
  const center = pointFrom<GlobalPoint>(
    element.x + element.width / 2,
    element.y + element.height / 2,
  );
  const [localX, localY] =
    element.angle === 0
      ? [point[0] - element.x, point[1] - element.y]
      : pointRotateRads(point, center, -element.angle as Radians).map(
          (coord, index) => coord - (index === 0 ? element.x : element.y),
        );

  const cell = layout.cells.find(
    (cell) =>
      localX >= cell.x &&
      localX <= cell.x + cell.width &&
      localY >= cell.y &&
      localY <= cell.y + cell.height,
  );
  return cell ? { rowId: cell.rowId, colId: cell.colId } : null;
};

export const tableToTsv = (element: ExcalidrawTableElement) =>
  element.rows
    .map((row) =>
      element.columns
        .map((column) => getCellText(element.cells, row.id, column.id))
        .join("\t"),
    )
    .join("\n");
