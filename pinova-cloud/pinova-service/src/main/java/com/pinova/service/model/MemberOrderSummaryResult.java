package com.pinova.service.model;

import java.time.Instant;
import java.util.List;

public record MemberOrderSummaryResult(
        String orderNo,
        String checkoutNo,
        String status,
        short fulfillmentType,
        String currencyCode,
        long payableAmountFen,
        long paidAmountFen,
        Instant submittedAt,
        String carrierName,
        String trackingNo,
        Instant shippedAt,
        Instant autoCompleteAt,
        Instant completedAt,
        Instant afterSaleDeadlineAt,
        Instant refundedAt,
        List<MemberOrderItemResult> items) {
    public MemberOrderSummaryResult {
        items = List.copyOf(items);
    }
}
