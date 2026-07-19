package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.MemberShippingAddress;
import org.apache.ibatis.annotations.Param;

public interface MemberShippingAddressMapper extends BaseMapper<MemberShippingAddress> {

    MemberShippingAddress selectActiveByIdForUpdate(
            @Param("memberId") Long memberId,
            @Param("addressId") Long addressId);

    int clearDefaultAddresses(
            @Param("memberId") Long memberId,
            @Param("excludedAddressId") Long excludedAddressId,
            @Param("operatorId") Long operatorId);

    int updateActiveAddress(MemberShippingAddress address);

    int setDefaultActiveAddress(
            @Param("memberId") Long memberId,
            @Param("addressId") Long addressId,
            @Param("version") Integer version,
            @Param("operatorId") Long operatorId);

    int softDeleteActiveAddress(
            @Param("memberId") Long memberId,
            @Param("addressId") Long addressId,
            @Param("version") Integer version,
            @Param("operatorId") Long operatorId);

    int promoteLatestActiveAddress(
            @Param("memberId") Long memberId,
            @Param("operatorId") Long operatorId);
}
