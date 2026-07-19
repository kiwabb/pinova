package com.pinova.api.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class PublicMediaUrlResolver {

    private final String publicBaseUrl;
    private final String bucket;

    public PublicMediaUrlResolver(
            @Value("${pinova.storage.public-base-url}") String publicBaseUrl,
            @Value("${pinova.storage.bucket}") String bucket) {
        this.publicBaseUrl = stripTrailingSlash(publicBaseUrl);
        this.bucket = bucket;
    }

    public String resolveNullable(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }
        return UriComponentsBuilder.fromUriString(publicBaseUrl)
                .pathSegment(bucket)
                .pathSegment(objectKey.split("/"))
                .build()
                .encode()
                .toUriString();
    }

    private static String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
