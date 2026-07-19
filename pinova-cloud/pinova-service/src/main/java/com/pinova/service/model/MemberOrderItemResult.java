package com.pinova.service.model;

public record MemberOrderItemResult(
        String productName,
        String skuSpec,
        String imageKey,
        long unitPriceFen,
        long quantity,
        long payableAmountFen) {
}
