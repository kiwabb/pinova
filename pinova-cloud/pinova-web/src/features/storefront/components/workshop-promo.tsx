import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { StoreProduct } from "@/data/storefront";
import homeStyles from "../home.module.css";

interface WorkshopPromoProps {
  product?: StoreProduct;
}

const SOURCE_TONES = [
  "paper",
  "paper",
  "rose",
  "rose",
  "paper",
  "leaf",
  "rose",
  "rose",
  "leaf",
  "leaf",
  "paper",
  "rose",
  "leaf",
  "paper",
  "paper",
  "paper",
];

const PATTERN_ROWS = [
  "...RR....",
  "..RRRR...",
  "..RRRR...",
  "...RR....",
  "...LL....",
  "..L.L....",
  ".L...L...",
];

const PATTERN_TONES = PATTERN_ROWS.join("").split("");

export function WorkshopPromo({ product }: WorkshopPromoProps) {
  return (
    <div className={`${homeStyles.creationStep} ${homeStyles.creationStepPattern}`}>
      <figure
        className={`${homeStyles.creationStepVisual} ${homeStyles.creationWorkbench}`}
      >
        <div className={homeStyles.workbenchFlow} aria-hidden="true">
          <div className={homeStyles.workbenchStage}>
            <span>INPUT / IMAGE</span>
            <div className={homeStyles.workbenchSource}>
              {SOURCE_TONES.map((tone, index) => (
                <i key={`${tone}-${index}`} data-tone={tone} />
              ))}
            </div>
            <small>原图抽象</small>
          </div>

          <ArrowRight
            className={homeStyles.workbenchArrow}
            aria-hidden="true"
            size={18}
          />

          <div className={homeStyles.workbenchStage}>
            <span>GRID / 09 × 07</span>
            <div className={homeStyles.workbenchMatrix}>
              {PATTERN_TONES.map((tone, index) => (
                <i key={`${tone}-${index}`} data-tone={tone} />
              ))}
            </div>
            <small>拼板坐标</small>
          </div>

          <ArrowRight
            className={homeStyles.workbenchArrow}
            aria-hidden="true"
            size={18}
          />

          <div className={homeStyles.workbenchStage}>
            <span>OUTPUT / COLORS</span>
            <div className={homeStyles.workbenchColors}>
              <p>
                <i data-tone="rose" />
                <b>暖红</b>
              </p>
              <p>
                <i data-tone="leaf" />
                <b>松绿</b>
              </p>
              <p>
                <i data-tone="paper" />
                <b>米白</b>
              </p>
            </div>
            <small>色号清单</small>
          </div>
        </div>
        <figcaption>图像转拼板流程示意</figcaption>
      </figure>
      <div className={homeStyles.creationStepCopy}>
        <span className={homeStyles.creationStepIndex}>01 / PATTERN LAB</span>
        <h3>一张照片，拆成可以动手的色点</h3>
        <p>
          导入图像、匹配色板、逐颗调整，再把准确的色号与用量带回材料目录。
        </p>
        {product ? (
          <Link
            className={homeStyles.creationStepAction}
            href={`/products/${product.id}`}
          >
            {product.name}
            <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        ) : (
          <Link
            className={homeStyles.creationStepAction}
            href="/category/pattern-kits"
          >
            浏览图纸材料
            <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}
