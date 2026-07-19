package com.pinova.api.controller;

import com.pinova.api.assembler.ProductCategoryResponseAssembler;
import com.pinova.api.response.ProductCategorySummaryResponse;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.ProductCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 商品分类查询接口。
 */
@Tag(name = "商品分类", description = "商品分类查询接口")
@RestController
@RequestMapping("/product-categories")
public class ProductCategoryController {

    private final ProductCategoryService productCategoryService;

    public ProductCategoryController(ProductCategoryService productCategoryService) {
        this.productCategoryService = productCategoryService;
    }

    @Operation(summary = "查询主分类列表")
    @GetMapping("/main")
    public ApiResponse<List<ProductCategorySummaryResponse>> listMainCategories() {
        return ApiResponse.success(ProductCategoryResponseAssembler.toSummaryResponses(
                productCategoryService.listMainCategories()));
    }

    @Operation(summary = "查询直接子分类")
    @GetMapping("/{parentCategoryId}/children")
    public ApiResponse<List<ProductCategorySummaryResponse>> listChildren(
            @Parameter(description = "父分类 ID", required = true)
            @PathVariable long parentCategoryId) {
        return ApiResponse.success(ProductCategoryResponseAssembler.toSummaryResponses(
                productCategoryService.listChildren(parentCategoryId)));
    }
}
