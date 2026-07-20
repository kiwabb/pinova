package com.pinova.service.command;
public record ApplyAfterSaleCommand(Long memberId,String orderNo,String requestKey,Short reasonCode,String reason) {}
