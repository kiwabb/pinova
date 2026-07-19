package com.pinova.api.assembler;

import com.pinova.api.response.SubmittedCheckoutResponse;
import com.pinova.api.response.SubmittedOrderResponse;
import com.pinova.service.model.SubmittedCheckoutResult;
import com.pinova.service.model.SubmittedOrderResult;
import org.springframework.stereotype.Component;

@Component
public class TradeOrderResponseAssembler {

    public SubmittedCheckoutResponse toSubmittedCheckoutResponse(SubmittedCheckoutResult result) {
        return new SubmittedCheckoutResponse(
                result.checkoutNo(),
                result.orders().stream().map(this::toSubmittedOrderResponse).toList());
    }

    public SubmittedOrderResponse toSubmittedOrderResponse(SubmittedOrderResult result) {
        return new SubmittedOrderResponse(result.id(), result.orderNo(), result.status());
    }
}
