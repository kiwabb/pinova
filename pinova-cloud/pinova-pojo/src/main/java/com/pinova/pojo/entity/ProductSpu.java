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
 * 商品 SPU
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@TableName("product_spu")
public class ProductSpu implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 所属店铺主键，业务归属字段，不是租户字段
     */
    @TableField("shop_id")
    private Long shopId;

    /**
     * 平台叶子类目主键
     */
    @TableField("category_id")
    private Long categoryId;

    /**
     * 店铺内稳定且不可复用的商品编码
     */
    @TableField("spu_code")
    private String spuCode;

    /**
     * 商品名称
     */
    @TableField("name")
    private String name;

    /**
     * 商品简短描述，不保存富文本详情
     */
    @TableField("summary")
    private String summary;

    /**
     * 商品类型：1-实物，2-虚拟，3-服务
     */
    @TableField("product_type")
    private Short productType;

    /**
     * 商品主图对象存储 Key
     */
    @TableField("main_image_key")
    private String mainImageKey;

    /**
     * 状态：0-草稿，1-待审核，2-上架，3-下架，4-审核拒绝，5-平台禁用
     */
    @TableField("status")
    private Short status;

    /**
     * 店铺内运营排序值，值越小越靠前
     */
    @TableField("sort_order")
    private Integer sortOrder;

    /**
     * 首次上架时间
     */
    @TableField("published_at")
    private Instant publishedAt;

    /**
     * 最近一次下架时间
     */
    @TableField("off_shelf_at")
    private Instant offShelfAt;

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

    public Long getShopId() {
        return shopId;
    }

    public void setShopId(Long shopId) {
        this.shopId = shopId;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public String getSpuCode() {
        return spuCode;
    }

    public void setSpuCode(String spuCode) {
        this.spuCode = spuCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Short getProductType() {
        return productType;
    }

    public void setProductType(Short productType) {
        this.productType = productType;
    }

    public String getMainImageKey() {
        return mainImageKey;
    }

    public void setMainImageKey(String mainImageKey) {
        this.mainImageKey = mainImageKey;
    }

    public Short getStatus() {
        return status;
    }

    public void setStatus(Short status) {
        this.status = status;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Instant getOffShelfAt() {
        return offShelfAt;
    }

    public void setOffShelfAt(Instant offShelfAt) {
        this.offShelfAt = offShelfAt;
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
