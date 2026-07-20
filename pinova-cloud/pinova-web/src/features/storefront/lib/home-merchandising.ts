import type { StaticImageData } from "next/image";
import heroImage from "@/assets/storefront/pinova-atelier-hero.webp";
import heroMobileImage from "@/assets/storefront/pinova-atelier-hero-mobile.webp";
import storeImage from "@/assets/storefront/pinova-atelier-store.webp";
import storeMobileImage from "@/assets/storefront/pinova-atelier-store-mobile.webp";
import {
  isProductPurchasable,
  type StoreProduct,
} from "@/data/storefront";

interface ArtDirectedHomeVisual {
  alt: string;
  desktopImage: StaticImageData;
  mobileImage: StaticImageData;
}

export const homeVisuals: {
  hero: ArtDirectedHomeVisual;
  store: ArtDirectedHomeVisual;
} = {
  hero: {
    desktopImage: heroImage,
    mobileImage: heroMobileImage,
    alt: "深色工作台上的武汉主题拼豆作品、分装彩豆与镊子",
  },
  store: {
    desktopImage: storeImage,
    mobileImage: storeMobileImage,
    alt: "陈列完整色号拼豆并设有创作桌的工作室空间场景示意",
  },
};

const FEATURED_PRODUCT_IMAGE_KEY = "product/demo/wuhan-kit.webp";

export type HomeProductKind =
  | "physical"
  | "digital"
  | "experience"
  | "other";

export interface HomeProductGroup {
  description: string;
  index: string;
  kind: HomeProductKind;
  label: string;
  products: StoreProduct[];
  title: string;
}

interface HomeProductGroupDefinition extends Omit<HomeProductGroup, "products"> {
  productType: number | null;
}

const HOME_PRODUCT_GROUPS: HomeProductGroupDefinition[] = [
  {
    description: "套装、补色豆、工具与成品",
    index: "01",
    kind: "physical",
    label: "实物",
    productType: 1,
    title: "实物材料",
  },
  {
    description: "图纸与色点方案",
    index: "02",
    kind: "digital",
    label: "数字",
    productType: 2,
    title: "数字图纸",
  },
  {
    description: "武汉门店预约与现场体验",
    index: "03",
    kind: "experience",
    label: "到店",
    productType: 3,
    title: "到店体验",
  },
  {
    description: "其他在售商品",
    index: "04",
    kind: "other",
    label: "其他",
    productType: null,
    title: "其他商品",
  },
];

export function getHomeFeaturedProduct(products: StoreProduct[]) {
  return products.find(
    (product) =>
      product.mainImageKey === FEATURED_PRODUCT_IMAGE_KEY &&
      isProductPurchasable(product),
  );
}

export function getHomeProductGroups(products: StoreProduct[]) {
  const knownTypes = new Set(
    HOME_PRODUCT_GROUPS.flatMap((group) =>
      group.productType === null ? [] : [group.productType],
    ),
  );

  return HOME_PRODUCT_GROUPS.flatMap<HomeProductGroup>((definition) => {
    const groupedProducts = products.filter((product) =>
      definition.productType === null
        ? !knownTypes.has(product.productType)
        : product.productType === definition.productType,
    );
    return groupedProducts.length
      ? [{ ...definition, products: groupedProducts }]
      : [];
  });
}

export function getHomeMerchandising(products: StoreProduct[]) {
  return {
    featuredProduct: getHomeFeaturedProduct(products),
    productGroups: getHomeProductGroups(products),
  };
}
