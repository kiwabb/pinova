package com.pinova.api.assembler;

import com.pinova.api.response.AuthenticatedMemberResponse;
import com.pinova.service.model.AuthenticatedMemberResult;
import org.springframework.stereotype.Component;

@Component
public class MemberAuthenticationResponseAssembler {

    public AuthenticatedMemberResponse toAuthenticatedMemberResponse(AuthenticatedMemberResult result) {
        return new AuthenticatedMemberResponse(
                result.id(),
                result.memberNo(),
                result.nickname(),
                result.avatarUrl());
    }
}
