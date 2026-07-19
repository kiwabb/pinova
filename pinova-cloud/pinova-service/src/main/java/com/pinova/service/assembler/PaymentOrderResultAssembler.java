package com.pinova.service.assembler;

import com.pinova.pojo.entity.PaymentOrder;
import com.pinova.service.model.PaymentOrderResult;
import com.pinova.service.model.PaymentOrderStatus;

public final class PaymentOrderResultAssembler {
    private PaymentOrderResultAssembler() {
    }

    public static PaymentOrderResult toResult(
            PaymentOrder payment,
            int orderCount,
            boolean mockMode) {
        return new PaymentOrderResult(
                payment.getPaymentNo(),
                payment.getCheckoutNo(),
                payment.getProviderCode(),
                PaymentOrderStatus.fromCode(payment.getStatus()).name(),
                payment.getCurrencyCode(),
                payment.getAmountFen(),
                orderCount,
                payment.getExpiresAt(),
                payment.getPaidAt(),
                payment.getFailureMessage(),
                mockMode);
    }
}
