package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 会员或游客购物车
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@TableName("shopping_cart")
public class ShoppingCart implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 会员主键，与游客令牌哈希二选一，跨会员域逻辑引用
     */
    @TableField("member_id")
    private Long memberId;

    /**
     * 游客随机令牌 SHA-256 十六进制哈希，不保存原始令牌
     */
    @TableField("guest_token_hash")
    private String guestTokenHash;

    /**
     * 状态：0-活跃，1-已合并，2-已结算，3-已过期
     */
    @TableField("status")
    private Short status;

    /**
     * 游客购物车登录后合并到的目标购物车主键
     */
    @TableField("merged_into_cart_id")
    private Long mergedIntoCartId;

    /**
     * 计划过期时间，游客购物车必须填写
     */
    @TableField("expires_at")
    private Instant expiresAt;

    /**
     * 最近一次有效操作时间
     */
    @TableField("last_activity_at")
    private Instant lastActivityAt;

    /**
     * 合并、结算或过期关闭时间
     */
    @TableField("closed_at")
    private Instant closedAt;

    /**
     * 乐观锁版本号
     */
    @Version
    @TableField("version")
    private Integer version;

    /**
     * 创建时间
     */
    @TableField("created_at")
    private Instant createdAt;

    /**
     * 创建人，游客或系统为 0
     */
    @TableField("created_by")
    private Long createdBy;

    /**
     * 最后更新时间
     */
    @TableField("updated_at")
    private Instant updatedAt;

    /**
     * 最后更新人，游客或系统为 0
     */
    @TableField("updated_by")
    private Long updatedBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public String getGuestTokenHash() {
        return guestTokenHash;
    }

    public void setGuestTokenHash(String guestTokenHash) {
        this.guestTokenHash = guestTokenHash;
    }

    public Short getStatus() {
        return status;
    }

    public void setStatus(Short status) {
        this.status = status;
    }

    public Long getMergedIntoCartId() {
        return mergedIntoCartId;
    }

    public void setMergedIntoCartId(Long mergedIntoCartId) {
        this.mergedIntoCartId = mergedIntoCartId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }
}
