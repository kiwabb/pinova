package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * <p>
 * 商品 SPU 详情，一对一保存前台详情内容 前端控制器
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Tag(name = "商品详情管理", description = "商品详情内容管理接口")
@RestController
@RequestMapping("/product-details")
public class ProductSpuDetailController {

}
