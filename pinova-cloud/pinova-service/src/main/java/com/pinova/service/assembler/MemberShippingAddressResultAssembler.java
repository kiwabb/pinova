package com.pinova.service.assembler;

import com.pinova.pojo.entity.MemberShippingAddress;
import com.pinova.service.model.MemberShippingAddressResult;
import org.springframework.stereotype.Component;

@Component
public class MemberShippingAddressResultAssembler {

    public MemberShippingAddressResult toAddressResult(MemberShippingAddress address) {
        return new MemberShippingAddressResult(
                address.getId(),
                address.getReceiverName(),
                address.getReceiverMobile(),
                address.getCountryCode(),
                address.getProvinceCode(),
                address.getProvinceName(),
                address.getCityCode(),
                address.getCityName(),
                address.getDistrictCode(),
                address.getDistrictName(),
                address.getDetailAddress(),
                address.getPostalCode(),
                address.getLabel(),
                Boolean.TRUE.equals(address.getDefaultAddress()),
                address.getVersion());
    }
}
