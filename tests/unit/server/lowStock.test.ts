import { describe, expect, it } from "vitest";
import { isPantryItemLow } from "../../../shared/lowStock";

describe("isPantryItemLow", () => {
  it("is false above the threshold and true at or below it", () => {
    expect(isPantryItemLow(5, 4)).toBe(false);
    expect(isPantryItemLow(4, 4)).toBe(true);
    expect(isPantryItemLow(3, 4)).toBe(true);
  });

  it("is false when either value is unset", () => {
    expect(isPantryItemLow(null, 4)).toBe(false);
    expect(isPantryItemLow(4, null)).toBe(false);
  });
});
