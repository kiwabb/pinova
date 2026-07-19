package com.pinova.api.assembler;

import com.pinova.api.media.PublicMediaUrlResolver;
import com.pinova.api.response.ProductReviewMediaResponse;
import com.pinova.api.response.ProductReviewResponse;
import com.pinova.service.model.PageResult;
import com.pinova.service.model.ProductReviewMediaResult;
import com.pinova.service.model.ProductReviewResult;
import org.springframework.stereotype.Component;

@Component
public class ProductReviewResponseAssembler {
    private final PublicMediaUrlResolver mediaUrlResolver;

    public ProductReviewResponseAssembler(PublicMediaUrlResolver mediaUrlResolver) {
        this.mediaUrlResolver = mediaUrlResolver;
    }

    public ProductReviewResponse toReviewResponse(ProductReviewResult result) {
        return new ProductReviewResponse(result.id(), result.reviewerName(), result.rating(), result.content(),
                result.skuSpecSnapshot(), result.publishedAt(), result.media().stream().map(this::toMediaResponse).toList());
    }

    public com.pinova.api.response.PageResponse<ProductReviewResponse> toPageResponse(PageResult<ProductReviewResult> result) {
        return new com.pinova.api.response.PageResponse<>(result.items().stream().map(this::toReviewResponse).toList(),
                result.page(), result.pageSize(), result.total());
    }

    private ProductReviewMediaResponse toMediaResponse(ProductReviewMediaResult result) {
        return new ProductReviewMediaResponse(result.id(), result.mediaType(), mediaUrlResolver.resolveNullable(result.objectKey()),
                mediaUrlResolver.resolveNullable(result.coverObjectKey()), result.mimeType(), result.width(), result.height(),
                result.durationMs(), result.altText());
    }
}
