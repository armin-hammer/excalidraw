import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import { newTableElement } from "../src/newElement";
import {
  hasBoundTextElement,
  isBindableElement,
  isExcalidrawElement,
  isRectanguloidElement,
  isTableElement,
} from "../src/typeChecks";

describe("Test TypeChecks", () => {
  describe("Test table element guards", () => {
    it("should identify tables as Excalidraw table elements", () => {
      const table = newTableElement({ x: 0, y: 0 });

      expect(isTableElement(table)).toBeTruthy();
      expect(isExcalidrawElement(table)).toBeTruthy();
      expect(isBindableElement(table)).toBeTruthy();
      expect(isRectanguloidElement(table)).toBeTruthy();
    });
  });

  describe("Test hasBoundTextElement", () => {
    it("should return true for text bindable containers with bound text", () => {
      expect(
        hasBoundTextElement(
          API.createElement({
            type: "rectangle",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeTruthy();

      expect(
        hasBoundTextElement(
          API.createElement({
            type: "ellipse",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeTruthy();

      expect(
        hasBoundTextElement(
          API.createElement({
            type: "arrow",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeTruthy();
    });

    it("should return false for text bindable containers without bound text", () => {
      expect(
        hasBoundTextElement(
          API.createElement({
            type: "freedraw",
            boundElements: [{ type: "arrow", id: "arrow-id" }],
          }),
        ),
      ).toBeFalsy();
    });

    it("should return false for non text bindable containers", () => {
      expect(
        hasBoundTextElement(
          API.createElement({
            type: "freedraw",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeFalsy();
    });

    expect(
      hasBoundTextElement(
        API.createElement({
          type: "image",
          boundElements: [{ type: "text", id: "text-id" }],
        }),
      ),
    ).toBeFalsy();
  });
});
