"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  type AuthenticationFieldErrors,
  validateAuthenticationForm,
} from "../lib/validate-authentication-form";
import type {
  AuthenticationFormValues,
  MemberAuthenticationMode,
} from "../types";
import styles from "../member-authentication.module.css";
import { PasswordField } from "./password-field";

type FieldName = keyof AuthenticationFormValues;

interface AuthenticationFormProps {
  error: string | null;
  isSubmitting: boolean;
  mode: MemberAuthenticationMode;
  onSubmit: (values: AuthenticationFormValues) => Promise<void>;
}

export function AuthenticationForm({
  error,
  isSubmitting,
  mode,
  onSubmit,
}: AuthenticationFormProps) {
  const [values, setValues] = useState<AuthenticationFormValues>({
    identifier: "",
    username: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] =
    useState<AuthenticationFieldErrors>({});

  const updateField = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAuthenticationForm(mode, values);
    setFieldErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0] as FieldName | undefined;
    if (firstInvalidField) {
      const fieldId =
        firstInvalidField === "confirmPassword"
          ? "account-confirm-password"
          : firstInvalidField === "password"
            ? "account-password"
            : `account-${firstInvalidField}`;
      document.getElementById(fieldId)?.focus();
      return;
    }
    await onSubmit({
      ...values,
      identifier: values.identifier.trim(),
      username: values.username.trim(),
      nickname: values.nickname.trim(),
    });
  };

  return (
    <div className={styles.formContent}>
      <nav className={styles.modeTabs} aria-label="账户操作">
        <Link
          href="/account?mode=login"
          aria-current={mode === "login" ? "page" : undefined}
        >
          登录
        </Link>
        <Link
          href="/account?mode=register"
          aria-current={mode === "register" ? "page" : undefined}
        >
          注册
        </Link>
      </nav>

      <div className={styles.formHeading}>
        <p>{mode === "login" ? "会员账户" : "创建账户"}</p>
        <h1>{mode === "login" ? "欢迎回来" : "加入 PINOVA"}</h1>
        <span>
          {mode === "login"
            ? "登录后继续逛商城与管理购物车。"
            : "注册后将自动登录。"}
        </span>
      </div>

      <form className={styles.form} noValidate onSubmit={submit}>
        {mode === "login" ? (
          <label className={styles.field} htmlFor="account-identifier">
            <span>用户名、手机号或邮箱</span>
            <input
              id="account-identifier"
              type="text"
              autoComplete="username"
              autoFocus
              aria-describedby={
                fieldErrors.identifier ? "account-identifier-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.identifier)}
              value={values.identifier}
              onChange={(event) => updateField("identifier", event.target.value)}
            />
            {fieldErrors.identifier && (
              <small
                id="account-identifier-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.identifier}
              </small>
            )}
          </label>
        ) : (
          <>
            <label className={styles.field} htmlFor="account-username">
              <span>用户名</span>
              <input
                id="account-username"
                type="text"
                autoComplete="username"
                autoFocus
                aria-describedby={
                  fieldErrors.username
                    ? "account-username-error"
                    : "account-username-help"
                }
                aria-invalid={Boolean(fieldErrors.username)}
                value={values.username}
                onChange={(event) => updateField("username", event.target.value)}
              />
              {fieldErrors.username ? (
                <small
                  id="account-username-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {fieldErrors.username}
                </small>
              ) : (
                <small id="account-username-help" className={styles.fieldHelp}>
                  4–32 位字母、数字或下划线
                </small>
              )}
            </label>
            <label className={styles.field} htmlFor="account-nickname">
              <span>昵称 <i>选填</i></span>
              <input
                id="account-nickname"
                type="text"
                autoComplete="nickname"
                aria-describedby={
                  fieldErrors.nickname ? "account-nickname-error" : undefined
                }
                aria-invalid={Boolean(fieldErrors.nickname)}
                value={values.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
              />
              {fieldErrors.nickname && (
                <small
                  id="account-nickname-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {fieldErrors.nickname}
                </small>
              )}
            </label>
          </>
        )}

        <PasswordField
          id="account-password"
          label="密码"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          error={fieldErrors.password}
          value={values.password}
          onValueChange={(value) => updateField("password", value)}
        />
        {mode === "register" && (
          <PasswordField
            id="account-confirm-password"
            label="确认密码"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            value={values.confirmPassword}
            onValueChange={(value) => updateField("confirmPassword", value)}
          />
        )}

        {error && (
          <p className={styles.submitError} role="alert">
            {error}
          </p>
        )}
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <LoaderCircle
              className={styles.spinner}
              aria-hidden="true"
              size={18}
            />
          )}
          {isSubmitting
            ? mode === "login"
              ? "正在登录"
              : "正在注册"
            : mode === "login"
              ? "登录"
              : "注册并登录"}
        </button>
      </form>
    </div>
  );
}
