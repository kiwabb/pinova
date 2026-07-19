"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import accountVisual from "@/assets/storefront/wuhan-kit.webp";
import { CommercePageHeader } from "@/components/commerce-page-header";
import { AuthenticationForm } from "./components/authentication-form";
import { MemberAccountPanel } from "./components/member-account-panel";
import {
  getCurrentMember,
  loginMember,
  logoutMember,
  MemberAuthenticationApiError,
  registerMember,
} from "./lib/member-authentication-api";
import type {
  AuthenticationFormValues,
  CurrentMember,
  MemberAuthenticationMode,
} from "./types";
import styles from "./member-authentication.module.css";

interface MemberAuthenticationPageProps {
  initialMode: MemberAuthenticationMode;
}

function errorMessage(error: unknown) {
  if (error instanceof MemberAuthenticationApiError) return error.message;
  return "会员服务暂时不可用，请稍后重试";
}

export function MemberAuthenticationPage({
  initialMode,
}: MemberAuthenticationPageProps) {
  const router = useRouter();
  const [member, setMember] = useState<CurrentMember | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getCurrentMember(controller.signal)
      .then(setMember)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError(errorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsCheckingSession(false);
      });
    return () => controller.abort();
  }, []);

  const submitAuthentication = async (values: AuthenticationFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const authenticatedMember =
        initialMode === "login"
          ? await loginMember({
              identifier: values.identifier,
              password: values.password,
            })
          : await registerMember({
              username: values.username,
              nickname: values.nickname,
              password: values.password,
              confirmPassword: values.confirmPassword,
            });
      setMember(authenticatedMember);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await logoutMember();
      setMember(null);
      router.replace("/account?mode=login");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#account-content">
        跳到账户内容
      </a>
      <CommercePageHeader
        backHref="/"
        backLabel="返回商城"
        currentArea="account"
        showNavigation={false}
      />
      <main id="account-content" className={styles.main}>
        <section className={styles.accountSurface} aria-label="会员账户">
          <div className={styles.visual}>
            <Image
              src={accountVisual}
              alt="由拼豆制作的武汉城市图案成品"
              fill
              priority
              sizes="(min-width: 768px) 480px, 100vw"
            />
          </div>
          <div className={styles.panel}>
            {isCheckingSession ? (
              <div
                className={styles.sessionLoading}
                role="status"
                aria-live="polite"
              >
                <LoaderCircle
                  className={styles.spinner}
                  aria-hidden="true"
                  size={24}
                />
                <span>正在读取会员状态</span>
              </div>
            ) : member ? (
              <MemberAccountPanel
                error={error}
                isLoggingOut={isSubmitting}
                member={member}
                onLogout={logout}
              />
            ) : (
              <AuthenticationForm
                key={initialMode}
                error={error}
                isSubmitting={isSubmitting}
                mode={initialMode}
                onSubmit={submitAuthentication}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
