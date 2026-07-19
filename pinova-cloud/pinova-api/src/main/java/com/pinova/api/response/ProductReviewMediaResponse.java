package com.pinova.api.response;

public record ProductReviewMediaResponse(
        Long id,
        Short mediaType,
        String objectUrl,
        String coverUrl,
        String mimeType,
        Integer width,
        Integer height,
        Integer durationMs,
        String altText) {
}
