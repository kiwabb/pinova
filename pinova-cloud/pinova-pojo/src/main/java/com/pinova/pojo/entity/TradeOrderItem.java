package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 订单成交商品行快照，创建后不可改写
 * </p>
 *
 * @author Pinova
 * @since 2026-07-18
 */
@TableName("trade_order_item")
public class TradeOrderItem implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 所属交易订单主键
     */
    @TableField("order_id")
    private Long orderId;

    /**
     * 来源购物车项主键，全局唯一防止重复下单
     */
    @TableField("source_cart_item_id")
    private Long sourceCartItemId;

    /**
     * 成交商品 SPU 主键，跨商品域逻辑引用
     */
    @TableField("spu_id")
    private Long spuId;

    /**
     * 成交商品 SKU 主键，跨商品域逻辑引用
     */
    @TableField("sku_id")
    private Long skuId;

    /**
     * 商品类型快照：1-实物，2-虚拟，3-服务
     */
    @TableField("product_type_snapshot")
    private Short productTypeSnapshot;

    /**
     * 下单时商品名称快照
     */
    @TableField("product_name_snapshot")
    private String productNameSnapshot;

    /**
     * 下单时 SKU 业务编码快照
     */
    @TableField("sku_code_snapshot")
    private String skuCodeSnapshot;

    /**
     * 下单时 SKU 规格摘要快照
     */
    @TableField("sku_spec_snapshot")
    private String skuSpecSnapshot;

    /**
     * 下单时商品主图对象 Key 快照
     */
    @TableField("main_image_key_snapshot")
    private String mainImageKeySnapshot;

    /**
     * 成交单价，单位为分
     */
    @TableField("unit_price_fen")
    private Long unitPriceFen;

    /**
     * 成交数量
     */
    @TableField("quantity")
    private Long quantity;

    /**
     * 优惠前行金额，单位为分
     */
    @TableField("line_amount_fen")
    private Long lineAmountFen;

    /**
     * 商品行优惠金额，单位为分；首期固定为 0
     */
    @TableField("discount_amount_fen")
    private Long discountAmountFen;

    /**
     * 商品行应付金额，单位为分
     */
    @TableField("payable_amount_fen")
    private Long payableAmountFen;

    /**
     * 创建时间，即成交快照形成时间
     */
    @TableField("created_at")
    private Instant createdAt;

    /**
     * 创建人，通常为下单会员主键
     */
    @TableField("created_by")
    private Long createdBy;

    /**
     * 最后更新时间；成交商品行创建后不得更新
     */
    @TableField("updated_at")
    private Instant updatedAt;

    /**
     * 最后更新人；成交商品行固定为创建人
     */
    @TableField("updated_by")
    private Long updatedBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getSourceCartItemId() {
        return sourceCartItemId;
    }

    public void setSourceCartItemId(Long sourceCartItemId) {
        this.sourceCartItemId = sourceCartItemId;
    }

    public Long getSpuId() {
        return spuId;
    }

    public void setSpuId(Long spuId) {
        this.spuId = spuId;
    }

    public Long getSkuId() {
        return skuId;
    }

    public void setSkuId(Long skuId) {
        this.skuId = skuId;
    }

    public Short getProductTypeSnapshot() {
        return productTypeSnapshot;
    }

    public void setProductTypeSnapshot(Short productTypeSnapshot) {
        this.productTypeSnapshot = productTypeSnapshot;
    }

    public String getProductNameSnapshot() {
        return productNameSnapshot;
    }

    public void setProductNameSnapshot(String productNameSnapshot) {
        this.productNameSnapshot = productNameSnapshot;
    }

    public String getSkuCodeSnapshot() {
        return skuCodeSnapshot;
    }

    public void setSkuCodeSnapshot(String skuCodeSnapshot) {
        this.skuCodeSnapshot = skuCodeSnapshot;
    }

    public String getSkuSpecSnapshot() {
        return skuSpecSnapshot;
    }

    public void setSkuSpecSnapshot(String skuSpecSnapshot) {
        this.skuSpecSnapshot = skuSpecSnapshot;
    }

    public String getMainImageKeySnapshot() {
        return mainImageKeySnapshot;
    }

    public void setMainImageKeySnapshot(String mainImageKeySnapshot) {
        this.mainImageKeySnapshot = mainImageKeySnapshot;
    }

    public Long getUnitPriceFen() {
        return unitPriceFen;
    }

    public void setUnitPriceFen(Long unitPriceFen) {
        this.unitPriceFen = unitPriceFen;
    }

    public Long getQuantity() {
        return quantity;
    }

    public void setQuantity(Long quantity) {
        this.quantity = quantity;
    }

    public Long getLineAmountFen() {
        return lineAmountFen;
    }

    public void setLineAmountFen(Long lineAmountFen) {
        this.lineAmountFen = lineAmountFen;
    }

    public Long getDiscountAmountFen() {
        return discountAmountFen;
    }

    public void setDiscountAmountFen(Long discountAmountFen) {
        this.discountAmountFen = discountAmountFen;
    }

    public Long getPayableAmountFen() {
        return payableAmountFen;
    }

    public void setPayableAmountFen(Long payableAmountFen) {
        this.payableAmountFen = payableAmountFen;
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
