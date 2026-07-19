export interface MemberAddress {
  id: string;
  receiverName: string;
  receiverMobile: string;
  countryCode: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  detailAddress: string;
  postalCode: string | null;
  label: string | null;
  defaultAddress: boolean;
  version: number;
}

export interface MemberAddressFormValues {
  receiverName: string;
  receiverMobile: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  detailAddress: string;
  postalCode: string;
  label: string;
  defaultAddress: boolean;
}

export type MemberAddressFieldErrors = Partial<
  Record<keyof MemberAddressFormValues, string>
>;
