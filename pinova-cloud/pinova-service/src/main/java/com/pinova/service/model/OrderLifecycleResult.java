package com.pinova.service.model;
import java.time.Instant;
public record OrderLifecycleResult(String orderNo, TradeOrderStatus status, String carrierCode,
                                   String carrierName, String trackingNo, Instant shippedAt,
                                   Instant autoCompleteAt, Instant completedAt, Short completionSource) {}
