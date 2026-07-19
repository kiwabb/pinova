import Link from "next/link";
import { Check, MapPin, Plus } from "lucide-react";
import type { MemberAddress } from "@/features/member-addresses";
import styles from "../checkout.module.css";

interface CheckoutAddressListProps {
  addresses: MemberAddress[];
  selectedAddressId: string;
  onSelectAddress: (addressId: string) => void;
}

function displayMobile(value: string) {
  if (/^\+86\d{11}$/.test(value)) {
    return `${value.slice(3, 6)} ${value.slice(6, 10)} ${value.slice(10)}`;
  }
  return value;
}

export function CheckoutAddressList({
  addresses,
  selectedAddressId,
  onSelectAddress,
}: CheckoutAddressListProps) {
  return (
    <section className={styles.section} aria-labelledby="shipping-address-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>01</span>
          <h2 id="shipping-address-title">收货地址</h2>
        </div>
        <Link href="/account/addresses">
          <Plus aria-hidden="true" size={16} />
          管理地址
        </Link>
      </div>

      {addresses.length === 0 ? (
        <div className={styles.addressEmpty}>
          <MapPin aria-hidden="true" size={24} />
          <div>
            <strong>还没有可用的收货地址</strong>
            <p>新增地址后返回此页继续确认订单。</p>
          </div>
          <Link href="/account/addresses">新增地址</Link>
        </div>
      ) : (
        <div className={styles.addressGrid} role="radiogroup" aria-label="选择收货地址">
          {addresses.map((address) => {
            const selected = address.id === selectedAddressId;
            return (
              <label
                key={address.id}
                className={styles.addressOption}
                data-selected={selected || undefined}
              >
                <input
                  type="radio"
                  name="shippingAddressId"
                  value={address.id}
                  checked={selected}
                  onChange={() => onSelectAddress(address.id)}
                />
                <span className={styles.addressCheck} aria-hidden="true">
                  {selected && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={styles.addressContent}>
                  <span className={styles.addressIdentity}>
                    <strong>{address.receiverName}</strong>
                    <span>{displayMobile(address.receiverMobile)}</span>
                    {address.defaultAddress && <small>默认</small>}
                  </span>
                  <span className={styles.addressText}>
                    {address.provinceName}
                    {address.cityName}
                    {address.districtName}
                    {address.detailAddress}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
