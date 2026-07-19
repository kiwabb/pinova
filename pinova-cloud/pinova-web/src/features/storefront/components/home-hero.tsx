import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { StoreCategory, StoreProduct } from "@/data/storefront";
import { formatPrice } from "../lib/format";
import { homeVisuals } from "../lib/home-merchandising";
import homeStyles from "../home.module.css";

interface HomeHeroProps {
  categories: StoreCategory[];
  product?: StoreProduct;
}

export function HomeHero({ product }: HomeHeroProps) {
  const title = product?.name ?? "拼豆创作材料";
  const detailHref = product
    ? `/products/${product.id}`
    : "/category/starter-kits";
  const imageSrc = product?.image ?? homeVisuals.hero.desktopImage;
  const imageAlt = product?.imageAlt ?? homeVisuals.hero.alt;
  const blurb =
    product?.description ??
    "材料、图纸与工具配齐，从新手套装开始这次创作。";

  return (
    <section className={homeStyles.hero} aria-labelledby="hero-title">
      <div className={homeStyles.homeContainer}>
        <div className={homeStyles.heroBanner}>
          <div className={homeStyles.heroCopy}>
            <p className={homeStyles.heroBadge}>精选商品</p>
            <h1 id="hero-title">{title}</h1>
            <p className={homeStyles.heroDesc}>{blurb}</p>
            {product?.priceFen != null && (
              <p className={homeStyles.heroPrice}>
                <strong>{formatPrice(product.priceFen)}</strong>
              </p>
            )}
            <div className={homeStyles.heroActions}>
              <Link className={homeStyles.heroPrimary} href={detailHref}>
                查看商品
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link
                className={homeStyles.heroSecondary}
                href="/category/starter-kits"
              >
                逛逛新手套装
              </Link>
            </div>
          </div>

          <div className={homeStyles.heroVisual}>
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 767px) 100vw, 55vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
