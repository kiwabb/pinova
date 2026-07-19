package com.pinova.service.assembler;

import com.pinova.pojo.entity.MemberAccount;
import com.pinova.service.model.AuthenticatedMemberResult;
import org.springframework.stereotype.Component;

@Component
public class MemberAuthenticationResultAssembler {

    public AuthenticatedMemberResult toAuthenticatedMemberResult(MemberAccount member) {
        return new AuthenticatedMemberResult(
                member.getId(),
                member.getMemberNo(),
                member.getNickname(),
                member.getAvatarUrl());
    }
}
