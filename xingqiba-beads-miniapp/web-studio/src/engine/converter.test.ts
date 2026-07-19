import { describe, expect, it } from 'vitest'
import { cleanupSmallRegions, limitPalette, nearestPaletteIndex } from './converter'

describe('converter helpers', () => {
  it('maps a color into the configured bead palette', () => {
    const index = nearestPaletteIndex({ r: 245, g: 220, b: 60 })
    expect(index).toBeGreaterThanOrEqual(0)
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
})
