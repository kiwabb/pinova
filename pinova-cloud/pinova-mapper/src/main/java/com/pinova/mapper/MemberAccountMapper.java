package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.MemberAccount;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.net.InetAddress;
import java.time.Instant;

/**
 * <p>
 * 商城会员账户 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-14
 */
public interface MemberAccountMapper extends BaseMapper<MemberAccount> {

    MemberAccount selectLoginByUsername(@Param("username") String username);

    MemberAccount selectLoginByMobile(@Param("mobile") String mobile);

    MemberAccount selectLoginByEmail(@Param("email") String email);

    int updateLastLogin(
            @Param("memberId") Long memberId,
            @Param("loginAt") Instant loginAt,
            @Param("loginIp") InetAddress loginIp);

    @Select("""
            SELECT id
            FROM pinova.member_account
            WHERE id = #{memberId}
              AND status = 1
              AND deleted = false
            FOR UPDATE
            """)
    Long lockActiveMember(@Param("memberId") Long memberId);

}
