package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 仓库管理接口。
 */
@Tag(name = "仓库管理", description = "仓库和门店库存节点管理接口")
@RestController
@RequestMapping("/warehouses")
public class WarehouseController {

}
