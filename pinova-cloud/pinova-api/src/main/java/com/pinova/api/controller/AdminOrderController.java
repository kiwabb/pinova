package com.pinova.api.controller;

import com.pinova.api.assembler.AdminOrderResponseAssembler;
import com.pinova.api.assembler.OrderLifecycleResponseAssembler;
import com.pinova.api.request.CorrectOrderShipmentRequest;
import com.pinova.api.request.ForceCompleteOrderRequest;
import com.pinova.api.request.ShipOrderRequest;
import com.pinova.api.response.OrderLifecycleResponse;
import com.pinova.api.response.AdminOrderDetailResponse;
import com.pinova.api.response.AdminOrderSummaryResponse;
import com.pinova.api.response.PageResponse;
import com.pinova.api.web.CurrentAdminResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.AdminOrderQueryService;
import com.pinova.service.OrderLifecycleService;
import com.pinova.service.command.CorrectOrderShipmentCommand;
import com.pinova.service.command.ShipOrderCommand;
import com.pinova.service.query.AdminOrderListQuery;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin/orders")
public class AdminOrderController {
    private final AdminOrderQueryService orderQueryService;
    private final AdminOrderResponseAssembler responseAssembler;
    private final CurrentAdminResolver currentAdminResolver;
    private final OrderLifecycleService lifecycleService;
    private final OrderLifecycleResponseAssembler lifecycleAssembler;

    public AdminOrderController(
            AdminOrderQueryService orderQueryService,
            AdminOrderResponseAssembler responseAssembler,
            CurrentAdminResolver currentAdminResolver,
            OrderLifecycleService lifecycleService,
            OrderLifecycleResponseAssembler lifecycleAssembler) {
        this.orderQueryService = orderQueryService;
        this.responseAssembler = responseAssembler;
        this.currentAdminResolver = currentAdminResolver;
        this.lifecycleService = lifecycleService;
        this.lifecycleAssembler = lifecycleAssembler;
    }

    @PostMapping("/{orderNo}/shipment")
    public ApiResponse<OrderLifecycleResponse> ship(
            @PathVariable String orderNo,
            @RequestHeader("Idempotency-Key") String requestKey,
            @Valid @RequestBody ShipOrderRequest body,
            HttpServletRequest request) {
        return ApiResponse.success(lifecycleAssembler.toResponse(lifecycleService.ship(new ShipOrderCommand(
                currentAdminResolver.requireCurrentAdmin(request), orderNo, requestKey,
                body.carrierCode(), body.carrierName(), body.trackingNo()))));
    }

    @PutMapping("/{orderNo}/shipment")
    public ApiResponse<OrderLifecycleResponse> correctShipment(
            @PathVariable String orderNo,
            @RequestHeader("Idempotency-Key") String requestKey,
            @Valid @RequestBody CorrectOrderShipmentRequest body,
            HttpServletRequest request) {
        return ApiResponse.success(lifecycleAssembler.toResponse(lifecycleService.correctShipment(
                new CorrectOrderShipmentCommand(currentAdminResolver.requireCurrentAdmin(request), orderNo,
                        requestKey, body.carrierCode(), body.carrierName(), body.trackingNo(), body.reason()))));
    }

    @PostMapping("/{orderNo}/complete")
    public ApiResponse<OrderLifecycleResponse> forceComplete(
            @PathVariable String orderNo,
            @RequestHeader("Idempotency-Key") String requestKey,
            @Valid @RequestBody ForceCompleteOrderRequest body,
            HttpServletRequest request) {
        return ApiResponse.success(lifecycleAssembler.toResponse(lifecycleService.forceComplete(
                currentAdminResolver.requireCurrentAdmin(request), orderNo, requestKey, body.reason())));
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
