package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.io.Serializable;
import java.net.InetAddress;
import java.time.Instant;

/**
 * <p>
 * 会员不透明登录会话
 * </p>
 *
 * @author Pinova
 * @since 2026-07-17
 */
@TableName("member_login_session")
public class MemberLoginSession implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 登录会员主键
     */
    @TableField("member_id")
    private Long memberId;

    /**
     * 随机会话令牌 SHA-256 十六进制哈希，不保存原始令牌
     */
    @TableField("token_hash")
    private String tokenHash;

    /**
     * 会话绝对过期时间
     */
    @TableField("expires_at")
    private Instant expiresAt;

    /**
     * 最近一次通过会话认证的时间
     */
    @TableField("last_seen_at")
    private Instant lastSeenAt;

    /**
     * 主动退出或安全操作导致的撤销时间
     */
    @TableField("revoked_at")
    private Instant revokedAt;

    /**
     * 登录时客户端 IP，不信任未经网关校验的转发头
     */
    @TableField("client_ip")
    private InetAddress clientIp;

    /**
     * 登录时客户端 User-Agent，最多 512 字符
     */
    @TableField("user_agent")
    private String userAgent;

    /**
     * 会话创建时间
     */
    @TableField("created_at")
    private Instant createdAt;

    /**
     * 创建会员主键
     */
    @TableField("created_by")
    private Long createdBy;

    /**
     * 最后更新时间
     */
    @TableField("updated_at")
    private Instant updatedAt;

    /**
     * 最后更新人，0 表示系统
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

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(Instant lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    public InetAddress getClientIp() {
        return clientIp;
    }

    public void setClientIp(InetAddress clientIp) {
        this.clientIp = clientIp;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
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
