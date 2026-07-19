package com.pinova.service.model;

import java.time.Instant;

public record PaymentOrderResult(
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
