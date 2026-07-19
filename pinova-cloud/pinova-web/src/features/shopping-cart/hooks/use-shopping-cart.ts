"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ShoppingCartData,
  ShoppingCartItem,
} from "@/data/shopping-cart";
import {
  addShoppingCartItem,
  getShoppingCart,
  removeShoppingCartItem,
  updateShoppingCartItem,
} from "@/lib/shopping-cart-api";

const EMPTY_CART: ShoppingCartData = { id: "", items: [] };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "购物车操作失败，请重试";
}

export function useShoppingCart() {
  const [cart, setCart] = useState<ShoppingCartData>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCart(await getShoppingCart());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void getShoppingCart()
      .then((nextCart) => {
        if (active) setCart(nextCart);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addSku = useCallback(async (skuId: string, quantity = 1) => {
    setPendingItemId(`sku:${skuId}`);
    setError(null);
    try {
      setCart(await addShoppingCartItem(skuId, quantity));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setPendingItemId(null);
    }
  }, []);

  const removeItem = useCallback(async (item: ShoppingCartItem) => {
    setPendingItemId(item.id);
    setError(null);
    try {
      await removeShoppingCartItem(item.id);
      setCart((current) => ({
        ...current,
        items: current.items.filter((candidate) => candidate.id !== item.id),
      }));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setPendingItemId(null);
    }
  }, []);

  const updateQuantity = useCallback(
    async (item: ShoppingCartItem, quantity: number) => {
      if (quantity <= 0) return removeItem(item);
      setPendingItemId(item.id);
      setError(null);
      try {
        setCart(
          await updateShoppingCartItem(item.id, {
            quantity,
            version: item.version,
          }),
        );
        return true;
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        return false;
      } finally {
        setPendingItemId(null);
      }
    },
    [removeItem],
  );

  const updateSelected = useCallback(
    async (item: ShoppingCartItem, selected: boolean) => {
      setPendingItemId(item.id);
      setError(null);
      try {
        setCart(
          await updateShoppingCartItem(item.id, {
            selected,
            version: item.version,
          }),
        );
        return true;
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        return false;
      } finally {
        setPendingItemId(null);
      }
    },
    [],
  );

  const summary = useMemo(() => {
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const selectedItems = cart.items.filter((item) => item.selected);
    const selectedCount = selectedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const selectedTotal = selectedItems.reduce(
      (sum, item) => sum + (item.priceFen ?? 0) * item.quantity,
      0,
    );
    return { count, selectedCount, selectedTotal };
  }, [cart.items]);

  return {
    ...summary,
    cart,
    error,
    isLoading,
    pendingItemId,
    addSku,
    refresh,
    removeItem,
    updateQuantity,
    updateSelected,
  };
}
