package com.pinova.api.controller;

import com.pinova.api.assembler.MemberShippingAddressResponseAssembler;
import com.pinova.api.request.MemberShippingAddressVersionRequest;
import com.pinova.api.request.SaveMemberShippingAddressRequest;
import com.pinova.api.response.MemberShippingAddressResponse;
import com.pinova.api.web.CurrentMemberResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.MemberShippingAddressService;
import com.pinova.service.command.CreateMemberShippingAddressCommand;
import com.pinova.service.command.DeleteMemberShippingAddressCommand;
import com.pinova.service.command.SetDefaultMemberShippingAddressCommand;
import com.pinova.service.command.UpdateMemberShippingAddressCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "会员收货地址", description = "当前登录会员的收货地址管理接口")
@RestController
@RequestMapping("/member-shipping-addresses")
public class MemberShippingAddressController {

    private final MemberShippingAddressService addressService;
    private final MemberShippingAddressResponseAssembler responseAssembler;
    private final CurrentMemberResolver currentMemberResolver;

    public MemberShippingAddressController(
            MemberShippingAddressService addressService,
            MemberShippingAddressResponseAssembler responseAssembler,
            CurrentMemberResolver currentMemberResolver) {
        this.addressService = addressService;
        this.responseAssembler = responseAssembler;
        this.currentMemberResolver = currentMemberResolver;
    }

    @Operation(summary = "获取当前会员的收货地址")
    @GetMapping
    public ApiResponse<List<MemberShippingAddressResponse>> list(HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(addressService.listMemberAddresses(memberId).stream()
                .map(responseAssembler::toAddressResponse)
                .toList());
    }

    @Operation(summary = "新增当前会员的收货地址")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberShippingAddressResponse> create(
            @Valid @RequestBody SaveMemberShippingAddressRequest body,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toAddressResponse(addressService.createAddress(
                new CreateMemberShippingAddressCommand(
                        memberId,
                        body.receiverName(),
                        body.receiverMobile(),
                        body.countryCode(),
                        body.provinceCode(),
                        body.provinceName(),
                        body.cityCode(),
                        body.cityName(),
                        body.districtCode(),
                        body.districtName(),
                        body.detailAddress(),
                        body.postalCode(),
                        body.label(),
                        body.defaultAddress()))));
    }

    @Operation(summary = "更新当前会员的收货地址")
    @PutMapping("/{addressId}")
    public ApiResponse<MemberShippingAddressResponse> update(
            @PathVariable Long addressId,
            @Valid @RequestBody SaveMemberShippingAddressRequest body,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toAddressResponse(addressService.updateAddress(
                new UpdateMemberShippingAddressCommand(
                        memberId,
                        addressId,
                        body.receiverName(),
                        body.receiverMobile(),
                        body.countryCode(),
                        body.provinceCode(),
                        body.provinceName(),
                        body.cityCode(),
                        body.cityName(),
                        body.districtCode(),
                        body.districtName(),
                        body.detailAddress(),
                        body.postalCode(),
                        body.label(),
                        body.defaultAddress(),
                        body.version()))));
    }

    @Operation(summary = "设为当前会员的默认收货地址")
    @PatchMapping("/{addressId}/default")
    public ApiResponse<MemberShippingAddressResponse> setDefault(
            @PathVariable Long addressId,
            @Valid @RequestBody MemberShippingAddressVersionRequest body,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        return ApiResponse.success(responseAssembler.toAddressResponse(addressService.setDefaultAddress(
                new SetDefaultMemberShippingAddressCommand(memberId, addressId, body.version()))));
    }

    @Operation(summary = "删除当前会员的收货地址")
    @DeleteMapping("/{addressId}")
    public ApiResponse<Void> delete(
            @PathVariable Long addressId,
            @RequestParam Integer version,
            HttpServletRequest request) {
        Long memberId = currentMemberResolver.requireCurrentMemberId(request);
        addressService.deleteAddress(new DeleteMemberShippingAddressCommand(memberId, addressId, version));
        return ApiResponse.success();
    }

}
