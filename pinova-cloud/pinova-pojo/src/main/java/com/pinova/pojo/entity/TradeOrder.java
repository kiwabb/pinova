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
 * 交易订单聚合根，每行只属于一个店铺和一种履约类型
 * </p>
 *
 * @author Pinova
 * @since 2026-07-18
 */
@TableName("trade_order")
public class TradeOrder implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 面向用户和运营的全局唯一订单号
     */
    @TableField("order_no")
    private String orderNo;

    /**
     * 同一次结算提交的全局编号和幂等键
     */
    @TableField("checkout_no")
    private String checkoutNo;

    /**
     * 规范化订单提交载荷的 SHA-256 十六进制哈希
     */
    @TableField("request_hash")
    private String requestHash;

    /**
     * 下单会员主键，跨会员域逻辑引用
     */
    @TableField("member_id")
    private Long memberId;

    /**
     * 成交店铺主键，跨商家域逻辑引用
     */
    @TableField("shop_id")
    private Long shopId;

    /**
     * 来源购物车主键，跨购物车聚合逻辑引用
     */
    @TableField("source_cart_id")
    private Long sourceCartId;

    /**
     * 履约类型：1-实物配送，2-数字交付，3-到店服务
     */
    @TableField("fulfillment_type")
    private Short fulfillmentType;

    /**
     * ISO 4217 币种代码，首期固定为 CNY
     */
    @TableField("currency_code")
    private String currencyCode;

    /**
     * 商品行原价合计，单位为分
     */
    @TableField("goods_amount_fen")
    private Long goodsAmountFen;

    /**
     * 订单优惠合计，单位为分；首期固定为 0
     */
    @TableField("discount_amount_fen")
    private Long discountAmountFen;

    /**
     * 运费，单位为分；首期固定为 0
     */
    @TableField("shipping_amount_fen")
    private Long shippingAmountFen;

    /**
     * 应付金额，单位为分
     */
    @TableField("payable_amount_fen")
    private Long payableAmountFen;

    /**
     * 已支付金额，单位为分；支付接入前为 0
     */
    @TableField("paid_amount_fen")
    private Long paidAmountFen;

    /**
     * 买家订单备注，最多 500 字符
     */
    @TableField("buyer_remark")
    private String buyerRemark;

    /**
     * 状态：0-待支付，1-待履约，2-履约中，3-已完成，4-已关闭
     */
    @TableField("status")
    private Short status;

    /**
     * 订单提交时间
     */
    @TableField("submitted_at")
    private Instant submittedAt;

    /**
     * 待支付订单自动关闭时间
     */
    @TableField("payment_expires_at")
    private Instant paymentExpiresAt;

    /**
     * 支付完成时间，零元订单为确认免支付时间
     */
    @TableField("paid_at")
    private Instant paidAt;

    /**
     * 履约开始时间
     */
    @TableField("fulfillment_started_at")
    private Instant fulfillmentStartedAt;

    @TableField("carrier_code")
    private String carrierCode;

    @TableField("carrier_name")
    private String carrierName;

    @TableField("tracking_no")
    private String trackingNo;

    @TableField("shipped_at")
    private Instant shippedAt;

    @TableField("auto_complete_at")
    private Instant autoCompleteAt;

    /**
     * 订单完成时间
     */
    @TableField("completed_at")
    private Instant completedAt;

    @TableField("completion_source")
    private Short completionSource;

    @TableField("completion_reason")
    private String completionReason;

    @TableField("after_sale_deadline_at")
    private Instant afterSaleDeadlineAt;

    @TableField("refunded_at")
    private Instant refundedAt;

    /**
     * 未支付订单关闭时间
     */
    @TableField("closed_at")
    private Instant closedAt;

    /**
     * 关闭原因：1-用户取消，2-支付超时，3-商家关闭，4-风控关闭，5-系统异常
     */
    @TableField("close_reason_code")
    private Short closeReasonCode;

    /**
     * 关闭原因补充说明，可为空
     */
    @TableField("close_reason")
    private String closeReason;

    /**
     * 订单状态并发更新使用的乐观锁版本
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
     * 创建人，通常为下单会员主键
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

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
    }

    public String getCheckoutNo() {
        return checkoutNo;
    }

    public void setCheckoutNo(String checkoutNo) {
        this.checkoutNo = checkoutNo;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public void setRequestHash(String requestHash) {
        this.requestHash = requestHash;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public Long getShopId() {
        return shopId;
    }

    public void setShopId(Long shopId) {
        this.shopId = shopId;
    }

    public Long getSourceCartId() {
        return sourceCartId;
    }

    public void setSourceCartId(Long sourceCartId) {
        this.sourceCartId = sourceCartId;
    }

    public Short getFulfillmentType() {
        return fulfillmentType;
    }

    public void setFulfillmentType(Short fulfillmentType) {
        this.fulfillmentType = fulfillmentType;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public Long getGoodsAmountFen() {
        return goodsAmountFen;
    }

    public void setGoodsAmountFen(Long goodsAmountFen) {
        this.goodsAmountFen = goodsAmountFen;
    }

    public Long getDiscountAmountFen() {
        return discountAmountFen;
    }

    public void setDiscountAmountFen(Long discountAmountFen) {
        this.discountAmountFen = discountAmountFen;
    }

    public Long getShippingAmountFen() {
        return shippingAmountFen;
    }

    public void setShippingAmountFen(Long shippingAmountFen) {
        this.shippingAmountFen = shippingAmountFen;
    }

    public Long getPayableAmountFen() {
        return payableAmountFen;
    }

    public void setPayableAmountFen(Long payableAmountFen) {
        this.payableAmountFen = payableAmountFen;
    }

    public Long getPaidAmountFen() {
        return paidAmountFen;
    }

    public void setPaidAmountFen(Long paidAmountFen) {
        this.paidAmountFen = paidAmountFen;
    }

    public String getBuyerRemark() {
        return buyerRemark;
    }

    public void setBuyerRemark(String buyerRemark) {
        this.buyerRemark = buyerRemark;
    }

    public Short getStatus() {
        return status;
    }

    public void setStatus(Short status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getPaymentExpiresAt() {
        return paymentExpiresAt;
    }

    public void setPaymentExpiresAt(Instant paymentExpiresAt) {
        this.paymentExpiresAt = paymentExpiresAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public Instant getFulfillmentStartedAt() {
        return fulfillmentStartedAt;
    }

    public void setFulfillmentStartedAt(Instant fulfillmentStartedAt) {
        this.fulfillmentStartedAt = fulfillmentStartedAt;
    }

    public String getCarrierCode() { return carrierCode; }
    public void setCarrierCode(String carrierCode) { this.carrierCode = carrierCode; }
    public String getCarrierName() { return carrierName; }
    public void setCarrierName(String carrierName) { this.carrierName = carrierName; }
    public String getTrackingNo() { return trackingNo; }
    public void setTrackingNo(String trackingNo) { this.trackingNo = trackingNo; }
    public Instant getShippedAt() { return shippedAt; }
    public void setShippedAt(Instant shippedAt) { this.shippedAt = shippedAt; }
    public Instant getAutoCompleteAt() { return autoCompleteAt; }
    public void setAutoCompleteAt(Instant autoCompleteAt) { this.autoCompleteAt = autoCompleteAt; }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Short getCompletionSource() { return completionSource; }
    public void setCompletionSource(Short completionSource) { this.completionSource = completionSource; }
    public String getCompletionReason() { return completionReason; }
    public void setCompletionReason(String completionReason) { this.completionReason = completionReason; }
    public Instant getAfterSaleDeadlineAt() { return afterSaleDeadlineAt; }
    public void setAfterSaleDeadlineAt(Instant afterSaleDeadlineAt) { this.afterSaleDeadlineAt = afterSaleDeadlineAt; }
    public Instant getRefundedAt() { return refundedAt; }
    public void setRefundedAt(Instant refundedAt) { this.refundedAt = refundedAt; }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Short getCloseReasonCode() {
        return closeReasonCode;
    }

    public void setCloseReasonCode(Short closeReasonCode) {
        this.closeReasonCode = closeReasonCode;
    }

    public String getCloseReason() {
        return closeReason;
    }

    public void setCloseReason(String closeReason) {
        this.closeReason = closeReason;
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
