"use client";

import type { MemberAddressFormValues } from "../types";
import styles from "../member-addresses.module.css";

interface AddressFieldProps {
  autoComplete?: string;
  error?: string;
  label: string;
  maxLength: number;
  name: keyof MemberAddressFormValues;
  placeholder?: string;
  value: string;
  onChange: (name: keyof MemberAddressFormValues, value: string) => void;
}

export function AddressField({
  autoComplete,
  error,
  label,
  maxLength,
  name,
  placeholder,
  value,
  onChange,
}: AddressFieldProps) {
  const errorId = `${name}-error`;
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        name={name}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {error && (
        <small id={errorId} className={styles.fieldError} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
