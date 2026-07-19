package com.pinova.service;

import com.pinova.service.command.ChangeAdminPasswordCommand;
import com.pinova.service.command.LoginAdminCommand;
import com.pinova.service.model.AdminLoginResult;
import com.pinova.service.model.AuthenticatedAdminResult;

public interface AdminAuthenticationService {
    AdminLoginResult login(LoginAdminCommand command);
    AuthenticatedAdminResult authenticate(String rawToken);
    void changePassword(ChangeAdminPasswordCommand command);
    void logout(String rawToken);
}

