package com.pinova.api.controller;

import com.pinova.api.assembler.ProductDetailResponseAssembler;
import com.pinova.api.assembler.ProductSpuResponseAssembler;
import com.pinova.api.response.PageResponse;
import com.pinova.api.response.ProductDetailResponse;
import com.pinova.api.response.ProductSummaryResponse;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.ProductSpuService;
import com.pinova.service.query.ProductListQuery;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商品管理接口。
 */
@Tag(name = "商品管理", description = "商品 SPU 管理接口")
@RestController
@RequestMapping("/products")
public class ProductSpuController {

    private final ProductSpuService productSpuService;
    private final ProductDetailResponseAssembler productDetailResponseAssembler;

    public ProductSpuController(
            ProductSpuService productSpuService,
            ProductDetailResponseAssembler productDetailResponseAssembler) {
        this.productSpuService = productSpuService;
        this.productDetailResponseAssembler = productDetailResponseAssembler;
    }

    @Operation(summary = "查询上架商品列表")
    @GetMapping
    public ApiResponse<PageResponse<ProductSummaryResponse>> listProducts(
            @Parameter(description = "分类编码；传父分类时聚合全部后代商品")
            @RequestParam(required = false) String categoryCode,
            @Parameter(description = "页码，从 1 开始")
            @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页数量，最大 100")
            @RequestParam(defaultValue = "20") int pageSize) {
        ProductListQuery query = new ProductListQuery(categoryCode, page, pageSize);
        return ApiResponse.success(ProductSpuResponseAssembler.toPageResponse(
                productSpuService.listPublishedProducts(query)));
    }

    @Operation(summary = "查询上架商品详情")
    @GetMapping("/{productId}")
    public ApiResponse<ProductDetailResponse> getProductDetail(
            @Parameter(description = "商品 SPU ID", required = true)
            @PathVariable Long productId) {
        return ApiResponse.success(productDetailResponseAssembler.toDetailResponse(
                productSpuService.getPublishedProductDetail(productId)));
    }
}
