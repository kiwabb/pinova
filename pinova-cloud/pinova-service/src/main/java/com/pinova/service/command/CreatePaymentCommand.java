package com.pinova.service.command;

public record CreatePaymentCommand(
        Long memberId,
        String checkoutNo) {
}
