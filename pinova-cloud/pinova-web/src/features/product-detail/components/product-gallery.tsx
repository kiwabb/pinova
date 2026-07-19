import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, Play } from "lucide-react";
import type { ProductDetailMedia } from "@/data/product-detail";
import styles from "../product-detail.module.css";

interface ProductGalleryProps {
  media: ProductDetailMedia[];
  productName: string;
  selectedMediaId: string | null;
  onSelectMedia: (mediaId: string) => void;
}

export function ProductGallery({
  media,
  productName,
  selectedMediaId,
  onSelectMedia,
}: ProductGalleryProps) {
  const selectedIndex = Math.max(
    0,
    media.findIndex((item) => item.id === selectedMediaId),
  );
  const selectedMedia = media[selectedIndex] ?? media[0] ?? null;
  const hasMultipleMedia = media.length > 1;

  const go = (delta: number) => {
    if (media.length < 2) return;
    const next = (selectedIndex + delta + media.length) % media.length;
    onSelectMedia(media[next].id);
  };

  return (
    <section
      className={styles.gallery}
      aria-label={`${productName} 商品图片`}
    >
      <div className={styles.galleryStage}>
        {selectedMedia?.mediaType === 2 ? (
          <video
            key={selectedMedia.id}
            controls
            poster={selectedMedia.coverUrl ?? undefined}
            preload="metadata"
            aria-label={selectedMedia.altText ?? `${productName} 商品视频`}
          >
            <source src={selectedMedia.url} type={selectedMedia.mimeType} />
          </video>
        ) : selectedMedia ? (
          <Image
            key={selectedMedia.id}
            src={selectedMedia.url}
            alt={selectedMedia.altText ?? productName}
            fill
            fetchPriority="high"
            loading="eager"
            sizes="(max-width: 900px) 100vw, 52vw"
          />
        ) : (
          <div className={styles.galleryEmpty} aria-label="暂无商品图片">
            <ImageIcon aria-hidden="true" size={34} />
          </div>
        )}

        {hasMultipleMedia && (
          <>
            <button
              type="button"
              className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
              onClick={() => go(-1)}
              aria-label="上一张"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <button
              type="button"
              className={`${styles.galleryNav} ${styles.galleryNavNext}`}
              onClick={() => go(1)}
              aria-label="下一张"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </button>
            <p className={styles.galleryPager} aria-live="polite">
              {selectedIndex + 1} / {media.length}
            </p>
          </>
        )}
      </div>

      {hasMultipleMedia && (
        <div className={styles.thumbnailList} aria-label="商品媒体缩略图">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={
                item.id === selectedMedia?.id ? styles.thumbnailActive : ""
              }
              onClick={() => onSelectMedia(item.id)}
              aria-label={`查看第 ${index + 1} 个商品媒体`}
              aria-pressed={item.id === selectedMedia?.id}
            >
              {item.mediaType === 2 && (
                <span className={styles.videoBadge}>
                  <Play aria-hidden="true" size={14} />
                  视频
                </span>
              )}
              {item.mediaType === 2 && !item.coverUrl ? (
                <Play aria-hidden="true" size={22} />
              ) : (
                <Image
                  src={item.mediaType === 2 ? item.coverUrl! : item.url}
                  alt=""
                  fill
                  sizes="72px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
