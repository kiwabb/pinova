package com.pinova.service.assembler;

import com.pinova.mapper.model.ProductSkuSaleSnapshot;
import com.pinova.pojo.entity.ProductCategory;
import com.pinova.pojo.entity.ProductMedia;
import com.pinova.pojo.entity.ProductSku;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.pojo.entity.ProductSpuDetail;
import com.pinova.service.model.ProductDetailContentResult;
import com.pinova.service.model.ProductDetailResult;
import com.pinova.service.model.ProductMediaResult;
import com.pinova.service.model.ProductSkuDetailResult;

import java.util.List;
import java.util.Map;

public final class ProductDetailResultAssembler {

    private static final String EMPTY_DOCUMENT = "{\"blocks\":[]}";

    private ProductDetailResultAssembler() {
    }

    public static ProductDetailResult toDetailResult(
            ProductSpu product,
            ProductCategory category,
            List<String> categoryPathCodes,
            ProductSpuDetail detail,
            List<ProductSku> skus,
            Map<Long, ProductSkuSaleSnapshot> saleSnapshotsBySku,
            List<ProductMedia> commonMedia,
            Map<Long, List<ProductMedia>> mediaBySku) {
        return new ProductDetailResult(
                product.getId(),
                product.getName(),
                product.getSummary(),
                product.getProductType(),
                product.getMainImageKey(),
                category.getCategoryCode(),
                category.getName(),
                categoryPathCodes,
                toContentResult(detail),
                commonMedia.stream().map(ProductDetailResultAssembler::toMediaResult).toList(),
                skus.stream()
                        .map(sku -> toSkuResult(
                                sku,
                                saleSnapshotsBySku.get(sku.getId()),
                                mediaBySku.getOrDefault(sku.getId(), List.of())))
                        .toList());
    }

    private static ProductDetailContentResult toContentResult(ProductSpuDetail detail) {
        if (detail == null) {
            return new ProductDetailContentResult(1, EMPTY_DOCUMENT, null, null, null);
        }
        return new ProductDetailContentResult(
                detail.getContentSchemaVersion(),
                detail.getDetailDocument(),
                detail.getPackingList(),
                detail.getUsageInstructions(),
                detail.getAfterSalesNote());
    }

    private static ProductSkuDetailResult toSkuResult(
            ProductSku sku,
            ProductSkuSaleSnapshot saleSnapshot,
            List<ProductMedia> media) {
        return new ProductSkuDetailResult(
                sku.getId(),
                sku.getSpecSummary(),
                saleSnapshot == null ? sku.getSalePriceFen() : saleSnapshot.priceFen(),
                saleSnapshot == null ? null : saleSnapshot.stock(),
                sku.getMainImageKey(),
                media.stream().map(ProductDetailResultAssembler::toMediaResult).toList());
    }

    private static ProductMediaResult toMediaResult(ProductMedia media) {
        return new ProductMediaResult(
                media.getId(),
                media.getMediaType(),
                media.getMediaRole(),
                media.getObjectKey(),
                media.getCoverObjectKey(),
                media.getMimeType(),
                media.getWidth(),
                media.getHeight(),
                media.getDurationMs(),
                media.getAltText(),
                media.getSortOrder());
    }
}
