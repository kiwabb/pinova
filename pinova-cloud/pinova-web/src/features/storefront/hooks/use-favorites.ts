import { useCallback, useEffect, useState } from "react";
import type { StoreProduct } from "@/data/storefront";
import { parseStoredStringArray } from "@/lib/local-storage-parsers";

const FAVORITES_KEY = "pinova-demo-favorites";

export function useFavorites(
  onToggle: (product: StoreProduct, active: boolean) => void,
) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFavorites(
        parseStoredStringArray(window.localStorage.getItem(FAVORITES_KEY)),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleFavorite = useCallback(
    (product: StoreProduct) => {
      const active = !favorites.includes(product.id);
      const next = active
        ? [...favorites, product.id]
        : favorites.filter((id) => id !== product.id);
      setFavorites(next);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      onToggle(product, active);
    },
    [favorites, onToggle],
  );

  return { favorites, toggleFavorite };
}
