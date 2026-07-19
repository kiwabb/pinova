package com.pinova.api.response;

import java.util.List;

public record ProductSkuDetailResponse(
        Long id,
        String specSummary,
        Long priceFen,
        String stock,
        String mainImageUrl,
        List<ProductMediaResponse> media) {

    public ProductSkuDetailResponse {
        media = List.copyOf(media);
    }
}
