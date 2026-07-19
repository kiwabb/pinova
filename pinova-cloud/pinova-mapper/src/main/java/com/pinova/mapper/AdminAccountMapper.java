package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.AdminAccount;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.net.InetAddress;
import java.time.Instant;

public interface AdminAccountMapper extends BaseMapper<AdminAccount> {
    @Select("SELECT 1 FROM (SELECT pg_advisory_xact_lock(920024)) bootstrap_lock")
    int acquireBootstrapLock();

    AdminAccount selectLoginByUsername(@Param("username") String username);

    int recordFailedLogin(
            @Param("accountId") Long accountId,
            @Param("now") Instant now,
            @Param("lockedUntil") Instant lockedUntil,
            @Param("maxAttempts") int maxAttempts);

    int recordSuccessfulLogin(
            @Param("accountId") Long accountId,
            @Param("now") Instant now,
            @Param("clientIp") InetAddress clientIp);

    int updatePassword(
            @Param("accountId") Long accountId,
            @Param("passwordHash") String passwordHash,
            @Param("now") Instant now,
            @Param("version") Integer version);
}
