import type { ExcalidrawTableElement, TableColumn, TableRow } from "./types";

export const MIN_TABLE_ROW_HEIGHT = 24;
export const MIN_TABLE_COLUMN_WIDTH = 32;
export const MIN_TABLE_CELL_PADDING = 2;

type Box = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

type Line = Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>;

export type TableCellRef = Readonly<{
  rowId: TableRow["id"];
  colId: TableColumn["id"];
}>;

export type TableLayout = Readonly<{
  frame: Box;
  rows: readonly (TableRow & { y: number })[];
  columns: readonly (TableColumn & { x: number })[];
  cells: readonly (TableCellRef & Box & { text: string; textBox: Box })[];
  dividers: Readonly<{
    horizontal: readonly Line[];
    vertical: readonly Line[];
  }>;
}>;

const normalizeSizes = (
  sizes: readonly number[],
  targetSize: number,
  minSize: number,
): { sizes: readonly number[]; size: number } => {
  const normalizedSizes = sizes.map((size) => Math.max(minSize, size));
  const minTotal = normalizedSizes.length * minSize;
  let size = Math.max(targetSize, minTotal);
  let total = normalizedSizes.reduce((sum, itemSize) => sum + itemSize, 0);

  if (!normalizedSizes.length) {
    return { sizes: normalizedSizes, size: 0 };
  }

  let diff = size - total;
  if (diff >= 0) {
    normalizedSizes[normalizedSizes.length - 1] += diff;
  } else {
    for (
      let index = normalizedSizes.length - 1;
      index >= 0 && diff < 0;
      index--
    ) {
      const shrinkBy = Math.min(normalizedSizes[index] - minSize, -diff);
      normalizedSizes[index] -= shrinkBy;
      diff += shrinkBy;
    }
    if (diff < 0) {
      size = minTotal;
    }
  }

  total = normalizedSizes.reduce((sum, itemSize) => sum + itemSize, 0);

  return { sizes: normalizedSizes, size: Math.max(size, total) };
};

export const normalizeTableGeometry = (
  element: ExcalidrawTableElement,
): Pick<
  ExcalidrawTableElement,
  "rows" | "columns" | "width" | "height" | "cellPadding"
> => {
  const rows = normalizeSizes(
    element.rows.map((row) => row.height),
    element.height,
    MIN_TABLE_ROW_HEIGHT,
  );
  const columns = normalizeSizes(
    element.columns.map((column) => column.width),
    element.width,
    MIN_TABLE_COLUMN_WIDTH,
  );

  return {
    rows: element.rows.map((row, index) => ({
      ...row,
      height: rows.sizes[index],
    })),
    columns: element.columns.map((column, index) => ({
      ...column,
      width: columns.sizes[index],
    })),
    width: columns.size,
    height: rows.size,
    cellPadding: Math.max(MIN_TABLE_CELL_PADDING, element.cellPadding),
  };
};

const tableLayoutCache = new WeakMap<
  ExcalidrawTableElement,
  {
    version: ExcalidrawTableElement["version"];
    versionNonce: ExcalidrawTableElement["versionNonce"];
    layout: TableLayout;
  }
>();

const getCellText = (
  element: ExcalidrawTableElement,
  rowId: TableRow["id"],
  colId: TableColumn["id"],
) => {
  return (
    element.cells.find((cell) => cell.rowId === rowId && cell.colId === colId)
      ?.text || ""
  );
};

export const computeTableLayout = (
  element: ExcalidrawTableElement,
): TableLayout => {
  const cached = tableLayoutCache.get(element);
  if (
    cached &&
    cached.version === element.version &&
    cached.versionNonce === element.versionNonce
  ) {
    return cached.layout;
  }

  const normalized = normalizeTableGeometry(element);
  let currentY = 0;
  const rows = normalized.rows.map((row) => {
    const layoutRow = { ...row, y: currentY };
    currentY += row.height;
    return layoutRow;
  });

  let currentX = 0;
  const columns = normalized.columns.map((column) => {
    const layoutColumn = { ...column, x: currentX };
    currentX += column.width;
    return layoutColumn;
  });

  const cells = rows.flatMap((row) =>
    columns.map((column) => {
      const textBox = {
        x: column.x + normalized.cellPadding,
        y: row.y + normalized.cellPadding,
        width: Math.max(0, column.width - normalized.cellPadding * 2),
        height: Math.max(0, row.height - normalized.cellPadding * 2),
      };

      return {
        rowId: row.id,
        colId: column.id,
        x: column.x,
        y: row.y,
        width: column.width,
        height: row.height,
        text: getCellText(element, row.id, column.id),
        textBox,
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

  const layout: TableLayout = {
    frame: {
      x: 0,
      y: 0,
      width: normalized.width,
      height: normalized.height,
    },
    rows,
    columns,
    cells,
    dividers: { horizontal, vertical },
  };

  tableLayoutCache.set(element, {
    version: element.version,
    versionNonce: element.versionNonce,
    layout,
  });

  return layout;
};

export const getCellAtPoint = (
  _element: ExcalidrawTableElement,
  layout: TableLayout,
  point: { x: number; y: number },
): TableCellRef | null => {
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x > layout.frame.width ||
    point.y > layout.frame.height
  ) {
    return null;
  }

  const cell = layout.cells.find((candidate) => {
    const isLastColumn = candidate.x + candidate.width === layout.frame.width;
    const isLastRow = candidate.y + candidate.height === layout.frame.height;

    return (
      point.x >= candidate.x &&
      (point.x < candidate.x + candidate.width ||
        (isLastColumn && point.x === layout.frame.width)) &&
      point.y >= candidate.y &&
      (point.y < candidate.y + candidate.height ||
        (isLastRow && point.y === layout.frame.height))
    );
  });

  return cell ? { rowId: cell.rowId, colId: cell.colId } : null;
};
