import { describe, expect, it } from "vitest";

import { pointFrom, type LocalPoint } from "@excalidraw/math";

import { getElementBounds } from "../src/bounds";
import { newTableElement } from "../src/newElement";
import {
  computeTableLayout,
  createDefaultTableColumns,
  createDefaultTableRows,
  getCellAtPoint,
  getTableLayout,
  normalizeTableGeometry,
} from "../src/tableLayout";

import type { ExcalidrawTableElement } from "../src/types";

const createFixtureTable = (
  overrides: Partial<ExcalidrawTableElement> = {},
): ExcalidrawTableElement => {
  const rows = createDefaultTableRows(3, 40);
  const columns = createDefaultTableColumns(3, 120);
  return {
    ...newTableElement({ x: 10, y: 20, rows, cols: columns }),
    ...overrides,
    rows: overrides.rows ?? rows,
    columns: overrides.columns ?? columns,
  };
};

describe("tableLayout", () => {
  it("computes stable layout for a 3x3 fixture table", () => {
    const element = createFixtureTable();
    const layout1 = computeTableLayout(element);
    const layout2 = computeTableLayout(element);

    expect(JSON.stringify(layout1)).toBe(JSON.stringify(layout2));
    expect(layout1.frame).toEqual({ x: 0, y: 0, width: 360, height: 120 });
    expect(layout1.rows).toHaveLength(3);
    expect(layout1.columns).toHaveLength(3);
    expect(layout1.cells).toHaveLength(9);
  });

  it("keeps column widths summing to frame width", () => {
    const element = createFixtureTable({
      columns: [
        { id: "c1", width: 50 },
        { id: "c2", width: 80 },
        { id: "c3", width: 130 },
      ],
      width: 260,
      height: 120,
    });
    const layout = computeTableLayout(element);
    const widthSum = layout.columns.reduce((sum, col) => sum + col.width, 0);
    expect(widthSum).toBeCloseTo(layout.frame.width, 0);
  });

  it("getCellAtPoint returns correct cell or null", () => {
    const element = createFixtureTable();
    const layout = computeTableLayout(element);

    const firstCell = getCellAtPoint(
      element,
      layout,
      pointFrom<LocalPoint>(10, 10),
    );
    expect(firstCell).toEqual({
      rowId: layout.rows[0].id,
      colId: layout.columns[0].id,
    });

    const secondColumn = getCellAtPoint(
      element,
      layout,
      pointFrom<LocalPoint>(130, 10),
    );
    expect(secondColumn?.colId).toBe(layout.columns[1].id);

    expect(
      getCellAtPoint(element, layout, pointFrom<LocalPoint>(-1, 10)),
    ).toBeNull();
    expect(
      getCellAtPoint(element, layout, pointFrom<LocalPoint>(400, 10)),
    ).toBeNull();
  });

  it("layout cache invalidates when version changes", () => {
    const element = createFixtureTable();
    const layoutBefore = getTableLayout(element);

    const updated = {
      ...element,
      version: element.version + 1,
      versionNonce: element.versionNonce + 1,
      rows: [...element.rows, { id: "row-new", height: 40 }],
      height: element.height + 40,
    };

    const layoutAfter = getTableLayout(updated);
    expect(layoutAfter.rows).toHaveLength(4);
    expect(layoutAfter.rows.length).not.toBe(layoutBefore.rows.length);
  });

  it("normalizeTableGeometry adjusts the last row to match frame height", () => {
    const element = createFixtureTable({
      rows: [
        { id: "r1", height: 30 },
        { id: "r2", height: 30 },
        { id: "r3", height: 30 },
      ],
      height: 100,
    });

    const normalized = normalizeTableGeometry(element);
    const heightSum = normalized.rows.reduce((sum, row) => sum + row.height, 0);
    expect(heightSum).toBe(normalized.height);
  });

  it("getElementBounds returns stable AABB for table elements", () => {
    const element = createFixtureTable({ x: 50, y: 75 });
    const elementsMap = new Map([[element.id, element]]);
    const bounds = getElementBounds(element, elementsMap);

    expect(bounds[0]).toBe(50);
    expect(bounds[1]).toBe(75);
    expect(bounds[2]).toBe(50 + element.width);
    expect(bounds[3]).toBe(75 + element.height);
  });

  it("handles 1x1 and elongated tables", () => {
    const oneByOne = createFixtureTable({
      rows: [{ id: "r1", height: 40 }],
      columns: [{ id: "c1", width: 120 }],
      width: 120,
      height: 40,
    });
    expect(computeTableLayout(oneByOne).cells).toHaveLength(1);

    const oneByTen = createFixtureTable({
      rows: [{ id: "r1", height: 400 }],
      columns: createDefaultTableColumns(10, 40),
      width: 400,
      height: 400,
    });
    expect(computeTableLayout(oneByTen).cells).toHaveLength(10);

    const tenByOne = createFixtureTable({
      rows: createDefaultTableRows(10, 40),
      columns: [{ id: "c1", width: 120 }],
      width: 120,
      height: 400,
    });
    expect(computeTableLayout(tenByOne).cells).toHaveLength(10);
  });
});
