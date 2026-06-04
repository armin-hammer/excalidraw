import { newElementWith } from "../src/mutateElement";
import {
  DEFAULT_TABLE_COLUMN_WIDTH,
  DEFAULT_TABLE_ROW_HEIGHT,
  newTableElement,
} from "../src/newElement";
import {
  computeTableLayout,
  getCellAtPoint,
  normalizeTableGeometry,
} from "../src/tableLayout";

describe("table layout", () => {
  it("creates stable row and column identities with derived dimensions", () => {
    const table = newTableElement({ x: 10, y: 20, rows: 3, cols: 2 });

    expect(table.type).toBe("table");
    expect(table.rows).toHaveLength(3);
    expect(table.columns).toHaveLength(2);
    expect(new Set(table.rows.map((row) => row.id)).size).toBe(3);
    expect(new Set(table.columns.map((column) => column.id)).size).toBe(2);
    expect(table.width).toBe(DEFAULT_TABLE_COLUMN_WIDTH * 2);
    expect(table.height).toBe(DEFAULT_TABLE_ROW_HEIGHT * 3);
  });

  it("computes deterministic cells and divider positions", () => {
    const table = newTableElement({
      x: 0,
      y: 0,
      rows: 2,
      cols: 2,
      cells: [{ rowId: "missing-row", colId: "missing-col", text: "ignored" }],
    });
    const firstRowId = table.rows[0].id;
    const firstColumnId = table.columns[0].id;
    const tableWithText = newElementWith(table, {
      cells: [{ rowId: firstRowId, colId: firstColumnId, text: "Alpha" }],
    });

    const layout = computeTableLayout(tableWithText);

    expect(layout.frame).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_TABLE_COLUMN_WIDTH * 2,
      height: DEFAULT_TABLE_ROW_HEIGHT * 2,
    });
    expect(layout.cells).toHaveLength(4);
    expect(layout.cells[0]).toMatchObject({
      rowId: firstRowId,
      colId: firstColumnId,
      x: 0,
      y: 0,
      width: DEFAULT_TABLE_COLUMN_WIDTH,
      height: DEFAULT_TABLE_ROW_HEIGHT,
      text: "Alpha",
    });
    expect(layout.dividers.horizontal).toEqual([
      {
        x1: 0,
        y1: DEFAULT_TABLE_ROW_HEIGHT,
        x2: DEFAULT_TABLE_COLUMN_WIDTH * 2,
        y2: DEFAULT_TABLE_ROW_HEIGHT,
      },
    ]);
    expect(layout.dividers.vertical).toEqual([
      {
        x1: DEFAULT_TABLE_COLUMN_WIDTH,
        y1: 0,
        x2: DEFAULT_TABLE_COLUMN_WIDTH,
        y2: DEFAULT_TABLE_ROW_HEIGHT * 2,
      },
    ]);
  });

  it("returns cached layout while version and nonce are unchanged", () => {
    const table = newTableElement({ x: 0, y: 0 });
    const layout = computeTableLayout(table);

    expect(computeTableLayout(table)).toBe(layout);
    expect(
      computeTableLayout(newElementWith(table, { versionNonce: 1 })),
    ).not.toBe(layout);
  });

  it("finds cells for interior and bottom-right edge points", () => {
    const table = newTableElement({ x: 0, y: 0, rows: 2, cols: 2 });
    const layout = computeTableLayout(table);

    expect(getCellAtPoint(table, layout, { x: 10, y: 10 })).toEqual({
      rowId: table.rows[0].id,
      colId: table.columns[0].id,
    });
    expect(
      getCellAtPoint(table, layout, {
        x: layout.frame.width,
        y: layout.frame.height,
      }),
    ).toEqual({
      rowId: table.rows[1].id,
      colId: table.columns[1].id,
    });
    expect(getCellAtPoint(table, layout, { x: -1, y: 10 })).toBeNull();
  });

  it("normalizes rows, columns, and padding against minimums", () => {
    const table = newTableElement({
      x: 0,
      y: 0,
      rows: [{ id: "row-a", height: 1 }],
      columns: [{ id: "col-a", width: 1 }],
      width: 1,
      height: 1,
      cellPadding: 0,
    });

    const normalized = normalizeTableGeometry(table);

    expect(normalized.rows[0].height).toBeGreaterThan(table.rows[0].height);
    expect(normalized.columns[0].width).toBeGreaterThan(table.columns[0].width);
    expect(normalized.cellPadding).toBeGreaterThan(table.cellPadding);
    expect(normalized.width).toBe(normalized.columns[0].width);
    expect(normalized.height).toBe(normalized.rows[0].height);
  });
});
