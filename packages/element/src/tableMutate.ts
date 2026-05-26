import { randomId } from "@excalidraw/common";

import { normalizeTableGeometry } from "./tableLayout";

import type { ExcalidrawTableElement, TableCell } from "./types";

const emptyCell = (rowId: string, colId: string): TableCell => ({
  rowId,
  colId,
  text: "",
  rowSpan: 1,
  colSpan: 1,
  styleOverride: null,
});

const ensureCell = (
  cells: readonly TableCell[],
  rowId: string,
  colId: string,
  text = "",
): TableCell =>
  cells.find((cell) => cell.rowId === rowId && cell.colId === colId) ?? {
    ...emptyCell(rowId, colId),
    text,
  };

export const getTableCell = (
  table: ExcalidrawTableElement,
  rowId: string,
  colId: string,
) => table.cells.find((cell) => cell.rowId === rowId && cell.colId === colId);

export const mutateTableCell = (
  table: ExcalidrawTableElement,
  rowId: string,
  colId: string,
  text: string,
): Pick<ExcalidrawTableElement, "cells"> => {
  const cells = table.cells.filter(
    (cell) => cell.rowId !== rowId || cell.colId !== colId,
  );
  return {
    cells: text ? [...cells, { ...emptyCell(rowId, colId), text }] : cells,
  };
};

export const insertRow = (
  table: ExcalidrawTableElement,
  atIndex: number,
  rowId = randomId(),
): Pick<ExcalidrawTableElement, "rows" | "columns" | "cells" | "height"> => {
  const reference =
    table.rows[Math.max(0, Math.min(atIndex, table.rows.length - 1))];
  const row = { id: rowId, height: reference?.height ?? 40 };
  const rows = [
    ...table.rows.slice(0, atIndex),
    row,
    ...table.rows.slice(atIndex),
  ];
  const normalized = normalizeTableGeometry({ ...table, rows });
  return {
    ...normalized,
    cells: table.cells,
  };
};

export const deleteRow = (
  table: ExcalidrawTableElement,
  rowId: string,
): Pick<ExcalidrawTableElement, "rows" | "columns" | "cells" | "height"> => {
  if (table.rows.length <= 1) {
    return {
      rows: table.rows,
      columns: table.columns,
      cells: table.cells,
      height: table.height,
    };
  }
  const rows = table.rows.filter((row) => row.id !== rowId);
  const normalized = normalizeTableGeometry({ ...table, rows });
  return {
    ...normalized,
    cells: table.cells.filter((cell) => cell.rowId !== rowId),
  };
};

export const insertColumn = (
  table: ExcalidrawTableElement,
  atIndex: number,
  colId = randomId(),
): Pick<ExcalidrawTableElement, "rows" | "columns" | "cells" | "width"> => {
  const reference =
    table.columns[Math.max(0, Math.min(atIndex, table.columns.length - 1))];
  const column = { id: colId, width: reference?.width ?? 120 };
  const columns = [
    ...table.columns.slice(0, atIndex),
    column,
    ...table.columns.slice(atIndex),
  ];
  const normalized = normalizeTableGeometry({ ...table, columns });
  return {
    ...normalized,
    cells: table.cells,
  };
};

export const deleteColumn = (
  table: ExcalidrawTableElement,
  colId: string,
): Pick<ExcalidrawTableElement, "rows" | "columns" | "cells" | "width"> => {
  if (table.columns.length <= 1) {
    return {
      rows: table.rows,
      columns: table.columns,
      cells: table.cells,
      width: table.width,
    };
  }
  const columns = table.columns.filter((column) => column.id !== colId);
  const normalized = normalizeTableGeometry({ ...table, columns });
  return {
    ...normalized,
    cells: table.cells.filter((cell) => cell.colId !== colId),
  };
};

export const materializeTableCells = (table: ExcalidrawTableElement) =>
  table.rows.flatMap((row) =>
    table.columns.map((column) => ensureCell(table.cells, row.id, column.id)),
  );
