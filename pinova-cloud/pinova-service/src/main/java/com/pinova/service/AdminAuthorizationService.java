package com.pinova.service;

import com.pinova.service.model.AuthenticatedAdminResult;

public interface AdminAuthorizationService {
    String ORDER_READ = "ORDER_READ";
    void requireOrderRead(AuthenticatedAdminResult admin);
    void requireSuperAdmin(AuthenticatedAdminResult admin);
}
