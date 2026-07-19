"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format-price";
import {
  createPayment,
  PaymentApiError,
  refreshPayment,
  simulatePayment,
} from "../lib/payment-api";
import type { MockPaymentOutcome, PaymentOrder } from "../types";
import styles from "../payment-dialog.module.css";

interface PaymentDialogProps {
  checkoutNo: string;
  onClose: () => void;
  onPaid?: () => void;
}

type DialogState = "loading" | "ready" | "working" | "error";

function requestErrorMessage(error: unknown) {
  if (error instanceof PaymentApiError) return error.message;
  return "支付服务暂时不可用，请稍后重试";
}

function statusHeading(payment: PaymentOrder) {
  switch (payment.status) {
    case "SUCCEEDED":
      return "支付已完成";
    case "FAILED":
      return "支付未完成";
    case "CLOSED":
      return "支付已关闭";
    case "REVIEW_REQUIRED":
      return "支付结果待确认";
    default:
      return "确认支付";
  }
}

function statusDescription(payment: PaymentOrder) {
  switch (payment.status) {
    case "SUCCEEDED":
      return "订单状态正在同步，返回订单页即可查看最新结果。";
    case "FAILED":
      return payment.failureMessage ?? "本次支付没有完成，可以重新发起。";
    case "CLOSED":
      return "支付有效期已结束，请回到订单页查看。";
    case "REVIEW_REQUIRED":
      return "渠道已返回结果，但订单尚未安全推进，请联系管理员处理。";
    default:
      return "本次结算的订单会一起支付。";
  }
}

function expiresLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function PaymentDialog({
  checkoutNo,
  onClose,
  onPaid,
}: PaymentDialogProps) {
  const [state, setState] = useState<DialogState>("loading");
  const [payment, setPayment] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const onPaidRef = useRef(onPaid);
  const paidNotifiedRef = useRef(false);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const notifyPaid = useCallback(() => {
    if (paidNotifiedRef.current) return;
    paidNotifiedRef.current = true;
    onPaidRef.current?.();
  }, []);

  useEffect(() => {
    let active = true;
    void createPayment(checkoutNo)
      .then((nextPayment) => {
        if (!active) return;
        setPayment(nextPayment);
        setState("ready");
        if (nextPayment.status === "SUCCEEDED") notifyPaid();
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestErrorMessage(requestError));
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [checkoutNo, notifyPaid]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose]);

  const updatePayment = async (
    action: () => Promise<PaymentOrder>,
  ) => {
    setState("working");
    setError(null);
    try {
      const nextPayment = await action();
      setPayment(nextPayment);
      setState("ready");
      if (nextPayment.status === "SUCCEEDED") notifyPaid();
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
      setState("ready");
    }
  };

  const retry = () => {
    void updatePayment(() => createPayment(checkoutNo));
  };
  const refresh = () => {
    if (!payment) return;
    void updatePayment(() => refreshPayment(payment.paymentNo));
  };
  const simulate = (outcome: MockPaymentOutcome) => {
    if (!payment) return;
    void updatePayment(() => simulatePayment(payment.paymentNo, outcome));
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden="true">
            <CircleDollarSign size={22} />
          </div>
          <div>
            <p>订单支付</p>
            <h2 id="payment-dialog-title">{payment ? statusHeading(payment) : "准备支付"}</h2>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭支付窗口" autoFocus>
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        {state === "loading" ? (
          <div className={styles.state} role="status" aria-live="polite">
            <LoaderCircle className={styles.spinner} aria-hidden="true" size={26} />
            <span>正在准备支付单</span>
          </div>
        ) : state === "error" ? (
          <div className={styles.state} role="alert">
            <AlertCircle aria-hidden="true" size={28} />
            <p>{error}</p>
            <button className={styles.primaryButton} type="button" onClick={retry}>
              <RefreshCw aria-hidden="true" size={17} />
              重新准备
            </button>
          </div>
        ) : payment ? (
          <>
            <div className={styles.content}>
              <div className={styles.amountBlock}>
                <span>本次结算应付</span>
                <strong>{formatPrice(payment.amountFen)}</strong>
              </div>
              <div className={styles.metaGrid}>
                <span>关联订单</span>
                <strong>{payment.orderCount} 笔</strong>
                <span>支付有效期</span>
                <strong>{expiresLabel(payment.expiresAt)}</strong>
              </div>
              <p className={styles.description}>{statusDescription(payment)}</p>
              {payment.mockMode && payment.status === "PENDING" && (
                <div className={styles.mockPanel}>
                  <span className={styles.mockLabel}>
                    <ShieldCheck aria-hidden="true" size={15} />
                    本地模拟渠道
                  </span>
                  <p>选择结果以继续验证订单和库存状态。</p>
                  <div className={styles.actionRow}>
                    <button className={styles.primaryButton} type="button" disabled={state === "working"} onClick={() => simulate("SUCCESS")}>
                      {state === "working" ? <LoaderCircle className={styles.buttonSpinner} aria-hidden="true" size={17} /> : <CheckCircle2 aria-hidden="true" size={17} />}
                      模拟支付成功
                    </button>
                    <button className={styles.secondaryButton} type="button" disabled={state === "working"} onClick={() => simulate("FAILED")}>
                      模拟失败
                    </button>
                  </div>
                </div>
              )}
              {payment.status === "PENDING" && !payment.mockMode && (
                <div className={styles.waitingPanel}>
                  <Clock3 aria-hidden="true" size={18} />
                  <span>等待支付渠道确认</span>
                  <button type="button" onClick={refresh} disabled={state === "working"}>
                    刷新结果
                  </button>
                </div>
              )}
              {payment.status === "FAILED" && (
                <button className={styles.primaryButton} type="button" onClick={retry} disabled={state === "working"}>
                  <RefreshCw aria-hidden="true" size={17} />
                  重新发起支付
                </button>
              )}
              {error && <p className={styles.error} role="alert">{error}</p>}
            </div>
            <footer className={styles.footer}>
              <span>支付单 {payment.paymentNo}</span>
              <button type="button" onClick={onClose}>返回订单</button>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}
