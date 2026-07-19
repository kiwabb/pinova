package com.pinova.service.impl;

import com.pinova.common.error.BusinessException;
import com.pinova.service.AdminAuthorizationService;
import com.pinova.service.error.AdminAuthenticationErrorCode;
import com.pinova.service.model.AuthenticatedAdminResult;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AdminAuthorizationServiceImplTest {
    private final AdminAuthorizationService service = new AdminAuthorizationServiceImpl();

    @Test
    void requiresPasswordChangeBeforeOrderRead() {
        AuthenticatedAdminResult admin = new AuthenticatedAdminResult(
                1L, "admin", "Admin", true, Set.of(AdminAuthorizationService.ORDER_READ));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.requireOrderRead(admin));

        assertEquals(AdminAuthenticationErrorCode.PASSWORD_CHANGE_REQUIRED, exception.getErrorCode());
    }

    @Test
    void requiresOrderReadPermission() {
        AuthenticatedAdminResult admin = new AuthenticatedAdminResult(1L, "admin", "Admin", false, Set.of());

        BusinessException exception = assertThrows(BusinessException.class, () -> service.requireOrderRead(admin));

        assertEquals(AdminAuthenticationErrorCode.PERMISSION_DENIED, exception.getErrorCode());
    }

    @Test
    void acceptsChangedPasswordAndOrderPermission() {
        AuthenticatedAdminResult admin = new AuthenticatedAdminResult(
                1L, "admin", "Admin", false, Set.of(AdminAuthorizationService.ORDER_READ));

        assertDoesNotThrow(() -> service.requireOrderRead(admin));
    }
}

