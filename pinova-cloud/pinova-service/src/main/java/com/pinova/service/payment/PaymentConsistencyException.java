package com.pinova.service.payment;

public class PaymentConsistencyException extends RuntimeException {

    private final String failureCode;
    private final ProviderPaymentResult providerResult;

    public PaymentConsistencyException(
            String failureCode,
            String message,
            ProviderPaymentResult providerResult) {
        super(message);
        this.failureCode = failureCode;
        this.providerResult = providerResult;
    }

    public String failureCode() {
        return failureCode;
    }

    public ProviderPaymentResult providerResult() {
        return providerResult;
    }
}
