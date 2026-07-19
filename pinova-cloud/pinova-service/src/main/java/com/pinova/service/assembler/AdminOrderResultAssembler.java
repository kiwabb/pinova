package com.pinova.service.assembler;

import com.pinova.pojo.entity.TradeOrder;
import com.pinova.pojo.entity.TradeOrderItem;
import com.pinova.pojo.entity.TradeOrderShippingAddress;
import com.pinova.service.model.AdminOrderDetailResult;
import com.pinova.service.model.AdminOrderItemResult;
import com.pinova.service.model.AdminOrderShippingAddressResult;
import com.pinova.service.model.AdminOrderSummaryResult;

import java.util.List;

public final class AdminOrderResultAssembler {
    private AdminOrderResultAssembler() {
    }

    public static AdminOrderSummaryResult toSummaryResult(TradeOrder order) {
        return new AdminOrderSummaryResult(
                order.getOrderNo(),
                order.getStatus(),
                order.getFulfillmentType(),
                order.getCurrencyCode(),
                order.getPayableAmountFen(),
                order.getPaidAmountFen(),
                order.getSubmittedAt());
    }

    public static AdminOrderDetailResult toDetailResult(
            TradeOrder order,
            List<TradeOrderItem> items,
            TradeOrderShippingAddress address) {
        return new AdminOrderDetailResult(
                order.getOrderNo(),
                order.getCheckoutNo(),
                order.getStatus(),
                order.getFulfillmentType(),
                order.getCurrencyCode(),
                order.getGoodsAmountFen(),
                order.getDiscountAmountFen(),
                order.getShippingAmountFen(),
                order.getPayableAmountFen(),
                order.getPaidAmountFen(),
                order.getBuyerRemark(),
                order.getSubmittedAt(),
                order.getPaymentExpiresAt(),
                order.getPaidAt(),
                order.getFulfillmentStartedAt(),
                order.getCompletedAt(),
                order.getClosedAt(),
                order.getCloseReasonCode(),
                order.getCloseReason(),
                items.stream().map(AdminOrderResultAssembler::toItemResult).toList(),
                toAddressResult(address));
    }

    private static AdminOrderItemResult toItemResult(TradeOrderItem item) {
        return new AdminOrderItemResult(
                item.getProductNameSnapshot(),
                item.getSkuCodeSnapshot(),
                item.getSkuSpecSnapshot(),
                item.getUnitPriceFen(),
                item.getQuantity(),
                item.getLineAmountFen(),
                item.getDiscountAmountFen(),
                item.getPayableAmountFen());
    }

    private static AdminOrderShippingAddressResult toAddressResult(TradeOrderShippingAddress address) {
        if (address == null) {
            return null;
        }
        return new AdminOrderShippingAddressResult(
                address.getReceiverName(),
                address.getReceiverMobile(),
                address.getCountryCode(),
                address.getProvinceName(),
                address.getCityName(),
                address.getDistrictName(),
                address.getDetailAddress());
    }
}

