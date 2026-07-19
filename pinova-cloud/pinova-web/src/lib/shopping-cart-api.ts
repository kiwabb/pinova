import JSONBigFactory from "json-bigint";
import type {
  ShoppingCartData,
  ShoppingCartItem,
} from "@/data/shopping-cart";

const JSONBig = JSONBigFactory({ storeAsString: true });
const CART_API_PATH = "/api/shopping-cart";

interface ApiResponseDto<T> {
  code: string;
  message: string;
  data: T;
}

interface ShoppingCartItemDto {
  id: string | number;
  shopId: string | number;
  spuId: string | number;
  skuId: string | number;
  productName: string | null;
  skuSpecSummary: string | null;
  imageUrl: string | null;
  priceFen: string | number | null;
  quantity: string | number;
  selected: boolean;
  version: number;
}

interface ShoppingCartDto {
  id: string | number;
  items: ShoppingCartItemDto[];
}

interface ProblemDetailDto {
  detail?: string;
  message?: string;
  title?: string;
}

export class ShoppingCartApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShoppingCartApiError";
  }
}

function mapCartItem(item: ShoppingCartItemDto): ShoppingCartItem {
  return {
    ...item,
    id: String(item.id),
    shopId: String(item.shopId),
    spuId: String(item.spuId),
    skuId: String(item.skuId),
    priceFen: item.priceFen === null ? null : Number(item.priceFen),
    quantity: Number(item.quantity),
    selected: Boolean(item.selected),
    version: Number(item.version),
  };
}

function mapCart(cart: ShoppingCartDto): ShoppingCartData {
  return {
    id: String(cart.id),
    items: Array.isArray(cart.items) ? cart.items.map(mapCartItem) : [],
  };
}

async function parseError(response: Response) {
  try {
    const body = JSON.parse(await response.text()) as ProblemDetailDto;
    const detail = body.detail ?? body.message ?? body.title;
    if (response.status === 401) return "登录状态已失效，请重新登录后再试";
    if (response.status === 404 && detail?.includes("No static resource")) {
      return "购物车服务尚未准备好，请刷新后重试";
    }
    return detail ?? `购物车请求失败（${response.status}）`;
  } catch {
    return `购物车请求失败（${response.status}）`;
  }
}

async function requestCart(path = "", init?: RequestInit) {
  const response = await fetch(`${CART_API_PATH}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new ShoppingCartApiError(await parseError(response));
  }

  const body = JSONBig.parse(await response.text()) as ApiResponseDto<ShoppingCartDto>;
  if (body.code !== "SUCCESS" || !body.data) {
    throw new ShoppingCartApiError(body.message || "购物车暂时无法使用");
  }
  return mapCart(body.data);
}

export function getShoppingCart() {
  return requestCart();
}

export function addShoppingCartItem(skuId: string, quantity = 1) {
  return requestCart("/items", {
    method: "POST",
    body: JSON.stringify({ skuId, quantity }),
  });
}

export function updateShoppingCartItem(
  itemId: string,
  update: { quantity?: number; selected?: boolean; version: number },
) {
  return requestCart(`/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export async function removeShoppingCartItem(itemId: string) {
  const response = await fetch(`${CART_API_PATH}/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ShoppingCartApiError(await parseError(response));
  }
}
