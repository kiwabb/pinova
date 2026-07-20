import { studioPalette } from '../domain/palette'
import type { ConvertRequest, ConvertResult, ImageMode, RGB } from '../domain/types'

interface Sample extends RGB {
  alpha: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function rgbDistance(first: RGB, second: RGB): number {
  const red = first.r - second.r
  const green = first.g - second.g
  const blue = first.b - second.b
  return Math.sqrt(red * red + green * green + blue * blue)
}

export interface SourceBackgroundResult {
  image: ImageData
  removedPixels: number
}

function removeConnectedSourceColor(data: Uint8ClampedArray, width: number, height: number, tolerance: number): number {
  const boundary: number[] = []
  const isTransparent = (index: number) => data[index * 4 + 3] < 128
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (isTransparent(index)) continue
      const touchesImageEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      const touchesTransparency =
        (x > 0 && isTransparent(index - 1)) ||
        (x < width - 1 && isTransparent(index + 1)) ||
        (y > 0 && isTransparent(index - width)) ||
        (y < height - 1 && isTransparent(index + width))
      if (touchesImageEdge || touchesTransparency) boundary.push(index)
    }
  }
  if (boundary.length === 0) return 0

  const bins = new Map<number, { count: number; red: number; green: number; blue: number }>()
  for (const index of boundary) {
    const offset = index * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bin = bins.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 }
    bin.count += 1
    bin.red += r
    bin.green += g
    bin.blue += b
    bins.set(key, bin)
  }
  const dominant = [...bins.values()].sort((first, second) => second.count - first.count)[0]
  if (!dominant || dominant.count / boundary.length < 0.18) return 0
  const background = {
    r: dominant.red / dominant.count,
    g: dominant.green / dominant.count,
    b: dominant.blue / dominant.count,
  }
  const maxDistanceSquared = tolerance * tolerance
  const matchesBackground = (index: number) => {
    const offset = index * 4
    const red = data[offset] - background.r
    const green = data[offset + 1] - background.g
    const blue = data[offset + 2] - background.b
    return data[offset + 3] >= 128 && red * red + green * green + blue * blue <= maxDistanceSquared
  }

  const visited = new Uint8Array(width * height)
  const stack: number[] = []
  for (const index of boundary) {
    if (!matchesBackground(index)) continue
    visited[index] = 1
    stack.push(index)
  }
  let removedPixels = 0
  while (stack.length) {
    const index = stack.pop()!
    if (!matchesBackground(index)) continue
    data[index * 4 + 3] = 0
    removedPixels += 1
    const x = index % width
    const y = Math.floor(index / width)
    const neighbours = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]
    for (const neighbour of neighbours) {
      if (neighbour < 0 || visited[neighbour]) continue
      visited[neighbour] = 1
      if (matchesBackground(neighbour)) stack.push(neighbour)
    }
  }
  return removedPixels
}

export function removeSourceImageBackground(image: ImageData, tolerance = 36): SourceBackgroundResult {
  const data = new Uint8ClampedArray(image.data)
  let removedPixels = removeConnectedSourceColor(data, image.width, image.height, tolerance)
  // A narrow screenshot frame can hide the real background from the image edge.
  // Once that small frame is transparent, run one more pass on the newly exposed boundary.
  if (removedPixels > 0 && removedPixels < image.width * image.height * 0.15) {
    removedPixels += removeConnectedSourceColor(data, image.width, image.height, tolerance)
  }
  return {
    image: { data, width: image.width, height: image.height, colorSpace: image.colorSpace } as ImageData,
    removedPixels,
  }
}

function representativeSample(
  image: ImageData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mode: ImageMode,
): Sample {
  const startX = clamp(Math.floor(x0), 0, image.width)
  const startY = clamp(Math.floor(y0), 0, image.height)
  const endX = clamp(Math.ceil(x1), 0, image.width)
  const endY = clamp(Math.ceil(y1), 0, image.height)
  const useAverage = mode === 'portrait' || mode === 'photo'
  let red = 0
  let green = 0
  let blue = 0
  let count = 0
  let dominant: RGB | null = null
  let dominantCount = 0
  const colorCounts = new Map<number, number>()

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * image.width + x) * 4
      if (image.data[offset + 3] < 128) continue
      const r = image.data[offset]
      const g = image.data[offset + 1]
      const b = image.data[offset + 2]
      count += 1
      if (useAverage) {
        red += r
        green += g
        blue += b
      } else {
        const key = (r << 16) | (g << 8) | b
        const nextCount = (colorCounts.get(key) ?? 0) + 1
        colorCounts.set(key, nextCount)
        if (nextCount > dominantCount) {
          dominantCount = nextCount
          dominant = { r, g, b }
        }
      }
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255, alpha: 0 }
  if (!useAverage) return { ...(dominant ?? { r: 255, g: 255, b: 255 }), alpha: 255 }
  return {
    r: Math.round(red / count),
    g: Math.round(green / count),
    b: Math.round(blue / count),
    alpha: 255,
  }
}

const PALETTE_CACHE_LIMIT = 16384
const paletteCache = new Map<number, number>()

function cachedIndex(rgb: RGB): number {
  const key = ((rgb.r & 0xff) << 16) | ((rgb.g & 0xff) << 8) | (rgb.b & 0xff)
  const cached = paletteCache.get(key)
  if (cached !== undefined) return cached
  const result = nearestPaletteIndex(rgb)
  if (paletteCache.size >= PALETTE_CACHE_LIMIT) paletteCache.delete(paletteCache.keys().next().value!)
  paletteCache.set(key, result)
  return result
}

export function nearestPaletteIndex(rgb: RGB, allowed?: Set<number>): number {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < studioPalette.length; index += 1) {
    if (allowed && !allowed.has(index)) continue
    const distance = rgbDistance(rgb, studioPalette[index].rgb)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
    if (distance === 0) break
  }
  return bestIndex
}

export function mergeSimilarColors(cells: Int16Array, maxDistance: number): Int16Array {
  if (maxDistance <= 0) return cells
  const counts = new Map<number, number>()
  for (const cell of cells) if (cell >= 0) counts.set(cell, (counts.get(cell) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((first, second) => second[1] - first[1]).map(([index]) => index)
  const result = cells.slice()
  const replaced = new Set<number>()

  for (let highIndex = 0; highIndex < sorted.length; highIndex += 1) {
    const high = sorted[highIndex]
    if (replaced.has(high)) continue
    for (let lowIndex = highIndex + 1; lowIndex < sorted.length; lowIndex += 1) {
      const low = sorted[lowIndex]
      if (replaced.has(low)) continue
      if (rgbDistance(studioPalette[high].rgb, studioPalette[low].rgb) >= maxDistance) continue
      replaced.add(low)
      for (let index = 0; index < result.length; index += 1) {
        if (result[index] === low) result[index] = high
      }
    }
  }
  return result
}

// Kept for manual tools and backwards-compatible imports. The online-compatible
// conversion path deliberately does not hard-limit the number of colors.
export function limitPalette(cells: Int16Array, maxColors: number, width?: number, height?: number): Int16Array {
  const counts = new Map<number, number>()
  for (const cell of cells) if (cell >= 0) counts.set(cell, (counts.get(cell) ?? 0) + 1)
  if (counts.size <= maxColors) return cells

  const edgeCounts = new Map<number, number>()
  if (width !== undefined && height !== undefined) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x
        const color = cells[index]
        if (color < 0) continue
        const edge =
          (x > 0 && cells[index - 1] >= 0 && cells[index - 1] !== color) ||
          (x < width - 1 && cells[index + 1] >= 0 && cells[index + 1] !== color) ||
          (y > 0 && cells[index - width] >= 0 && cells[index - width] !== color) ||
          (y < height - 1 && cells[index + width] >= 0 && cells[index + width] !== color)
        if (edge) edgeCounts.set(color, (edgeCounts.get(color) ?? 0) + 1)
      }
    }
  }

  const allowed = new Set([...counts.entries()]
    .map(([color, count]) => ({ color, score: count + (edgeCounts.get(color) ?? 0) * 2 }))
    .sort((first, second) => second.score - first.score)
    .slice(0, maxColors)
    .map(({ color }) => color))
  const result = cells.slice()
  for (let index = 0; index < result.length; index += 1) {
    const current = result[index]
    if (current >= 0 && !allowed.has(current)) result[index] = nearestPaletteIndex(studioPalette[current].rgb, allowed)
  }
  return result
}

export function removeBackgroundByVote(cells: Int16Array, width: number, height: number): Int16Array {
  const votes = new Map<number, number>()
  const tally = (index: number) => {
    const value = cells[index]
    if (value >= 0) votes.set(value, (votes.get(value) ?? 0) + 1)
  }
  for (let x = 0; x < width; x += 1) {
    tally(x)
    tally((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    tally(y * width)
    tally(y * width + width - 1)
  }
  if (votes.size === 0) return cells
  const background = [...votes.entries()].sort((first, second) => second[1] - first[1])[0][0]
  const result = cells.slice()
  const visited = new Uint8Array(cells.length)
  const stack: number[] = []
  const enqueue = (index: number) => {
    if (visited[index] || cells[index] !== background) return
    visited[index] = 1
    stack.push(index)
  }
  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }
  while (stack.length) {
    const index = stack.pop()!
    result[index] = -1
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x < width - 1) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y < height - 1) enqueue(index + width)
  }
  return result
}

export function cleanupSmallRegions(cells: Int16Array, width: number, height: number, threshold: number): Int16Array {
  if (threshold <= 1) return cells
  const result = cells.slice()
  const visited = new Uint8Array(cells.length)
  for (let start = 0; start < result.length; start += 1) {
    if (visited[start] || result[start] < 0) continue
    const color = result[start]
    const component: number[] = []
    const queue = [start]
    const neighbours = new Map<number, number>()
    visited[start] = 1
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head]
      component.push(index)
      const x = index % width
      const y = Math.floor(index / width)
      const adjacent = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]
      for (const neighbour of adjacent) {
        if (neighbour < 0) continue
        if (result[neighbour] === color && !visited[neighbour]) {
          visited[neighbour] = 1
          queue.push(neighbour)
        } else if (result[neighbour] >= 0 && result[neighbour] !== color) {
          neighbours.set(result[neighbour], (neighbours.get(result[neighbour]) ?? 0) + 1)
        }
      }
    }
    if (component.length < threshold && neighbours.size) {
      const replacement = [...neighbours.entries()].sort((first, second) => second[1] - first[1])[0][0]
      for (const index of component) result[index] = replacement
    }
  }
  return result
}

export function convertImage({ image, settings }: ConvertRequest): ConvertResult {
  const width = clamp(Math.round(settings.width), 12, 120)
  const height = clamp(Math.round(settings.height ?? width), 12, 120)
  const fitScale = Math.min(width / image.width, height / image.height)
  const renderScale = fitScale * clamp(settings.imageScale ?? 1, 0.25, 4)
  const renderWidth = image.width * renderScale
  const renderHeight = image.height * renderScale
  const imageLeft = (width - renderWidth) / 2 + (settings.imageOffsetX ?? 0)
  const imageTop = (height - renderHeight) / 2 + (settings.imageOffsetY ?? 0)
  const excluded = new Set(settings.excludedColors ?? [])
  const allowed = excluded.size
    ? new Set(studioPalette.map((_, index) => index).filter((index) => !excluded.has(index)))
    : undefined
  if (allowed && allowed.size === 0) throw new Error('当前可用颜色板为空，请恢复部分颜色')

  const cells = new Int16Array(width * height).fill(-1)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rawX0 = (x - imageLeft) / renderScale
      const rawY0 = (y - imageTop) / renderScale
      const rawX1 = (x + 1 - imageLeft) / renderScale
      const rawY1 = (y + 1 - imageTop) / renderScale
      const x0 = clamp(rawX0, 0, image.width)
      const y0 = clamp(rawY0, 0, image.height)
      const x1 = clamp(rawX1, 0, image.width)
      const y1 = clamp(rawY1, 0, image.height)
      if (x1 <= x0 || y1 <= y0) continue
      const sample = representativeSample(image, x0, y0, x1, y1, settings.mode)
      if (sample.alpha < 128) continue
      cells[y * width + x] = allowed ? nearestPaletteIndex(sample, allowed) : cachedIndex(sample)
    }
  }

  return {
    width,
    height,
    cells: mergeSimilarColors(cells, settings.mergeDistance ?? 30),
  }
}
