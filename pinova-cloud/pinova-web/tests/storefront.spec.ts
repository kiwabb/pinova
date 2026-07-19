import { expect, test } from "@playwright/test";
import {
  mockShoppingCart,
} from "./shopping-cart-fixture";

async function loadAllLazyImages(page: import("@playwright/test").Page) {
  const images = page.locator('main img[alt]:not([alt=""])');
  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          image.evaluate(
            (element) => {
              const imageElement = element as HTMLImageElement;
              return imageElement.complete && imageElement.naturalWidth > 0;
            },
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function ensureSearchIsVisible(page: import("@playwright/test").Page) {
  const search = page.getByLabel("搜索商品或分类");
  const openSearchButton = page.getByRole("button", {
    name: "打开搜索",
    exact: true,
  });

  if (await openSearchButton.isVisible()) {
    await openSearchButton.click();
  }
  await expect(search).toBeVisible();
  return search;
}

test.beforeEach(async ({ page }) => {
  await mockShoppingCart(page);
  await page.goto("/");
});

test("renders the storefront without horizontal overflow", async ({
  page,
}, testInfo) => {
  await expect(
    page.getByRole("heading", { name: "武汉城市记忆大幅套装", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "探索材料世界" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "推荐商品" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "实物材料", level: 3 }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(9);
  await expect(page.getByText("Pinova 基础拼豆材料包")).toBeVisible();

  if (testInfo.project.name === "mobile-chrome") {
    const categoryLink = page.getByRole("link", {
      name: "浏览全部分类",
      exact: true,
    });
    await expect(categoryLink).toBeVisible();
    await expect(categoryLink).toHaveAttribute("href", "/category/all");
    await expect(
      page.getByRole("navigation", { name: "移动端导航" }),
    ).toHaveCount(0);
  }

  const heroSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "武汉城市记忆大幅套装", level: 1 }),
  });
  await expect(heroSection.locator("img").first()).toBeVisible();
  await expect(page.locator("main article img").first()).toHaveAttribute(
    "loading",
    "lazy",
  );

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await loadAllLazyImages(page);

  await page.screenshot({
    path: `artifacts/storefront-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.screenshot({
    path: `artifacts/storefront-${testInfo.project.name}-viewport.png`,
  });
});

test("mobile header opens the real full category catalog", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome");

  const categoryLink = page.getByRole("link", {
    name: "浏览全部分类",
    exact: true,
  });
  await categoryLink.click();

  await expect(page).toHaveURL("/category/all");
  await expect(
    page.getByRole("heading", { name: "全部商品", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "面包屑" }),
  ).toContainText("首页全部商品");
});

test("searches, favorites, and reflects product sale availability", async ({
  page,
}) => {
  const search = await ensureSearchIsVisible(page);
  await search.fill("武汉");
  const suggestion = page.getByRole("option", {
    name: /武汉城市记忆大幅套装/,
  });
  await expect(suggestion).toBeVisible();
  await search.press("ArrowDown");
  await expect(suggestion).toHaveAttribute("aria-selected", "true");
  await search.press("Enter");
  await expect(
    page.getByRole("heading", { name: "“武汉城市记忆大幅套装”的搜索结果" }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);

  await ensureSearchIsVisible(page);
  await search.fill("不存在的商品 xyz");
  const emptySearchMessage = page.getByText("没有找到相关商品", {
    exact: true,
  });
  await expect(emptySearchMessage).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(emptySearchMessage).toBeHidden();
  await expect(
    page.getByRole("listbox", { name: "搜索建议" }),
  ).toBeHidden();

  await search.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "没有找到与“不存在的商品 xyz”匹配的商品",
      level: 3,
    }),
  ).toBeVisible();

  await ensureSearchIsVisible(page);
  await page.getByRole("button", { name: "清空搜索" }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(page.locator("article")).toHaveCount(9);

  await search.fill("48 色基础拼豆套装");
  await page
    .getByRole("option", { name: /48 色基础拼豆套装/ })
    .click();
  await expect(page.locator("article")).toHaveCount(1);
  await ensureSearchIsVisible(page);
  await page.getByRole("button", { name: "清空搜索" }).click();
  await expect(page.locator("article")).toHaveCount(9);

  const closeSearchButton = page.getByRole("button", {
    name: "关闭搜索",
    exact: true,
  });
  if (await closeSearchButton.isVisible()) {
    await closeSearchButton.click();
  }

  const firstProduct = page
    .locator("article")
    .filter({ hasText: "48 色基础拼豆套装" });
  await firstProduct
    .getByRole("button", { name: "收藏 48 色基础拼豆套装" })
    .click();
  await expect(
    firstProduct.getByRole("button", { name: "取消收藏 48 色基础拼豆套装" }),
  ).toBeVisible();

  await expect(firstProduct.getByText("¥59.90", { exact: true })).toBeVisible();
  await expect(
    firstProduct.getByRole("button", {
      name: "选择规格：48 色基础拼豆套装",
      exact: true,
    }),
  ).toBeEnabled();

  const lowStockProduct = page
    .locator("article")
    .filter({ hasText: "莓果双人挂件材料包" });
  await expect(lowStockProduct.getByText("库存紧张", { exact: true })).toBeVisible();
  await expect(
    lowStockProduct.getByRole("button", {
      name: "选择规格：莓果双人挂件材料包",
      exact: true,
    }),
  ).toBeEnabled();

  const soldOutProduct = page
    .locator("article")
    .filter({ hasText: "城市漫游杯垫材料包" });
  await expect(soldOutProduct.locator('[data-tone="unavailable"]')).toHaveText(
    "已售罄",
  );
  await expect(
    soldOutProduct.getByRole("button", {
      name: "已售罄：城市漫游杯垫材料包",
      exact: true,
    }),
  ).toBeDisabled();

  const reservationProduct = page
    .locator("article")
    .filter({ hasText: "家庭周末创作桌预约" });
  await expect(
    reservationProduct.getByRole("button", {
      name: "暂不可购买：家庭周末创作桌预约",
      exact: true,
    }),
  ).toBeDisabled();
});

test("quick view locks scrolling and restores trigger focus", async ({ page }) => {
  const productCard = page
    .locator("article")
    .filter({ hasText: "48 色基础拼豆套装" });
  const quickViewTrigger = productCard.getByRole("button", {
    name: "快速预览 48 色基础拼豆套装",
    exact: true,
  });

  await quickViewTrigger.click();
  const dialog = page.getByRole("dialog", {
    name: "48 色基础拼豆套装",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "关闭商品详情", exact: true }),
  ).toBeFocused();
  await expect
    .poll(() => page.locator("body").evaluate((body) => body.style.overflow))
    .toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(quickViewTrigger).toBeFocused();
  await expect
    .poll(() => page.locator("body").evaluate((body) => body.style.overflow))
    .toBe("");
});

test("keeps adaptive navigation available at tablet widths", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome");

  await page.setViewportSize({ width: 1024, height: 768 });
  const navigation = page.getByRole("navigation", { name: "主要导航" });
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "全部分类", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "移动端导航" }),
  ).toHaveCount(0);

  await page.goto("/category/starter-kits");
  await expect(navigation).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("keeps quick view usable in mobile landscape", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome");

  await page.setViewportSize({ width: 812, height: 375 });
  const productCard = page
    .locator("article")
    .filter({ hasText: "48 色基础拼豆套装" });
  await productCard
    .getByRole("button", {
      name: "快速预览 48 色基础拼豆套装",
      exact: true,
    })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "48 色基础拼豆套装",
    exact: true,
  });
  const addButton = dialog.getByRole("button", {
    name: "选择规格",
    exact: true,
  });
  await addButton.scrollIntoViewIfNeeded();
  await expect(addButton).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return style.overflowY === "auto" && element.scrollHeight > element.clientHeight;
      }),
    )
    .toBe(true);
});

test("respects reduced motion preferences", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const motionState = await page.locator("main article").first().evaluate((element) => {
    const style = window.getComputedStyle(element);
    const durations = [style.animationDuration, style.transitionDuration]
      .flatMap((value) => value.split(","))
      .map((value) => Number.parseFloat(value));
    return {
      matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      maximumDuration: Math.max(...durations),
    };
  });

  expect(motionState.matches).toBe(true);
  expect(motionState.maximumDuration).toBeLessThanOrEqual(0.001);
});
