package com.pinova.service.payment;

import com.pinova.service.PaymentOrderService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PaymentExpirationScheduler {

    private final PaymentOrderService paymentOrderService;

    public PaymentExpirationScheduler(PaymentOrderService paymentOrderService) {
        this.paymentOrderService = paymentOrderService;
    }

    @Scheduled(fixedDelayString = "${pinova.payment.expiration-scan-delay-ms:60000}")
    public void closeExpiredCheckouts() {
        paymentOrderService.closeExpiredCheckouts(100);
    }
}
