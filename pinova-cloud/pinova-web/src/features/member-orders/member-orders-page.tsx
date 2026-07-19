"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CommercePageHeader } from "@/components/commerce-page-header";
import { PaymentDialog } from "@/features/payments";
import { MemberOrderCard } from "./components/member-order-card";
import { OrderStatusFilter } from "./components/order-status-filter";
import {
  listMemberOrders,
  MemberOrderApiError,
} from "./lib/member-order-api";
import type {
  MemberOrderPageData,
  MemberOrderStatusFilter,
} from "./types";
import styles from "./member-orders.module.css";

const PAGE_SIZE = 10;

function requestErrorMessage(error: unknown) {
  if (error instanceof MemberOrderApiError) return error.message;
  return "订单暂时无法读取，请稍后重试";
}

export function MemberOrdersPage() {
  const [filter, setFilter] = useState<MemberOrderStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MemberOrderPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [paymentCheckoutNo, setPaymentCheckoutNo] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void listMemberOrders({ filter, page, pageSize: PAGE_SIZE }, controller.signal)
      .then((nextData) => {
        setData(nextData);
        setRequiresLogin(false);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        if (
          requestError instanceof MemberOrderApiError &&
          requestError.status === 401
        ) {
          setData(null);
          setRequiresLogin(true);
        } else {
          setError(requestErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [filter, page, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const reload = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((value) => value + 1);
  };
  const selectFilter = (nextFilter: MemberOrderStatusFilter) => {
    setIsLoading(true);
    setError(null);
    setFilter(nextFilter);
    setPage(1);
  };
  const changePage = (nextPage: number) => {
    setIsLoading(true);
    setError(null);
    setPage(nextPage);
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#orders-content">
        跳到订单内容
      </a>
      <CommercePageHeader
        backHref="/account"
        backLabel="返回账户"
        currentArea="account"
        showNavigation={false}
      />

      <main id="orders-content" className={styles.main}>
        <header className={styles.pageHeading}>
          <div className={styles.headingIcon} aria-hidden="true">
            <ClipboardList size={25} />
          </div>
          <div>
            <p>会员账户</p>
            <h1>我的订单</h1>
            <span>查看订单状态、成交商品与金额。</span>
          </div>
          {data && !isLoading && (
            <span className={styles.orderCount}>{data.total} 笔订单</span>
          )}
        </header>

        {!requiresLogin && (
          <OrderStatusFilter
            value={filter}
            onSelect={selectFilter}
          />
        )}

        {error && data && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle aria-hidden="true" size={19} />
            <span>{error}</span>
            <button type="button" onClick={reload}>
              <RefreshCw aria-hidden="true" size={17} />
              重试
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={styles.statePanel} role="status" aria-live="polite">
            <LoaderCircle className={styles.spinner} aria-hidden="true" size={25} />
            <span>正在读取订单</span>
          </div>
        ) : requiresLogin ? (
          <section className={styles.statePanel}>
            <LockKeyhole aria-hidden="true" size={30} />
            <h2>登录后查看订单</h2>
            <p>订单只对下单时使用的会员账户可见。</p>
            <Link href="/account?mode=login">
              登录会员账户
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </section>
        ) : error && !data ? (
          <section className={styles.statePanel} role="alert">
            <AlertCircle aria-hidden="true" size={30} />
            <h2>订单加载失败</h2>
            <p>{error}</p>
            <button type="button" onClick={reload}>
              <RefreshCw aria-hidden="true" size={17} />
              重新加载
            </button>
          </section>
        ) : data && data.items.length > 0 ? (
          <>
            <section className={styles.orderList} aria-label="订单列表">
              {data.items.map((order) => (
                <MemberOrderCard
                  key={order.orderNo}
                  order={order}
                  onPay={setPaymentCheckoutNo}
                />
              ))}
            </section>

            {totalPages > 1 && (
              <nav className={styles.pagination} aria-label="订单分页">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => changePage(Math.max(1, page - 1))}
                >
                  <ArrowLeft aria-hidden="true" size={17} />
                  上一页
                </button>
                <span>
                  第 {page} / {totalPages} 页
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => changePage(Math.min(totalPages, page + 1))}
                >
                  下一页
                  <ArrowRight aria-hidden="true" size={17} />
                </button>
              </nav>
            )}
          </>
        ) : data ? (
          <section className={styles.statePanel}>
            <ShoppingBag aria-hidden="true" size={30} />
            <h2>{filter === "ALL" ? "还没有订单" : "没有该状态的订单"}</h2>
            <p>
              {filter === "ALL"
                ? "完成一次结算后，订单会显示在这里。"
                : "可以切换其他状态继续查看。"}
            </p>
            {filter === "ALL" ? (
              <Link href="/">
                去商城逛逛
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => selectFilter("ALL")}
              >
                查看全部订单
              </button>
            )}
          </section>
        ) : null}
      </main>
      {paymentCheckoutNo && (
        <PaymentDialog
          checkoutNo={paymentCheckoutNo}
          onClose={() => setPaymentCheckoutNo(null)}
          onPaid={reload}
        />
      )}
    </div>
  );
}
