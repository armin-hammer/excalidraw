import { newTableElement } from "../src/newElement";
import {
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  mutateTableCell,
} from "../src/tableMutate";

describe("table mutations", () => {
  it("preserves cell identity across row and column inserts", () => {
    const table = newTableElement({ x: 0, y: 0, rows: 2, cols: 2 });
    const edited = {
      ...table,
      ...mutateTableCell(table, table.rows[0].id, table.columns[0].id, "A1"),
    };

    const withRow = { ...edited, ...insertRow(edited, 1, "new-row") };
    const withColumn = {
      ...withRow,
      ...insertColumn(withRow, 1, "new-column"),
    };

    expect(
      withColumn.cells.find(
        (cell) =>
          cell.rowId === table.rows[0].id && cell.colId === table.columns[0].id,
      )?.text,
    ).toBe("A1");
    expect(withColumn.rows.map((row) => row.id)).toEqual([
      table.rows[0].id,
      "new-row",
      table.rows[1].id,
    ]);
    expect(withColumn.columns.map((column) => column.id)).toEqual([
      table.columns[0].id,
      "new-column",
      table.columns[1].id,
    ]);
  });

  it("drops only cells from deleted structures", () => {
    const table = newTableElement({ x: 0, y: 0, rows: 2, cols: 2 });
    const withCells = {
      ...table,
      cells: [
        {
          rowId: table.rows[0].id,
          colId: table.columns[0].id,
          text: "keep",
          rowSpan: 1,
          colSpan: 1,
          styleOverride: null,
        },
        {
          rowId: table.rows[1].id,
          colId: table.columns[1].id,
          text: "drop",
          rowSpan: 1,
          colSpan: 1,
          styleOverride: null,
        },
      ],
    };

    const withoutRow = {
      ...withCells,
      ...deleteRow(withCells, table.rows[1].id),
    };
    const withoutColumn = {
      ...withoutRow,
      ...deleteColumn(withoutRow, table.columns[1].id),
    };

    expect(withoutColumn.cells).toHaveLength(1);
    expect(withoutColumn.cells[0].text).toBe("keep");
    expect(withoutColumn.rows).toHaveLength(1);
    expect(withoutColumn.columns).toHaveLength(1);
  });
});
