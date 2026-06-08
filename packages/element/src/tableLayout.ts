import {
  DEFAULT_TABLE_CELL_PADDING,
  DEFAULT_TABLE_COL_WIDTH,
  DEFAULT_TABLE_ROW_HEIGHT,
  MIN_TABLE_CELL_PADDING,
  MIN_TABLE_COL_WIDTH,
  MIN_TABLE_ROW_HEIGHT,
} from "@excalidraw/common";

import type { LocalPoint } from "@excalidraw/math";

import type {
  ExcalidrawTableElement,
  TableCell,
  TableColumn,
  TableRow,
} from "./types";

/**
 * V1 open-question defaults (FED-102):
 * - Outer resize adjusts last row/column, not proportional scaling.
 * - Auto row-height runs on commit only, not per keystroke.
 * - Cell editing reuses textWysiwyg (wired in FED-94).
 * - Older clients skip unknown types; tables render read-only when supported.
 * - headerColumn is in schema; UI deferred.
 * - Styling is table-level + header-scoped only; no per-cell styles in V1.
 */

export type TableBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TableLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type CellRef = {
  rowId: string;
  colId: string;
};

export type TableLayout = {
  frame: TableBox;
  rows: readonly { id: string; y: number; height: number }[];
  columns: readonly { id: string; x: number; width: number }[];
  cells: readonly {
    rowId: string;
    colId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    textBox: TableBox;
  }[];
  dividers: {
    horizontal: readonly TableLine[];
    vertical: readonly TableLine[];
  };
};

const clampRowHeights = (
  rows: readonly TableRow[],
  frameHeight: number,
): TableRow[] => {
  if (rows.length === 0) {
    return rows as TableRow[];
  }

  const clamped = rows.map((row) => ({
    ...row,
    height: Math.max(MIN_TABLE_ROW_HEIGHT, row.height),
  }));

  const sum = clamped.reduce((acc, row) => acc + row.height, 0);
  const lastIndex = clamped.length - 1;
  const adjustedLastHeight = clamped[lastIndex].height + (frameHeight - sum);

  return clamped.map((row, index) =>
    index === lastIndex
      ? { ...row, height: Math.max(MIN_TABLE_ROW_HEIGHT, adjustedLastHeight) }
      : row,
  );
};

const clampColumnWidths = (
  columns: readonly TableColumn[],
  frameWidth: number,
): TableColumn[] => {
  if (columns.length === 0) {
    return columns as TableColumn[];
  }

  const clamped = columns.map((column) => ({
    ...column,
    width: Math.max(MIN_TABLE_COL_WIDTH, column.width),
  }));

  const sum = clamped.reduce((acc, column) => acc + column.width, 0);
  const lastIndex = clamped.length - 1;
  const adjustedLastWidth = clamped[lastIndex].width + (frameWidth - sum);

  return clamped.map((column, index) =>
    index === lastIndex
      ? { ...column, width: Math.max(MIN_TABLE_COL_WIDTH, adjustedLastWidth) }
      : column,
  );
};

export const normalizeTableGeometry = (
  element: ExcalidrawTableElement,
): ExcalidrawTableElement => {
  const cellPadding = Math.max(
    MIN_TABLE_CELL_PADDING,
    element.cellPadding ?? DEFAULT_TABLE_CELL_PADDING,
  );

  const rows = clampRowHeights(element.rows, element.height);
  const columns = clampColumnWidths(element.columns, element.width);

  return {
    ...element,
    cellPadding,
    rows,
    columns,
  };
};

export const computeTableLayout = (
  element: ExcalidrawTableElement,
): TableLayout => {
  const normalized = normalizeTableGeometry(element);
  const padding = normalized.cellPadding;

  const frame: TableBox = {
    x: 0,
    y: 0,
    width: normalized.width,
    height: normalized.height,
  };

  const rows: Array<{ id: string; y: number; height: number }> = [];
  let rowY = 0;
  for (const row of normalized.rows) {
    rows.push({ id: row.id, y: rowY, height: row.height });
    rowY += row.height;
  }

  const columns: Array<{ id: string; x: number; width: number }> = [];
  let colX = 0;
  for (const column of normalized.columns) {
    columns.push({ id: column.id, x: colX, width: column.width });
    colX += column.width;
  }

  const cellTextMap = new Map<string, TableCell>();
  for (const cell of normalized.cells) {
    cellTextMap.set(`${cell.rowId}:${cell.colId}`, cell);
  }

  const cells: Array<TableLayout["cells"][number]> = [];
  for (const row of rows) {
    for (const column of columns) {
      const x = column.x;
      const y = row.y;
      const width = column.width;
      const height = row.height;
      cells.push({
        rowId: row.id,
        colId: column.id,
        x,
        y,
        width,
        height,
        textBox: {
          x: x + padding,
          y: y + padding,
          width: Math.max(0, width - padding * 2),
          height: Math.max(0, height - padding * 2),
        },
      });
    }
  }

  const horizontal: TableLine[] = [];
  const vertical: TableLine[] = [];

  let dividerY = 0;
  for (let i = 0; i <= rows.length; i++) {
    horizontal.push({
      x1: 0,
      y1: dividerY,
      x2: frame.width,
      y2: dividerY,
    });
    if (i < rows.length) {
      dividerY += rows[i].height;
    }
  }

  let dividerX = 0;
  for (let i = 0; i <= columns.length; i++) {
    vertical.push({
      x1: dividerX,
      y1: 0,
      x2: dividerX,
      y2: frame.height,
    });
    if (i < columns.length) {
      dividerX += columns[i].width;
    }
  }

  return {
    frame,
    rows,
    columns,
    cells,
    dividers: { horizontal, vertical },
  };
};

export const getCellAtPoint = (
  element: ExcalidrawTableElement,
  layout: TableLayout,
  point: LocalPoint,
): CellRef | null => {
  const [px, py] = point;

  if (px < 0 || py < 0 || px > layout.frame.width || py > layout.frame.height) {
    return null;
  }

  const row = layout.rows.find(
    (entry) => py >= entry.y && py < entry.y + entry.height,
  );
  const column = layout.columns.find(
    (entry) => px >= entry.x && px < entry.x + entry.width,
  );

  if (!row || !column) {
    return null;
  }

  return { rowId: row.id, colId: column.id };
};

class TableLayoutCache {
  private static cache = new WeakMap<
    ExcalidrawTableElement,
    {
      layout: TableLayout;
      version: number;
      versionNonce: number;
    }
  >();

  static get(element: ExcalidrawTableElement): TableLayout {
    const cached = TableLayoutCache.cache.get(element);
    if (
      cached &&
      cached.version === element.version &&
      cached.versionNonce === element.versionNonce
    ) {
      return cached.layout;
    }

    const layout = computeTableLayout(element);
    TableLayoutCache.cache.set(element, {
      layout,
      version: element.version,
      versionNonce: element.versionNonce,
    });
    return layout;
  }

  static delete(element: ExcalidrawTableElement) {
    TableLayoutCache.cache.delete(element);
  }
}

export const getTableLayout = (element: ExcalidrawTableElement): TableLayout =>
  TableLayoutCache.get(element);

export const createDefaultTableRows = (
  count: number,
  rowHeight: number = DEFAULT_TABLE_ROW_HEIGHT,
): TableRow[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    height: rowHeight,
  }));

export const createDefaultTableColumns = (
  count: number,
  colWidth: number = DEFAULT_TABLE_COL_WIDTH,
): TableColumn[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `col-${index}`,
    width: colWidth,
  }));
