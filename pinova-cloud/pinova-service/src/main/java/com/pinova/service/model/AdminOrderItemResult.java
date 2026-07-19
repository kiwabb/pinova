package com.pinova.service.model;

public record AdminOrderItemResult(
        String productName,
        String skuCode,
        String skuSpec,
        long unitPriceFen,
        long quantity,
        long lineAmountFen,
        long discountAmountFen,
        long payableAmountFen) {
}

