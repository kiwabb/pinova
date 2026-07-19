package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.Instant;

@TableName("admin_permission")
public class AdminPermission implements Serializable {
    @TableId(value = "id", type = IdType.ASSIGN_ID) private Long id;
    @TableField("permission_code") private String permissionCode;
    private String name;
    @TableField("built_in") private Boolean builtIn;
    @Version private Integer version;
    @TableLogic private Boolean deleted;
    @TableField("deleted_at") private Instant deletedAt;
    @TableField("deleted_by") private Long deletedBy;
    @TableField("created_at") private Instant createdAt;
    @TableField("created_by") private Long createdBy;
    @TableField("updated_at") private Instant updatedAt;
    @TableField("updated_by") private Long updatedBy;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPermissionCode() { return permissionCode; }
    public void setPermissionCode(String permissionCode) { this.permissionCode = permissionCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Boolean getBuiltIn() { return builtIn; }
    public void setBuiltIn(Boolean builtIn) { this.builtIn = builtIn; }
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

