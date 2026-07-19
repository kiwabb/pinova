import type { RasterImage, RGB } from './types'

const palette = {
  background: { r: 217, g: 226, b: 220 },
  ear: { r: 107, g: 73, b: 56 },
  head: { r: 231, g: 189, b: 131 },
  muzzle: { r: 242, g: 214, b: 166 },
  dark: { r: 42, g: 37, b: 36 },
  brown: { r: 77, g: 51, b: 44 },
  white: { r: 255, g: 255, b: 255 },
}

const ellipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => (
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
)

const circleLine = (x: number, y: number, cx: number, cy: number, radius: number, thickness: number) => (
  Math.abs(Math.hypot(x - cx, y - cy) - radius) <= thickness
)

export function createPetRaster(size = 320): RasterImage {
  const data = new Uint8ClampedArray(size * size * 4)
  const scale = size / 320
  const set = (offset: number, color: RGB) => {
    data[offset] = color.r
    data[offset + 1] = color.g
    data[offset + 2] = color.b
    data[offset + 3] = 255
  }

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = px / scale
      const y = py / scale
      let color = palette.background
      if (ellipse(x, y, 78, 116, 58, 86) || ellipse(x, y, 242, 116, 58, 86)) color = palette.ear
      if (ellipse(x, y, 160, 150, 113, 122)) color = palette.head
      if (ellipse(x, y, 160, 202, 75, 68)) color = palette.muzzle
      if (ellipse(x, y, 119, 142, 15, 19) || ellipse(x, y, 201, 142, 15, 19)) color = palette.dark
      if (ellipse(x, y, 114, 137, 4, 5) || ellipse(x, y, 196, 137, 4, 5)) color = palette.white
      if (ellipse(x, y, 160, 197, 24, 19)) color = palette.brown
      const mouthStem = Math.abs(x - 160) < 4 && y >= 211 && y <= 229
      const leftMouth = y >= 218 && x <= 160 && circleLine(x, y, 139, 213, 27, 3.5)
      const rightMouth = y >= 218 && x >= 160 && circleLine(x, y, 181, 213, 27, 3.5)
      if (mouthStem || leftMouth || rightMouth) color = palette.brown
      set((py * size + px) * 4, color)
    }
  }
  return { width: size, height: size, data }
}
