import { adjustContrast, deltaE2000, rgbToLab } from '../domain/color'
import { studioPalette } from '../domain/palette'
import type { ConvertRequest, ConvertResult, ImageMode, RGB } from '../domain/types'

interface Sample extends RGB {
  alpha: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function pixelAt(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): Sample {
  const px = clamp(x, 0, width - 1)
  const py = clamp(y, 0, height - 1)
  const offset = (py * width + px) * 4
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2], alpha: data[offset + 3] }
}

function averageSample(image: ImageData, x0: number, y0: number, x1: number, y1: number, mode: ImageMode): Sample {
  if (mode === 'pixel') {
    return pixelAt(image.data, image.width, image.height, Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2))
  }

  if (mode === 'illustration') {
    const bins = new Map<number, { count: number; r: number; g: number; b: number; alpha: number }>()
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const sample = pixelAt(image.data, image.width, image.height, x, y)
        if (sample.alpha < 32) continue
        const key = (sample.r >> 4) << 8 | (sample.g >> 4) << 4 | (sample.b >> 4)
        const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0, alpha: 0 }
        bin.count += 1
        bin.r += sample.r
        bin.g += sample.g
        bin.b += sample.b
        bin.alpha += sample.alpha
        bins.set(key, bin)
      }
    }
    let winner: ReturnType<typeof bins.get>
    for (const bin of bins.values()) {
      if (!winner || bin.count > winner.count) winner = bin
    }
    if (!winner) return { r: 255, g: 255, b: 255, alpha: 0 }
    return {
      r: winner.r / winner.count,
      g: winner.g / winner.count,
      b: winner.b / winner.count,
      alpha: winner.alpha / winner.count,
    }
  }

  let totalWeight = 0
  let r = 0
  let g = 0
  let b = 0
  let alpha = 0
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const sample = pixelAt(image.data, image.width, image.height, x, y)
      if (sample.alpha < 16) continue
      let weight = sample.alpha / 255
      if (mode === 'portrait') {
        const right = pixelAt(image.data, image.width, image.height, x + 1, y)
        const down = pixelAt(image.data, image.width, image.height, x, y + 1)
        const luminance = (color: RGB) => color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
        const edge = Math.abs(luminance(sample) - luminance(right)) + Math.abs(luminance(sample) - luminance(down))
        weight *= 1 + Math.min(2.4, edge / 42)
      }
      totalWeight += weight
      r += sample.r * weight
      g += sample.g * weight
      b += sample.b * weight
      alpha += sample.alpha * weight
    }
  }
  if (totalWeight === 0) return { r: 255, g: 255, b: 255, alpha: 0 }
  return { r: r / totalWeight, g: g / totalWeight, b: b / totalWeight, alpha: alpha / totalWeight }
}

export function nearestPaletteIndex(rgb: RGB, allowed?: Set<number>): number {
  const lab = rgbToLab(rgb)
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < studioPalette.length; index += 1) {
    if (allowed && !allowed.has(index)) continue
    const distance = deltaE2000(lab, studioPalette[index].lab)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }
  return bestIndex
}

function mapWithDither(samples: Sample[], width: number, height: number): Int16Array {
  const working = samples.map((sample) => ({ ...sample }))
  const cells = new Int16Array(width * height).fill(-1)
  const spread = (x: number, y: number, error: RGB, factor: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const target = working[y * width + x]
    if (target.alpha < 48) return
    target.r = clamp(target.r + error.r * factor, 0, 255)
    target.g = clamp(target.g + error.g * factor, 0, 255)
    target.b = clamp(target.b + error.b * factor, 0, 255)
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const sample = working[index]
      if (sample.alpha < 48) continue
      const paletteIndex = nearestPaletteIndex(sample)
      cells[index] = paletteIndex
      const mapped = studioPalette[paletteIndex].rgb
      const error = { r: sample.r - mapped.r, g: sample.g - mapped.g, b: sample.b - mapped.b }
      spread(x + 1, y, error, 5 / 16)
      spread(x - 1, y + 1, error, 2 / 16)
      spread(x, y + 1, error, 4 / 16)
      spread(x + 1, y + 1, error, 1 / 16)
    }
  }
  return cells
}

export function limitPalette(cells: Int16Array, maxColors: number): Int16Array {
  const counts = new Map<number, number>()
  for (const cell of cells) if (cell >= 0) counts.set(cell, (counts.get(cell) ?? 0) + 1)
  if (counts.size <= maxColors) return cells
  const allowed = new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors).map(([index]) => index))
  const result = cells.slice()
  for (let index = 0; index < result.length; index += 1) {
    const current = result[index]
    if (current < 0 || allowed.has(current)) continue
    result[index] = nearestPaletteIndex(studioPalette[current].rgb, allowed)
  }
  return result
}

function removeSimpleBackground(cells: Int16Array, width: number, height: number): Int16Array {
  const borderCounts = new Map<number, number>()
  const add = (index: number) => {
    const value = cells[index]
    if (value >= 0) borderCounts.set(value, (borderCounts.get(value) ?? 0) + 1)
  }
  for (let x = 0; x < width; x += 1) {
    add(x)
    add((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(y * width)
    add(y * width + width - 1)
  }
  const dominant = [...borderCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  const borderLength = Math.max(1, width * 2 + height * 2 - 4)
  if (!dominant || dominant[1] / borderLength < 0.18) return cells
  const result = cells.slice()
  const visited = new Uint8Array(result.length)
  const queue: number[] = []
  const backgroundLab = studioPalette[dominant[0]].lab
  const canRemove = (index: number) => {
    const value = result[index]
    return value >= 0 && deltaE2000(studioPalette[value].lab, backgroundLab) < 8
  }
  for (let x = 0; x < width; x += 1) {
    queue.push(x, (height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) queue.push(y * width, y * width + width - 1)
  let head = 0
  while (head < queue.length) {
    const index = queue[head++]
    if (visited[index] || !canRemove(index)) continue
    visited[index] = 1
    result[index] = -1
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) queue.push(index - 1)
    if (x < width - 1) queue.push(index + 1)
    if (y > 0) queue.push(index - width)
    if (y < height - 1) queue.push(index + width)
  }
  return result
}

export function cleanupSmallRegions(cells: Int16Array, width: number, height: number, threshold: number): Int16Array {
  if (threshold <= 1) return cells
  let result = cells.slice()
  for (let pass = 0; pass < 2; pass += 1) {
    const visited = new Uint8Array(result.length)
    const next = result.slice()
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
        const replacement = [...neighbours.entries()].sort((a, b) => b[1] - a[1])[0][0]
        for (const index of component) next[index] = replacement
      }
    }
    result = next
  }
  return result
}

export function convertImage({ image, settings }: ConvertRequest): ConvertResult {
  const width = clamp(Math.round(settings.width), 12, 120)
  const height = clamp(Math.round(width * image.height / image.width), 12, 120)
  const samples: Sample[] = []
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * image.height / height)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * image.height / height))
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x * image.width / width)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * image.width / width))
      const sample = averageSample(image, x0, y0, x1, y1, settings.mode)
      const corrected = adjustContrast(sample, settings.contrast)
      samples.push({ ...corrected, alpha: sample.alpha })
    }
  }
  let cells = settings.dither ? mapWithDither(samples, width, height) : new Int16Array(samples.map((sample) => sample.alpha < 48 ? -1 : nearestPaletteIndex(sample)))
  cells = limitPalette(cells, settings.maxColors)
  if (settings.removeBackground) cells = removeSimpleBackground(cells, width, height)
  cells = cleanupSmallRegions(cells, width, height, settings.cleanupSize)
  return { width, height, cells }
}
