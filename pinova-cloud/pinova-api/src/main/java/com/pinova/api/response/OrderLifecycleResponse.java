package com.pinova.api.response;
import java.time.Instant;
public record OrderLifecycleResponse(String orderNo,String status,String carrierCode,String carrierName,
                                     String trackingNo,Instant shippedAt,Instant autoCompleteAt,
                                     Instant completedAt,Short completionSource) {}
