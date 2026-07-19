package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 库存余额管理接口。
 */
@Tag(name = "库存余额", description = "SKU 库存余额管理接口")
@RestController
@RequestMapping("/inventory/stocks")
public class InventoryStockController {

}
