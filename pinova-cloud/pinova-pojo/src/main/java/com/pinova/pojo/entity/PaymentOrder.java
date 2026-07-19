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
 * 按结算聚合的支付单，一次 checkout 只允许一张有效支付单
 * </p>
 *
 * @author Pinova
 * @since 2026-07-19
 */
@TableName("payment_order")
public class PaymentOrder implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 面向渠道和用户的全局唯一支付单号
     */
    @TableField("payment_no")
    private String paymentNo;

    /**
     * 来源结算编号和创建支付幂等键
     */
    @TableField("checkout_no")
    private String checkoutNo;

    /**
     * 付款会员主键，跨会员域逻辑引用
     */
    @TableField("member_id")
    private Long memberId;

    /**
     * 支付渠道代码，首期为 MOCK
     */
    @TableField("provider_code")
    private String providerCode;

    /**
     * 支付渠道交易号，可在渠道创建成功后补充
     */
    @TableField("provider_transaction_no")
    private String providerTransactionNo;

    /**
     * ISO 4217 币种代码，首期固定为 CNY
     */
    @TableField("currency_code")
    private String currencyCode;

    /**
     * 本次结算全部订单应付金额之和，单位为分
     */
    @TableField("amount_fen")
    private Long amountFen;

    /**
     * 状态：0-待支付，1-支付成功，2-支付失败，3-已关闭，4-需人工处理
     */
    @TableField("status")
    private Short status;

    /**
     * 支付尝试次数，失败后重新发起时递增
     */
    @TableField("attempt_count")
    private Integer attemptCount;

    /**
     * 支付单失效时间，不晚于关联订单支付过期时间
     */
    @TableField("expires_at")
    private Instant expiresAt;

    /**
     * 最近一次主动查询渠道结果的时间
     */
    @TableField("last_queried_at")
    private Instant lastQueriedAt;

    /**
     * 渠道确认付款时间
     */
    @TableField("paid_at")
    private Instant paidAt;

    /**
     * 最近一次渠道确认失败时间
     */
    @TableField("failed_at")
    private Instant failedAt;

    /**
     * 支付单关闭时间
     */
    @TableField("closed_at")
    private Instant closedAt;

    /**
     * 支付已确认但业务推进失败，进入人工处理的时间
     */
    @TableField("review_required_at")
    private Instant reviewRequiredAt;

    /**
     * 稳定失败或人工处理原因代码
     */
    @TableField("failure_code")
    private String failureCode;

    /**
     * 失败原因补充说明，不保存敏感渠道报文
     */
    @TableField("failure_message")
    private String failureMessage;

    /**
     * 支付状态并发更新使用的乐观锁版本
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
     * 最后更新人，系统任务为 0
     */
    @TableField("updated_by")
    private Long updatedBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPaymentNo() {
        return paymentNo;
    }

    public void setPaymentNo(String paymentNo) {
        this.paymentNo = paymentNo;
    }

    public String getCheckoutNo() {
        return checkoutNo;
    }

    public void setCheckoutNo(String checkoutNo) {
        this.checkoutNo = checkoutNo;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public String getProviderCode() {
        return providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }

    public String getProviderTransactionNo() {
        return providerTransactionNo;
    }

    public void setProviderTransactionNo(String providerTransactionNo) {
        this.providerTransactionNo = providerTransactionNo;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public Long getAmountFen() {
        return amountFen;
    }

    public void setAmountFen(Long amountFen) {
        this.amountFen = amountFen;
    }

    public Short getStatus() {
        return status;
    }

    public void setStatus(Short status) {
        this.status = status;
    }

    public Integer getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(Integer attemptCount) {
        this.attemptCount = attemptCount;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getLastQueriedAt() {
        return lastQueriedAt;
    }

    public void setLastQueriedAt(Instant lastQueriedAt) {
        this.lastQueriedAt = lastQueriedAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public Instant getFailedAt() {
        return failedAt;
    }

    public void setFailedAt(Instant failedAt) {
        this.failedAt = failedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getReviewRequiredAt() {
        return reviewRequiredAt;
    }

    public void setReviewRequiredAt(Instant reviewRequiredAt) {
        this.reviewRequiredAt = reviewRequiredAt;
    }

    public String getFailureCode() {
        return failureCode;
    }

    public void setFailureCode(String failureCode) {
        this.failureCode = failureCode;
    }

    public String getFailureMessage() {
        return failureMessage;
    }

    public void setFailureMessage(String failureMessage) {
        this.failureMessage = failureMessage;
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
