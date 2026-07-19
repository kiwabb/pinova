"use client";

import Link from "next/link";
import {
  ArrowRight,
  LoaderCircle,
  LogOut,
  MapPinned,
  ReceiptText,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import type { CurrentMember } from "../types";
import styles from "../member-authentication.module.css";

interface MemberAccountPanelProps {
  error: string | null;
  isLoggingOut: boolean;
  member: CurrentMember;
  onLogout: () => Promise<void>;
}

export function MemberAccountPanel({
  error,
  isLoggingOut,
  member,
  onLogout,
}: MemberAccountPanelProps) {
  return (
    <div className={styles.memberPanel}>
      <div className={styles.memberAvatar} aria-hidden="true">
        <UserRound size={30} />
      </div>
      <div className={styles.memberHeading}>
        <p>会员账户</p>
        <h1>欢迎回来，{member.nickname}</h1>
      </div>

      <div className={styles.memberActions}>
        <Link href="/account/orders">
          <ReceiptText aria-hidden="true" size={19} />
          <span>
            <strong>我的订单</strong>
            <small>查看订单状态、商品与成交金额</small>
          </span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
        <Link href="/">
          <Store aria-hidden="true" size={19} />
          <span>
            <strong>继续逛商城</strong>
            <small>浏览材料、图纸与到店体验</small>
          </span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
        <Link href="/cart">
          <ShoppingBag aria-hidden="true" size={19} />
          <span>
            <strong>查看购物车</strong>
            <small>确认已选商品与数量</small>
          </span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
        <Link href="/account/addresses">
          <MapPinned aria-hidden="true" size={19} />
          <span>
            <strong>收货地址</strong>
            <small>管理常用地址与默认地址</small>
          </span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>

      {error && (
        <p className={styles.submitError} role="alert">
          {error}
        </p>
      )}
      <button
        className={styles.logoutButton}
        type="button"
        disabled={isLoggingOut}
        onClick={() => void onLogout()}
      >
        {isLoggingOut ? (
          <LoaderCircle className={styles.spinner} aria-hidden="true" size={18} />
        ) : (
          <LogOut aria-hidden="true" size={18} />
        )}
        {isLoggingOut ? "正在退出" : "退出登录"}
      </button>
    </div>
  );
}
