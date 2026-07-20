package com.pinova.service;

import com.pinova.service.command.CreatePaymentCommand;
import com.pinova.service.command.SimulatePaymentResultCommand;
import com.pinova.service.model.PaymentOrderResult;
import com.pinova.service.model.CancelledCheckoutResult;

public interface PaymentOrderService {

    PaymentOrderResult createPayment(CreatePaymentCommand command);

    PaymentOrderResult getPayment(Long memberId, String paymentNo);

    PaymentOrderResult refreshPayment(Long memberId, String paymentNo);

    PaymentOrderResult simulatePayment(SimulatePaymentResultCommand command);

    CancelledCheckoutResult cancelCheckout(Long memberId, String checkoutNo);

    int closeExpiredCheckouts(int limit);
}
