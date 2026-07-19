package com.pinova.api.request;

public record ChangeAdminPasswordRequest(String currentPassword, String newPassword, String confirmPassword) {
}

