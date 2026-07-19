package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 商品订单项评价
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@TableName("product_review")
public class ProductReview implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 订单成交时所属店铺主键，跨商家域逻辑引用
     */
    @TableField("shop_id")
    private Long shopId;

    /**
     * 评价会员主键，跨会员域逻辑引用
     */
    @TableField("member_id")
    private Long memberId;

    /**
     * 交易订单主键，跨交易域逻辑引用
     */
    @TableField("order_id")
    private Long orderId;

    /**
     * 交易订单项主键，每个订单项只能评价一次
     */
    @TableField("order_item_id")
    private Long orderItemId;

    /**
     * 被评价商品 SKU 主键
     */
    @TableField("sku_id")
    private Long skuId;

    /**
     * 下单时商品名称快照
     */
    @TableField("product_name_snapshot")
    private String productNameSnapshot;

    /**
     * 下单时 SKU 规格快照
     */
    @TableField("sku_spec_snapshot")
    private String skuSpecSnapshot;

    /**
     * 综合评分：1-5 星
     */
    @TableField("rating")
    private Short rating;

    /**
     * 评价正文，最多 2000 字，可为空
     */
    @TableField("content")
    private String content;

    /**
     * 是否匿名展示
     */
    @TableField("anonymous")
    private Boolean anonymous;

    /**
     * 状态：0-待审核，1-已发布，2-已隐藏，3-已拒绝
     */
    @TableField("status")
    private Short status;

    /**
     * 隐藏或拒绝原因，公开接口不返回
     */
    @TableField("moderation_reason")
    private String moderationReason;

    /**
     * 最近审核时间
     */
    @TableField("moderated_at")
    private Instant moderatedAt;

    /**
     * 最近审核人，0 表示系统审核
     */
    @TableField("moderated_by")
    private Long moderatedBy;

    /**
     * 首次发布时间
     */
    @TableField("published_at")
    private Instant publishedAt;

    /**
     * 乐观锁版本号
     */
    @Version
    @TableField("version")
    private Integer version;

    /**
     * 逻辑删除标记
     */
    @TableLogic
    @TableField("deleted")
    private Boolean deleted;

    /**
     * 逻辑删除时间
     */
    @TableField("deleted_at")
    private Instant deletedAt;

    /**
     * 逻辑删除操作人
     */
    @TableField("deleted_by")
    private Long deletedBy;

    /**
     * 评价提交时间
     */
    @TableField("created_at")
    private Instant createdAt;

    /**
     * 创建人，通常为评价会员主键
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

    public Long getShopId() {
        return shopId;
    }

    public void setShopId(Long shopId) {
        this.shopId = shopId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(Long orderItemId) {
        this.orderItemId = orderItemId;
    }

    public Long getSkuId() {
        return skuId;
    }

    public void setSkuId(Long skuId) {
        this.skuId = skuId;
    }

    public String getProductNameSnapshot() {
        return productNameSnapshot;
    }

    public void setProductNameSnapshot(String productNameSnapshot) {
        this.productNameSnapshot = productNameSnapshot;
    }

    public String getSkuSpecSnapshot() {
        return skuSpecSnapshot;
    }

    public void setSkuSpecSnapshot(String skuSpecSnapshot) {
        this.skuSpecSnapshot = skuSpecSnapshot;
    }

    public Short getRating() {
        return rating;
    }

    public void setRating(Short rating) {
        this.rating = rating;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Boolean getAnonymous() {
        return anonymous;
    }

    public void setAnonymous(Boolean anonymous) {
        this.anonymous = anonymous;
    }

    public Short getStatus() {
        return status;
    }

    public void setStatus(Short status) {
        this.status = status;
    }

    public String getModerationReason() {
        return moderationReason;
    }

    public void setModerationReason(String moderationReason) {
        this.moderationReason = moderationReason;
    }

    public Instant getModeratedAt() {
        return moderatedAt;
    }

    public void setModeratedAt(Instant moderatedAt) {
        this.moderatedAt = moderatedAt;
    }

    public Long getModeratedBy() {
        return moderatedBy;
    }

    public void setModeratedBy(Long moderatedBy) {
        this.moderatedBy = moderatedBy;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public Boolean getDeleted() {
        return deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Long getDeletedBy() {
        return deletedBy;
    }

    public void setDeletedBy(Long deletedBy) {
        this.deletedBy = deletedBy;
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
