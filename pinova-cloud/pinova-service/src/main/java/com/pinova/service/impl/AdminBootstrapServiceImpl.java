package com.pinova.service.impl;

import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.AdminAccountMapper;
import com.pinova.mapper.AdminAccountRoleMapper;
import com.pinova.mapper.AdminRoleMapper;
import com.pinova.pojo.entity.AdminAccount;
import com.pinova.pojo.entity.AdminAccountRole;
import com.pinova.service.AdminBootstrapService;
import com.pinova.service.command.BootstrapAdminCommand;
import com.pinova.service.error.AdminAuthenticationErrorCode;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class AdminBootstrapServiceImpl implements AdminBootstrapService {
    private static final Pattern USERNAME = Pattern.compile("[a-z][a-z0-9_]{3,31}");
    private static final int MAX_BCRYPT_BYTES = 72;
    private final AdminAccountMapper accountMapper;
    private final AdminAccountRoleMapper accountRoleMapper;
    private final AdminRoleMapper roleMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminBootstrapServiceImpl(
            AdminAccountMapper accountMapper,
            AdminAccountRoleMapper accountRoleMapper,
            AdminRoleMapper roleMapper) {
        this.accountMapper = accountMapper;
        this.accountRoleMapper = accountRoleMapper;
        this.roleMapper = roleMapper;
    }

    @Override
    @Transactional
    public String bootstrap(BootstrapAdminCommand command) {
        if (command == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "管理员引导参数不能为空");
        }
        String username = normalizeUsername(command.username());
        String password = validateNewPassword(command.password());
        accountMapper.acquireBootstrapLock();
        if (accountMapper.selectCount(null) > 0) {
            throw new BusinessException(AdminAuthenticationErrorCode.ADMIN_ALREADY_EXISTS);
        }
        Long roleId = roleMapper.selectIdByCode("SUPER_ADMIN");
        if (roleId == null) {
            throw new IllegalStateException("缺少内置 SUPER_ADMIN 角色，请先执行数据库迁移");
        }

        Instant now = Instant.now();
        AdminAccount account = new AdminAccount();
        account.setUsername(username);
        account.setDisplayName(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setStatus((short) 1);
        account.setMustChangePassword(true);
        account.setFailedLoginCount(0);
        account.setVersion(0);
        account.setDeleted(false);
        account.setCreatedAt(now);
        account.setCreatedBy(0L);
        account.setUpdatedAt(now);
        account.setUpdatedBy(0L);
        accountMapper.insert(account);

        AdminAccountRole accountRole = new AdminAccountRole();
        accountRole.setAccountId(account.getId());
        accountRole.setRoleId(roleId);
        accountRole.setCreatedAt(now);
        accountRole.setCreatedBy(0L);
        accountRole.setUpdatedAt(now);
        accountRole.setUpdatedBy(0L);
        accountRoleMapper.insert(accountRole);
        return username;
    }

    static String normalizeUsername(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "管理员用户名不能为空");
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!USERNAME.matcher(normalized).matches()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "管理员用户名必须为 4 到 32 位小写字母、数字或下划线，且以字母开头");
        }
        return normalized;
    }

    static String validateNewPassword(String value) {
        if (value == null || value.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码不能为空");
        }
        if (value.getBytes(StandardCharsets.UTF_8).length > MAX_BCRYPT_BYTES) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码 UTF-8 编码后不能超过 72 字节");
        }
        if (value.codePointCount(0, value.length()) < 12
                || value.codePoints().noneMatch(Character::isLetter)
                || value.codePoints().noneMatch(Character::isDigit)) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "密码至少 12 个字符，且必须包含字母和数字");
        }
        return value;
    }
}

