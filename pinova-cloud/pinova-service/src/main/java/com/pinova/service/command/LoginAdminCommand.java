package com.pinova.service.command;

import java.net.InetAddress;

public record LoginAdminCommand(String username, String password, InetAddress clientIp, String userAgent) {
}

