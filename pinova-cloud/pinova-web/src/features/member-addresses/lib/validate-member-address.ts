import type {
  MemberAddressFieldErrors,
  MemberAddressFormValues,
} from "../types";

function required(
  errors: MemberAddressFieldErrors,
  field: keyof MemberAddressFormValues,
  value: string,
  label: string,
  maxLength: number,
) {
  const normalized = value.trim();
  if (!normalized) errors[field] = `${label}不能为空`;
  else if (normalized.length > maxLength) {
    errors[field] = `${label}不能超过 ${maxLength} 个字符`;
  }
}

export function validateMemberAddress(values: MemberAddressFormValues) {
  const errors: MemberAddressFieldErrors = {};
  required(errors, "receiverName", values.receiverName, "收货人姓名", 64);
  if (!values.provinceCode.trim() || !values.provinceName.trim()) {
    errors.provinceCode = "请选择省 / 自治区";
  }
  if (!values.cityCode.trim() || !values.cityName.trim()) {
    errors.cityCode = "请选择城市";
  }
  if (!values.districtCode.trim() || !values.districtName.trim()) {
    errors.districtCode = "请选择区 / 县";
  }
  required(errors, "detailAddress", values.detailAddress, "详细地址", 255);

  const mobile = values.receiverMobile.replace(/[\s()-]/g, "");
  if (!mobile) errors.receiverMobile = "手机号不能为空";
  else if (!/^1\d{10}$/.test(mobile) && !/^\+[1-9]\d{7,14}$/.test(mobile)) {
    errors.receiverMobile = "请输入中国大陆手机号或 E.164 国际号码";
  }

  if (values.postalCode.trim().length > 16) {
    errors.postalCode = "邮政编码不能超过 16 个字符";
  }
  if (values.label.trim().length > 32) {
    errors.label = "地址标签不能超过 32 个字符";
  }
  return errors;
}
