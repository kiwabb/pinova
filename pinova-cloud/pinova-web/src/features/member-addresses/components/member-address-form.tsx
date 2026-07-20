"use client";

import { Check, LoaderCircle, Save, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { validateMemberAddress } from "../lib/validate-member-address";
import type {
  MemberAddress,
  MemberAddressFieldErrors,
  MemberAddressFormValues,
} from "../types";
import styles from "../member-addresses.module.css";
import { AddressField } from "./address-field";
import { AddressRegionFieldset } from "./address-region-fieldset";

interface MemberAddressFormProps {
  address: MemberAddress | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: MemberAddressFormValues) => Promise<void>;
}

const EMPTY_VALUES: MemberAddressFormValues = {
  receiverName: "",
  receiverMobile: "",
  provinceCode: "",
  provinceName: "",
  cityCode: "",
  cityName: "",
  districtCode: "",
  districtName: "",
  detailAddress: "",
  postalCode: "",
  label: "",
  defaultAddress: false,
};

function initialValues(address: MemberAddress | null): MemberAddressFormValues {
  if (!address) return EMPTY_VALUES;
  return {
    receiverName: address.receiverName,
    receiverMobile: address.receiverMobile.startsWith("+86")
      ? address.receiverMobile.slice(3)
      : address.receiverMobile,
    provinceCode: address.provinceCode,
    provinceName: address.provinceName,
    cityCode: address.cityCode,
    cityName: address.cityName,
    districtCode: address.districtCode,
    districtName: address.districtName,
    detailAddress: address.detailAddress,
    postalCode: address.postalCode ?? "",
    label: address.label ?? "",
    defaultAddress: address.defaultAddress,
  };
}

export function MemberAddressForm({
  address,
  isSaving,
  onCancel,
  onSubmit,
}: MemberAddressFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(() => initialValues(address));
  const [errors, setErrors] = useState<MemberAddressFieldErrors>({});

  const updateValue = (name: keyof MemberAddressFormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const selectProvince = (provinceCode: string, provinceName: string) => {
    setValues((current) => ({
      ...current,
      provinceCode,
      provinceName,
      cityCode: "",
      cityName: "",
      districtCode: "",
      districtName: "",
    }));
    setErrors((current) => ({
      ...current,
      provinceCode: undefined,
      cityCode: undefined,
      districtCode: undefined,
    }));
  };

  const selectCity = (cityCode: string, cityName: string) => {
    setValues((current) => ({
      ...current,
      cityCode,
      cityName,
      districtCode: "",
      districtName: "",
    }));
    setErrors((current) => ({
      ...current,
      cityCode: undefined,
      districtCode: undefined,
    }));
  };

  const selectDistrict = (districtCode: string, districtName: string) => {
    setValues((current) => ({ ...current, districtCode, districtName }));
    setErrors((current) => ({ ...current, districtCode: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateMemberAddress(values);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstError}"]`)
          ?.focus();
      });
      return;
    }
    await onSubmit(values);
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.formHeading}>
        <div>
          <p>{address ? "编辑地址" : "新增地址"}</p>
          <h2>{address ? address.receiverName : "填写收货信息"}</h2>
        </div>
        <button type="button" className={styles.cancelIcon} onClick={onCancel}>
          <X aria-hidden="true" size={19} />
          <span className={styles.srOnly}>取消编辑</span>
        </button>
      </div>

      <div className={styles.formGrid}>
        <AddressField
          autoComplete="name"
          error={errors.receiverName}
          label="收货人姓名"
          maxLength={64}
          name="receiverName"
          placeholder="姓名"
          value={values.receiverName}
          onChange={updateValue}
        />
        <AddressField
          autoComplete="tel"
          error={errors.receiverMobile}
          label="手机号"
          maxLength={32}
          name="receiverMobile"
          placeholder="138 0000 0000"
          value={values.receiverMobile}
          onChange={updateValue}
        />
      </div>

      <AddressRegionFieldset
        errors={errors}
        region={values}
        onSelectCity={selectCity}
        onSelectDistrict={selectDistrict}
        onSelectProvince={selectProvince}
      />

      <label className={styles.field}>
        <span>详细地址</span>
        <textarea
          autoComplete="street-address"
          name="detailAddress"
          maxLength={255}
          rows={3}
          placeholder="街道、门牌号、楼栋与房间号"
          value={values.detailAddress}
          aria-invalid={Boolean(errors.detailAddress)}
          aria-describedby={errors.detailAddress ? "detailAddress-error" : undefined}
          onChange={(event) => updateValue("detailAddress", event.target.value)}
        />
        {errors.detailAddress && (
          <small id="detailAddress-error" className={styles.fieldError} role="alert">
            {errors.detailAddress}
          </small>
        )}
      </label>

      <div className={styles.formGrid}>
        <AddressField
          autoComplete="postal-code"
          error={errors.postalCode}
          label="邮政编码（选填）"
          maxLength={16}
          name="postalCode"
          placeholder="430000"
          value={values.postalCode}
          onChange={updateValue}
        />
        <AddressField
          error={errors.label}
          label="地址标签（选填）"
          maxLength={32}
          name="label"
          placeholder="家、公司"
          value={values.label}
          onChange={updateValue}
        />
      </div>

      <label className={styles.defaultToggle}>
        <input
          type="checkbox"
          name="defaultAddress"
          checked={values.defaultAddress}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              defaultAddress: event.target.checked,
            }))
          }
        />
        <span className={styles.toggleMark} aria-hidden="true">
          {values.defaultAddress && <Check size={13} strokeWidth={3} />}
        </span>
        设为默认收货地址
      </label>

      <div className={styles.formActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          取消
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSaving}>
          {isSaving ? (
            <LoaderCircle className={styles.spinner} aria-hidden="true" size={18} />
          ) : (
            <Save aria-hidden="true" size={18} />
          )}
          {isSaving ? "正在保存" : "保存地址"}
        </button>
      </div>
    </form>
  );
}
