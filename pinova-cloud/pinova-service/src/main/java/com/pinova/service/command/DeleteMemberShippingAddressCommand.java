package com.pinova.service.command;

public record DeleteMemberShippingAddressCommand(
        Long memberId,
        Long addressId,
        Integer version) {
}
