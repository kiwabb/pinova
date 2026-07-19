package com.pinova.api.response;

public record MemberOrderItemResponse(
        String productName,
        String skuSpec,
        String imageUrl,
        long unitPriceFen,
        long quantity,
        long payableAmountFen) {
}
