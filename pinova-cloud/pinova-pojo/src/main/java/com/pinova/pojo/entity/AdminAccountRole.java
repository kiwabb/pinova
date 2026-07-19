package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.Instant;

@TableName("admin_account_role")
public class AdminAccountRole implements Serializable {
    @TableId(value = "id", type = IdType.ASSIGN_ID) private Long id;
    @TableField("account_id") private Long accountId;
    @TableField("role_id") private Long roleId;
    @TableField("created_at") private Instant createdAt;
    @TableField("created_by") private Long createdBy;
    @TableField("updated_at") private Instant updatedAt;
    @TableField("updated_by") private Long updatedBy;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }
    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}

