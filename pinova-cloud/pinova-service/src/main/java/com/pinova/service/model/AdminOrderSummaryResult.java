package com.pinova.service.model;

import java.time.Instant;

public record AdminOrderSummaryResult(
        String orderNo,
        short status,
        short fulfillmentType,
        String currencyCode,
        long payableAmountFen,
        long paidAmountFen,
        Instant submittedAt) {
}

