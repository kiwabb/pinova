package com.pinova.service.assembler;

import com.pinova.pojo.entity.AdminAccount;
import com.pinova.service.model.AuthenticatedAdminResult;

import java.util.Collection;
import java.util.Set;

public final class AdminAuthenticationResultAssembler {
    private AdminAuthenticationResultAssembler() {
    }

    public static AuthenticatedAdminResult toAuthenticatedAdminResult(
            AdminAccount account,
            Collection<String> permissions) {
        return new AuthenticatedAdminResult(
                account.getId(),
                account.getUsername(),
                account.getDisplayName(),
                Boolean.TRUE.equals(account.getMustChangePassword()),
                Set.copyOf(permissions));
    }
}

