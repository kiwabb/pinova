package com.pinova.service.payment;

import java.time.Instant;

public record ProviderPaymentCommand(
        String paymentNo,
        long amountFen,
        String currencyCode,
        int attemptCount,
        Instant expiresAt) {
}
