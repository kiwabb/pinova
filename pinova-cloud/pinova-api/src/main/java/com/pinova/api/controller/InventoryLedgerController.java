package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 库存流水查询接口。
 */
@Tag(name = "库存流水", description = "不可变库存流水查询接口")
@RestController
@RequestMapping("/inventory/ledgers")
public class InventoryLedgerController {

}
