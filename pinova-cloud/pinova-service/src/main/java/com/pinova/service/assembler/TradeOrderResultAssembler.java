package com.pinova.service.assembler;

import com.pinova.pojo.entity.TradeOrder;
import com.pinova.service.model.SubmittedCheckoutResult;
import com.pinova.service.model.SubmittedOrderResult;
import com.pinova.service.model.TradeOrderStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TradeOrderResultAssembler {

    public SubmittedCheckoutResult toSubmittedCheckoutResult(String checkoutNo, List<TradeOrder> orders) {
        return new SubmittedCheckoutResult(
                checkoutNo,
                orders.stream().map(this::toSubmittedOrderResult).toList());
    }

    public SubmittedOrderResult toSubmittedOrderResult(TradeOrder order) {
        return new SubmittedOrderResult(
                order.getId(),
                order.getOrderNo(),
                TradeOrderStatus.fromCode(order.getStatus()).name());
    }
}
