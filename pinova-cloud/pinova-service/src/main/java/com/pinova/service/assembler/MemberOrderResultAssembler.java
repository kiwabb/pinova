package com.pinova.service.assembler;

import com.pinova.pojo.entity.TradeOrder;
import com.pinova.pojo.entity.TradeOrderItem;
import com.pinova.service.model.MemberOrderItemResult;
import com.pinova.service.model.MemberOrderSummaryResult;
import com.pinova.service.model.TradeOrderStatus;

import java.util.List;

public final class MemberOrderResultAssembler {
    private MemberOrderResultAssembler() {
    }

    public static MemberOrderSummaryResult toSummaryResult(
            TradeOrder order,
            List<TradeOrderItem> items) {
        return new MemberOrderSummaryResult(
                order.getOrderNo(),
                order.getCheckoutNo(),
                TradeOrderStatus.fromCode(order.getStatus()).name(),
                order.getFulfillmentType(),
                order.getCurrencyCode(),
                order.getPayableAmountFen(),
                order.getPaidAmountFen(),
                order.getSubmittedAt(),
                order.getCarrierName(),
                order.getTrackingNo(),
                order.getShippedAt(),
                order.getAutoCompleteAt(),
                order.getCompletedAt(),
                order.getAfterSaleDeadlineAt(),
                order.getRefundedAt(),
                items.stream().map(MemberOrderResultAssembler::toItemResult).toList());
    }

    private static MemberOrderItemResult toItemResult(TradeOrderItem item) {
        return new MemberOrderItemResult(
                item.getProductNameSnapshot(),
                item.getSkuSpecSnapshot(),
                item.getMainImageKeySnapshot(),
                item.getUnitPriceFen(),
                item.getQuantity(),
                item.getPayableAmountFen());
    }
}
