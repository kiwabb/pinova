import { expect, test } from "@playwright/test";
import {
  cartItemFixture,
  mockShoppingCart,
} from "./shopping-cart-fixture";

test.beforeEach(async ({ page }) => {
  await mockShoppingCart(page, [cartItemFixture]);
  await page.goto("/cart");
});

test("cart page updates quantity, selected state, and removal", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "购物车", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "48 色基础拼豆套装", exact: true }),
  ).toBeVisible();
  const quantity = page.locator('output[aria-label="48 色基础拼豆套装 数量"]');
  const summary = page.getByRole("complementary", { name: "购物车汇总" });
  await expect(quantity).toHaveText("1");
  await expect(page.getByText("¥59.90")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "去结算" })).toHaveAttribute(
    "href",
    "/checkout",
  );

  await page
    .getByRole("button", { name: "增加 48 色基础拼豆套装 数量" })
    .click();
  await expect(quantity).toHaveText("2");
  await expect(summary.getByText("¥119.80", { exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: "选择 48 色基础拼豆套装" }).click();
  await expect(summary.getByText("¥0.00", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "移除 48 色基础拼豆套装" }).click();
  await expect(page.getByRole("heading", { name: "购物车还是空的" })).toBeVisible();
});
