"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { PinovaBrand } from "@/components/pinova-brand";
import styles from "./error.module.css";

interface AppErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function AppError({
  error,
  unstable_retry,
}: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="返回 PINOVA 首页">
          <PinovaBrand />
        </Link>
      </header>

      <main className={styles.main}>
        <section
          className={styles.message}
          role="alert"
          aria-labelledby="error-title"
        >
          <span className={styles.messageIcon} aria-hidden="true">
            <TriangleAlert size={22} />
          </span>
          <h1 id="error-title">页面加载失败</h1>
          <p className={styles.description}>
            页面加载过程中发生错误。请重新加载；如果仍然失败，可以返回首页重新进入。
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={unstable_retry}>
              <RefreshCw aria-hidden="true" size={18} />
              重新加载
            </button>
            <Link href="/">
              <ArrowLeft aria-hidden="true" size={18} />
              返回首页
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
