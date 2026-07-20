package com.pinova.service.impl;

import com.pinova.common.error.BusinessException;
import com.pinova.mapper.AdminRoleMapper;
import com.pinova.service.AdminAuthorizationService;
import com.pinova.service.error.AdminAuthenticationErrorCode;
import com.pinova.service.model.AuthenticatedAdminResult;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminAuthorizationServiceImplTest {
    private final AdminRoleMapper roleMapper = mock(AdminRoleMapper.class);
    private final AdminAuthorizationService service = new AdminAuthorizationServiceImpl(roleMapper);

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

    @Test
    void rejectsWriteWhenAdminDoesNotOwnSuperAdminRole() {
        AuthenticatedAdminResult admin = new AuthenticatedAdminResult(1L, "admin", "Admin", false, Set.of());
        when(roleMapper.selectCodesByAccountId(1L)).thenReturn(List.of("ORDER_OPERATOR"));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.requireSuperAdmin(admin));

        assertEquals(AdminAuthenticationErrorCode.PERMISSION_DENIED, exception.getErrorCode());
    }

    @Test
    void acceptsWriteForSuperAdminRole() {
        AuthenticatedAdminResult admin = new AuthenticatedAdminResult(1L, "admin", "Admin", false, Set.of());
        when(roleMapper.selectCodesByAccountId(1L)).thenReturn(List.of("SUPER_ADMIN"));

        assertDoesNotThrow(() -> service.requireSuperAdmin(admin));
    }
}
