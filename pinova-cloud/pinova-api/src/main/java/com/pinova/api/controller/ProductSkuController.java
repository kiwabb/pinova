package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商品 SKU 管理接口。
 */
@Tag(name = "商品 SKU", description = "商品 SKU 管理接口")
@RestController
@RequestMapping("/product-skus")
public class ProductSkuController {

}
