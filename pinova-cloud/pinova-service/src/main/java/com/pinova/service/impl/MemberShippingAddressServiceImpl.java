package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.MemberAccountMapper;
import com.pinova.mapper.MemberShippingAddressMapper;
import com.pinova.pojo.entity.MemberAccount;
import com.pinova.pojo.entity.MemberShippingAddress;
import com.pinova.service.MemberShippingAddressService;
import com.pinova.service.assembler.MemberShippingAddressResultAssembler;
import com.pinova.service.command.CreateMemberShippingAddressCommand;
import com.pinova.service.command.DeleteMemberShippingAddressCommand;
import com.pinova.service.command.SetDefaultMemberShippingAddressCommand;
import com.pinova.service.command.UpdateMemberShippingAddressCommand;
import com.pinova.service.error.MemberShippingAddressErrorCode;
import com.pinova.service.model.MemberShippingAddressResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class MemberShippingAddressServiceImpl
        extends ServiceImpl<MemberShippingAddressMapper, MemberShippingAddress>
        implements MemberShippingAddressService {

    private static final int MAX_ADDRESS_COUNT = 20;
    private static final Pattern E164_MOBILE = Pattern.compile("^\\+[1-9]\\d{7,14}$");
    private static final Pattern COUNTRY_CODE = Pattern.compile("^[A-Z]{2}$");

    private final MemberAccountMapper memberAccountMapper;
    private final MemberShippingAddressResultAssembler resultAssembler;

    public MemberShippingAddressServiceImpl(
            MemberAccountMapper memberAccountMapper,
            MemberShippingAddressResultAssembler resultAssembler) {
        this.memberAccountMapper = memberAccountMapper;
        this.resultAssembler = resultAssembler;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberShippingAddressResult> listMemberAddresses(Long memberId) {
        requireReadableMember(memberId);
        return baseMapper.selectList(Wrappers.lambdaQuery(MemberShippingAddress.class)
                        .eq(MemberShippingAddress::getMemberId, memberId)
                        .orderByDesc(MemberShippingAddress::getDefaultAddress)
                        .orderByDesc(MemberShippingAddress::getUpdatedAt)
                        .orderByDesc(MemberShippingAddress::getId))
                .stream()
                .map(resultAssembler::toAddressResult)
                .toList();
    }

    @Override
    @Transactional
    public MemberShippingAddressResult createAddress(CreateMemberShippingAddressCommand command) {
        requireWritableMember(command.memberId());
        long addressCount = baseMapper.selectCount(Wrappers.lambdaQuery(MemberShippingAddress.class)
                .eq(MemberShippingAddress::getMemberId, command.memberId()));
        if (addressCount >= MAX_ADDRESS_COUNT) {
            throw new BusinessException(MemberShippingAddressErrorCode.ADDRESS_LIMIT_REACHED);
        }

        NormalizedAddress normalized = normalizeAddress(
                command.receiverName(), command.receiverMobile(), command.countryCode(),
                command.provinceCode(), command.provinceName(), command.cityCode(), command.cityName(),
                command.districtCode(), command.districtName(), command.detailAddress(),
                command.postalCode(), command.label());
        boolean defaultAddress = command.defaultAddress() || addressCount == 0;
        if (defaultAddress) {
            baseMapper.clearDefaultAddresses(command.memberId(), null, command.memberId());
        }

        MemberShippingAddress address = new MemberShippingAddress();
        address.setMemberId(command.memberId());
        applyNormalizedAddress(address, normalized);
        address.setDefaultAddress(defaultAddress);
        address.setVersion(0);
        address.setDeleted(false);
        address.setCreatedBy(command.memberId());
        address.setUpdatedBy(command.memberId());
        baseMapper.insert(address);
        return resultAssembler.toAddressResult(address);
    }

    @Override
    @Transactional
    public MemberShippingAddressResult updateAddress(UpdateMemberShippingAddressCommand command) {
        requireWritableMember(command.memberId());
        MemberShippingAddress address = requireAddress(command.memberId(), command.addressId(), command.version());
        NormalizedAddress normalized = normalizeAddress(
                command.receiverName(), command.receiverMobile(), command.countryCode(),
                command.provinceCode(), command.provinceName(), command.cityCode(), command.cityName(),
                command.districtCode(), command.districtName(), command.detailAddress(),
                command.postalCode(), command.label());
        if (command.defaultAddress()) {
            baseMapper.clearDefaultAddresses(command.memberId(), command.addressId(), command.memberId());
        }
        applyNormalizedAddress(address, normalized);
        address.setDefaultAddress(command.defaultAddress());
        address.setUpdatedBy(command.memberId());
        if (baseMapper.updateActiveAddress(address) == 0) {
            throw new BusinessException(MemberShippingAddressErrorCode.VERSION_CONFLICT);
        }
        address.setVersion(address.getVersion() + 1);
        return resultAssembler.toAddressResult(address);
    }

    @Override
    @Transactional
    public MemberShippingAddressResult setDefaultAddress(SetDefaultMemberShippingAddressCommand command) {
        requireWritableMember(command.memberId());
        MemberShippingAddress address = requireAddress(command.memberId(), command.addressId(), command.version());
        if (Boolean.TRUE.equals(address.getDefaultAddress())) {
            return resultAssembler.toAddressResult(address);
        }
        baseMapper.clearDefaultAddresses(command.memberId(), command.addressId(), command.memberId());
        if (baseMapper.setDefaultActiveAddress(
                command.memberId(), command.addressId(), command.version(), command.memberId()) == 0) {
            throw new BusinessException(MemberShippingAddressErrorCode.VERSION_CONFLICT);
        }
        address.setDefaultAddress(true);
        address.setVersion(address.getVersion() + 1);
        return resultAssembler.toAddressResult(address);
    }

    @Override
    @Transactional
    public void deleteAddress(DeleteMemberShippingAddressCommand command) {
        requireWritableMember(command.memberId());
        MemberShippingAddress address = requireAddress(command.memberId(), command.addressId(), command.version());
        if (baseMapper.softDeleteActiveAddress(
                command.memberId(), command.addressId(), command.version(), command.memberId()) == 0) {
            throw new BusinessException(MemberShippingAddressErrorCode.VERSION_CONFLICT);
        }
        if (Boolean.TRUE.equals(address.getDefaultAddress())) {
            baseMapper.promoteLatestActiveAddress(command.memberId(), command.memberId());
        }
    }

    private void requireReadableMember(Long memberId) {
        validatePositiveId(memberId, "会员 ID");
        MemberAccount member = memberAccountMapper.selectById(memberId);
        if (member == null || member.getStatus() == null || member.getStatus() != 1) {
            throw new BusinessException(MemberShippingAddressErrorCode.MEMBER_NOT_FOUND);
        }
    }

    private void requireWritableMember(Long memberId) {
        validatePositiveId(memberId, "会员 ID");
        if (memberAccountMapper.lockActiveMember(memberId) == null) {
            throw new BusinessException(MemberShippingAddressErrorCode.MEMBER_NOT_FOUND);
        }
    }

    private MemberShippingAddress requireAddress(Long memberId, Long addressId, Integer version) {
        validatePositiveId(addressId, "收货地址 ID");
        if (version == null || version < 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "收货地址版本号无效");
        }
        MemberShippingAddress address = baseMapper.selectActiveByIdForUpdate(memberId, addressId);
        if (address == null) {
            throw new BusinessException(MemberShippingAddressErrorCode.ADDRESS_NOT_FOUND);
        }
        if (!version.equals(address.getVersion())) {
            throw new BusinessException(MemberShippingAddressErrorCode.VERSION_CONFLICT);
        }
        return address;
    }

    private static NormalizedAddress normalizeAddress(
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
            String label) {
        String normalizedMobile = requiredText(receiverMobile, 32, "收货人手机号");
        if (!E164_MOBILE.matcher(normalizedMobile).matches()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "收货人手机号必须使用 E.164 国际格式");
        }
        String normalizedCountryCode = requiredText(countryCode, 2, "国家代码").toUpperCase(Locale.ROOT);
        if (!COUNTRY_CODE.matcher(normalizedCountryCode).matches()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "国家代码必须是两个大写字母");
        }
        return new NormalizedAddress(
                requiredText(receiverName, 64, "收货人姓名"),
                normalizedMobile,
                normalizedCountryCode,
                requiredText(provinceCode, 32, "省级行政区代码"),
                requiredText(provinceName, 64, "省级行政区名称"),
                requiredText(cityCode, 32, "市级行政区代码"),
                requiredText(cityName, 64, "市级行政区名称"),
                requiredText(districtCode, 32, "区县级行政区代码"),
                requiredText(districtName, 64, "区县级行政区名称"),
                requiredText(detailAddress, 255, "详细地址"),
                optionalText(postalCode, 16, "邮政编码"),
                optionalText(label, 32, "地址标签"));
    }

    private static void applyNormalizedAddress(MemberShippingAddress address, NormalizedAddress normalized) {
        address.setReceiverName(normalized.receiverName());
        address.setReceiverMobile(normalized.receiverMobile());
        address.setCountryCode(normalized.countryCode());
        address.setProvinceCode(normalized.provinceCode());
        address.setProvinceName(normalized.provinceName());
        address.setCityCode(normalized.cityCode());
        address.setCityName(normalized.cityName());
        address.setDistrictCode(normalized.districtCode());
        address.setDistrictName(normalized.districtName());
        address.setDetailAddress(normalized.detailAddress());
        address.setPostalCode(normalized.postalCode());
        address.setLabel(normalized.label());
    }

    private static void validatePositiveId(Long value, String fieldName) {
        if (value == null || value <= 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, fieldName + "必须大于 0");
        }
    }

    private static String requiredText(String value, int maxLength, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, fieldName + "不能为空");
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, fieldName + "长度不能超过 " + maxLength);
        }
        return normalized;
    }

    private static String optionalText(String value, int maxLength, String fieldName) {
        if (value == null) return null;
        String normalized = value.trim();
        if (normalized.isEmpty()) return null;
        if (normalized.length() > maxLength) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, fieldName + "长度不能超过 " + maxLength);
        }
        return normalized;
    }

    private record NormalizedAddress(
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
            String label) {
    }
}
