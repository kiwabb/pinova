package com.pinova.service.assembler;

import com.pinova.pojo.entity.ProductCategory;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.service.model.ProductSummaryResult;

import java.util.List;

public final class ProductSpuResultAssembler {

    private ProductSpuResultAssembler() {
    }

    public static ProductSummaryResult toSummaryResult(
            ProductSpu product,
            ProductCategory category,
            List<String> categoryPathCodes,
            Long priceFen,
            String stock) {
        return new ProductSummaryResult(
                product.getId(),
                product.getName(),
                product.getSummary(),
                product.getProductType(),
                product.getMainImageKey(),
                category.getCategoryCode(),
                category.getName(),
                categoryPathCodes,
                priceFen,
                stock);
    }
}
