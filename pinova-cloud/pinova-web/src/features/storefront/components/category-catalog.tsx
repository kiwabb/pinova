"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  findCategoryByCode,
  getCategoryHref,
  getCategoryPath,
  getCategoryPresentation,
  type CategoryCode,
  type StoreCategory,
  type StoreProduct,
} from "@/data/storefront";
import catalogStyles from "../catalog-workspace.module.css";
import { CategoryFilterDrawer } from "./category-filter-drawer";
import { CategoryPageHeader } from "./category-page-header";
import {
  CategoryToolbar,
  type CategorySortOrder,
} from "./category-toolbar";
import { CategoryTree } from "./category-tree";
import { ProductGrid } from "./product-grid";
import { SubcategoryNav } from "./subcategory-nav";

interface CategoryCatalogProps {
  appliedSearch: string;
  categories: StoreCategory[];
  currentCode: CategoryCode;
  favorites: string[];
  loadingCategoryIds: Set<string>;
  products: StoreProduct[];
  onAddToCart: (product: StoreProduct) => void;
  onLoadCategory: (category: StoreCategory) => Promise<boolean>;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function CategoryCatalog({
  appliedSearch,
  categories,
  currentCode,
  favorites,
  loadingCategoryIds,
  products,
  onAddToCart,
  onLoadCategory,
  onQuickView,
  onToggleFavorite,
}: CategoryCatalogProps) {
  const [sortOrder, setSortOrder] =
    useState<CategorySortOrder>("featured");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const closeFilter = useCallback(() => setIsFilterOpen(false), []);
  const currentCategory = findCategoryByCode(currentCode, categories);
  const categoryPath = getCategoryPath(currentCode, categories);
  const visibleChildren =
    currentCode === "all" ? categories : (currentCategory?.children ?? []);
  const sortedProducts = useMemo(() => {
    const next = [...products];
    if (sortOrder === "price-asc") {
      return next.sort(
        (a, b) =>
          (a.priceFen ?? Number.POSITIVE_INFINITY) -
          (b.priceFen ?? Number.POSITIVE_INFINITY),
      );
    }
    if (sortOrder === "price-desc") {
      return next.sort(
        (a, b) =>
          (b.priceFen ?? Number.NEGATIVE_INFINITY) -
          (a.priceFen ?? Number.NEGATIVE_INFINITY),
      );
    }
    return next;
  }, [products, sortOrder]);

  const pageTitle = currentCategory?.name ?? "全部商品";
  const currentPresentation = currentCategory
    ? getCategoryPresentation(currentCategory.code)
    : undefined;
  const pageCaption =
    currentPresentation?.caption ??
    (currentCode === "all"
      ? "浏览 Pinova 全部材料、工具、成品与到店体验。"
      : "沿着分类层级查找适合这次创作的商品。");

  return (
    <section
      id="products"
      className={catalogStyles.categoryCatalog}
      aria-labelledby="category-page-title"
    >
      <div className={catalogStyles.catalogIntroBand}>
        <div
          className={`${catalogStyles.catalogContainer} ${catalogStyles.catalogIntroInner}`}
        >
          <CategoryPageHeader
            categories={categories}
            categoryPath={categoryPath}
            pageCaption={pageCaption}
            pageTitle={pageTitle}
            productCount={products.length}
          />
        </div>
      </div>

      {visibleChildren.length > 0 && (
        <div className={catalogStyles.catalogBranchBand}>
          <div className={catalogStyles.catalogContainer}>
            <SubcategoryNav
              categories={categories}
              subcategories={visibleChildren}
            />
          </div>
        </div>
      )}

      <div
        className={`${catalogStyles.catalogContainer} ${catalogStyles.categoryWorkspace}`}
      >
        <aside className={catalogStyles.categorySidebar}>
          <div className={catalogStyles.categorySidebarHeading}>
            <div>
              <strong>分类索引</strong>
              <small>
                {categoryPath.length
                  ? categoryPath.map((category) => category.name).join(" / ")
                  : "全部目录"}
              </small>
            </div>
          </div>
          <CategoryTree
            categories={categories}
            currentCode={currentCode}
            label="商品分类树"
            loadingCategoryIds={loadingCategoryIds}
            onLoadCategory={onLoadCategory}
          />
        </aside>
        <div className={catalogStyles.categoryResults}>
          <CategoryToolbar
            pageTitle={pageTitle}
            productCount={products.length}
            sortOrder={sortOrder}
            onOpenFilter={() => setIsFilterOpen(true)}
            onSortOrderChange={setSortOrder}
          />
          <div className={catalogStyles.productLedger}>
            <ProductGrid
              products={sortedProducts}
              favorites={favorites}
              searchQuery={appliedSearch}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
              onToggleFavorite={onToggleFavorite}
              emptyAction={
                <Link href={getCategoryHref("all", categories)}>
                  查看全部商品
                </Link>
              }
            />
          </div>
        </div>
      </div>

      <CategoryFilterDrawer
        categories={categories}
        currentCode={currentCode}
        isOpen={isFilterOpen}
        loadingCategoryIds={loadingCategoryIds}
        onClose={closeFilter}
        onLoadCategory={onLoadCategory}
      />
    </section>
  );
}
