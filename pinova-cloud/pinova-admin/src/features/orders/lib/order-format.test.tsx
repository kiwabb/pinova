import { describe, expect, it } from "vitest";

import { formatOrderDate, formatOrderMoney, fulfillmentLabel } from "./order-format";

describe("order formatting", () => {
  it("formats fen amounts with the server currency", () => {
    expect(formatOrderMoney(1299, "CNY")).toContain("12.99");
  });

  it("returns safe fallbacks for unknown or absent values", () => {
    expect(formatOrderDate(null)).toBe("-");
    expect(fulfillmentLabel(99)).toBe("未知");
  });
});

