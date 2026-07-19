package com.pinova.service.command;

import java.net.InetAddress;

public record RegisterMemberCommand(
        String username,
        String nickname,
        String password,
        String confirmPassword,
        InetAddress clientIp,
        String userAgent) {
}
