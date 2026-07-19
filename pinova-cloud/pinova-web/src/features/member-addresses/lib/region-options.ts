import { areaList } from "@vant/area-data";

export interface RegionOption {
  code: string;
  name: string;
}

function toOptions(regions: Record<string, string>): RegionOption[] {
  return Object.entries(regions).map(([code, name]) => ({ code, name }));
}

export const provinceOptions = toOptions(areaList.province_list);

export function includeCurrentRegion(
  options: RegionOption[],
  code: string,
  name: string,
): RegionOption[] {
  if (!code || !name || options.some((option) => option.code === code)) return options;
  return [{ code, name }, ...options];
}

export function getCityOptions(provinceCode: string): RegionOption[] {
  if (!provinceCode) return [];
  const prefix = provinceCode.slice(0, 2);
  return toOptions(areaList.city_list).filter(({ code }) => code.startsWith(prefix));
}

export function getDistrictOptions(cityCode: string): RegionOption[] {
  if (!cityCode) return [];
  const prefix = cityCode.slice(0, 4);
  return toOptions(areaList.county_list).filter(({ code }) => code.startsWith(prefix));
}
