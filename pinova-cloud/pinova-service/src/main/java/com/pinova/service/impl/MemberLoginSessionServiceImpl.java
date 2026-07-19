package com.pinova.service.impl;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.MemberAccountMapper;
import com.pinova.mapper.MemberLoginSessionMapper;
import com.pinova.pojo.entity.MemberAccount;
import com.pinova.pojo.entity.MemberLoginSession;
import com.pinova.service.MemberLoginSessionService;
import com.pinova.service.assembler.MemberAuthenticationResultAssembler;
import com.pinova.service.command.LoginMemberCommand;
import com.pinova.service.command.RegisterMemberCommand;
import com.pinova.service.error.MemberAuthenticationErrorCode;
import com.pinova.service.model.AuthenticatedMemberResult;
import com.pinova.service.model.MemberLoginResult;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * <p>
 * 会员不透明登录会话 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-17
 */
@Service
public class MemberLoginSessionServiceImpl
        extends ServiceImpl<MemberLoginSessionMapper, MemberLoginSession>
        implements MemberLoginSessionService {

    private static final Duration SESSION_LIFETIME = Duration.ofDays(7);
    private static final Duration LAST_SEEN_WRITE_INTERVAL = Duration.ofMinutes(5);
    private static final Pattern E164_MOBILE = Pattern.compile("\\+[1-9]\\d{7,14}");
    private static final Pattern SESSION_TOKEN = Pattern.compile("[A-Za-z0-9_-]{43}");
    private static final Pattern REGISTRATION_USERNAME = Pattern.compile("[a-z][a-z0-9_]{3,31}");
    private static final int MAX_IDENTIFIER_LENGTH = 254;
    private static final int MAX_BCRYPT_PASSWORD_BYTES = 72;
    private static final int MAX_USER_AGENT_LENGTH = 512;
    private static final String DUMMY_PASSWORD_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MemberAccountMapper memberAccountMapper;
    private final MemberAuthenticationResultAssembler resultAssembler;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public MemberLoginSessionServiceImpl(
            MemberAccountMapper memberAccountMapper,
            MemberAuthenticationResultAssembler resultAssembler) {
        this.memberAccountMapper = memberAccountMapper;
        this.resultAssembler = resultAssembler;
    }

    @Override
    @Transactional
    public MemberLoginResult register(RegisterMemberCommand command) {
        if (command == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "注册参数不能为空");
        }
        String username = normalizeRegistrationUsername(command.username());
        String password = validateNewPassword(command.password(), command.confirmPassword());
        String nickname = normalizeNickname(command.nickname(), username);
        if (memberAccountMapper.selectLoginByUsername(username) != null) {
            throw new BusinessException(MemberAuthenticationErrorCode.USERNAME_UNAVAILABLE);
        }

        Instant now = Instant.now();
        MemberAccount member = new MemberAccount();
        member.setMemberNo(generateMemberNo());
        member.setUsername(username);
        member.setPasswordHash(passwordEncoder.encode(password));
        member.setNickname(nickname);
        member.setStatus((short) 1);
        member.setLastLoginAt(now);
        member.setLastLoginIp(command.clientIp());
        member.setPasswordChangedAt(now);
        member.setVersion(0);
        member.setDeleted(false);
        member.setCreatedAt(now);
        member.setCreatedBy(0L);
        member.setUpdatedAt(now);
        member.setUpdatedBy(0L);
        try {
            memberAccountMapper.insert(member);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(MemberAuthenticationErrorCode.USERNAME_UNAVAILABLE);
        }
        return createSession(member, command.clientIp(), command.userAgent(), now);
    }

    @Override
    @Transactional
    public MemberLoginResult login(LoginMemberCommand command) {
        if (command == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "登录参数不能为空");
        }
        String identifier = normalizeIdentifier(command.identifier());
        String password = validatePassword(command.password());
        MemberAccount member = findMember(identifier);
        boolean passwordMatches = matchesPassword(password, member);
        if (member == null
                || member.getStatus() == null
                || member.getStatus() != 1
                || member.getPasswordHash() == null
                || !passwordMatches) {
            throw new BusinessException(MemberAuthenticationErrorCode.INVALID_CREDENTIALS);
        }

        Instant now = Instant.now();
        if (memberAccountMapper.updateLastLogin(member.getId(), now, command.clientIp()) == 0) {
            throw new BusinessException(MemberAuthenticationErrorCode.INVALID_CREDENTIALS);
        }

        return createSession(member, command.clientIp(), command.userAgent(), now);
    }

    private MemberLoginResult createSession(
            MemberAccount member,
            InetAddress clientIp,
            String userAgent,
            Instant now) {
        String rawToken = generateToken();
        MemberLoginSession session = new MemberLoginSession();
        session.setMemberId(member.getId());
        session.setTokenHash(hashToken(rawToken));
        session.setExpiresAt(now.plus(SESSION_LIFETIME));
        session.setLastSeenAt(now);
        session.setClientIp(clientIp);
        session.setUserAgent(normalizeUserAgent(userAgent));
        session.setCreatedAt(now);
        session.setCreatedBy(member.getId());
        session.setUpdatedAt(now);
        session.setUpdatedBy(member.getId());
        baseMapper.insert(session);

        return new MemberLoginResult(
                rawToken,
                session.getExpiresAt(),
                resultAssembler.toAuthenticatedMemberResult(member));
    }

    @Override
    @Transactional
    public AuthenticatedMemberResult authenticate(String rawToken) {
        String tokenHash = requireTokenHash(rawToken);
        Instant now = Instant.now();
        MemberLoginSession session = baseMapper.selectActiveByTokenHash(tokenHash, now);
        if (session == null) {
            throw new BusinessException(MemberAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }

        MemberAccount member = memberAccountMapper.selectById(session.getMemberId());
        if (member == null
                || member.getStatus() == null
                || member.getStatus() != 1
                || Boolean.TRUE.equals(member.getDeleted())
                || member.getPasswordChangedAt() != null
                && member.getPasswordChangedAt().isAfter(session.getCreatedAt())) {
            throw new BusinessException(MemberAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }

        Instant staleBefore = now.minus(LAST_SEEN_WRITE_INTERVAL);
        if (!session.getLastSeenAt().isAfter(staleBefore)) {
            baseMapper.touchLastSeen(tokenHash, now, staleBefore);
        }
        return resultAssembler.toAuthenticatedMemberResult(member);
    }

    @Override
    @Transactional
    public void logout(String rawToken) {
        if (!isValidToken(rawToken)) {
            return;
        }
        baseMapper.revokeByTokenHash(hashToken(rawToken), Instant.now());
    }

    private MemberAccount findMember(String identifier) {
        if (identifier.indexOf('@') >= 0) {
            return memberAccountMapper.selectLoginByEmail(identifier.toLowerCase(Locale.ROOT));
        }
        if (E164_MOBILE.matcher(identifier).matches()) {
            return memberAccountMapper.selectLoginByMobile(identifier);
        }
        return memberAccountMapper.selectLoginByUsername(identifier);
    }

    private boolean matchesPassword(String password, MemberAccount member) {
        String encodedPassword = member == null || member.getPasswordHash() == null
                ? DUMMY_PASSWORD_HASH
                : member.getPasswordHash();
        try {
            return passwordEncoder.matches(password, encodedPassword);
        } catch (IllegalArgumentException exception) {
            passwordEncoder.matches(password, DUMMY_PASSWORD_HASH);
            return false;
        }
    }

    private static String normalizeIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "登录账号不能为空");
        }
        String normalized = identifier.trim();
        if (normalized.length() > MAX_IDENTIFIER_LENGTH) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "登录账号长度不能超过 254");
        }
        return normalized;
    }

    private static String validatePassword(String password) {
        if (password == null || password.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码不能为空");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BCRYPT_PASSWORD_BYTES) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码 UTF-8 编码后不能超过 72 字节");
        }
        return password;
    }

    private static String normalizeRegistrationUsername(String username) {
        if (username == null || username.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "用户名不能为空");
        }
        String normalized = username.trim().toLowerCase(Locale.ROOT);
        if (!REGISTRATION_USERNAME.matcher(normalized).matches()) {
            throw new BusinessException(
                    CommonErrorCode.INVALID_REQUEST,
                    "用户名必须以字母开头，且为 4 到 32 位小写字母、数字或下划线");
        }
        return normalized;
    }

    private static String validateNewPassword(String password, String confirmPassword) {
        String validated = validatePassword(password);
        if (!validated.equals(confirmPassword)) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "两次输入的密码不一致");
        }
        if (validated.codePointCount(0, validated.length()) < 8) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码至少需要 8 个字符");
        }
        boolean containsLetter = validated.codePoints().anyMatch(Character::isLetter);
        boolean containsDigit = validated.codePoints().anyMatch(Character::isDigit);
        if (!containsLetter || !containsDigit) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码必须同时包含字母和数字");
        }
        return validated;
    }

    private static String normalizeNickname(String nickname, String username) {
        if (nickname == null || nickname.isBlank()) {
            return username;
        }
        String normalized = nickname.trim();
        if (normalized.length() > 64) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "昵称长度不能超过 64");
        }
        return normalized;
    }

    private static String normalizeUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        String normalized = userAgent.trim();
        return normalized.length() <= MAX_USER_AGENT_LENGTH
                ? normalized
                : normalized.substring(0, MAX_USER_AGENT_LENGTH);
    }

    private static String generateToken() {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private static String generateMemberNo() {
        return "M" + UUID.randomUUID().toString().replace("-", "").substring(0, 31).toUpperCase(Locale.ROOT);
    }

    private static String requireTokenHash(String rawToken) {
        if (!isValidToken(rawToken)) {
            throw new BusinessException(MemberAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        return hashToken(rawToken);
    }

    private static boolean isValidToken(String rawToken) {
        return rawToken != null && SESSION_TOKEN.matcher(rawToken).matches();
    }

    private static String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM 不支持 SHA-256", exception);
        }
    }

}
