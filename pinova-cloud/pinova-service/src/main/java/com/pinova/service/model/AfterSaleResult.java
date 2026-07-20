package com.pinova.service.model;
import java.time.Instant;
public record AfterSaleResult(String afterSaleNo,String orderNo,AfterSaleStatus status,long amountFen,
                              String currencyCode,short reasonCode,String reason,String reviewReason,
                              String refundNo,RefundOrderStatus refundStatus,int version,Instant appliedAt,Instant completedAt) {}
