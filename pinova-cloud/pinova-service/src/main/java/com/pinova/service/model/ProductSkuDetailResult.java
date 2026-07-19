package com.pinova.service.model;

import java.util.List;

public record ProductSkuDetailResult(
        Long id,
        String specSummary,
        Long priceFen,
        String stock,
        String mainImageKey,
        List<ProductMediaResult> media) {

    public ProductSkuDetailResult {
        media = List.copyOf(media);
    }
}
