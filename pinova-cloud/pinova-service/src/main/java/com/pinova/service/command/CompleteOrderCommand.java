package com.pinova.service.command;
public record CompleteOrderCommand(String orderNo, Long operatorId, String requestKey,
                                   short completionSource, String reason) {}
