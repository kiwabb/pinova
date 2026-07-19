import { expect, test } from "@playwright/test";
import { mockShoppingCart } from "./shopping-cart-fixture";

test.beforeEach(async ({ page }) => {
  await mockShoppingCart(page);
});

test("desktop category menu navigates to a hierarchical category page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome");

  const childRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/product-categories\/\d+\/children$/.test(request.url())) {
      childRequests.push(request.url());
    }
  });

  await page.goto("/");
  expect(childRequests).toHaveLength(0);
  const trigger = page.getByRole("button", {
    name: "全部分类",
    exact: true,
  });
  await trigger.click();

  const menu = page.getByRole("navigation", { name: "商品分类菜单" });
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    menu.getByRole("link", { name: "按熟练度", exact: true }),
  ).toBeVisible();
  await expect.poll(() => childRequests.length).toBe(1);

  await trigger.press("Tab");
  await expect(
    menu.getByRole("link", { name: "全部商品", exact: true }),
  ).toBeFocused();

  const skillLevelLink = menu.getByRole("link", {
    name: "按熟练度",
    exact: true,
  });
  await skillLevelLink.hover();
  await expect(
    menu.getByRole("link", { name: "第一次尝试", exact: true }),
  ).toBeVisible();
  await expect.poll(() => childRequests.length).toBe(2);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  await trigger.click();
  await expect(menu).toBeVisible();
  await menu.locator("a").last().focus();
  await page.keyboard.press("Tab");
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await menu
    .getByRole("link", { name: "第一次尝试", exact: true })
    .click();

  await expect(page).toHaveURL(
    "/category/starter-kits/starter-level/first-project",
  );
  await expect(
    page.getByRole("heading", { name: "第一次尝试", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "面包屑" })).toContainText(
    "新手套装按熟练度第一次尝试",
  );
  await expect(
    page.getByRole("navigation", { name: "商品分类树" }),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.locator("main article img").first()).toHaveAttribute(
    "loading",
    "eager",
  );
  await expect(page.locator("main article img").first()).toHaveAttribute(
    "fetchpriority",
    "high",
  );

  await page
    .getByRole("navigation", { name: "面包屑" })
    .getByRole("link", { name: "新手套装", exact: true })
    .click();
  await expect(page).toHaveURL("/category/starter-kits");
  await expect(page.locator("main article")).toHaveCount(3);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("mobile category drawer switches the current leaf category", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome");

  await page.goto(
    "/category/starter-kits/starter-level/first-project",
  );
  await expect(
    page.getByRole("navigation", { name: "商品分类树" }),
  ).toBeHidden();

  const filterTrigger = page.getByRole("button", {
    name: "选择分类",
    exact: true,
  });
  await filterTrigger.click();
  const drawer = page.getByRole("dialog", { name: "选择分类" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(filterTrigger).toBeFocused();

  await filterTrigger.click();
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("navigation", { name: "移动端商品分类树" }),
  ).toBeVisible();
  await drawer
    .getByRole("link", { name: "亲子共创", exact: true })
    .click();

  await expect(page).toHaveURL(
    "/category/starter-kits/starter-level/family-kits",
  );
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "亲子共创", level: 1 }),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(1);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
