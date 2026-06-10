import { arrayToMap } from "@excalidraw/common";

import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import { getElementBounds } from "../src/bounds";
import { newTableElement } from "../src/newElement";
import { computeTableLayout, getCellAtPoint } from "../src/tableLayout";
import { isTableElement } from "../src/typeChecks";

describe("table elements", () => {
  it("initializes a stable default table schema", () => {
    const table = newTableElement({ x: 10, y: 20 });

    expect(table.type).toBe("table");
    expect(table.rows).toHaveLength(3);
    expect(table.columns).toHaveLength(3);
    expect(table.cells).toHaveLength(9);
    expect(new Set(table.rows.map((row) => row.id)).size).toBe(3);
    expect(new Set(table.columns.map((column) => column.id)).size).toBe(3);
    expect(table.width).toBe(360);
    expect(table.height).toBe(144);
  });

  it("normalizes layout to the element frame", () => {
    const table = newTableElement({
      x: 0,
      y: 0,
      width: 360,
      height: 120,
      rows: [
        { id: "r1", height: 40 },
        { id: "r2", height: 40 },
      ],
      columns: [
        { id: "c1", width: 100 },
        { id: "c2", width: 100 },
      ],
    });

    const layout = computeTableLayout(table);

    expect(layout.columns.map((column) => column.width)).toEqual([100, 260]);
    expect(layout.rows.map((row) => row.height)).toEqual([40, 80]);
    expect(layout.cells[3]).toMatchObject({
      rowId: "r2",
      colId: "c2",
      x: 100,
      y: 40,
      width: 260,
      height: 80,
    });
  });

  it("finds cells from local table coordinates", () => {
    const table = newTableElement({
      x: 0,
      y: 0,
      rows: [
        { id: "r1", height: 40 },
        { id: "r2", height: 40 },
      ],
      columns: [
        { id: "c1", width: 50 },
        { id: "c2", width: 50 },
      ],
    });

    expect(getCellAtPoint(table, { x: 75, y: 50 })).toEqual({
      rowId: "r2",
      colId: "c2",
    });
    expect(getCellAtPoint(table, { x: 101, y: 50 })).toBeNull();
  });

  it("participates in API creation and bounds", () => {
    const table = API.createElement({
      type: "table",
      x: 20,
      y: 30,
      width: 300,
      height: 120,
    });

    expect(isTableElement(table)).toBe(true);
    expect(getElementBounds(table, arrayToMap([table]))).toEqual([
      20, 30, 320, 150,
    ]);
  });
});
