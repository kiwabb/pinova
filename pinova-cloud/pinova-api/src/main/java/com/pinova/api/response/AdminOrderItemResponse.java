package com.pinova.api.response;

public record AdminOrderItemResponse(
        String productName,
        String skuCode,
        String skuSpec,
        long unitPriceFen,
        long quantity,
        long lineAmountFen,
        long discountAmountFen,
        long payableAmountFen) {
}

