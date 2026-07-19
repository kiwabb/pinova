package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 不可变库存变更流水
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@TableName("inventory_ledger")
public class InventoryLedger implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 全局唯一流水编号和幂等键
     */
    @TableField("transaction_no")
    private String transactionNo;

    /**
     * 变更的库存余额主键
     */
    @TableField("stock_id")
    private Long stockId;

    /**
     * 关联库存预占主键
     */
    @TableField("reservation_id")
    private Long reservationId;

    /**
     * 类型：1-入库，2-出库，3-预占，4-释放，5-盘盈，6-盘亏
     */
    @TableField("change_type")
    private Short changeType;

    /**
     * 现存数量变化，可正可负
     */
    @TableField("on_hand_delta")
    private Long onHandDelta;

    /**
     * 锁定数量变化，可正可负
     */
    @TableField("reserved_delta")
    private Long reservedDelta;

    /**
     * 变更后的现存数量
     */
    @TableField("on_hand_after")
    private Long onHandAfter;

    /**
     * 变更后的锁定数量
     */
    @TableField("reserved_after")
    private Long reservedAfter;

    /**
     * 来源业务类型，例如 ORDER 或 PURCHASE
     */
    @TableField("reference_type")
    private String referenceType;

    /**
     * 来源业务主键
     */
    @TableField("reference_id")
    private Long referenceId;

    /**
     * 变更备注
     */
    @TableField("remark")
    private String remark;

    /**
     * 库存变更发生时间
     */
    @TableField("occurred_at")
    private Instant occurredAt;

    /**
     * 创建时间
     */
    @TableField("created_at")
    private Instant createdAt;

    /**
     * 创建人，0 表示系统
     */
    @TableField("created_by")
    private Long createdBy;

    /**
     * 最后更新时间；不可变流水创建后不得更新
     */
    @TableField("updated_at")
    private Instant updatedAt;

    /**
     * 最后更新人；不可变流水固定为创建人
     */
    @TableField("updated_by")
    private Long updatedBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTransactionNo() {
        return transactionNo;
    }

    public void setTransactionNo(String transactionNo) {
        this.transactionNo = transactionNo;
    }

    public Long getStockId() {
        return stockId;
    }

    public void setStockId(Long stockId) {
        this.stockId = stockId;
    }

    public Long getReservationId() {
        return reservationId;
    }

    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
    }

    public Short getChangeType() {
        return changeType;
    }

    public void setChangeType(Short changeType) {
        this.changeType = changeType;
    }

    public Long getOnHandDelta() {
        return onHandDelta;
    }

    public void setOnHandDelta(Long onHandDelta) {
        this.onHandDelta = onHandDelta;
    }

    public Long getReservedDelta() {
        return reservedDelta;
    }

    public void setReservedDelta(Long reservedDelta) {
        this.reservedDelta = reservedDelta;
    }

    public Long getOnHandAfter() {
        return onHandAfter;
    }

    public void setOnHandAfter(Long onHandAfter) {
        this.onHandAfter = onHandAfter;
    }

    public Long getReservedAfter() {
        return reservedAfter;
    }

    public void setReservedAfter(Long reservedAfter) {
        this.reservedAfter = reservedAfter;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(Long referenceId) {
        this.referenceId = referenceId;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
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
