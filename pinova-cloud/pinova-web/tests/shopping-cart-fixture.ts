import type { Page } from "@playwright/test";

interface CartItemFixture {
  id: string;
  shopId: string;
  spuId: string;
  skuId: string;
  productName: string;
  skuSpecSummary: string;
  imageUrl: string | null;
  priceFen: number;
  quantity: number;
  selected: boolean;
  version: number;
}

export const cartItemFixture: CartItemFixture = {
  id: "990000000000000001",
  shopId: "1",
  spuId: "100000000000000001",
  skuId: "920000000000000001",
  productName: "48 色基础拼豆套装",
  skuSpecSummary: "SKU 01",
  imageUrl: null,
  priceFen: 5990,
  quantity: 1,
  selected: true,
  version: 1,
};

function cartPayload(items: CartItemFixture[]) {
  return {
    code: "SUCCESS",
    message: "OK",
    data: {
      id: "980000000000000001",
      items,
    },
  };
}

function cloneItem(item: CartItemFixture): CartItemFixture {
  return { ...item };
}

export async function mockShoppingCart(
  page: Page,
  initialItems: CartItemFixture[] = [],
) {
  let items = initialItems.map(cloneItem);

  await page.route("**/api/shopping-cart", async (route) => {
    await route.fulfill({ json: cartPayload(items) });
  });

  await page.route("**/api/shopping-cart/items", async (route) => {
    const body = route.request().postDataJSON() as {
      quantity?: number;
      skuId?: string;
    };
    const existing = items.find((item) => item.skuId === body.skuId);
    if (existing) {
      existing.quantity += body.quantity ?? 1;
      existing.version += 1;
    } else {
      items = [
        {
          ...cartItemFixture,
          quantity: body.quantity ?? 1,
          skuId: body.skuId ?? cartItemFixture.skuId,
        },
      ];
    }
    await route.fulfill({ json: cartPayload(items) });
  });

  await page.route("**/api/shopping-cart/items/*", async (route) => {
    const request = route.request();
    const itemId = request.url().split("/").at(-1);

    if (request.method() === "DELETE") {
      items = items.filter((item) => item.id !== itemId);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    const body = request.postDataJSON() as {
      quantity?: number;
      selected?: boolean;
    };
    items = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity: body.quantity ?? item.quantity,
            selected: body.selected ?? item.selected,
            version: item.version + 1,
          }
        : item,
    );
    await route.fulfill({ json: cartPayload(items) });
  });

  return {
    setItems(nextItems: CartItemFixture[]) {
      items = nextItems.map(cloneItem);
    },
  };
}
