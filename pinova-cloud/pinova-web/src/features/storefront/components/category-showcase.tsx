import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import {
  getCategoryHref,
  getCategoryPresentation,
  type StoreCategory,
} from "@/data/storefront";
import {
  categoryIcons,
  categoryIconTints,
} from "../lib/category-icons";
import homeStyles from "../home.module.css";

interface CategoryShowcaseProps {
  categories: StoreCategory[];
}

export function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  return (
    <section
      id="categories"
      className={homeStyles.explore}
      aria-labelledby="category-title"
    >
      <div className={homeStyles.homeContainer}>
        <header className={homeStyles.sectionHead}>
          <div>
            <h2 id="category-title">探索材料世界</h2>
            <p>发现更多创作可能</p>
          </div>
          <Link
            className={homeStyles.sectionMore}
            href={getCategoryHref("all", categories)}
          >
            查看全部商品
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </header>

        <ul className={homeStyles.exploreGrid}>
          {categories.map((category) => {
            const presentation = getCategoryPresentation(category.code);
            const Icon = categoryIcons[category.code];
            const tint = categoryIconTints[category.code] ?? "#f4f6f3";
            return (
              <li key={category.code}>
                <Link
                  className={homeStyles.exploreCard}
                  href={getCategoryHref(category.code, categories)}
                  style={
                    {
                      "--card-tint": tint,
                      "--index-color": presentation?.color ?? "#929991",
                    } as CSSProperties
                  }
                >
                  <span className={homeStyles.exploreIcon} aria-hidden="true">
                    {Icon ? <Icon size={20} strokeWidth={1.75} /> : null}
                  </span>
                  <span className={homeStyles.exploreText}>
                    <strong>{category.name}</strong>
                    <small>{presentation?.caption ?? category.code}</small>
                  </span>
                  <ArrowRight
                    className={homeStyles.exploreArrow}
                    aria-hidden="true"
                    size={16}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
