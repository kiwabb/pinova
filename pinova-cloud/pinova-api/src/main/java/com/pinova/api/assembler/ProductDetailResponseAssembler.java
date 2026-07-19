package com.pinova.api.assembler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinova.api.media.PublicMediaUrlResolver;
import com.pinova.api.response.ProductDetailContentResponse;
import com.pinova.api.response.ProductDetailResponse;
import com.pinova.api.response.ProductMediaResponse;
import com.pinova.api.response.ProductSkuDetailResponse;
import com.pinova.service.model.ProductDetailContentResult;
import com.pinova.service.model.ProductDetailResult;
import com.pinova.service.model.ProductMediaResult;
import com.pinova.service.model.ProductSkuDetailResult;
import org.springframework.stereotype.Component;

@Component
public class ProductDetailResponseAssembler {

    private final ObjectMapper objectMapper;
    private final PublicMediaUrlResolver mediaUrlResolver;

    public ProductDetailResponseAssembler(
            ObjectMapper objectMapper,
            PublicMediaUrlResolver mediaUrlResolver) {
        this.objectMapper = objectMapper;
        this.mediaUrlResolver = mediaUrlResolver;
    }

    public ProductDetailResponse toDetailResponse(ProductDetailResult result) {
        return new ProductDetailResponse(
                result.id(),
                result.name(),
                result.summary(),
                result.productType(),
                mediaUrlResolver.resolveNullable(result.mainImageKey()),
                result.categoryCode(),
                result.categoryName(),
                result.categoryPathCodes(),
                toContentResponse(result.detail()),
                result.commonMedia().stream().map(this::toMediaResponse).toList(),
                result.skus().stream().map(this::toSkuResponse).toList());
    }

    private ProductDetailContentResponse toContentResponse(ProductDetailContentResult result) {
        return new ProductDetailContentResponse(
                result.contentSchemaVersion(),
                parseDocument(result.detailDocumentJson()),
                result.packingList(),
                result.usageInstructions(),
                result.afterSalesNote());
    }

    private ProductSkuDetailResponse toSkuResponse(ProductSkuDetailResult result) {
        return new ProductSkuDetailResponse(
                result.id(),
                result.specSummary(),
                result.priceFen(),
                result.stock(),
                mediaUrlResolver.resolveNullable(result.mainImageKey()),
                result.media().stream().map(this::toMediaResponse).toList());
    }

    private ProductMediaResponse toMediaResponse(ProductMediaResult result) {
        return new ProductMediaResponse(
                result.id(),
                result.mediaType(),
                result.mediaRole(),
                result.objectKey(),
                mediaUrlResolver.resolveNullable(result.objectKey()),
                mediaUrlResolver.resolveNullable(result.coverObjectKey()),
                result.mimeType(),
                result.width(),
                result.height(),
                result.durationMs(),
                result.altText(),
                result.sortOrder());
    }

    private JsonNode parseDocument(String documentJson) {
        try {
            return objectMapper.readTree(documentJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("商品详情文档不是有效 JSON", exception);
        }
    }
}
