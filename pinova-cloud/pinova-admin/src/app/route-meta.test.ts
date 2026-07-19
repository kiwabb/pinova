import { describe, expect, it } from "vitest";

import { getRouteMeta } from "./route-meta";

describe("getRouteMeta", () => {
  it("keeps member details in the member navigation section", () => {
    expect(getRouteMeta("/members/910000000000000001")).toEqual({
      menuKey: "/members",
      title: "会员详情",
      breadcrumbs: ["会员", "会员详情"],
    });
  });

  it("returns not-found metadata for unknown paths", () => {
    expect(getRouteMeta("/missing").menuKey).toBe("");
    expect(getRouteMeta("/missing").title).toBe("页面未找到");
  });

  it("keeps order details in the order navigation section", () => {
    expect(getRouteMeta("/orders/P202607180001").menuKey).toBe("/orders");
    expect(getRouteMeta("/orders/P202607180001").title).toBe("订单详情");
  });
});
