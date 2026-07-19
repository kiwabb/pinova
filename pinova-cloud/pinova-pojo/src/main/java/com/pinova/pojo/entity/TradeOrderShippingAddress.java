package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.io.Serializable;
import java.time.Instant;

/**
 * <p>
 * 实物订单一对一收货地址成交快照
 * </p>
 *
 * @author Pinova
 * @since 2026-07-18
 */
@TableName("trade_order_shipping_address")
public class TradeOrderShippingAddress implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键，由应用生成
     */
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 所属交易订单主键，每张订单最多一条地址快照
     */
    @TableField("order_id")
    private Long orderId;

    /**
     * 来源会员地址主键，仅用于审计，不建立外键
     */
    @TableField("source_address_id")
    private Long sourceAddressId;

    /**
     * 下单时会员地址乐观锁版本
     */
    @TableField("source_address_version")
    private Integer sourceAddressVersion;

    /**
     * 收货人姓名快照
     */
    @TableField("receiver_name")
    private String receiverName;

    /**
     * 收货人手机号快照
     */
    @TableField("receiver_mobile")
    private String receiverMobile;

    /**
     * ISO 3166-1 alpha-2 国家代码快照
     */
    @TableField("country_code")
    private String countryCode;

    /**
     * 省级行政区稳定代码快照
     */
    @TableField("province_code")
    private String provinceCode;

    /**
     * 省级行政区名称快照
     */
    @TableField("province_name")
    private String provinceName;

    /**
     * 市级行政区稳定代码快照
     */
    @TableField("city_code")
    private String cityCode;

    /**
     * 市级行政区名称快照
     */
    @TableField("city_name")
    private String cityName;

    /**
     * 区县级行政区稳定代码快照
     */
    @TableField("district_code")
    private String districtCode;

    /**
     * 区县级行政区名称快照
     */
    @TableField("district_name")
    private String districtName;

    /**
     * 街道、门牌号等详细地址快照
     */
    @TableField("detail_address")
    private String detailAddress;

    /**
     * 邮政编码快照
     */
    @TableField("postal_code")
    private String postalCode;

    /**
     * 创建时间，即地址快照形成时间
     */
    @TableField("created_at")
    private Instant createdAt;

    /**
     * 创建人，通常为下单会员主键
     */
    @TableField("created_by")
    private Long createdBy;

    /**
     * 最后更新时间；地址快照创建后不得更新
     */
    @TableField("updated_at")
    private Instant updatedAt;

    /**
     * 最后更新人；地址快照固定为创建人
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

    public Long getSourceAddressId() {
        return sourceAddressId;
    }

    public void setSourceAddressId(Long sourceAddressId) {
        this.sourceAddressId = sourceAddressId;
    }

    public Integer getSourceAddressVersion() {
        return sourceAddressVersion;
    }

    public void setSourceAddressVersion(Integer sourceAddressVersion) {
        this.sourceAddressVersion = sourceAddressVersion;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getReceiverMobile() {
        return receiverMobile;
    }

    public void setReceiverMobile(String receiverMobile) {
        this.receiverMobile = receiverMobile;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getProvinceCode() {
        return provinceCode;
    }

    public void setProvinceCode(String provinceCode) {
        this.provinceCode = provinceCode;
    }

    public String getProvinceName() {
        return provinceName;
    }

    public void setProvinceName(String provinceName) {
        this.provinceName = provinceName;
    }

    public String getCityCode() {
        return cityCode;
    }

    public void setCityCode(String cityCode) {
        this.cityCode = cityCode;
    }

    public String getCityName() {
        return cityName;
    }

    public void setCityName(String cityName) {
        this.cityName = cityName;
    }

    public String getDistrictCode() {
        return districtCode;
    }

    public void setDistrictCode(String districtCode) {
        this.districtCode = districtCode;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
    }

    public String getDetailAddress() {
        return detailAddress;
    }

    public void setDetailAddress(String detailAddress) {
        this.detailAddress = detailAddress;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
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
