import { describe, it, expect } from "vitest";
import { computeEffectiveFlavorPrice } from "../storefront";

/**
 * Locks the single-source-of-truth pricing formula:
 *
 *   Final Price = MAX(0, Base Price − Box Discount)
 *
 * This is the contract every browser, device, and user session must observe.
 * If you find yourself changing these expectations, you are almost certainly
 * about to re-introduce the production bug where anonymous visitors saw the
 * un-discounted base price.
 */
describe("computeEffectiveFlavorPrice", () => {
  it("applies a fixed discount: base 100, discount 20 → 80", () => {
    expect(computeEffectiveFlavorPrice(100, 20)).toBe(80);
  });

  it("returns the base price when discount is 0", () => {
    expect(computeEffectiveFlavorPrice(100, 0)).toBe(100);
  });

  it("clamps to 0 when the discount exceeds the base price", () => {
    expect(computeEffectiveFlavorPrice(100, 150)).toBe(0);
  });

  it("treats NaN / non-finite inputs as 0", () => {
    expect(computeEffectiveFlavorPrice(NaN, 20)).toBe(0);
    expect(computeEffectiveFlavorPrice(100, NaN)).toBe(100);
  });

  it("handles decimal pricing without arithmetic surprises beyond float precision", () => {
    const result = computeEffectiveFlavorPrice(9.99, 1.5);
    expect(result).toBeCloseTo(8.49, 2);
  });

  it("never returns a negative value", () => {
    for (const [base, discount] of [
      [0, 10],
      [5, 5],
      [5, 100],
      [-1, 0],
    ] as const) {
      expect(computeEffectiveFlavorPrice(base, discount)).toBeGreaterThanOrEqual(0);
    }
  });
});
