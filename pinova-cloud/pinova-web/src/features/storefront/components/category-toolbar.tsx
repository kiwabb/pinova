import { SlidersHorizontal } from "lucide-react";
import styles from "../catalog-workspace.module.css";

export type CategorySortOrder = "featured" | "price-asc" | "price-desc";

interface CategoryToolbarProps {
  pageTitle: string;
  productCount: number;
  sortOrder: CategorySortOrder;
  onOpenFilter: () => void;
  onSortOrderChange: (sortOrder: CategorySortOrder) => void;
}

export function CategoryToolbar({
  pageTitle,
  productCount,
  sortOrder,
  onOpenFilter,
  onSortOrderChange,
}: CategoryToolbarProps) {
  return (
    <div className={styles.categoryToolbar}>
      <p className={styles.categoryToolbarSummary} aria-live="polite">
        <span>当前结果</span>
        <strong>{pageTitle}</strong>
        <small>{productCount} 件</small>
      </p>
      <div className={styles.categoryToolbarControls}>
        <button
          type="button"
          className={styles.filterButton}
          onClick={onOpenFilter}
          aria-haspopup="dialog"
          aria-controls="category-filter-drawer"
        >
          <SlidersHorizontal aria-hidden="true" size={17} />
          选择分类
        </button>
        <label className={styles.sortControl}>
          <span>排序</span>
          <select
            aria-label="商品排序"
            value={sortOrder}
            onChange={(event) =>
              onSortOrderChange(event.target.value as CategorySortOrder)
            }
          >
            <option value="featured">默认排序</option>
            <option value="price-asc">价格从低到高</option>
            <option value="price-desc">价格从高到低</option>
          </select>
        </label>
      </div>
    </div>
  );
}
