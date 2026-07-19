package com.pinova.api.assembler;

import com.pinova.api.response.MemberShippingAddressResponse;
import com.pinova.service.model.MemberShippingAddressResult;
import org.springframework.stereotype.Component;

@Component
public class MemberShippingAddressResponseAssembler {

    public MemberShippingAddressResponse toAddressResponse(MemberShippingAddressResult result) {
        return new MemberShippingAddressResponse(
                result.id(),
                result.receiverName(),
                result.receiverMobile(),
                result.countryCode(),
                result.provinceCode(),
                result.provinceName(),
                result.cityCode(),
                result.cityName(),
                result.districtCode(),
                result.districtName(),
                result.detailAddress(),
                result.postalCode(),
                result.label(),
                result.defaultAddress(),
                result.version());
    }
}
