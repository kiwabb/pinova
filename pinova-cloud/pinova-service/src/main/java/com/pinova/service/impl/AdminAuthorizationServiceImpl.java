package com.pinova.service.impl;

import com.pinova.common.error.BusinessException;
import com.pinova.mapper.AdminRoleMapper;
import com.pinova.service.AdminAuthorizationService;
import com.pinova.service.error.AdminAuthenticationErrorCode;
import com.pinova.service.model.AuthenticatedAdminResult;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthorizationServiceImpl implements AdminAuthorizationService {
    private final AdminRoleMapper adminRoleMapper;

    public AdminAuthorizationServiceImpl(AdminRoleMapper adminRoleMapper) {
        this.adminRoleMapper = adminRoleMapper;
    }

    @Override
    public void requireOrderRead(AuthenticatedAdminResult admin) {
        if (admin == null) {
            throw new BusinessException(AdminAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        if (admin.mustChangePassword()) {
            throw new BusinessException(AdminAuthenticationErrorCode.PASSWORD_CHANGE_REQUIRED);
        }
        if (!admin.permissions().contains(ORDER_READ)) {
            throw new BusinessException(AdminAuthenticationErrorCode.PERMISSION_DENIED);
        }
    }

    @Override
    public void requireSuperAdmin(AuthenticatedAdminResult admin) {
        if (admin == null) {
            throw new BusinessException(AdminAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        if (admin.mustChangePassword()) {
            throw new BusinessException(AdminAuthenticationErrorCode.PASSWORD_CHANGE_REQUIRED);
        }
        if (!adminRoleMapper.selectCodesByAccountId(admin.id()).contains("SUPER_ADMIN")) {
            throw new BusinessException(AdminAuthenticationErrorCode.PERMISSION_DENIED);
        }
    }
}
