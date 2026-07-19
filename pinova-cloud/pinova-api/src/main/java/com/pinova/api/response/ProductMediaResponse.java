package com.pinova.api.response;

public record ProductMediaResponse(
        Long id,
        Short mediaType,
        Short mediaRole,
        String objectKey,
        String url,
        String coverUrl,
        String mimeType,
        Integer width,
        Integer height,
        Integer durationMs,
        String altText,
        Integer sortOrder) {
}
