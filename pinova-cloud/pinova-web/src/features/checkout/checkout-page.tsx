"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Home,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useCallback, useState } from "react";
import { CommercePageHeader } from "@/components/commerce-page-header";
import { PaymentDialog } from "@/features/payments";
import { CheckoutAddressList } from "./components/checkout-address-list";
import { CheckoutItemList } from "./components/checkout-item-list";
import { CheckoutSummary } from "./components/checkout-summary";
import { useCheckout } from "./hooks/use-checkout";
import styles from "./checkout.module.css";

const MAX_REMARK_LENGTH = 200;

export function CheckoutPage() {
  const [buyerRemark, setBuyerRemark] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const {
    data,
    isSubmitting,
    load,
    loadError,
    placeOrder,
    selectedAddress,
    selectedAddressId,
    setSelectedAddressId,
    status,
    submitError,
    submittedCheckout,
    summary,
  } = useCheckout();
  const cartCount = data?.cart.items.reduce((total, item) => total + item.quantity, 0);
  const requiresPayment = submittedCheckout?.orders.some(
    (order) => order.status === "PENDING_PAYMENT",
  );
  const handlePaid = useCallback(() => setPaymentCompleted(true), []);

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#checkout-content">
        跳到结算内容
      </a>
      <CommercePageHeader
        backHref="/cart"
        backLabel="返回购物车"
        cartCount={cartCount}
      />

      <main id="checkout-content" className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/">
            <Home aria-hidden="true" size={15} />
            商城首页
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <Link href="/cart">购物车</Link>
          <ChevronRight aria-hidden="true" size={14} />
          <span aria-current="page">确认订单</span>
        </nav>

        <header className={styles.pageHeading}>
          <div className={styles.headingIcon} aria-hidden="true">
            <ShoppingBag size={25} />
          </div>
          <div>
            <p>结算</p>
            <h1>确认订单</h1>
            <span>核对商品与收货信息后提交。</span>
          </div>
        </header>

        {status === "loading" ? (
          <div className={styles.statePanel} role="status" aria-live="polite">
            <LoaderCircle className={styles.spinner} aria-hidden="true" size={26} />
            <span>正在读取结算信息</span>
          </div>
        ) : status === "requires-login" ? (
          <div className={styles.statePanel}>
            <LockKeyhole aria-hidden="true" size={28} />
            <h2>登录后继续结算</h2>
            <p>登录会员账户后即可选择收货地址并提交订单。</p>
            <Link href="/account?mode=login">
              登录会员账户
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        ) : status === "error" ? (
          <div className={styles.statePanel} role="alert">
            <AlertCircle aria-hidden="true" size={28} />
            <h2>结算信息加载失败</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()}>
              <RefreshCw aria-hidden="true" size={17} />
              重新加载
            </button>
          </div>
        ) : submittedCheckout ? (
          <div className={styles.statePanel} role="status" aria-live="polite">
            <CheckCircle2 aria-hidden="true" size={30} />
            <h2>{paymentCompleted ? "支付已完成" : "订单已提交"}</h2>
            <p>
              {paymentCompleted
                ? `本次结算的 ${submittedCheckout.orders.length} 笔订单已进入待履约`
                : `本次已创建 ${submittedCheckout.orders.length} 笔订单`}
            </p>
            <ul className={styles.submittedOrders} aria-label="已提交订单">
              {submittedCheckout.orders.map((order) => (
                <li key={order.id}>{order.orderNo}</li>
              ))}
            </ul>
            <div className={styles.stateActions}>
              {requiresPayment && !paymentCompleted && (
                <button type="button" onClick={() => setPaymentOpen(true)}>
                  <CreditCard aria-hidden="true" size={18} />
                  立即支付
                </button>
              )}
              <Link href="/account/orders">
                查看我的订单
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link href="/">继续逛商城</Link>
            </div>
          </div>
        ) : summary.items.length === 0 ? (
          <div className={styles.statePanel}>
            <ShoppingBag aria-hidden="true" size={28} />
            <h2>没有可结算商品</h2>
            <p>请先在购物车中勾选需要购买的商品。</p>
            <Link href="/cart">返回购物车</Link>
          </div>
        ) : summary.hasUnavailablePrice ? (
          <div className={styles.statePanel} role="alert">
            <AlertCircle aria-hidden="true" size={28} />
            <h2>部分商品暂不能结算</h2>
            <p>商品缺少有效价格，请返回购物车重新确认。</p>
            <Link href="/cart">返回购物车</Link>
          </div>
        ) : data ? (
          <div className={styles.workspace}>
            <div className={styles.contentColumn}>
              <CheckoutAddressList
                addresses={data.addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={setSelectedAddressId}
              />
              <CheckoutItemList items={summary.items} />
              <section className={styles.section} aria-labelledby="buyer-remark-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <span>03</span>
                    <h2 id="buyer-remark-title">订单备注</h2>
                  </div>
                  <small>{buyerRemark.length} / {MAX_REMARK_LENGTH}</small>
                </div>
                <label className={styles.remarkField}>
                  <span className={styles.srOnly}>订单备注（选填）</span>
                  <textarea
                    value={buyerRemark}
                    maxLength={MAX_REMARK_LENGTH}
                    rows={3}
                    placeholder="选填，可填写与本次订单相关的说明"
                    onChange={(event) => setBuyerRemark(event.target.value)}
                  />
                </label>
              </section>
            </div>
            <CheckoutSummary
              disabled={!selectedAddress}
              error={submitError}
              isSubmitting={isSubmitting}
              itemCount={summary.itemCount}
              productTotalFen={summary.productTotalFen}
              onSubmit={() => void placeOrder(buyerRemark)}
            />
          </div>
        ) : null}
      </main>
      {paymentOpen && submittedCheckout && (
        <PaymentDialog
          checkoutNo={submittedCheckout.checkoutNo}
          onClose={() => setPaymentOpen(false)}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
