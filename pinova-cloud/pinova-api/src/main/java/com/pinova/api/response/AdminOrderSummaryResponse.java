package com.pinova.api.response;

import java.time.Instant;

public record AdminOrderSummaryResponse(
        String orderNo,
        short status,
        short fulfillmentType,
        String currencyCode,
        long payableAmountFen,
        long paidAmountFen,
        Instant submittedAt) {
}

