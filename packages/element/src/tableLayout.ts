import {
  MIN_TABLE_COLUMN_WIDTH,
  MIN_TABLE_ROW_HEIGHT,
} from "@excalidraw/common";

import type {
  ExcalidrawTableElement,
  TableCell,
  TableColumn,
  TableRow,
} from "./types";

export type TableCellBounds = Readonly<{
  rowId: TableRow["id"];
  colId: TableColumn["id"];
  x: number;
  y: number;
  width: number;
  height: number;
  textBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
}>;

export type TableLayout = Readonly<{
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rows: readonly (TableRow & { y: number })[];
  columns: readonly (TableColumn & { x: number })[];
  cells: readonly TableCellBounds[];
  rowDividers: readonly number[];
  columnDividers: readonly number[];
}>;

const normalizeSizes = (
  sizes: readonly number[],
  total: number,
  minSize: number,
): readonly number[] => {
  if (!sizes.length) {
    return [Math.max(total, minSize)];
  }

  const normalized = sizes.map((size) => Math.max(size || 0, minSize));
  const currentTotal = normalized.reduce((sum, size) => sum + size, 0);
  const delta = total - currentTotal;
  const lastIndex = normalized.length - 1;

  normalized[lastIndex] = Math.max(minSize, normalized[lastIndex] + delta);

  return normalized;
};

const getCellText = (
  cells: readonly TableCell[],
  rowId: string,
  colId: string,
) =>
  cells.find((cell) => cell.rowId === rowId && cell.colId === colId)?.text ||
  "";

export const computeTableLayout = (
  element: ExcalidrawTableElement,
): TableLayout => {
  const rowHeights = normalizeSizes(
    element.rows.map((row) => row.height),
    element.height,
    MIN_TABLE_ROW_HEIGHT,
  );
  const columnWidths = normalizeSizes(
    element.columns.map((column) => column.width),
    element.width,
    MIN_TABLE_COLUMN_WIDTH,
  );

  let rowY = 0;
  const rows = element.rows.map((row, index) => {
    const layoutRow = { ...row, height: rowHeights[index], y: rowY };
    rowY += layoutRow.height;
    return layoutRow;
  });

  let columnX = 0;
  const columns = element.columns.map((column, index) => {
    const layoutColumn = {
      ...column,
      width: columnWidths[index],
      x: columnX,
    };
    columnX += layoutColumn.width;
    return layoutColumn;
  });

  const cells = rows.flatMap((row) =>
    columns.map((column) => {
      const padding = Math.min(
        element.cellPadding,
        Math.max(0, column.width / 2),
        Math.max(0, row.height / 2),
      );
      return {
        rowId: row.id,
        colId: column.id,
        x: column.x,
        y: row.y,
        width: column.width,
        height: row.height,
        textBox: {
          x: column.x + padding,
          y: row.y + padding,
          width: Math.max(0, column.width - padding * 2),
          height: Math.max(0, row.height - padding * 2),
        },
        text: getCellText(element.cells, row.id, column.id),
      };
    }),
  );

  return {
    frame: {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
    },
    rows,
    columns,
    cells,
    rowDividers: rows.slice(0, -1).map((row) => row.y + row.height),
    columnDividers: columns
      .slice(0, -1)
      .map((column) => column.x + column.width),
  };
};

export const getCellAtPoint = (
  element: ExcalidrawTableElement,
  point: { x: number; y: number },
): Pick<TableCellBounds, "rowId" | "colId"> | null => {
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x > element.width ||
    point.y > element.height
  ) {
    return null;
  }

  const cell = computeTableLayout(element).cells.find(
    (cell) =>
      point.x >= cell.x &&
      point.x <= cell.x + cell.width &&
      point.y >= cell.y &&
      point.y <= cell.y + cell.height,
  );

  return cell ? { rowId: cell.rowId, colId: cell.colId } : null;
};
