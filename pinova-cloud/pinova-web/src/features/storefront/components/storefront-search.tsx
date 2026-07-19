"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { StoreProduct } from "@/data/storefront";
import type { StorefrontSearchProps } from "../types";
import styles from "./storefront-shell.module.css";

interface StorefrontSearchComponentProps {
  mobileOpen: boolean;
  placeholder: string;
  search: StorefrontSearchProps;
  onMobileDismiss: () => void;
}

export function StorefrontSearch({
  mobileOpen,
  placeholder,
  search,
  onMobileDismiss,
}: StorefrontSearchComponentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const popupId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const isPopupOpen =
    search.showSuggestions && Boolean(search.normalizedInput);
  const isListboxOpen = isPopupOpen && search.suggestions.length > 0;
  const validActiveIndex =
    activeIndex >= 0 && activeIndex < search.suggestions.length
      ? activeIndex
      : -1;

  useEffect(() => {
    if (mobileOpen) inputRef.current?.focus();
  }, [mobileOpen]);

  const getOptionId = (product: StoreProduct) =>
    `${popupId}-option-${product.id}`;
  const applySuggestion = (product: StoreProduct) => {
    setActiveIndex(-1);
    search.onApplySuggestion(product);
    if (mobileOpen) onMobileDismiss();
  };

  return (
    <form
      id="storefront-search"
      className={`${styles.search} ${
        mobileOpen ? styles.searchMobileOpen : ""
      }`}
      role="search"
      onSubmit={(event) => {
        search.onSubmit(event);
        if (mobileOpen) onMobileDismiss();
      }}
    >
      <label className={styles.srOnly} htmlFor="site-search">
        搜索商品或分类
      </label>
      <input
        ref={inputRef}
        id="site-search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={isPopupOpen ? popupId : undefined}
        aria-expanded={isListboxOpen}
        aria-activedescendant={
          isListboxOpen && validActiveIndex >= 0
            ? getOptionId(search.suggestions[validActiveIndex])
            : undefined
        }
        value={search.input}
        onChange={(event) => {
          setActiveIndex(-1);
          search.onChange(event.target.value);
        }}
        onFocus={() => {
          setActiveIndex(-1);
          search.onFocus();
        }}
        onBlur={() => {
          setActiveIndex(-1);
          search.onBlur();
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "ArrowDown" || event.key === "ArrowUp") &&
            search.suggestions.length
          ) {
            event.preventDefault();
            if (!isPopupOpen) search.onFocus();
            setActiveIndex((current) => {
              if (event.key === "ArrowDown") {
                return current < 0 || current >= search.suggestions.length - 1
                  ? 0
                  : current + 1;
              }
              return current <= 0
                ? search.suggestions.length - 1
                : current - 1;
            });
            return;
          }
          if (event.key === "Enter" && validActiveIndex >= 0) {
            event.preventDefault();
            applySuggestion(search.suggestions[validActiveIndex]);
            return;
          }
          if (event.key === "Escape" && isPopupOpen) {
            event.preventDefault();
            setActiveIndex(-1);
            search.onCloseSuggestions();
            return;
          }
          if (event.key === "Escape" && mobileOpen) {
            event.preventDefault();
            onMobileDismiss();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        className={styles.searchClear}
        disabled={!search.input}
        onClick={() => {
          setActiveIndex(-1);
          search.onClear();
          inputRef.current?.focus();
        }}
        aria-label="清空搜索"
      >
        <X aria-hidden="true" size={17} />
      </button>
      <button
        type="submit"
        className={styles.searchSubmit}
        aria-label="提交搜索"
      >
        <Search aria-hidden="true" size={18} />
      </button>

      {isPopupOpen &&
        (isListboxOpen ? (
          <div
            id={popupId}
            className={styles.suggestions}
            role="listbox"
            aria-label="搜索建议"
          >
            {search.suggestions.map((product, index) => (
              <button
                key={product.id}
                id={getOptionId(product)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === validActiveIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applySuggestion(product)}
              >
                <span>{product.name}</span>
                <small>{product.categoryName}</small>
              </button>
            ))}
          </div>
        ) : (
          <div
            id={popupId}
            className={`${styles.suggestions} ${styles.noSuggestion}`}
            role="status"
            aria-live="polite"
          >
            <span>没有找到相关商品</span>
            <small>试试“套装”“武汉”或“体验”</small>
          </div>
        ))}
    </form>
  );
}
