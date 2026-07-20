/**
 * 图片转拼豆图纸引擎。
 * 从 web-studio/src/engine/converter.ts 移植，适配小程序环境。
 * 不使用 ImageData / Worker，直接操作 Uint8ClampedArray。
 */

import { studioPalette, rgbDistance, type RGB } from './mardPalette'

// ── 类型 ────────────────────────────────────────────────

export type ConversionMode = 'illustration' | 'photo' | 'pixel' | 'portrait'

export interface ConvertOptions {
  pixels: Uint8ClampedArray
  imageWidth: number
  imageHeight: number
  gridWidth: number
  gridHeight: number
  mode: ConversionMode
  imageScale?: number
  imageOffsetX?: number
  imageOffsetY?: number
  mergeDistance?: number
  cleanupSize?: number
  excludedColors?: number[]
  /** 限定重新量化可使用的色号，避免排除颜色时引入材料清单之外的新色。 */
  allowedColors?: number[]
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// ── 色板查找（LRU 缓存） ────────────────────────────────

const PALETTE_CACHE_LIMIT = 16384
const paletteCache = new Map<number, number>()

function cachedIndex(rgb: RGB): number {
  const key = ((rgb.r & 0xff) << 16) | ((rgb.g & 0xff) << 8) | (rgb.b & 0xff)
  const hit = paletteCache.get(key)
  if (hit !== undefined) return hit
  const result = nearestPaletteIndex(rgb)
  if (paletteCache.size >= PALETTE_CACHE_LIMIT) {
    paletteCache.delete(paletteCache.keys().next().value!)
  }
  paletteCache.set(key, result)
  return result
}

export function nearestPaletteIndex(rgb: RGB, allowed?: Set<number>): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < studioPalette.length; i++) {
    if (allowed && !allowed.has(i)) continue
    const d = rgbDistance(rgb, studioPalette[i].rgb)
    if (d < bestDist) { bestDist = d; best = i }
    if (d === 0) break
  }
  return best
}

// ── 格子采样 ────────────────────────────────────────────

interface Sample extends RGB { alpha: number }

function representativeSample(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x0: number, y0: number, x1: number, y1: number,
  mode: ConversionMode,
): Sample {
  const sx = clamp(Math.floor(x0), 0, imageWidth)
  const sy = clamp(Math.floor(y0), 0, imageHeight)
  const ex = clamp(Math.ceil(x1), 0, imageWidth)
  const ey = clamp(Math.ceil(y1), 0, imageHeight)
  const useAvg = mode === 'portrait' || mode === 'photo'

  let r = 0, g = 0, b = 0, count = 0
  let dominant: RGB | null = null
  let dominantCount = 0
  const colorCounts = new Map<number, number>()

  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      const off = (y * imageWidth + x) * 4
      if (pixels[off + 3] < 128) continue
      const cr = pixels[off], cg = pixels[off + 1], cb = pixels[off + 2]
      count++
      if (useAvg) { r += cr; g += cg; b += cb }
      else {
        const key = ((cr >> 4) << 8) | ((cg >> 4) << 4) | (cb >> 4)
        const nc = (colorCounts.get(key) ?? 0) + 1
        colorCounts.set(key, nc)
        if (nc > dominantCount) { dominantCount = nc; dominant = { r: cr, g: cg, b: cb } }
      }
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255, alpha: 0 }
  if (!useAvg) return { ...(dominant ?? { r: 255, g: 255, b: 255 }), alpha: 255 }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), alpha: 255 }
}

// ── 主转换 ──────────────────────────────────────────────

export function convertPixelsToGrid(options: ConvertOptions): Int16Array {
  const w = clamp(Math.round(options.gridWidth), 12, 120)
  const h = clamp(Math.round(options.gridHeight), 12, 120)
  const { imageWidth, imageHeight, pixels } = options

  const fitScale = Math.min(w / imageWidth, h / imageHeight)
  const renderScale = fitScale * clamp(options.imageScale ?? 1, 0.25, 4)
  const rw = imageWidth * renderScale
  const rh = imageHeight * renderScale
  const imgLeft = (w - rw) / 2 + (options.imageOffsetX ?? 0)
  const imgTop  = (h - rh) / 2 + (options.imageOffsetY ?? 0)

  const excluded = new Set(options.excludedColors ?? [])
  const restricted = options.allowedColors
    ?.filter(i => Number.isInteger(i) && i >= 0 && i < studioPalette.length && !excluded.has(i))
  const allowed = restricted
    ? new Set(restricted)
    : excluded.size
      ? new Set(studioPalette.map((_, i) => i).filter(i => !excluded.has(i)))
      : undefined
  if (allowed && allowed.size === 0) throw new Error('排除颜色后至少需要保留一种可用颜色')

  const cells = new Int16Array(w * h).fill(-1)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rx0 = (x - imgLeft) / renderScale
      const ry0 = (y - imgTop) / renderScale
      const rx1 = (x + 1 - imgLeft) / renderScale
      const ry1 = (y + 1 - imgTop) / renderScale
      const sx0 = clamp(rx0, 0, imageWidth)
      const sy0 = clamp(ry0, 0, imageHeight)
      const sx1 = clamp(rx1, 0, imageWidth)
      const sy1 = clamp(ry1, 0, imageHeight)
      if (sx1 <= sx0 || sy1 <= sy0) continue
      const sample = representativeSample(pixels, imageWidth, imageHeight, sx0, sy0, sx1, sy1, options.mode)
      if (sample.alpha < 128) continue
      cells[y * w + x] = allowed ? nearestPaletteIndex(sample, allowed) : cachedIndex(sample)
    }
  }

  let result = mergeSimilarColors(cells, options.mergeDistance ?? 30)
  if ((options.cleanupSize ?? 1) > 1) {
    result = cleanupSmallRegions(result, w, h, options.cleanupSize!)
  }
  return result
}

// ── 相近颜色合并 ────────────────────────────────────────

export function mergeSimilarColors(cells: Int16Array, maxDist: number): Int16Array {
  if (maxDist <= 0) return cells

  const counts = new Map<number, number>()
  for (const v of cells) if (v >= 0) counts.set(v, (counts.get(v) ?? 0) + 1)

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([i]) => i)
  const result = cells.slice()
  const replaced = new Set<number>()

  for (let hi = 0; hi < sorted.length; hi++) {
    const high = sorted[hi]
    if (replaced.has(high)) continue
    for (let lo = hi + 1; lo < sorted.length; lo++) {
      const low = sorted[lo]
      if (replaced.has(low)) continue
      if (rgbDistance(studioPalette[high].rgb, studioPalette[low].rgb) >= maxDist) continue
      replaced.add(low)
      for (let i = 0; i < result.length; i++) if (result[i] === low) result[i] = high
    }
  }
  return result
}

// ── 小区域清理 ──────────────────────────────────────────

export function cleanupSmallRegions(
  cells: Int16Array, width: number, height: number, threshold: number,
): Int16Array {
  if (threshold <= 1) return cells
  const result = cells.slice()
  const visited = new Uint8Array(result.length)

  for (let start = 0; start < result.length; start++) {
    if (visited[start] || result[start] < 0) continue
    const color = result[start]
    const component: number[] = []
    const queue = [start]
    const neighbours = new Map<number, number>()
    visited[start] = 1

    for (let head = 0; head < queue.length; head++) {
      const idx = queue[head]
      component.push(idx)
      const cx = idx % width, cy = Math.floor(idx / width)
      const adj = [
        cx > 0 ? idx - 1 : -1, cx < width - 1 ? idx + 1 : -1,
        cy > 0 ? idx - width : -1, cy < height - 1 ? idx + width : -1,
      ]
      for (const nb of adj) {
        if (nb < 0) continue
        if (result[nb] === color && !visited[nb]) { visited[nb] = 1; queue.push(nb) }
        else if (result[nb] >= 0 && result[nb] !== color) {
          neighbours.set(result[nb], (neighbours.get(result[nb]) ?? 0) + 1)
        }
      }
    }

    if (component.length < threshold && neighbours.size) {
      const replacement = [...neighbours.entries()].sort((a, b) => b[1] - a[1])[0][0]
      for (const idx of component) result[idx] = replacement
    }
  }
  return result
}

// ── 板子背景去除（沿边 flood-fill） ─────────────────────

export function removeBackgroundByVote(cells: Int16Array, width: number, height: number): Int16Array {
  const votes = new Map<number, number>()
  const tally = (i: number) => {
    const v = cells[i]
    if (v >= 0) votes.set(v, (votes.get(v) ?? 0) + 1)
  }
  for (let x = 0; x < width; x++) { tally(x); tally((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y++) { tally(y * width); tally(y * width + width - 1) }
  if (votes.size === 0) return cells

  const bg = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const result = cells.slice()
  const visited = new Uint8Array(result.length)
  const stack: number[] = []

  const enqueue = (i: number) => {
    if (visited[i] || result[i] !== bg) return
    visited[i] = 1; stack.push(i)
  }
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1) }

  while (stack.length) {
    const idx = stack.pop()!
    result[idx] = -1
    const cx = idx % width, cy = Math.floor(idx / width)
    if (cx > 0) enqueue(idx - 1)
    if (cx < width - 1) enqueue(idx + 1)
    if (cy > 0) enqueue(idx - width)
    if (cy < height - 1) enqueue(idx + width)
  }
  return result
}

// ── 原图背景去除 ────────────────────────────────────────

function removeConnectedSourceColor(
  data: Uint8ClampedArray, width: number, height: number, tolerance: number,
): number {
  const boundary: number[] = []
  const isTransparent = (i: number) => data[i * 4 + 3] < 128

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (isTransparent(i)) continue
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      const touchTrans =
        (x > 0 && isTransparent(i - 1)) || (x < width - 1 && isTransparent(i + 1)) ||
        (y > 0 && isTransparent(i - width)) || (y < height - 1 && isTransparent(i + width))
      if (edge || touchTrans) boundary.push(i)
    }
  }
  if (boundary.length === 0) return 0

  // 4-bit 分桶找主导背景色
  const bins = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (const idx of boundary) {
    const off = idx * 4
    const cr = data[off], cg = data[off + 1], cb = data[off + 2]
    const key = ((cr >> 4) << 8) | ((cg >> 4) << 4) | (cb >> 4)
    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bin.count++; bin.r += cr; bin.g += cg; bin.b += cb
    bins.set(key, bin)
  }
  const dom = [...bins.values()].sort((a, b) => b.count - a.count)[0]
  if (!dom || dom.count / boundary.length < 0.18) return 0

  const bgR = dom.r / dom.count, bgG = dom.g / dom.count, bgB = dom.b / dom.count
  const maxDsq = tolerance * tolerance
  const matches = (i: number) => {
    const off = i * 4
    if (data[off + 3] < 128) return false
    const dr = data[off] - bgR, dg = data[off + 1] - bgG, db = data[off + 2] - bgB
    return dr * dr + dg * dg + db * db <= maxDsq
  }

  const visited = new Uint8Array(width * height)
  const stack: number[] = []
  for (const idx of boundary) { if (matches(idx)) { visited[idx] = 1; stack.push(idx) } }

  let removed = 0
  while (stack.length) {
    const idx = stack.pop()!
    if (!matches(idx)) continue
    data[idx * 4 + 3] = 0
    removed++
    const cx = idx % width, cy = Math.floor(idx / width)
    const nb = [
      cx > 0 ? idx - 1 : -1, cx < width - 1 ? idx + 1 : -1,
      cy > 0 ? idx - width : -1, cy < height - 1 ? idx + width : -1,
    ]
    for (const n of nb) {
      if (n < 0 || visited[n]) continue
      visited[n] = 1
      if (matches(n)) stack.push(n)
    }
  }
  return removed
}

export function removeSourceImageBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 36,
): { data: Uint8ClampedArray; removedPixels: number } {
  const data = new Uint8ClampedArray(pixels)
  let removed = removeConnectedSourceColor(data, width, height, tolerance)
  // 截图边框可能在首次清除后暴露真正的背景 → 再跑一次
  if (removed > 0 && removed < width * height * 0.15) {
    removed += removeConnectedSourceColor(data, width, height, tolerance)
  }
  return { data, removedPixels: removed }
}
