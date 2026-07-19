import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CategoryCode, StoreProduct } from "@/data/storefront";

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function matchesProduct(
  product: StoreProduct,
  categoryCode: CategoryCode,
  query: string,
) {
  const matchesCategory =
    categoryCode === "all" ||
    product.categoryPathCodes.includes(categoryCode);
  if (!matchesCategory || !query) return matchesCategory;
  return normalizeQuery(
    `${product.name}${product.categoryName}${product.description ?? ""}`,
  ).includes(query);
}

export function useProductSearch(
  products: StoreProduct[],
  effectiveCategoryCode: CategoryCode,
  onShowResults: () => void,
) {
  const [input, setInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimerRef = useRef<number | null>(null);
  const normalizedInput = normalizeQuery(input);

  useEffect(
    () => () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    },
    [],
  );

  const cancelPendingBlur = () => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  const suggestions = useMemo(() => {
    if (!normalizedInput) return [];
    return products
      .filter((product) =>
        matchesProduct(product, effectiveCategoryCode, normalizedInput),
      )
      .slice(0, 5);
  }, [effectiveCategoryCode, normalizedInput, products]);

  const filteredProducts = useMemo(() => {
    const query = normalizeQuery(appliedSearch);
    return products.filter((product) =>
      matchesProduct(product, effectiveCategoryCode, query),
    );
  }, [appliedSearch, effectiveCategoryCode, products]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(input.trim());
    setShowSuggestions(false);
    onShowResults();
  };

  const applySuggestion = (product: StoreProduct) => {
    setInput(product.name);
    setAppliedSearch(product.name);
    setShowSuggestions(false);
    onShowResults();
  };

  const clear = () => {
    setInput("");
    setAppliedSearch("");
    setShowSuggestions(false);
  };

  return {
    appliedSearch,
    filteredProducts,
    clear,
    searchProps: {
      input,
      normalizedInput,
      showSuggestions,
      suggestions,
      onApplySuggestion: applySuggestion,
      onBlur: () => {
        cancelPendingBlur();
        blurTimerRef.current = window.setTimeout(() => {
          setShowSuggestions(false);
          blurTimerRef.current = null;
        }, 120);
      },
      onClear: clear,
      onCloseSuggestions: () => setShowSuggestions(false),
      onChange: (value: string) => {
        setInput(value);
        setShowSuggestions(true);
      },
      onFocus: () => {
        cancelPendingBlur();
        setShowSuggestions(true);
      },
      onSubmit: submit,
    },
  };
}
