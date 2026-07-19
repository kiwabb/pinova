package com.pinova.service.impl;

import com.pinova.common.error.BusinessException;
import com.pinova.service.AdminAuthorizationService;
import com.pinova.service.error.AdminAuthenticationErrorCode;
import com.pinova.service.model.AuthenticatedAdminResult;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthorizationServiceImpl implements AdminAuthorizationService {
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
}

