package com.pinova.api.response;

import java.time.Instant;

public record PaymentOrderResponse(
        String paymentNo,
        String checkoutNo,
        String providerCode,
        String status,
        String currencyCode,
        long amountFen,
        int orderCount,
        Instant expiresAt,
        Instant paidAt,
        String failureMessage,
        boolean mockMode) {
}
