package com.pinova.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record SaveMemberShippingAddressRequest(
        @NotBlank @Size(max = 64) String receiverName,
        @NotBlank @Size(max = 32) String receiverMobile,
        @NotBlank @Size(max = 2) String countryCode,
        @NotBlank @Size(max = 32) String provinceCode,
        @NotBlank @Size(max = 64) String provinceName,
        @NotBlank @Size(max = 32) String cityCode,
        @NotBlank @Size(max = 64) String cityName,
        @NotBlank @Size(max = 32) String districtCode,
        @NotBlank @Size(max = 64) String districtName,
        @NotBlank @Size(max = 255) String detailAddress,
        @Size(max = 16) String postalCode,
        @Size(max = 32) String label,
        boolean defaultAddress,
        @PositiveOrZero Integer version) {
}
