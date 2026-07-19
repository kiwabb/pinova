package com.pinova.service.payment;

import java.time.Instant;

public record ProviderPaymentResult(
        String providerTransactionNo,
        ProviderPaymentStatus status,
        long amountFen,
        String currencyCode,
        Instant occurredAt,
        String failureCode,
        String failureMessage) {
}
