package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.MemberLoginSession;
import org.apache.ibatis.annotations.Param;

import java.time.Instant;

/**
 * <p>
 * 会员不透明登录会话 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-17
 */
public interface MemberLoginSessionMapper extends BaseMapper<MemberLoginSession> {

    MemberLoginSession selectActiveByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("now") Instant now);

    int touchLastSeen(
            @Param("tokenHash") String tokenHash,
            @Param("now") Instant now,
            @Param("staleBefore") Instant staleBefore);

    int revokeByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("now") Instant now);

}
