package com.pinova.service.payment;
import java.time.Instant;
public record ProviderRefundResult(String providerRefundNo,ProviderRefundStatus status,long amountFen,
                                   String currencyCode,Instant occurredAt,String failureCode,String failureMessage) {}
