package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;

import java.io.Serializable;
import java.net.InetAddress;
import java.time.Instant;

@TableName("admin_account")
public class AdminAccount implements Serializable {

    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;
    @TableField("username")
    private String username;
    @TableField("display_name")
    private String displayName;
    @TableField("password_hash")
    private String passwordHash;
    @TableField("status")
    private Short status;
    @TableField("must_change_password")
    private Boolean mustChangePassword;
    @TableField("password_changed_at")
    private Instant passwordChangedAt;
    @TableField("last_login_at")
    private Instant lastLoginAt;
    @TableField("last_login_ip")
    private InetAddress lastLoginIp;
    @TableField("failed_login_count")
    private Integer failedLoginCount;
    @TableField("locked_until")
    private Instant lockedUntil;
    @Version
    @TableField("version")
    private Integer version;
    @TableLogic
    @TableField("deleted")
    private Boolean deleted;
    @TableField("deleted_at")
    private Instant deletedAt;
    @TableField("deleted_by")
    private Long deletedBy;
    @TableField("created_at")
    private Instant createdAt;
    @TableField("created_by")
    private Long createdBy;
    @TableField("updated_at")
    private Instant updatedAt;
    @TableField("updated_by")
    private Long updatedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Short getStatus() { return status; }
    public void setStatus(Short status) { this.status = status; }
    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }
    public Instant getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(Instant passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public InetAddress getLastLoginIp() { return lastLoginIp; }
    public void setLastLoginIp(InetAddress lastLoginIp) { this.lastLoginIp = lastLoginIp; }
    public Integer getFailedLoginCount() { return failedLoginCount; }
    public void setFailedLoginCount(Integer failedLoginCount) { this.failedLoginCount = failedLoginCount; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public Boolean getDeleted() { return deleted; }
    public void setDeleted(Boolean deleted) { this.deleted = deleted; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public Long getDeletedBy() { return deletedBy; }
    public void setDeletedBy(Long deletedBy) { this.deletedBy = deletedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}

