package com.pinova.service.command;

public record ChangeAdminPasswordCommand(
        Long accountId,
        String currentPassword,
        String newPassword,
        String confirmPassword) {
}

