"use client";

import { useMemo } from "react";
import {
  getCityOptions,
  getDistrictOptions,
  includeCurrentRegion,
  provinceOptions,
  type RegionOption,
} from "../lib/region-options";
import type {
  MemberAddressFieldErrors,
  MemberAddressFormValues,
} from "../types";
import styles from "../member-addresses.module.css";
import { RegionSelect } from "./region-select";

type RegionValues = Pick<
  MemberAddressFormValues,
  | "provinceCode"
  | "provinceName"
  | "cityCode"
  | "cityName"
  | "districtCode"
  | "districtName"
>;

interface AddressRegionFieldsetProps {
  errors: MemberAddressFieldErrors;
  region: RegionValues;
  onSelectCity: (cityCode: string, cityName: string) => void;
  onSelectDistrict: (districtCode: string, districtName: string) => void;
  onSelectProvince: (provinceCode: string, provinceName: string) => void;
}

export function AddressRegionFieldset({
  errors,
  region,
  onSelectCity,
  onSelectDistrict,
  onSelectProvince,
}: AddressRegionFieldsetProps) {
  const selectedProvinceOptions = useMemo(
    () =>
      includeCurrentRegion(
        provinceOptions,
        region.provinceCode,
        region.provinceName,
      ),
    [region.provinceCode, region.provinceName],
  );
  const cityOptions = useMemo(
    () =>
      includeCurrentRegion(
        getCityOptions(region.provinceCode),
        region.cityCode,
        region.cityName,
      ),
    [region.cityCode, region.cityName, region.provinceCode],
  );
  const districtOptions = useMemo(
    () =>
      includeCurrentRegion(
        getDistrictOptions(region.cityCode),
        region.districtCode,
        region.districtName,
      ),
    [region.cityCode, region.districtCode, region.districtName],
  );

  const findName = (options: RegionOption[], code: string) =>
    options.find((option) => option.code === code)?.name ?? "";

  return (
    <fieldset className={styles.regionFields}>
      <legend>所在地区</legend>
      <div className={styles.regionSelectGrid}>
        <RegionSelect
          error={errors.provinceCode}
          label="省 / 自治区"
          name="provinceCode"
          options={selectedProvinceOptions}
          placeholder="请选择省 / 自治区"
          value={region.provinceCode}
          onChange={(code) =>
            onSelectProvince(code, findName(selectedProvinceOptions, code))
          }
        />
        <RegionSelect
          disabled={!region.provinceCode}
          error={errors.cityCode}
          label="城市"
          name="cityCode"
          options={cityOptions}
          placeholder="请选择城市"
          value={region.cityCode}
          onChange={(code) => onSelectCity(code, findName(cityOptions, code))}
        />
        <RegionSelect
          disabled={!region.cityCode}
          error={errors.districtCode}
          label="区 / 县"
          name="districtCode"
          options={districtOptions}
          placeholder="请选择区 / 县"
          value={region.districtCode}
          onChange={(code) =>
            onSelectDistrict(code, findName(districtOptions, code))
          }
        />
      </div>
    </fieldset>
  );
}
