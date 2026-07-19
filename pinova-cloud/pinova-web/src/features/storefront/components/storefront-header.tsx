"use client";

import Link from "next/link";
import {
  ChevronDown,
  Grid3X3,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { PinovaBrand } from "@/components/pinova-brand";
import type { StoreCategory } from "@/data/storefront";
import type { StorefrontSearchProps } from "../types";
import { CategoryMegaMenu } from "./category-mega-menu";
import { StorefrontSearch } from "./storefront-search";
import styles from "./storefront-shell.module.css";

interface StorefrontHeaderProps {
  cartCount: number;
  categories: StoreCategory[];
  loadingCategoryIds: Set<string>;
  search: StorefrontSearchProps;
  searchPlaceholder: string;
  onLoadCategory: (category: StoreCategory) => Promise<boolean>;
  onOpenCart: () => void;
}

export function StorefrontHeader({
  cartCount,
  categories,
  loadingCategoryIds,
  search,
  searchPlaceholder,
  onLoadCategory,
  onOpenCart,
}: StorefrontHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategoryCode, setActiveCategoryCode] = useState(
    categories[0]?.code ?? "",
  );
  const activeCategory =
    categories.find((category) => category.code === activeCategoryCode) ??
    categories[0];

  useEffect(() => {
    if (!isMenuOpen && !isSearchOpen) return;
    const closeShell = (event: PointerEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
        search.onCloseSuggestions();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        const returnFocusToSearch = isSearchOpen;
        setIsMenuOpen(false);
        setIsSearchOpen(false);
        search.onCloseSuggestions();
        (returnFocusToSearch ? searchButtonRef : menuButtonRef).current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeShell);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeShell);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen, isSearchOpen, search]);

  const closeMenu = () => setIsMenuOpen(false);
  const closeSearch = () => {
    setIsSearchOpen(false);
    search.onCloseSuggestions();
    window.requestAnimationFrame(() => searchButtonRef.current?.focus());
  };
  const closeShellAfterFocusLeaves = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsMenuOpen(false);
      setIsSearchOpen(false);
      search.onCloseSuggestions();
    }
  };
  const activateCategory = (category: StoreCategory) => {
    setActiveCategoryCode(category.code);
    void onLoadCategory(category);
  };
  const toggleMenu = () => {
    const nextOpen = !isMenuOpen;
    setIsMenuOpen(nextOpen);
    setIsSearchOpen(false);
    search.onCloseSuggestions();
    if (nextOpen && activeCategory) void onLoadCategory(activeCategory);
  };
  const toggleSearch = () => {
    const nextOpen = !isSearchOpen;
    setIsSearchOpen(nextOpen);
    setIsMenuOpen(false);
    if (!nextOpen) search.onCloseSuggestions();
  };

  return (
    <header
      ref={headerRef}
      className={styles.header}
      onBlur={closeShellAfterFocusLeaves}
    >
      <div className={styles.headerMain}>
        <Link className={styles.brandLink} href="/" aria-label="Pinova 商城首页">
          <PinovaBrand />
        </Link>

        <nav className={styles.desktopNav} aria-label="主要导航">
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.categoryMenuButton}
            onClick={toggleMenu}
            aria-label="全部分类"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-controls="desktop-category-menu"
          >
            <span>全部分类</span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
          {isMenuOpen && activeCategory && (
            <CategoryMegaMenu
              activeCategory={activeCategory}
              categories={categories}
              loadingCategoryIds={loadingCategoryIds}
              onActivateCategory={activateCategory}
              onClose={closeMenu}
              onLoadCategory={onLoadCategory}
            />
          )}
          <Link href="/#products" onClick={closeMenu}>
            商品
          </Link>
          <Link href="/category/starter-kits" onClick={closeMenu}>
            新手套装
          </Link>
          <Link href="/category/store-experience" onClick={closeMenu}>
            到店体验
          </Link>
          <Link href="/category/pattern-kits" onClick={closeMenu}>
            灵感图集
          </Link>
        </nav>

        <StorefrontSearch
          mobileOpen={isSearchOpen}
          placeholder={searchPlaceholder}
          search={search}
          onMobileDismiss={closeSearch}
        />

        <div className={styles.headerActions}>
          <Link
            className={styles.mobileCategoryLink}
            href="/category/all"
            aria-label="浏览全部分类"
            title="分类"
          >
            <Grid3X3 aria-hidden="true" size={19} />
          </Link>
          <button
            ref={searchButtonRef}
            type="button"
            className={styles.mobileSearchButton}
            onClick={toggleSearch}
            aria-label={isSearchOpen ? "关闭搜索" : "打开搜索"}
            aria-expanded={isSearchOpen}
            aria-controls="storefront-search"
          >
            <Search aria-hidden="true" size={19} />
          </button>
          <Link
            className={styles.accountLink}
            href="/account"
            aria-label="会员账户"
          >
            <UserRound aria-hidden="true" size={19} />
            <span>账户</span>
          </Link>
          <button
            type="button"
            className={styles.cartButton}
            onClick={onOpenCart}
            aria-label={`购物车，共 ${cartCount} 件商品`}
          >
            <ShoppingBag aria-hidden="true" size={19} />
            <span>购物车</span>
            {cartCount > 0 && (
              <b key={cartCount}>
                {cartCount > 99 ? "99+" : String(cartCount).padStart(2, "0")}
              </b>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
