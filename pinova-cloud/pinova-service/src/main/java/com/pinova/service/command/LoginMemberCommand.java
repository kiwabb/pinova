package com.pinova.service.command;

import java.net.InetAddress;

public record LoginMemberCommand(
        String identifier,
        String password,
        InetAddress clientIp,
        String userAgent) {
}
