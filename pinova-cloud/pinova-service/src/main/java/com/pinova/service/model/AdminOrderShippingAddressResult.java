package com.pinova.service.model;

public record AdminOrderShippingAddressResult(
        String receiverName,
        String receiverMobile,
        String countryCode,
        String provinceName,
        String cityName,
        String districtName,
        String detailAddress) {
}

