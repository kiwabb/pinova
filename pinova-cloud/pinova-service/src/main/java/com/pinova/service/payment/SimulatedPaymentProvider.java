package com.pinova.service.payment;

public interface SimulatedPaymentProvider extends PaymentProvider {

    void simulateResult(
            ProviderPaymentCommand command,
            String providerTransactionNo,
            ProviderPaymentStatus outcome);
}
