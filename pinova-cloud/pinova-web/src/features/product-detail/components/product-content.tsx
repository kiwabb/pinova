import Image from "next/image";
import type {
  ProductDetailContent as ProductDetailContentData,
  ProductDetailMedia,
} from "@/data/product-detail";
import styles from "../product-detail.module.css";

interface ProductContentProps {
  content: ProductDetailContentData;
  mediaByObjectKey: Map<string, ProductDetailMedia>;
}

function parsePackingItems(packingList: string | null) {
  if (!packingList?.trim()) return [];
  return packingList
    .split(/\n|、|；|;|，|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductContent({ content, mediaByObjectKey }: ProductContentProps) {
  const packingItems = parsePackingItems(content.packingList);
  const notes = [
    ["使用说明", content.usageInstructions],
    ["售后说明", content.afterSalesNote],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className={styles.contentBand}>
      {packingItems.length > 0 && (
        <section className={styles.packingCard} aria-labelledby="packing-title">
          <h2 id="packing-title">套装包含</h2>
          <ul className={styles.packingGrid}>
            {packingItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true" />
                <strong>{item}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.detailContent} aria-labelledby="detail-content-title">
        <header className={styles.detailContentHeader}>
          <h2 id="detail-content-title">商品详情</h2>
        </header>
        <div className={styles.documentBlocks}>
          {content.document.blocks.map((block, index) => {
            if (block.type === "heading" && block.data.text) {
              return <h3 key={`${block.type}-${index}`}>{block.data.text}</h3>;
            }
            if (block.type === "paragraph" && block.data.text) {
              return <p key={`${block.type}-${index}`}>{block.data.text}</p>;
            }
            if (block.type === "image" && block.data.objectKey) {
              const media = mediaByObjectKey.get(block.data.objectKey);
              return media ? (
                <figure key={`${block.type}-${index}`}>
                  <Image
                    src={media.url}
                    alt={block.data.alt ?? media.altText ?? ""}
                    width={media.width}
                    height={media.height}
                    sizes="(max-width: 900px) 100vw, 760px"
                  />
                </figure>
              ) : null;
            }
            return null;
          })}
        </div>
      </section>

      {notes.length > 0 && (
        <section className={styles.notes} aria-label="商品说明">
          {notes.map(([title, text]) => (
            <div key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
