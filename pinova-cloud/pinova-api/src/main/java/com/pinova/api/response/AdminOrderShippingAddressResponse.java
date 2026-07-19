package com.pinova.api.response;

public record AdminOrderShippingAddressResponse(
        String receiverName,
        String receiverMobile,
        String countryCode,
        String provinceName,
        String cityName,
        String districtName,
        String detailAddress) {
}

