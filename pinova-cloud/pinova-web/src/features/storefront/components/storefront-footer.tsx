import Link from "next/link";
import { PinovaBrand } from "@/components/pinova-brand";
import styles from "./storefront-shell.module.css";

export function StorefrontFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerBrand}>
          <Link href="/" aria-label="返回 Pinova 商城首页">
            <PinovaBrand tone="light" />
          </Link>
          <p>拼豆材料、数字图纸与武汉到店体验。</p>
        </div>

        <nav className={styles.footerDirectory} aria-label="页尾商品目录">
          <p>商品目录</p>
          <Link href="/category/all">
            全部商品
          </Link>
          <Link href="/category/starter-kits">
            新手材料
          </Link>
          <Link href="/category/pattern-kits">
            图纸方案
          </Link>
          <Link href="/category/tools">
            工具配件
          </Link>
          <Link href="/category/store-experience">
            到店体验
          </Link>
          <Link href="/account">
            我的账户
          </Link>
        </nav>
      </div>

      <div className={styles.footerMeta}>
        <span>© 2026 PINOVA</span>
        <span>武汉</span>
      </div>
    </footer>
  );
}
