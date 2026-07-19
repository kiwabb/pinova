package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.AdminLoginSession;
import org.apache.ibatis.annotations.Param;

import java.time.Instant;

public interface AdminLoginSessionMapper extends BaseMapper<AdminLoginSession> {
    AdminLoginSession selectActiveByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("now") Instant now,
            @Param("idleAfter") Instant idleAfter);

    int touchLastSeen(
            @Param("tokenHash") String tokenHash,
            @Param("now") Instant now,
            @Param("staleBefore") Instant staleBefore);

    int revokeByTokenHash(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

    int revokeAllForAccount(@Param("accountId") Long accountId, @Param("now") Instant now);
}

