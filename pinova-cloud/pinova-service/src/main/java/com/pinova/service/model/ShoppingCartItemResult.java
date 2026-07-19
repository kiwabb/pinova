package com.pinova.service.model;

public record ShoppingCartItemResult(
        Long id,
        Long shopId,
        Long spuId,
        Long skuId,
        String productName,
        String skuSpecSummary,
        String imageKey,
        Long priceFen,
        Long quantity,
        Boolean selected,
        Integer version) {
}
