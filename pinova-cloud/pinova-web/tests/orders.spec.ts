import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockShoppingCart } from "./shopping-cart-fixture";

async function mockMember(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: {
        code: "SUCCESS",
        message: "success",
        data: {
          id: "900000000000000001",
          memberNo: "P0001",
          nickname: "拼豆用户",
          avatarUrl: null,
        },
      },
    });
  });
}

test("member account exposes a working order entry", async ({ page }) => {
  await mockShoppingCart(page);
  await mockMember(page);

  await page.goto("/account");

  await expect(page.getByRole("link", { name: /我的订单/ })).toHaveAttribute(
    "href",
    "/account/orders",
  );
});

test("member orders render snapshots and support status filters", async ({ page }) => {
  await mockShoppingCart(page);
  await page.route("**/api/orders?*", async (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    await route.fulfill({
      json: {
        code: "SUCCESS",
        message: "success",
        data: {
          items:
            status === "3"
              ? []
              : [
                  {
                    orderNo: "PO202607190001",
                    status: "PENDING_PAYMENT",
                    fulfillmentType: 1,
                    currencyCode: "CNY",
                    payableAmountFen: 5990,
                    paidAmountFen: 0,
                    submittedAt: "2026-07-19T04:00:00Z",
                    items: [
                      {
                        productName: "48 色基础拼豆套装",
                        skuSpec: "48 色 / 基础版",
                        imageUrl: null,
                        unitPriceFen: 5990,
                        quantity: 1,
                        payableAmountFen: 5990,
                      },
                    ],
                  },
                ],
          page: 1,
          pageSize: 10,
          total: status === "3" ? 0 : 1,
        },
      },
    });
  });

  await page.goto("/account/orders");

  await expect(page.getByRole("heading", { name: "我的订单", level: 1 })).toBeVisible();
  await expect(page.getByText("PO202607190001")).toBeVisible();
  await expect(page.getByText("48 色基础拼豆套装")).toBeVisible();
  await expect(page.getByLabel("订单列表").getByText("待支付")).toBeVisible();
  await expect(page.getByText("¥59.90").last()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  await page.getByRole("button", { name: "已完成" }).click();
  await expect(page.getByRole("heading", { name: "没有该状态的订单" })).toBeVisible();
});

test("member orders provide a login recovery path", async ({ page }) => {
  await mockShoppingCart(page);
  await page.route("**/api/orders?*", async (route) => {
    await route.fulfill({
      status: 401,
      json: { title: "Unauthorized", detail: "请先登录" },
    });
  });

  await page.goto("/account/orders");

  await expect(page.getByRole("heading", { name: "登录后查看订单" })).toBeVisible();
  await expect(page.getByRole("link", { name: /登录会员账户/ })).toHaveAttribute(
    "href",
    "/account?mode=login",
  );
});
