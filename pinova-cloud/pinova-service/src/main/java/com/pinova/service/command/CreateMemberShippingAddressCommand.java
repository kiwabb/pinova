package com.pinova.service.command;

public record CreateMemberShippingAddressCommand(
        Long memberId,
        String receiverName,
        String receiverMobile,
        String countryCode,
        String provinceCode,
        String provinceName,
        String cityCode,
        String cityName,
        String districtCode,
        String districtName,
        String detailAddress,
        String postalCode,
        String label,
        boolean defaultAddress) {
}
