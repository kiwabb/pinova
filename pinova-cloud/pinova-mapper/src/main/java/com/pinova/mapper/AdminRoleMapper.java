package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.AdminRole;
import org.apache.ibatis.annotations.Param;

public interface AdminRoleMapper extends BaseMapper<AdminRole> {
    Long selectIdByCode(@Param("roleCode") String roleCode);
}

