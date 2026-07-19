package com.pinova.service.model;

public record ProductReviewMediaResult(
        Long id,
        Short mediaType,
        String objectKey,
        String coverObjectKey,
        String mimeType,
        Integer width,
        Integer height,
        Integer durationMs,
        String altText) {
}
