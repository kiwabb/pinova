package com.pinova.service;

import com.pinova.service.command.CreatePaymentCommand;
import com.pinova.service.command.SimulatePaymentResultCommand;
import com.pinova.service.model.PaymentOrderResult;

public interface PaymentOrderService {

    PaymentOrderResult createPayment(CreatePaymentCommand command);

    PaymentOrderResult getPayment(Long memberId, String paymentNo);

    PaymentOrderResult refreshPayment(Long memberId, String paymentNo);

    PaymentOrderResult simulatePayment(SimulatePaymentResultCommand command);

    int closeExpiredCheckouts(int limit);
}
