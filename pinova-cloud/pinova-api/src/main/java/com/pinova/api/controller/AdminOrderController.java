package com.pinova.api.controller;

import com.pinova.api.assembler.AdminOrderResponseAssembler;
import com.pinova.api.response.AdminOrderDetailResponse;
import com.pinova.api.response.AdminOrderSummaryResponse;
import com.pinova.api.response.PageResponse;
import com.pinova.api.web.CurrentAdminResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.AdminOrderQueryService;
import com.pinova.service.query.AdminOrderListQuery;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/admin/orders")
public class AdminOrderController {
    private final AdminOrderQueryService orderQueryService;
    private final AdminOrderResponseAssembler responseAssembler;
    private final CurrentAdminResolver currentAdminResolver;

    public AdminOrderController(
            AdminOrderQueryService orderQueryService,
            AdminOrderResponseAssembler responseAssembler,
            CurrentAdminResolver currentAdminResolver) {
        this.orderQueryService = orderQueryService;
        this.responseAssembler = responseAssembler;
        this.currentAdminResolver = currentAdminResolver;
    }

    @GetMapping
    public ApiResponse<PageResponse<AdminOrderSummaryResponse>> listOrders(
            @RequestParam(required = false) String orderNo,
            @RequestParam(required = false) Short status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant submittedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant submittedTo,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            HttpServletRequest request) {
        return ApiResponse.success(responseAssembler.toPageResponse(orderQueryService.listOrders(
                currentAdminResolver.requireCurrentAdmin(request),
                new AdminOrderListQuery(orderNo, status, submittedFrom, submittedTo, page, pageSize))));
    }

    @GetMapping("/{orderNo}")
    public ApiResponse<AdminOrderDetailResponse> getOrder(
            @PathVariable String orderNo,
            HttpServletRequest request) {
        return ApiResponse.success(responseAssembler.toDetailResponse(orderQueryService.getOrder(
                currentAdminResolver.requireCurrentAdmin(request), orderNo)));
    }
}

