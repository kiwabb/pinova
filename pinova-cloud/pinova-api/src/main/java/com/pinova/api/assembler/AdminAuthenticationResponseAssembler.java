package com.pinova.api.assembler;

import com.pinova.api.response.AuthenticatedAdminResponse;
import com.pinova.service.model.AuthenticatedAdminResult;
import org.springframework.stereotype.Component;

@Component
public class AdminAuthenticationResponseAssembler {
    public AuthenticatedAdminResponse toAuthenticatedAdminResponse(AuthenticatedAdminResult result) {
        return new AuthenticatedAdminResponse(
                result.id().toString(),
                result.username(),
                result.displayName(),
                result.mustChangePassword(),
                result.permissions());
    }
}

