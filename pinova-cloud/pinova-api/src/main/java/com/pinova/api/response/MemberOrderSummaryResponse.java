package com.pinova.api.response;

import java.time.Instant;
import java.util.List;

public record MemberOrderSummaryResponse(
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
        List<MemberOrderItemResponse> items) {
    public MemberOrderSummaryResponse {
        items = List.copyOf(items);
    }
}
