package com.pinova.api.response;

public record MemberShippingAddressResponse(
        Long id,
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
        boolean defaultAddress,
        Integer version) {
}
