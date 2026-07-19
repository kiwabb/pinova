package com.pinova.api.assembler;

import com.pinova.api.response.PaymentOrderResponse;
import com.pinova.service.model.PaymentOrderResult;
import org.springframework.stereotype.Component;

@Component
public class PaymentOrderResponseAssembler {

    public PaymentOrderResponse toPaymentResponse(PaymentOrderResult result) {
        return new PaymentOrderResponse(
                result.paymentNo(),
                result.checkoutNo(),
                result.providerCode(),
                result.status(),
                result.currencyCode(),
                result.amountFen(),
                result.orderCount(),
                result.expiresAt(),
                result.paidAt(),
                result.failureMessage(),
                result.mockMode());
    }
}
