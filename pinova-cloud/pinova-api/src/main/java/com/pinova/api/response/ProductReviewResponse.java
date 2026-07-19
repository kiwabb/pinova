package com.pinova.api.response;

import java.time.Instant;
import java.util.List;

public record ProductReviewResponse(
        Long id,
        String reviewerName,
        Short rating,
        String content,
        String skuSpecSnapshot,
        Instant publishedAt,
        List<ProductReviewMediaResponse> media) {
    public ProductReviewResponse {
        media = List.copyOf(media);
    }
}
