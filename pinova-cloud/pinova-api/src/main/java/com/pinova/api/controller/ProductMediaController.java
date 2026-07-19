package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * <p>
 * 商品 SPU 公共媒体与 SKU 专属媒体 前端控制器
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Tag(name = "商品媒体管理", description = "商品 SPU 与 SKU 媒体管理接口")
@RestController
@RequestMapping("/product-media")
public class ProductMediaController {

}
