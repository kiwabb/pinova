"use client";

import Link from "next/link";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { useState, type CSSProperties } from "react";
import {
  getCategoryHref,
  getCategoryPath,
  type CategoryCode,
  type StoreCategory,
} from "@/data/storefront";
import styles from "../catalog-workspace.module.css";

interface CategoryTreeNodeProps {
  categories: StoreCategory[];
  category: StoreCategory;
  currentCode: CategoryCode;
  currentPathCodes: Set<string>;
  depth: number;
  loadingCategoryIds: Set<string>;
  onLoadCategory: (category: StoreCategory) => Promise<boolean>;
  onNavigate?: () => void;
}

function CategoryTreeNode({
  categories,
  category,
  currentCode,
  currentPathCodes,
  depth,
  loadingCategoryIds,
  onLoadCategory,
  onNavigate,
}: CategoryTreeNodeProps) {
  const isLoading = loadingCategoryIds.has(category.id);
  const isCurrent = currentCode === category.code;
  const isAncestor = !isCurrent && currentPathCodes.has(category.code);
  const [expanded, setExpanded] = useState(
    currentPathCodes.has(category.code),
  );
  const rowStyle = {
    "--category-tree-depth": `${depth * 16}px`,
  } as CSSProperties;

  return (
    <li className={styles.categoryTreeItem} data-depth={depth}>
      <div
        className={`${styles.categoryTreeRow} ${
          isAncestor ? styles.categoryTreeRowAncestor : ""
        } ${isCurrent ? styles.categoryTreeRowCurrent : ""}`}
        data-has-children={category.hasChildren}
        style={rowStyle}
      >
        <Link
          href={getCategoryHref(category.code, categories)}
          aria-current={isCurrent ? "page" : undefined}
          onClick={onNavigate}
        >
          <span>{category.name}</span>
        </Link>
        {category.hasChildren && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-busy={isLoading}
            aria-label={`${expanded ? "收起" : "展开"}${category.name}`}
            onClick={async () => {
              if (expanded) {
                setExpanded(false);
                return;
              }
              const loaded = await onLoadCategory(category);
              if (loaded) setExpanded(true);
            }}
          >
            {isLoading ? (
              <LoaderCircle
                className={styles.loadingIcon}
                aria-hidden="true"
                size={16}
              />
            ) : (
              <ChevronDown aria-hidden="true" size={16} />
            )}
          </button>
        )}
      </div>
      {category.hasChildren && expanded && category.childrenLoaded && (
        <ul className={styles.categoryTreeChildren}>
          {category.children.map((child) => (
            <CategoryTreeNode
              key={`${currentCode}:${child.code}`}
              categories={categories}
              category={child}
              currentCode={currentCode}
              currentPathCodes={currentPathCodes}
              depth={depth + 1}
              loadingCategoryIds={loadingCategoryIds}
              onLoadCategory={onLoadCategory}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface CategoryTreeProps {
  categories: StoreCategory[];
  currentCode: CategoryCode;
  label: string;
  loadingCategoryIds: Set<string>;
  onLoadCategory: (category: StoreCategory) => Promise<boolean>;
  onNavigate?: () => void;
}

export function CategoryTree({
  categories,
  currentCode,
  label,
  loadingCategoryIds,
  onLoadCategory,
  onNavigate,
}: CategoryTreeProps) {
  const currentPathCodes = new Set(
    getCategoryPath(currentCode, categories).map((category) => category.code),
  );

  return (
    <nav className={styles.categoryTree} aria-label={label}>
      <Link
        className={`${styles.categoryTreeAll} ${
          currentCode === "all" ? styles.categoryTreeAllActive : ""
        }`}
        href={getCategoryHref("all", categories)}
        aria-current={currentCode === "all" ? "page" : undefined}
        onClick={onNavigate}
      >
        全部商品
      </Link>
      <ul className={styles.categoryTreeRoot}>
        {categories.map((category) => (
          <CategoryTreeNode
            key={`${currentCode}:${category.code}`}
            categories={categories}
            category={category}
            currentCode={currentCode}
            currentPathCodes={currentPathCodes}
            depth={0}
            loadingCategoryIds={loadingCategoryIds}
            onLoadCategory={onLoadCategory}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}
