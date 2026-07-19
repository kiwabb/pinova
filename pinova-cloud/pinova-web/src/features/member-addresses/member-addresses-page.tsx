"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  MapPinned,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CommercePageHeader } from "@/components/commerce-page-header";
import { MemberAddressCard } from "./components/member-address-card";
import { MemberAddressForm } from "./components/member-address-form";
import {
  createMemberAddress,
  deleteMemberAddress,
  listMemberAddresses,
  MemberAddressApiError,
  setDefaultMemberAddress,
  updateMemberAddress,
} from "./lib/member-address-api";
import type { MemberAddress, MemberAddressFormValues } from "./types";
import styles from "./member-addresses.module.css";

function requestErrorMessage(error: unknown) {
  if (error instanceof MemberAddressApiError) return error.message;
  return "收货地址暂时无法使用，请稍后重试";
}

export function MemberAddressesPage() {
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<MemberAddress | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

  const loadAddresses = useCallback(async (signal?: AbortSignal) => {
    try {
      const nextAddresses = await listMemberAddresses(signal);
      setAddresses(nextAddresses);
      setRequiresLogin(false);
      if (nextAddresses.length === 0) setIsFormOpen(true);
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return;
      }
      if (
        requestError instanceof MemberAddressApiError &&
        requestError.status === 401
      ) {
        setRequiresLogin(true);
      } else {
        setError(requestErrorMessage(requestError));
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listMemberAddresses(controller.signal)
      .then((nextAddresses) => {
        setAddresses(nextAddresses);
        setRequiresLogin(false);
        if (nextAddresses.length === 0) setIsFormOpen(true);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        if (
          requestError instanceof MemberAddressApiError &&
          requestError.status === 401
        ) {
          setRequiresLogin(true);
        } else {
          setError(requestErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const openCreateForm = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEditForm = (address: MemberAddress) => {
    setEditingAddress(address);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setEditingAddress(null);
    setIsFormOpen(false);
  };

  const saveAddress = async (values: MemberAddressFormValues) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingAddress) await updateMemberAddress(editingAddress, values);
      else await createMemberAddress(values);
      setAddresses(await listMemberAddresses());
      setSuccess(editingAddress ? "收货地址已更新" : "收货地址已保存");
      closeForm();
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const setDefault = async (address: MemberAddress) => {
    setPendingAddressId(address.id);
    setError(null);
    setSuccess(null);
    try {
      await setDefaultMemberAddress(address);
      setAddresses(await listMemberAddresses());
      setSuccess("默认收货地址已更新");
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setPendingAddressId(null);
    }
  };

  const deleteAddress = async (address: MemberAddress) => {
    setPendingAddressId(address.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteMemberAddress(address);
      const nextAddresses = await listMemberAddresses();
      setAddresses(nextAddresses);
      if (editingAddress?.id === address.id) closeForm();
      setSuccess("收货地址已删除");
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setPendingAddressId(null);
    }
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#address-content">
        跳到地址内容
      </a>
      <CommercePageHeader
        backHref="/account"
        backLabel="返回账户"
        currentArea="account"
        showNavigation={false}
      />

      <main id="address-content" className={styles.main}>
        <header className={styles.pageHeading}>
          <div className={styles.headingIcon} aria-hidden="true">
            <MapPinned size={25} />
          </div>
          <div>
            <p>会员账户</p>
            <h1>收货地址</h1>
            <span>管理常用收货信息与默认配送地址。</span>
          </div>
          {!requiresLogin && !isLoading && (
            <button type="button" className={styles.addButton} onClick={openCreateForm}>
              <Plus aria-hidden="true" size={18} />
              新增地址
            </button>
          )}
        </header>

        <div className={styles.liveRegion} aria-live="polite" aria-atomic="true">
          {success}
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle aria-hidden="true" size={19} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                void loadAddresses();
              }}
            >
              <RefreshCw aria-hidden="true" size={17} />
              重试
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingState} role="status" aria-live="polite">
            <LoaderCircle className={styles.spinner} aria-hidden="true" size={24} />
            正在读取收货地址
          </div>
        ) : requiresLogin ? (
          <section className={styles.loginState}>
            <MapPinned aria-hidden="true" size={30} />
            <h2>登录后管理收货地址</h2>
            <p>收货地址只保存在你的会员账户中。</p>
            <Link href="/account?mode=login">
              登录会员账户
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </section>
        ) : (
          <div className={styles.workspace} data-form-open={isFormOpen}>
            <section className={styles.addressList} aria-labelledby="saved-addresses-title">
              <div className={styles.sectionHeading}>
                <h2 id="saved-addresses-title">已保存地址</h2>
                <span>{addresses.length} / 20</span>
              </div>

              {addresses.length === 0 ? (
                <div className={styles.emptyState}>
                  <MapPinned aria-hidden="true" size={28} />
                  <h3>还没有收货地址</h3>
                  <p>保存第一条地址后，它会自动成为默认地址。</p>
                </div>
              ) : (
                <div className={styles.addressCards}>
                  {addresses.map((address) => (
                    <MemberAddressCard
                      key={address.id}
                      address={address}
                      pending={pendingAddressId === address.id}
                      onDelete={deleteAddress}
                      onEdit={openEditForm}
                      onSetDefault={setDefault}
                    />
                  ))}
                </div>
              )}
            </section>

            {isFormOpen && (
              <aside className={styles.formPanel} aria-label="收货地址表单">
                <MemberAddressForm
                  key={editingAddress?.id ?? "new-address"}
                  address={editingAddress}
                  isSaving={isSaving}
                  onCancel={closeForm}
                  onSubmit={saveAddress}
                />
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
