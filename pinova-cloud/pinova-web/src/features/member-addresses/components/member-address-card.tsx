"use client";

import { Check, MapPin, Pencil, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { MemberAddress } from "../types";
import styles from "../member-addresses.module.css";

interface MemberAddressCardProps {
  address: MemberAddress;
  pending: boolean;
  onDelete: (address: MemberAddress) => Promise<void>;
  onEdit: (address: MemberAddress) => void;
  onSetDefault: (address: MemberAddress) => Promise<void>;
}

function displayMobile(value: string) {
  if (/^\+86\d{11}$/.test(value)) {
    return `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 10)} ${value.slice(10)}`;
  }
  return value;
}

export function MemberAddressCard({
  address,
  pending,
  onDelete,
  onEdit,
  onSetDefault,
}: MemberAddressCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <article className={styles.addressCard} aria-busy={pending}>
      <div className={styles.cardTopline}>
        <div className={styles.addressIdentity}>
          <strong>{address.receiverName}</strong>
          <span>{displayMobile(address.receiverMobile)}</span>
        </div>
        <div className={styles.addressBadges}>
          {address.defaultAddress && <span className={styles.defaultBadge}>默认</span>}
          {address.label && <span>{address.label}</span>}
        </div>
      </div>

      <p className={styles.addressText}>
        <MapPin aria-hidden="true" size={18} />
        <span>
          {address.provinceName}
          {address.cityName}
          {address.districtName}
          {address.detailAddress}
        </span>
      </p>

      <div className={styles.cardActions}>
        {!address.defaultAddress && (
          <button type="button" disabled={pending} onClick={() => void onSetDefault(address)}>
            <Star aria-hidden="true" size={17} />
            设为默认
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => onEdit(address)}>
          <Pencil aria-hidden="true" size={17} />
          编辑
        </button>
        <button
          type="button"
          className={styles.deleteButton}
          disabled={pending}
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 aria-hidden="true" size={17} />
          删除
        </button>
      </div>

      {confirmingDelete && (
        <div className={styles.deleteConfirm} role="group" aria-label="确认删除地址">
          <span>确认删除这条地址？</span>
          <button type="button" disabled={pending} onClick={() => void onDelete(address)}>
            <Check aria-hidden="true" size={16} />
            删除
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirmingDelete(false)}>
            <X aria-hidden="true" size={16} />
            取消
          </button>
        </div>
      )}
    </article>
  );
}
