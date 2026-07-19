import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import {
  getCategoryHref,
  getCategoryPresentation,
  type StoreCategory,
} from "@/data/storefront";
import styles from "../catalog-workspace.module.css";

interface CategoryPageHeaderProps {
  categories: StoreCategory[];
  categoryPath: StoreCategory[];
  pageCaption: string;
  pageTitle: string;
  productCount: number;
}

export function CategoryPageHeader({
  categories,
  categoryPath,
  pageCaption,
  pageTitle,
  productCount,
}: CategoryPageHeaderProps) {
  const rootCategory = categoryPath[0];
  const rootPresentation = rootCategory
    ? getCategoryPresentation(rootCategory.code)
    : undefined;
  const mastheadStyle = {
    "--catalog-category-accent": rootPresentation?.color ?? "var(--brand)",
  } as CSSProperties;

  return (
    <>
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/">首页</Link>
        <ChevronRight aria-hidden="true" size={15} />
        {categoryPath.map((category, index) => {
          const isCurrent = index === categoryPath.length - 1;
          return (
            <span key={category.code}>
              {isCurrent ? (
                <span aria-current="page">{category.name}</span>
              ) : (
                <Link href={getCategoryHref(category.code, categories)}>
                  {category.name}
                </Link>
              )}
              {!isCurrent && <ChevronRight aria-hidden="true" size={15} />}
            </span>
          );
        })}
        {!categoryPath.length && <span aria-current="page">全部商品</span>}
      </nav>

      <div className={styles.categoryMasthead} style={mastheadStyle}>
        <div className={styles.categoryPageCopy}>
          <h1 id="category-page-title">{pageTitle}</h1>
          <p className={styles.categoryCaption}>{pageCaption}</p>
        </div>
        <p
          className={styles.categoryResultCount}
          aria-label={`${productCount} 件商品`}
          aria-live="polite"
        >
          <strong aria-hidden="true">{productCount}</strong>
          <span>件商品</span>
        </p>
      </div>
    </>
  );
}
