package com.pinova.service.command;

public record SimulatePaymentResultCommand(
        Long memberId,
        String paymentNo,
        String outcome) {
}
