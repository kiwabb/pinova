package com.pinova.service.model;

public record ProductMediaResult(
        Long id,
        Short mediaType,
        Short mediaRole,
        String objectKey,
        String coverObjectKey,
        String mimeType,
        Integer width,
        Integer height,
        Integer durationMs,
        String altText,
        Integer sortOrder) {
}
