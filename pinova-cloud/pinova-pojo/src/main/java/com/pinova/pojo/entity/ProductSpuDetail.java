package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import com.pinova.pojo.typehandler.PostgreSqlJsonbStringTypeHandler;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 商品 SPU 详情，一对一保存前台详情内容
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@TableName(value = "product_spu_detail", autoResultMap = true)
public class ProductSpuDetail implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 商品 SPU 主键，每个 SPU 最多一条详情
     */
    @TableField("spu_id")
    private Long spuId;

    /**
     * 详情文档结构版本
     */
    @TableField("content_schema_version")
    private Integer contentSchemaVersion;

    /**
     * 结构化详情文档，根对象必须包含 blocks 数组
     */
    @TableField(value = "detail_document", typeHandler = PostgreSqlJsonbStringTypeHandler.class)
    private String detailDocument;

    /**
     * 包装清单或服务包含内容
     */
    @TableField("packing_list")
    private String packingList;

    /**
     * 使用、制作或履约说明
     */
    @TableField("usage_instructions")
    private String usageInstructions;

    /**
     * 该商品特有的售后补充说明
     */
    @TableField("after_sales_note")
    private String afterSalesNote;

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

    public Integer getContentSchemaVersion() {
        return contentSchemaVersion;
    }

    public void setContentSchemaVersion(Integer contentSchemaVersion) {
        this.contentSchemaVersion = contentSchemaVersion;
    }

    public String getDetailDocument() {
        return detailDocument;
    }

    public void setDetailDocument(String detailDocument) {
        this.detailDocument = detailDocument;
    }

    public String getPackingList() {
        return packingList;
    }

    public void setPackingList(String packingList) {
        this.packingList = packingList;
    }

    public String getUsageInstructions() {
        return usageInstructions;
    }

    public void setUsageInstructions(String usageInstructions) {
        this.usageInstructions = usageInstructions;
    }

    public String getAfterSalesNote() {
        return afterSalesNote;
    }

    public void setAfterSalesNote(String afterSalesNote) {
        this.afterSalesNote = afterSalesNote;
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
