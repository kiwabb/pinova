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
 * 商品销售单元 SKU
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@TableName("product_sku")
public class ProductSku implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 所属商品 SPU 主键
     */
    @TableField("spu_id")
    private Long spuId;

    /**
     * SPU 内稳定且不可复用的 SKU 编码
     */
    @TableField("sku_code")
    private String skuCode;

    /**
     * 规格摘要，例如颜色和尺寸组合
     */
    @TableField("spec_summary")
    private String specSummary;

    /**
     * 销售价，单位为分
     */
    @TableField("sale_price_fen")
    private Long salePriceFen;

    /**
     * 库存模式：1-跟踪库存，2-无限库存，3-预约容量
     */
    @TableField("inventory_mode")
    private Short inventoryMode;

    /**
     * SKU 主图对象存储 Key
     */
    @TableField("main_image_key")
    private String mainImageKey;

    /**
     * 商品条码
     */
    @TableField("barcode")
    private String barcode;

    /**
     * 状态：0-停用，1-启用
     */
    @TableField("status")
    private Short status;

    /**
     * SPU 内排序值，值越小越靠前
     */
    @TableField("sort_order")
    private Integer sortOrder;

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

    public Long getSpuId() {
        return spuId;
    }

    public void setSpuId(Long spuId) {
        this.spuId = spuId;
    }

    public String getSkuCode() {
        return skuCode;
    }

    public void setSkuCode(String skuCode) {
        this.skuCode = skuCode;
    }

    public String getSpecSummary() {
        return specSummary;
    }

    public void setSpecSummary(String specSummary) {
        this.specSummary = specSummary;
    }

    public Long getSalePriceFen() {
        return salePriceFen;
    }

    public void setSalePriceFen(Long salePriceFen) {
        this.salePriceFen = salePriceFen;
    }

    public Short getInventoryMode() {
        return inventoryMode;
    }

    public void setInventoryMode(Short inventoryMode) {
        this.inventoryMode = inventoryMode;
    }

    public String getMainImageKey() {
        return mainImageKey;
    }

    public void setMainImageKey(String mainImageKey) {
        this.mainImageKey = mainImageKey;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
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
