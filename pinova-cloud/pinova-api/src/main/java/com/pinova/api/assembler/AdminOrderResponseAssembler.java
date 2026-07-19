package com.pinova.api.assembler;

import com.pinova.api.response.*;
import com.pinova.service.model.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AdminOrderResponseAssembler {
    public PageResponse<AdminOrderSummaryResponse> toPageResponse(AdminOrderPageResult result) {
        return new PageResponse<>(
                result.items().stream().map(this::toSummaryResponse).toList(),
                result.page(), result.pageSize(), result.total());
    }

    public AdminOrderDetailResponse toDetailResponse(AdminOrderDetailResult result) {
        return new AdminOrderDetailResponse(
                result.orderNo(), result.checkoutNo(), result.status(), result.fulfillmentType(),
                result.currencyCode(), result.goodsAmountFen(), result.discountAmountFen(),
                result.shippingAmountFen(), result.payableAmountFen(), result.paidAmountFen(),
                result.buyerRemark(), result.submittedAt(), result.paymentExpiresAt(), result.paidAt(),
                result.fulfillmentStartedAt(), result.completedAt(), result.closedAt(),
                result.closeReasonCode(), result.closeReason(),
                result.items().stream().map(this::toItemResponse).toList(),
                toAddressResponse(result.shippingAddress()));
    }

    private AdminOrderSummaryResponse toSummaryResponse(AdminOrderSummaryResult result) {
        return new AdminOrderSummaryResponse(
                result.orderNo(), result.status(), result.fulfillmentType(), result.currencyCode(),
                result.payableAmountFen(), result.paidAmountFen(), result.submittedAt());
    }

    private AdminOrderItemResponse toItemResponse(AdminOrderItemResult result) {
        return new AdminOrderItemResponse(
                result.productName(), result.skuCode(), result.skuSpec(), result.unitPriceFen(),
                result.quantity(), result.lineAmountFen(), result.discountAmountFen(), result.payableAmountFen());
    }

    private AdminOrderShippingAddressResponse toAddressResponse(AdminOrderShippingAddressResult result) {
        if (result == null) {
            return null;
        }
        return new AdminOrderShippingAddressResponse(
                maskName(result.receiverName()),
                maskMobile(result.receiverMobile()),
                result.countryCode(), result.provinceName(), result.cityName(), result.districtName(),
                result.detailAddress() == null ? null : "******");
    }

    static String maskName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        int[] points = value.codePoints().toArray();
        if (points.length == 1) {
            return "*";
        }
        return new String(points, 0, 1) + "*".repeat(points.length - 1);
    }

    static String maskMobile(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.length() <= 7) {
            return "*".repeat(value.length());
        }
        return value.substring(0, 3) + "*".repeat(value.length() - 7) + value.substring(value.length() - 4);
    }
}

