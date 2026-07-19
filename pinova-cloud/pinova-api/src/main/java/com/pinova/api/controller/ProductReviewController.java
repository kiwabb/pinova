package com.pinova.api.controller;

import com.pinova.api.assembler.ProductReviewResponseAssembler;
import com.pinova.api.response.PageResponse;
import com.pinova.api.response.ProductReviewResponse;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.ProductReviewService;
import com.pinova.service.query.ProductReviewPageQuery;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * <p>
 * 商品订单项评价 前端控制器
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@Tag(name = "商品评价管理", description = "商品订单项评价管理接口")
@RestController
@RequestMapping("/products/{productId}/reviews")
public class ProductReviewController {

    private final ProductReviewService productReviewService;
    private final ProductReviewResponseAssembler productReviewResponseAssembler;

    public ProductReviewController(
            ProductReviewService productReviewService,
            ProductReviewResponseAssembler productReviewResponseAssembler) {
        this.productReviewService = productReviewService;
        this.productReviewResponseAssembler = productReviewResponseAssembler;
    }

    @Operation(summary = "查询已发布商品评价")
    @GetMapping
    public ApiResponse<PageResponse<ProductReviewResponse>> listPublishedReviews(
            @Parameter(description = "商品 SPU ID", required = true) @PathVariable Long productId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.success(productReviewResponseAssembler.toPageResponse(
                productReviewService.listPublishedReviews(productId, new ProductReviewPageQuery(page, pageSize))));
    }

}
