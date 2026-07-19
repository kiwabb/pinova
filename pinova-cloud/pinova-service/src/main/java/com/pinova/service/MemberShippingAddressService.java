package com.pinova.service;

import com.baomidou.mybatisplus.spring.service.IService;
import com.pinova.pojo.entity.MemberShippingAddress;
import com.pinova.service.command.CreateMemberShippingAddressCommand;
import com.pinova.service.command.DeleteMemberShippingAddressCommand;
import com.pinova.service.command.SetDefaultMemberShippingAddressCommand;
import com.pinova.service.command.UpdateMemberShippingAddressCommand;
import com.pinova.service.model.MemberShippingAddressResult;

import java.util.List;

public interface MemberShippingAddressService extends IService<MemberShippingAddress> {

    List<MemberShippingAddressResult> listMemberAddresses(Long memberId);

    MemberShippingAddressResult createAddress(CreateMemberShippingAddressCommand command);

    MemberShippingAddressResult updateAddress(UpdateMemberShippingAddressCommand command);

    MemberShippingAddressResult setDefaultAddress(SetDefaultMemberShippingAddressCommand command);

    void deleteAddress(DeleteMemberShippingAddressCommand command);
}
