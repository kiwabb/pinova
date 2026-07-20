package com.pinova.service.payment;
public record ProviderRefundCommand(String refundNo,String paymentNo,String providerTransactionNo,
                                    long amountFen,String currencyCode,int attemptCount) {}
