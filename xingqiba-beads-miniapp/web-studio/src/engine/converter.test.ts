import { describe, expect, it } from 'vitest'
import { studioPalette } from '../domain/palette'
import type { ConvertSettings } from '../domain/types'
import { cleanupSmallRegions, convertImage, limitPalette, mergeSimilarColors, nearestPaletteIndex, removeBackgroundByVote, removeSourceImageBackground, rgbDistance } from './converter'

describe('converter helpers', () => {
  it('maps a color into the configured bead palette', () => {
    const index = nearestPaletteIndex({ r: 245, g: 220, b: 60 })
    expect(index).toBeGreaterThanOrEqual(0)
  })

  it('loads the complete 291-color MARD palette', () => {
    expect(studioPalette).toHaveLength(291)
  })

  it('limits a grid to the requested number of colors', () => {
    const result = limitPalette(new Int16Array([0, 1, 2, 2, 3, 3, 3]), 2)
    expect(new Set(result).size).toBeLessThanOrEqual(2)
  })

  it('replaces an isolated region with its surrounding color', () => {
    const input = new Int16Array([
      1, 1, 1,
      1, 2, 1,
      1, 1, 1,
    ])
    const result = cleanupSmallRegions(input, 3, 3, 2)
    expect(result[4]).toBe(1)
  })

  it('uses the most frequent exact source color in cartoon mode', () => {
    const width = 24
    const height = 24
    const data = new Uint8ClampedArray(width * height * 4)
    const dominant = studioPalette[24].rgb
    const accent = studioPalette[180].rgb
    for (let cellY = 0; cellY < 12; cellY += 1) {
      for (let cellX = 0; cellX < 12; cellX += 1) {
        for (let localY = 0; localY < 2; localY += 1) {
          for (let localX = 0; localX < 2; localX += 1) {
            const offset = ((cellY * 2 + localY) * width + cellX * 2 + localX) * 4
            const color = localX === 1 && localY === 1 ? accent : dominant
            data.set([color.r, color.g, color.b, 255], offset)
          }
        }
      }
    }
    const settings: ConvertSettings = {
      mode: 'illustration', width: 12, height: 12, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0, maxColors: 48, mergeDistance: 0, contrast: 1,
      dither: false, removeBackground: false, cleanupSize: 1, excludedColors: [],
    }
    const result = convertImage({ image: { data, width, height } as ImageData, settings })

    expect(new Set(result.cells)).toEqual(new Set([24]))
  })

  it('uses the simple mean source color in realistic mode', () => {
    const width = 24
    const height = 24
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4
        const value = (x % 2) * 255
        data.set([value, value, value, 255], offset)
      }
    }
    const expected = nearestPaletteIndex({ r: 128, g: 128, b: 128 })
    const result = convertImage({
      image: { data, width, height } as ImageData,
      settings: {
        mode: 'photo', width: 12, height: 12, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0,
        maxColors: studioPalette.length, mergeDistance: 0, contrast: 1, dither: false,
        removeBackground: false, cleanupSize: 1, excludedColors: [],
      },
    })

    expect(new Set(result.cells)).toEqual(new Set([expected]))
  })

  it('never emits a user-excluded palette color', () => {
    const data = new Uint8ClampedArray(12 * 12 * 4)
    const excluded = studioPalette[6].rgb
    for (let offset = 0; offset < data.length; offset += 4) data.set([excluded.r, excluded.g, excluded.b, 255], offset)
    const result = convertImage({
      image: { data, width: 12, height: 12 } as ImageData,
      settings: {
        mode: 'pixel', width: 12, height: 12, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0, maxColors: 48, mergeDistance: 0, contrast: 1, dither: false,
        removeBackground: false, cleanupSize: 1, excludedColors: [6],
      },
    })

    expect([...result.cells]).not.toContain(6)
  })

  it('merges a lower-frequency nearby palette color into the dominant color', () => {
    let first = -1
    let second = -1
    for (let left = 0; left < studioPalette.length && first < 0; left += 1) {
      for (let right = left + 1; right < studioPalette.length; right += 1) {
        const distance = rgbDistance(studioPalette[left].rgb, studioPalette[right].rgb)
        if (distance > 0 && distance < 30) {
          first = left
          second = right
          break
        }
      }
    }
    expect(first).toBeGreaterThanOrEqual(0)
    const result = mergeSimilarColors(new Int16Array([first, first, first, second]), 30)

    expect([...result]).toEqual([first, first, first, first])
  })

  it('places an image inside a fixed board and leaves uncovered cells empty', () => {
    const data = new Uint8ClampedArray(12 * 6 * 4)
    for (let offset = 0; offset < data.length; offset += 4) data.set([201, 200, 194, 255], offset)
    const baseSettings: ConvertSettings = {
      mode: 'pixel', width: 12, height: 12, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0,
      maxColors: 48, mergeDistance: 0, contrast: 1, dither: false, removeBackground: false, cleanupSize: 1, excludedColors: [],
    }
    const fitted = convertImage({ image: { data, width: 12, height: 6 } as ImageData, settings: baseSettings })
    const filled = convertImage({ image: { data, width: 12, height: 6 } as ImageData, settings: { ...baseSettings, imageScale: 2 } })

    expect(fitted.height).toBe(12)
    expect([...fitted.cells].filter((cell) => cell >= 0)).toHaveLength(72)
    expect([...filled.cells].filter((cell) => cell >= 0)).toHaveLength(144)
  })

  it('preserves a one-cell detail when cleanup is off', () => {
    const data = new Uint8ClampedArray(12 * 12 * 4)
    const background = studioPalette[0].rgb
    const detail = studioPalette[120].rgb
    for (let offset = 0; offset < data.length; offset += 4) data.set([background.r, background.g, background.b, 255], offset)
    const detailOffset = (6 * 12 + 6) * 4
    data.set([detail.r, detail.g, detail.b, 255], detailOffset)

    const result = convertImage({
      image: { data, width: 12, height: 12 } as ImageData,
      settings: {
        mode: 'pixel', width: 12, height: 12, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0,
        maxColors: studioPalette.length, mergeDistance: 0, contrast: 1, dither: false,
        removeBackground: false, cleanupSize: 1, excludedColors: [],
      },
    })

    expect(result.cells[6 * 12 + 6]).toBe(120)
  })

  it('removes only background cells connected to the board edge', () => {
    const width = 10
    const height = 10
    const cells = new Int16Array(width * height).fill(11)
    const border: number[] = []
    for (let x = 0; x < width; x += 1) border.push(x, (height - 1) * width + x)
    for (let y = 1; y < height - 1; y += 1) border.push(y * width, y * width + width - 1)
    border.forEach((index, position) => { cells[index] = 2 + position % 9 })
    for (let x = 0; x < 5; x += 1) cells[x] = 1
    for (let y = 3; y < 7; y += 1) {
      for (let x = 3; x < 7; x += 1) cells[y * width + x] = 1
    }

    const result = removeBackgroundByVote(cells, width, height)

    expect([...result].filter((cell) => cell === -1)).toHaveLength(5)
    expect(result[4 * width + 4]).toBe(1)
  })

  it('removes a similar-colored source background without deleting enclosed highlights', () => {
    const width = 7
    const height = 7
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4
        data.set([248 + (x + y) % 3, 248, 246, 255], offset)
      }
    }
    for (let y = 2; y <= 4; y += 1) {
      for (let x = 2; x <= 4; x += 1) {
        const offset = (y * width + x) * 4
        data.set([40, 45, 48, 255], offset)
      }
    }
    data.set([249, 248, 246, 255], (3 * width + 3) * 4)

    const result = removeSourceImageBackground({ data, width, height } as ImageData)

    expect(result.removedPixels).toBe(40)
    expect(result.image.data[3]).toBe(0)
    expect(result.image.data[(2 * width + 2) * 4 + 3]).toBe(255)
    expect(result.image.data[(3 * width + 3) * 4 + 3]).toBe(255)
  })
})
