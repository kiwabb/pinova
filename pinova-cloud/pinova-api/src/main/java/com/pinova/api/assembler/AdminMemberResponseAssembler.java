package com.pinova.api.assembler;

import com.pinova.api.response.AdminMemberResponse;
import com.pinova.service.model.AdminMemberResult;
import org.springframework.stereotype.Component;

@Component
public class AdminMemberResponseAssembler {
    public AdminMemberResponse toResponse(AdminMemberResult member) {
        return new AdminMemberResponse(String.valueOf(member.id()), member.memberNo(), member.username(),
                maskMobile(member.mobile()), maskEmail(member.email()), member.nickname(), member.avatarUrl(),
                member.status(), member.version(), member.lastLoginAt(), member.createdAt());
    }

    static String maskMobile(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.length() <= 7) return "*".repeat(value.length());
        return value.substring(0, 3) + "*".repeat(value.length() - 7) + value.substring(value.length() - 4);
    }

    static String maskEmail(String value) {
        if (value == null || value.isBlank()) return null;
        int separator = value.indexOf('@');
        if (separator <= 0) return "***";
        String local = value.substring(0, separator);
        return local.substring(0, 1) + "***" + value.substring(separator);
    }
}
