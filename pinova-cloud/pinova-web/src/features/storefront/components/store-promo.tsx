import Link from "next/link";
import { ArrowRight } from "lucide-react";
import homeStyles from "../home.module.css";
import { homeVisuals } from "../lib/home-merchandising";
import { ResponsiveArtDirectedImage } from "./responsive-art-directed-image";

export function StorePromo() {
  return (
    <section className={homeStyles.store} aria-labelledby="store-title">
      <div className={`${homeStyles.homeContainer} ${homeStyles.storeCard}`}>
        <div className={homeStyles.storeMedia}>
          <ResponsiveArtDirectedImage
            className={homeStyles.storePicture}
            desktopImage={homeVisuals.store.desktopImage}
            mobileImage={homeVisuals.store.mobileImage}
            alt={homeVisuals.store.alt}
          />
        </div>
        <div className={homeStyles.storeCopy}>
          <p>武汉门店</p>
          <h2 id="store-title">到店体验</h2>
          <span>预约创作桌，带材料到店完成作品。</span>
          <Link href="/category/store-experience">
            预约到店
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
