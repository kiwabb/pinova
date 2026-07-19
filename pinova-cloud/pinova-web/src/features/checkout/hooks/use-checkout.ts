"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentMember } from "@/features/member-authentication";
import {
  listMemberAddresses,
  type MemberAddress,
} from "@/features/member-addresses";
import { getShoppingCart } from "@/lib/shopping-cart-api";
import { submitOrder } from "../lib/order-api";
import type {
  CheckoutData,
  CheckoutSummary,
  SubmittedCheckout,
  SubmitOrderInput,
} from "../types";

type CheckoutStatus = "loading" | "ready" | "requires-login" | "error";

function requestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "结算信息加载失败，请稍后重试";
}

function summarizeCheckout(data: CheckoutData | null): CheckoutSummary {
  const items = data?.cart.items.filter((item) => item.selected) ?? [];
  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    productTotalFen: items.reduce(
      (total, item) => total + (item.priceFen ?? 0) * item.quantity,
      0,
    ),
    hasUnavailablePrice: items.some((item) => item.priceFen === null),
  };
}

async function fetchCheckoutData(): Promise<CheckoutData | null> {
  const member = await getCurrentMember();
  if (!member) return null;
  const [cart, addresses] = await Promise.all([
    getShoppingCart(),
    listMemberAddresses(),
  ]);
  return { cart, addresses };
}

export function useCheckout() {
  const [status, setStatus] = useState<CheckoutStatus>("loading");
  const [data, setData] = useState<CheckoutData | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCheckout, setSubmittedCheckout] =
    useState<SubmittedCheckout | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const applyCheckoutData = useCallback((nextData: CheckoutData) => {
    setData(nextData);
    setSelectedAddressId((current) => {
      if (nextData.addresses.some((address) => address.id === current)) return current;
      return (
        nextData.addresses.find((address) => address.defaultAddress)?.id ??
        nextData.addresses[0]?.id ??
        ""
      );
    });
    setStatus("ready");
  }, []);

  const load = useCallback(
    async (isActive: () => boolean = () => true) => {
      setStatus("loading");
      setLoadError(null);
      setSubmitError(null);
      try {
        const nextData = await fetchCheckoutData();
        if (!isActive()) return;
        if (!nextData) {
          setData(null);
          setStatus("requires-login");
          return;
        }
        applyCheckoutData(nextData);
      } catch (error) {
        if (!isActive()) return;
        setLoadError(requestErrorMessage(error));
        setStatus("error");
      }
    },
    [applyCheckoutData],
  );

  useEffect(() => {
    let active = true;
    const runInitialLoad = async () => {
      await load(() => active);
    };
    void runInitialLoad();
    return () => {
      active = false;
    };
  }, [load]);

  const summary = useMemo(() => summarizeCheckout(data), [data]);
  const selectedAddress = useMemo<MemberAddress | null>(
    () => data?.addresses.find((address) => address.id === selectedAddressId) ?? null,
    [data?.addresses, selectedAddressId],
  );

  const placeOrder = useCallback(
    async (buyerRemark: string) => {
      if (!data || !selectedAddress || summary.items.length === 0) return false;
      if (summary.hasUnavailablePrice) {
        setSubmitError("部分商品缺少有效价格，请返回购物车重新确认");
        return false;
      }
      const input: SubmitOrderInput = {
        cartId: data.cart.id,
        shippingAddressId: selectedAddress.id,
        shippingAddressVersion: selectedAddress.version,
        items: summary.items.map((item) => ({
          cartItemId: item.id,
          cartItemVersion: item.version,
          skuId: item.skuId,
          quantity: item.quantity,
        })),
        buyerRemark: buyerRemark.trim() || null,
      };
      idempotencyKeyRef.current ??= crypto.randomUUID();
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        setSubmittedCheckout(await submitOrder(input, idempotencyKeyRef.current));
        return true;
      } catch (error) {
        setSubmitError(requestErrorMessage(error));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [data, selectedAddress, summary.hasUnavailablePrice, summary.items],
  );

  return {
    data,
    isSubmitting,
    load,
    loadError,
    placeOrder,
    selectedAddress,
    selectedAddressId,
    setSelectedAddressId,
    status,
    submitError,
    submittedCheckout,
    summary,
  };
}
