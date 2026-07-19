package com.pinova.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 库存预占管理接口。
 */
@Tag(name = "库存预占", description = "订单库存预占管理接口")
@RestController
@RequestMapping("/inventory/reservations")
public class InventoryReservationController {

}
