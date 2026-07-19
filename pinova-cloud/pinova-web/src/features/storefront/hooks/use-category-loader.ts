import { useCallback, useRef, useState } from "react";
import type { StoreCategory } from "@/data/storefront";
import {
  attachCategoryChildren,
  fetchCategoryChildren,
  findCategoryById,
} from "../lib/category-tree";

export function useCategoryLoader(
  initialCategories: StoreCategory[],
  onError: () => void,
) {
  const categoriesRef = useRef(initialCategories);
  const requestsRef = useRef(new Map<string, Promise<StoreCategory[]>>());
  const [categories, setCategories] = useState(initialCategories);
  const [loadingCategoryIds, setLoadingCategoryIds] = useState<Set<string>>(
    new Set(),
  );

  const loadCategory = useCallback(
    async (category: StoreCategory) => {
      const currentCategory =
        findCategoryById(category.id, categoriesRef.current) ?? category;
      if (!currentCategory.hasChildren || currentCategory.childrenLoaded) {
        return true;
      }

      let request = requestsRef.current.get(category.id);
      if (!request) {
        setLoadingCategoryIds((current) => new Set(current).add(category.id));
        request = fetchCategoryChildren(category.id);
        requestsRef.current.set(category.id, request);
      }

      try {
        const children = await request;
        const nextCategories = attachCategoryChildren(
          categoriesRef.current,
          category.id,
          children,
        );
        categoriesRef.current = nextCategories;
        setCategories(nextCategories);
        return true;
      } catch {
        onError();
        return false;
      } finally {
        requestsRef.current.delete(category.id);
        setLoadingCategoryIds((current) => {
          const next = new Set(current);
          next.delete(category.id);
          return next;
        });
      }
    },
    [onError],
  );

  return { categories, loadingCategoryIds, loadCategory };
}
