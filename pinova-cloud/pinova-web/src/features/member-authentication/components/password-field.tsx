"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import styles from "../member-authentication.module.css";

interface PasswordFieldProps {
  autoComplete: "current-password" | "new-password";
  error?: string;
  id: "account-password" | "account-confirm-password";
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}

export function PasswordField({
  autoComplete,
  error,
  id,
  label,
  onValueChange,
  value,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const descriptionId = error ? `${id}-error` : undefined;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <span className={styles.passwordInput}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          title={visible ? `隐藏${label}` : `显示${label}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff aria-hidden="true" size={18} />
          ) : (
            <Eye aria-hidden="true" size={18} />
          )}
        </button>
      </span>
      {error && (
        <small id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
