package com.pinova.service.command;

public record SetDefaultMemberShippingAddressCommand(
        Long memberId,
        Long addressId,
        Integer version) {
}
