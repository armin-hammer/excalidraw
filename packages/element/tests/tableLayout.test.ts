import { pointFrom, type GlobalPoint } from "@excalidraw/math";

import { newTableElement } from "../src/newElement";
import {
  computeTableLayout,
  getCellAtPoint,
  normalizeTableGeometry,
} from "../src/tableLayout";

describe("table layout", () => {
  it("computes stable bounds and divider positions", () => {
    const table = newTableElement({
      x: 10,
      y: 20,
      rows: 3,
      cols: 3,
      rowHeights: [30, 40, 50],
      columnWidths: [80, 100, 120],
    });

    const layout = computeTableLayout(table);

    expect(layout.frame).toEqual({ x: 0, y: 0, width: 300, height: 120 });
    expect(layout.rows.map(({ y, height }) => ({ y, height }))).toEqual([
      { y: 0, height: 30 },
      { y: 30, height: 40 },
      { y: 70, height: 50 },
    ]);
    expect(layout.columns.map(({ x, width }) => ({ x, width }))).toEqual([
      { x: 0, width: 80 },
      { x: 80, width: 100 },
      { x: 180, width: 120 },
    ]);
    expect(computeTableLayout(table)).toBe(layout);
  });

  it("finds cells from scene points", () => {
    const table = newTableElement({ x: 10, y: 20, rows: 2, cols: 2 });
    const layout = computeTableLayout(table);
    const cell = getCellAtPoint(table, layout, pointFrom<GlobalPoint>(140, 45));

    expect(cell).toEqual({
      rowId: table.rows[0].id,
      colId: table.columns[1].id,
    });
    expect(
      getCellAtPoint(table, layout, pointFrom<GlobalPoint>(500, 500)),
    ).toBeNull();
  });

  it("normalizes rows and columns to match the element frame", () => {
    const table = newTableElement({
      x: 0,
      y: 0,
      rows: 1,
      cols: 2,
      width: 333,
      columnWidths: [100, 100],
    });

    const normalized = normalizeTableGeometry(table);

    expect(normalized.width).toBe(333);
    expect(
      normalized.columns.reduce((sum, column) => sum + column.width, 0),
    ).toBe(333);
  });
});
