package com.pinova.service.model;

import java.time.Instant;
import java.util.List;

public record ProductReviewResult(
        Long id,
        String reviewerName,
        Short rating,
        String content,
        String skuSpecSnapshot,
        Instant publishedAt,
        List<ProductReviewMediaResult> media) {
    public ProductReviewResult {
        media = List.copyOf(media);
    }
}
