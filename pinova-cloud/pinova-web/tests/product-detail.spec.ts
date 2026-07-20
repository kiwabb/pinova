import { expect, test } from "@playwright/test";
import { mockShoppingCart } from "./shopping-cart-fixture";

test.beforeEach(async ({ page }) => {
  await mockShoppingCart(page);
});

test("opens a product detail page and adds the selected SKU", async ({ page }) => {
  await page.goto("/");
  const productCard = page
    .locator("article")
    .filter({ hasText: "48 色基础拼豆套装" });
  await productCard
    .getByRole("link", { name: "48 色基础拼豆套装", exact: true })
    .click();

  await expect(page).toHaveURL(/\/products\/100000000000000001$/);
  await expect(
    page.getByRole("heading", { name: "48 色基础拼豆套装", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("¥59.90", { exact: true })).toBeVisible();
  await expect(page.getByText("现货", { exact: true })).toBeVisible();
  // 单 SKU 商品不渲染规格选择器（design-system 规则）。
  await expect(page.getByRole("group", { name: "选择规格" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "商品亮点", level: 3 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "套装包含", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "商品评价", level: 2 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "加入购物车", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已加入购物车", exact: true }),
  ).toBeVisible();
  const cartLink = page.getByRole("link", { name: /购物车/ });
  await expect(cartLink).toContainText("1");
  const cartTarget = await cartLink.boundingBox();
  expect(cartTarget?.width).toBeGreaterThanOrEqual(44);
  expect(cartTarget?.height).toBeGreaterThanOrEqual(44);

  const image = page
    .getByRole("region", { name: "48 色基础拼豆套装 商品图片" })
    .locator("img")
    .first();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("loading", "eager");
  await expect(image).toHaveAttribute("fetchpriority", "high");
  await expect(image).toHaveAttribute("src", /\/_next\/image\?url=/);
  await expect(image).toHaveAttribute("srcset", /\/_next\/image\?url=/);
  await expect
    .poll(() =>
      image.evaluate((element) => {
        const productImage = element as HTMLImageElement;
        return productImage.complete && productImage.naturalWidth > 0;
      }),
    )
    .toBe(true);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await cartLink.click();
  await expect(page).toHaveURL("/cart");
  await expect(
    page.getByRole("heading", { name: "购物车", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "48 色基础拼豆套装", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('output[aria-label="48 色基础拼豆套装 数量"]'),
  ).toHaveText("1");

  await page
    .getByRole("button", { name: "增加 48 色基础拼豆套装 数量" })
    .click();
  await expect(
    page.locator('output[aria-label="48 色基础拼豆套装 数量"]'),
  ).toHaveText("2");
});

test("uses SPU media fallback and disables unavailable products", async ({ page }) => {
  await page.goto("/products/100000000000000005");
  await expect(
    page.getByRole("heading", { name: "暖饮杯套双人体验包", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "暂不可购买", exact: true }),
  ).toBeDisabled();
  await expect(page.locator('img[alt="暖饮杯套双人体验包"]')).toBeVisible();

  await page.goto("/products/100000000000000008");
  await expect(page.locator('[data-stock="sold_out"]')).toHaveText("已售罄");
  await expect(
    page.getByRole("button", { name: "已售罄", exact: true }),
  ).toBeDisabled();
});
