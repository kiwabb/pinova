package com.pinova.service.command;

public record RecordAdminAuditCommand(
        Long operatorId, String domainCode, String actionCode,
        String targetType, String targetId, String requestId,
        String reason, String beforeSnapshot, String afterSnapshot) {
}
