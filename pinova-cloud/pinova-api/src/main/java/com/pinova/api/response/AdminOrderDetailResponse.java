package com.pinova.api.response;

import java.time.Instant;
import java.util.List;

public record AdminOrderDetailResponse(
        String orderNo,
        String checkoutNo,
        short status,
        short fulfillmentType,
        String currencyCode,
        long goodsAmountFen,
        long discountAmountFen,
        long shippingAmountFen,
        long payableAmountFen,
        long paidAmountFen,
        String buyerRemark,
        Instant submittedAt,
        Instant paymentExpiresAt,
        Instant paidAt,
        Instant fulfillmentStartedAt,
        Instant completedAt,
        Instant closedAt,
        Short closeReasonCode,
        String closeReason,
        List<AdminOrderItemResponse> items,
        AdminOrderShippingAddressResponse shippingAddress) {
    public AdminOrderDetailResponse {
        items = List.copyOf(items);
    }
}

