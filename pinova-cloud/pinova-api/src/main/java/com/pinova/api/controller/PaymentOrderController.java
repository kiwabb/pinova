package com.pinova.api.controller;

import com.pinova.api.assembler.PaymentOrderResponseAssembler;
import com.pinova.api.request.CreatePaymentRequest;
import com.pinova.api.request.SimulatePaymentResultRequest;
import com.pinova.api.response.PaymentOrderResponse;
import com.pinova.api.web.CurrentMemberResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.service.PaymentOrderService;
import com.pinova.service.command.CreatePaymentCommand;
import com.pinova.service.command.SimulatePaymentResultCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "支付", description = "当前登录会员的支付创建、查询与本地模拟接口")
@RestController
@RequestMapping("/payments")
public class PaymentOrderController {

    private final PaymentOrderService paymentOrderService;
    private final PaymentOrderResponseAssembler responseAssembler;
    private final CurrentMemberResolver currentMemberResolver;

    public PaymentOrderController(
            PaymentOrderService paymentOrderService,
            PaymentOrderResponseAssembler responseAssembler,
            CurrentMemberResolver currentMemberResolver) {
        this.paymentOrderService = paymentOrderService;
        this.responseAssembler = responseAssembler;
        this.currentMemberResolver = currentMemberResolver;
    }

    @Operation(summary = "为一次结算创建或获取支付单")
    @PostMapping
    public ApiResponse<PaymentOrderResponse> createPayment(
            @RequestBody(required = false) CreatePaymentRequest body,
            HttpServletRequest request) {
        if (body == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "支付请求体不能为空");
        }
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toPaymentResponse(
                paymentOrderService.createPayment(
                        new CreatePaymentCommand(memberId, body.checkoutNo()))));
    }

    @Operation(summary = "查询当前会员的支付单")
    @GetMapping("/{paymentNo}")
    public ApiResponse<PaymentOrderResponse> getPayment(
            @PathVariable String paymentNo,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toPaymentResponse(
                paymentOrderService.getPayment(memberId, paymentNo)));
    }

    @Operation(summary = "主动查询渠道并刷新支付结果")
    @PostMapping("/{paymentNo}/refresh")
    public ApiResponse<PaymentOrderResponse> refreshPayment(
            @PathVariable String paymentNo,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toPaymentResponse(
                paymentOrderService.refreshPayment(memberId, paymentNo)));
    }

    @Operation(summary = "在开发或测试环境模拟支付结果")
    @PostMapping("/{paymentNo}/mock-result")
    public ApiResponse<PaymentOrderResponse> simulatePaymentResult(
            @PathVariable String paymentNo,
            @RequestBody(required = false) SimulatePaymentResultRequest body,
            HttpServletRequest request) {
        if (body == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "模拟支付请求体不能为空");
        }
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toPaymentResponse(
                paymentOrderService.simulatePayment(
                        new SimulatePaymentResultCommand(memberId, paymentNo, body.outcome()))));
    }
}
