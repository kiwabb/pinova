"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  getCategoryHref,
  getCategoryPresentation,
  type StoreCategory,
} from "@/data/storefront";
import styles from "./storefront-shell.module.css";

interface CategoryMegaMenuProps {
  activeCategory: StoreCategory;
  categories: StoreCategory[];
  loadingCategoryIds: Set<string>;
  onActivateCategory: (category: StoreCategory) => void;
  onClose: () => void;
  onLoadCategory: (category: StoreCategory) => Promise<boolean>;
}

export function CategoryMegaMenu({
  activeCategory,
  categories,
  loadingCategoryIds,
  onActivateCategory,
  onClose,
  onLoadCategory,
}: CategoryMegaMenuProps) {
  const activePresentation = getCategoryPresentation(activeCategory.code);

  return (
    <div
      id="desktop-category-menu"
      className={styles.categoryMenu}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget as Node | null)
        ) {
          onClose();
        }
      }}
    >
      <nav
        className={styles.categoryMenuPanel}
        aria-label="商品分类菜单"
      >
        <div className={styles.categoryMenuRoots}>
          <Link
            className={styles.categoryMenuAll}
            href={getCategoryHref("all", categories)}
            onClick={onClose}
          >
            <span>全部商品</span>
            <ChevronRight aria-hidden="true" size={15} />
          </Link>
          {categories.map((category) => {
            const isActive = category.code === activeCategory.code;
            const presentation = getCategoryPresentation(category.code);
            return (
              <Link
                key={category.code}
                className={isActive ? styles.categoryMenuRootActive : ""}
                href={getCategoryHref(category.code, categories)}
                style={
                  {
                    "--category-color": presentation?.color ?? "#929991",
                  } as CSSProperties
                }
                onMouseEnter={() => onActivateCategory(category)}
                onFocus={() => onActivateCategory(category)}
                onClick={onClose}
              >
                <span>{category.name}</span>
                <ChevronRight aria-hidden="true" size={15} />
              </Link>
            );
          })}
        </div>

        <div
          key={activeCategory.code}
          className={styles.categoryMenuContent}
        >
          <div className={styles.categoryMenuHeading}>
            <div>
              <h2>{activeCategory.name}</h2>
              {activePresentation?.caption && (
                <p>{activePresentation.caption}</p>
              )}
            </div>
            <Link
              href={getCategoryHref(activeCategory.code, categories)}
              onClick={onClose}
            >
              查看全部
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          {!activeCategory.childrenLoaded ? (
            <div className={styles.categoryMenuState} aria-live="polite">
              <LoaderCircle
                className={styles.loadingIcon}
                aria-hidden="true"
                size={22}
              />
              <span>正在读取分类目录</span>
            </div>
          ) : activeCategory.children.length === 0 ? (
            <div className={styles.categoryMenuEmpty}>
              <p>当前分类没有下级目录，可直接查看全部商品。</p>
            </div>
          ) : (
            <div className={styles.categoryMenuGroups}>
              {activeCategory.children.map((category) => (
                <section
                  key={category.code}
                  onMouseEnter={() => void onLoadCategory(category)}
                >
                  <Link
                    className={styles.categoryMenuGroupTitle}
                    href={getCategoryHref(category.code, categories)}
                    onFocus={() => void onLoadCategory(category)}
                    onClick={onClose}
                  >
                    <strong>{category.name}</strong>
                    {loadingCategoryIds.has(category.id) ? (
                      <LoaderCircle
                        className={styles.loadingIcon}
                        aria-hidden="true"
                        size={15}
                      />
                    ) : (
                      <ChevronRight aria-hidden="true" size={15} />
                    )}
                  </Link>
                  {category.childrenLoaded && (
                    <div>
                      {category.children.map((child) => (
                        <Link
                          key={child.code}
                          href={getCategoryHref(child.code, categories)}
                          onClick={onClose}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
