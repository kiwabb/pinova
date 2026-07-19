package com.pinova.api.response;

public record ShoppingCartItemResponse(
        Long id,
        Long shopId,
        Long spuId,
        Long skuId,
        String productName,
        String skuSpecSummary,
        String imageUrl,
        Long priceFen,
        Long quantity,
        Boolean selected,
        Integer version) {
}
