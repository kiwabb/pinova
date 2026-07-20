package com.pinova.service.payment;

public interface PaymentProvider {

    String code();

    boolean isEnabled();

    ProviderPaymentResult createPayment(ProviderPaymentCommand command);

    ProviderPaymentResult queryPayment(
            ProviderPaymentCommand command,
            String providerTransactionNo);

    void closePayment(ProviderPaymentCommand command, String providerTransactionNo);

    ProviderRefundResult createRefund(ProviderRefundCommand command);

    ProviderRefundResult queryRefund(ProviderRefundCommand command, String providerRefundNo);
}
