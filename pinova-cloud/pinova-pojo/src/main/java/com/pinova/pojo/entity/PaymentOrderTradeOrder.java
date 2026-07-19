package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 支付单与交易订单的关联快照
 * </p>
 *
 * @author Pinova
 * @since 2026-07-19
 */
@TableName("payment_order_trade_order")
public class PaymentOrderTradeOrder implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 所属支付单主键
     */
    @TableField("payment_order_id")
    private Long paymentOrderId;

    /**
     * 交易订单主键，跨交易域逻辑引用
     */
    @TableField("trade_order_id")
    private Long tradeOrderId;

    /**
     * 关联订单参与本次支付的金额快照，单位为分
     */
    @TableField("order_amount_fen")
    private Long orderAmountFen;

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
     * 最后更新人
     */
    @TableField("updated_by")
    private Long updatedBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPaymentOrderId() {
        return paymentOrderId;
    }

    public void setPaymentOrderId(Long paymentOrderId) {
        this.paymentOrderId = paymentOrderId;
    }

    public Long getTradeOrderId() {
        return tradeOrderId;
    }

    public void setTradeOrderId(Long tradeOrderId) {
        this.tradeOrderId = tradeOrderId;
    }

    public Long getOrderAmountFen() {
        return orderAmountFen;
    }

    public void setOrderAmountFen(Long orderAmountFen) {
        this.orderAmountFen = orderAmountFen;
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
