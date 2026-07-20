import type { Lab, RGB } from './types'

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value))

export function hexToRgb(hex: string): RGB {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((value) => Math.round(clamp(value)).toString(16).padStart(2, '0')).join('')}`
}

function linearize(value: number): number {
  const channel = value / 255
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function rgbToLab(rgb: RGB): Lab {
  const r = linearize(rgb.r)
  const g = linearize(rgb.g)
  const b = linearize(rgb.b)
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883
  const transform = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116)
  const fx = transform(x)
  const fy = transform(y)
  const fz = transform(z)
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

export function deltaE2000(first: Lab, second: Lab): number {
  const avgLightness = (first.l + second.l) / 2
  const chroma1 = Math.hypot(first.a, first.b)
  const chroma2 = Math.hypot(second.a, second.b)
  const avgChroma = (chroma1 + chroma2) / 2
  const g = 0.5 * (1 - Math.sqrt(avgChroma ** 7 / (avgChroma ** 7 + 25 ** 7)))
  const a1 = (1 + g) * first.a
  const a2 = (1 + g) * second.a
  const adjustedChroma1 = Math.hypot(a1, first.b)
  const adjustedChroma2 = Math.hypot(a2, second.b)
  const averageAdjustedChroma = (adjustedChroma1 + adjustedChroma2) / 2
  const hue = (a: number, b: number) => {
    const angle = (Math.atan2(b, a) * 180) / Math.PI
    return angle >= 0 ? angle : angle + 360
  }
  const hue1 = hue(a1, first.b)
  const hue2 = hue(a2, second.b)
  const hueDifference = Math.abs(hue1 - hue2) <= 180 ? hue2 - hue1 : hue2 <= hue1 ? hue2 - hue1 + 360 : hue2 - hue1 - 360
  const averageHue = Math.abs(hue1 - hue2) <= 180 ? (hue1 + hue2) / 2 : (hue1 + hue2 + 360) / 2 % 360
  const t = 1 - 0.17 * Math.cos(((averageHue - 30) * Math.PI) / 180) + 0.24 * Math.cos((2 * averageHue * Math.PI) / 180) + 0.32 * Math.cos(((3 * averageHue + 6) * Math.PI) / 180) - 0.2 * Math.cos(((4 * averageHue - 63) * Math.PI) / 180)
  const deltaLightness = second.l - first.l
  const deltaChroma = adjustedChroma2 - adjustedChroma1
  const deltaHue = 2 * Math.sqrt(adjustedChroma1 * adjustedChroma2) * Math.sin((hueDifference * Math.PI) / 360)
  const sl = 1 + (0.015 * (avgLightness - 50) ** 2) / Math.sqrt(20 + (avgLightness - 50) ** 2)
  const sc = 1 + 0.045 * averageAdjustedChroma
  const sh = 1 + 0.015 * averageAdjustedChroma * t
  const rotation = 30 * Math.exp(-1 * (((averageHue - 275) / 25) ** 2))
  const rc = 2 * Math.sqrt(averageAdjustedChroma ** 7 / (averageAdjustedChroma ** 7 + 25 ** 7))
  const rt = -rc * Math.sin((2 * rotation * Math.PI) / 180)
  const lightnessTerm = deltaLightness / sl
  const chromaTerm = deltaChroma / sc
  const hueTerm = deltaHue / sh
  return Math.sqrt(lightnessTerm ** 2 + chromaTerm ** 2 + hueTerm ** 2 + rt * chromaTerm * hueTerm)
}

export function adjustContrast(rgb: RGB, contrast: number): RGB {
  return {
    r: clamp((rgb.r - 128) * contrast + 128),
    g: clamp((rgb.g - 128) * contrast + 128),
    b: clamp((rgb.b - 128) * contrast + 128),
  }
}
