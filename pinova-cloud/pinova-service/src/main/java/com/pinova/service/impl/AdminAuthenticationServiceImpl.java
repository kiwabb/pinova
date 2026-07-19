package com.pinova.service.impl;

import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.AdminAccountMapper;
import com.pinova.mapper.AdminLoginSessionMapper;
import com.pinova.mapper.AdminPermissionMapper;
import com.pinova.pojo.entity.AdminAccount;
import com.pinova.pojo.entity.AdminLoginSession;
import com.pinova.service.AdminAuthenticationService;
import com.pinova.service.assembler.AdminAuthenticationResultAssembler;
import com.pinova.service.command.ChangeAdminPasswordCommand;
import com.pinova.service.command.LoginAdminCommand;
import com.pinova.service.error.AdminAuthenticationErrorCode;
import com.pinova.service.model.AdminLoginResult;
import com.pinova.service.model.AuthenticatedAdminResult;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class AdminAuthenticationServiceImpl implements AdminAuthenticationService {
    private static final Duration SESSION_LIFETIME = Duration.ofHours(8);
    private static final Duration SESSION_IDLE_TIMEOUT = Duration.ofMinutes(30);
    private static final Duration LAST_SEEN_WRITE_INTERVAL = Duration.ofMinutes(5);
    private static final Duration LOGIN_LOCK_DURATION = Duration.ofMinutes(15);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int MAX_USER_AGENT_LENGTH = 512;
    private static final Pattern SESSION_TOKEN = Pattern.compile("[A-Za-z0-9_-]{43}");
    private static final String DUMMY_PASSWORD_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AdminAccountMapper accountMapper;
    private final AdminLoginSessionMapper sessionMapper;
    private final AdminPermissionMapper permissionMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminAuthenticationServiceImpl(
            AdminAccountMapper accountMapper,
            AdminLoginSessionMapper sessionMapper,
            AdminPermissionMapper permissionMapper) {
        this.accountMapper = accountMapper;
        this.sessionMapper = sessionMapper;
        this.permissionMapper = permissionMapper;
    }

    @Override
    @Transactional(noRollbackFor = BusinessException.class)
    public AdminLoginResult login(LoginAdminCommand command) {
        if (command == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "登录参数不能为空");
        }
        String username = AdminBootstrapServiceImpl.normalizeUsername(command.username());
        String password = validatePassword(command.password());
        AdminAccount account = accountMapper.selectLoginByUsername(username);
        boolean passwordMatches = matchesPassword(password, account);
        Instant now = Instant.now();
        boolean locked = account != null
                && account.getLockedUntil() != null
                && account.getLockedUntil().isAfter(now);
        if (account == null
                || account.getStatus() == null
                || account.getStatus() != 1
                || Boolean.TRUE.equals(account.getDeleted())
                || locked
                || !passwordMatches) {
            if (account != null && !locked) {
                accountMapper.recordFailedLogin(
                        account.getId(), now, now.plus(LOGIN_LOCK_DURATION), MAX_FAILED_ATTEMPTS);
            }
            throw new BusinessException(AdminAuthenticationErrorCode.INVALID_CREDENTIALS);
        }
        if (accountMapper.recordSuccessfulLogin(account.getId(), now, command.clientIp()) != 1) {
            throw new BusinessException(AdminAuthenticationErrorCode.INVALID_CREDENTIALS);
        }

        String rawToken = generateToken();
        AdminLoginSession session = new AdminLoginSession();
        session.setAccountId(account.getId());
        session.setTokenHash(hashToken(rawToken));
        session.setExpiresAt(now.plus(SESSION_LIFETIME));
        session.setLastSeenAt(now);
        session.setClientIp(command.clientIp());
        session.setUserAgent(normalizeUserAgent(command.userAgent()));
        session.setCreatedAt(now);
        session.setCreatedBy(account.getId());
        session.setUpdatedAt(now);
        session.setUpdatedBy(account.getId());
        sessionMapper.insert(session);

        return new AdminLoginResult(rawToken, session.getExpiresAt(), toResult(account));
    }

    @Override
    @Transactional
    public AuthenticatedAdminResult authenticate(String rawToken) {
        String tokenHash = requireTokenHash(rawToken);
        Instant now = Instant.now();
        AdminLoginSession session = sessionMapper.selectActiveByTokenHash(
                tokenHash, now, now.minus(SESSION_IDLE_TIMEOUT));
        if (session == null) {
            throw new BusinessException(AdminAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        AdminAccount account = accountMapper.selectById(session.getAccountId());
        if (account == null
                || account.getStatus() == null
                || account.getStatus() != 1
                || Boolean.TRUE.equals(account.getDeleted())
                || account.getPasswordChangedAt() != null
                && account.getPasswordChangedAt().isAfter(session.getCreatedAt())) {
            throw new BusinessException(AdminAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        if (!session.getLastSeenAt().isAfter(now.minus(LAST_SEEN_WRITE_INTERVAL))) {
            sessionMapper.touchLastSeen(tokenHash, now, now.minus(LAST_SEEN_WRITE_INTERVAL));
        }
        return toResult(account);
    }

    @Override
    @Transactional
    public void changePassword(ChangeAdminPasswordCommand command) {
        if (command == null || command.accountId() == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "修改密码参数不能为空");
        }
        AdminAccount account = accountMapper.selectById(command.accountId());
        String currentPassword = validatePassword(command.currentPassword());
        if (account == null || !matchesPassword(currentPassword, account)) {
            throw new BusinessException(AdminAuthenticationErrorCode.INVALID_CREDENTIALS);
        }
        String newPassword = AdminBootstrapServiceImpl.validateNewPassword(command.newPassword());
        if (!newPassword.equals(command.confirmPassword())) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "两次输入的新密码不一致");
        }
        if (passwordEncoder.matches(newPassword, account.getPasswordHash())) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "新密码不能与当前密码相同");
        }
        Instant now = Instant.now();
        if (accountMapper.updatePassword(
                account.getId(), passwordEncoder.encode(newPassword), now, account.getVersion()) != 1) {
            throw new BusinessException(AdminAuthenticationErrorCode.PASSWORD_UPDATE_CONFLICT);
        }
        sessionMapper.revokeAllForAccount(account.getId(), now);
    }

    @Override
    @Transactional
    public void logout(String rawToken) {
        if (isValidToken(rawToken)) {
            sessionMapper.revokeByTokenHash(hashToken(rawToken), Instant.now());
        }
    }

    private AuthenticatedAdminResult toResult(AdminAccount account) {
        List<String> permissions = permissionMapper.selectCodesByAccountId(account.getId());
        return AdminAuthenticationResultAssembler.toAuthenticatedAdminResult(account, permissions);
    }

    private boolean matchesPassword(String password, AdminAccount account) {
        String encoded = account == null ? DUMMY_PASSWORD_HASH : account.getPasswordHash();
        try {
            return passwordEncoder.matches(password, encoded);
        } catch (IllegalArgumentException exception) {
            passwordEncoder.matches(password, DUMMY_PASSWORD_HASH);
            return false;
        }
    }

    private static String validatePassword(String password) {
        if (password == null || password.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码不能为空");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码 UTF-8 编码后不能超过 72 字节");
        }
        return password;
    }

    private static String normalizeUserAgent(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        return normalized.length() <= MAX_USER_AGENT_LENGTH
                ? normalized
                : normalized.substring(0, MAX_USER_AGENT_LENGTH);
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String requireTokenHash(String rawToken) {
        if (!isValidToken(rawToken)) {
            throw new BusinessException(AdminAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        return hashToken(rawToken);
    }

    private static boolean isValidToken(String rawToken) {
        return rawToken != null && SESSION_TOKEN.matcher(rawToken).matches();
    }

    private static String hashToken(String rawToken) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM 不支持 SHA-256", exception);
        }
    }
}

