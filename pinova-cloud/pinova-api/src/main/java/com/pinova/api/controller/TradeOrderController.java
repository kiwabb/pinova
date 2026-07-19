package com.pinova.api.controller;

import com.pinova.api.assembler.MemberOrderResponseAssembler;
import com.pinova.api.assembler.TradeOrderResponseAssembler;
import com.pinova.api.response.MemberOrderSummaryResponse;
import com.pinova.api.response.PageResponse;
import com.pinova.api.request.SubmitOrderLineRequest;
import com.pinova.api.request.SubmitOrderRequest;
import com.pinova.api.response.SubmittedCheckoutResponse;
import com.pinova.api.web.CurrentMemberResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.service.MemberOrderQueryService;
import com.pinova.service.TradeOrderService;
import com.pinova.service.command.SubmitOrderCommand;
import com.pinova.service.command.SubmitOrderLineCommand;
import com.pinova.service.query.MemberOrderListQuery;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "交易订单", description = "当前登录会员的订单提交与查询接口")
@RestController
@RequestMapping("/orders")
public class TradeOrderController {

    private static final String CART_TOKEN_COOKIE = "PINOVA_CART_TOKEN";

    private final TradeOrderService tradeOrderService;
    private final TradeOrderResponseAssembler responseAssembler;
    private final MemberOrderQueryService memberOrderQueryService;
    private final MemberOrderResponseAssembler memberOrderResponseAssembler;
    private final CurrentMemberResolver currentMemberResolver;

    public TradeOrderController(
            TradeOrderService tradeOrderService,
            TradeOrderResponseAssembler responseAssembler,
            MemberOrderQueryService memberOrderQueryService,
            MemberOrderResponseAssembler memberOrderResponseAssembler,
            CurrentMemberResolver currentMemberResolver) {
        this.tradeOrderService = tradeOrderService;
        this.responseAssembler = responseAssembler;
        this.memberOrderQueryService = memberOrderQueryService;
        this.memberOrderResponseAssembler = memberOrderResponseAssembler;
        this.currentMemberResolver = currentMemberResolver;
    }

    @Operation(summary = "分页获取当前会员的订单")
    @GetMapping
    public ApiResponse<PageResponse<MemberOrderSummaryResponse>> listOrders(
            @RequestParam(required = false) Short status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(memberOrderResponseAssembler.toPageResponse(
                memberOrderQueryService.listOrders(memberId, new MemberOrderListQuery(status, page, pageSize))));
    }

    @Operation(summary = "提交当前购物车中的已选商品")
    @PostMapping
    public ApiResponse<SubmittedCheckoutResponse> submitOrder(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @CookieValue(value = CART_TOKEN_COOKIE, required = false) String guestCartToken,
            @RequestBody(required = false) SubmitOrderRequest body,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        if (body == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单请求体不能为空");
        }
        return ApiResponse.success(responseAssembler.toSubmittedCheckoutResponse(
                tradeOrderService.submitOrder(toCommand(memberId, guestCartToken, idempotencyKey, body))));
    }

    private static SubmitOrderCommand toCommand(
            Long memberId,
            String guestCartToken,
            String idempotencyKey,
            SubmitOrderRequest request) {
        List<SubmitOrderLineCommand> items = request.items() == null
                ? null
                : request.items().stream().map(TradeOrderController::toLineCommand).toList();
        return new SubmitOrderCommand(
                memberId,
                guestCartToken,
                idempotencyKey,
                request.cartId(),
                request.shippingAddressId(),
                request.shippingAddressVersion(),
                items,
                request.buyerRemark());
    }

    private static SubmitOrderLineCommand toLineCommand(SubmitOrderLineRequest request) {
        if (request == null) {
            return null;
        }
        return new SubmitOrderLineCommand(
                request.cartItemId(),
                request.cartItemVersion(),
                request.skuId(),
                request.quantity());
    }
}
