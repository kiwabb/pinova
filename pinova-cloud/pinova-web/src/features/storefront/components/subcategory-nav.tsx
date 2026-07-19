import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  getCategoryHref,
  type StoreCategory,
} from "@/data/storefront";
import styles from "../catalog-workspace.module.css";

interface SubcategoryNavProps {
  categories: StoreCategory[];
  subcategories: StoreCategory[];
}

export function SubcategoryNav({
  categories,
  subcategories,
}: SubcategoryNavProps) {
  if (!subcategories.length) return null;

  return (
    <nav className={styles.subcategoryDirectory} aria-label="下级分类">
      <div className={styles.subcategoryDirectoryHeading}>
        <span>下级目录</span>
        <span>{subcategories.length} 项</span>
      </div>
      <ol className={styles.subcategoryDirectoryList}>
        {subcategories.map((category) => (
          <li key={category.code}>
            <Link href={getCategoryHref(category.code, categories)}>
              <strong>{category.name}</strong>
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
