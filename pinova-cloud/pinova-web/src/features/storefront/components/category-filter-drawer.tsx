"use client";

import { X } from "lucide-react";
import {
  getCategoryPath,
  type CategoryCode,
  type StoreCategory,
} from "@/data/storefront";
import { useOverlayDialog } from "../hooks/use-overlay-dialog";
import styles from "../catalog-workspace.module.css";
import { CategoryTree } from "./category-tree";
import { OverlayShell } from "./overlay-shell";

interface CategoryFilterDrawerProps {
  categories: StoreCategory[];
  currentCode: CategoryCode;
  isOpen: boolean;
  loadingCategoryIds: Set<string>;
  onClose: () => void;
  onLoadCategory: (category: StoreCategory) => Promise<boolean>;
}

export function CategoryFilterDrawer({
  categories,
  currentCode,
  isOpen,
  loadingCategoryIds,
  onClose,
  onLoadCategory,
}: CategoryFilterDrawerProps) {
  const dialogRef = useOverlayDialog<HTMLElement>({ isOpen, onClose });
  const currentPath = getCategoryPath(currentCode, categories)
    .map((category) => category.name)
    .join(" / ");

  if (!isOpen) return null;

  return (
    <OverlayShell closeLabel="关闭分类选择" onClose={onClose}>
      <aside
        id="category-filter-drawer"
        ref={dialogRef}
        className={styles.categoryFilterDrawer}
        role="dialog"
        aria-modal="true"
        aria-label="选择分类"
        tabIndex={-1}
      >
        <div className={styles.drawerHeader}>
          <div>
            <h2>选择分类</h2>
            <p className={styles.filterDrawerCurrentPath}>
              当前：{currentPath || "全部商品"}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭分类选择"
          >
            <X aria-hidden="true" size={21} />
          </button>
        </div>
        <div className={styles.categoryFilterContent}>
          <CategoryTree
            categories={categories}
            currentCode={currentCode}
            label="移动端商品分类树"
            loadingCategoryIds={loadingCategoryIds}
            onLoadCategory={onLoadCategory}
            onNavigate={onClose}
          />
        </div>
      </aside>
    </OverlayShell>
  );
}
