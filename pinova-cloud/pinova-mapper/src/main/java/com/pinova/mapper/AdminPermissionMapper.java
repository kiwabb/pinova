package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.AdminPermission;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AdminPermissionMapper extends BaseMapper<AdminPermission> {
    List<String> selectCodesByAccountId(@Param("accountId") Long accountId);
}

