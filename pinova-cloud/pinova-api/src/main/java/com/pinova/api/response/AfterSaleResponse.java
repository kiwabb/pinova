package com.pinova.api.response;
import java.time.Instant;
public record AfterSaleResponse(String afterSaleNo,String orderNo,String status,long amountFen,String currencyCode,
                                short reasonCode,String reason,String reviewReason,String refundNo,String refundStatus,
                                int version,Instant appliedAt,Instant completedAt) {}
