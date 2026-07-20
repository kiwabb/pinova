export interface SearchablePaletteColor { index: number; id: string; name: string; hex: string }
export type PaletteFilter = 'all' | 'used'

export function filterPaletteColors<T extends SearchablePaletteColor>(
  colors: T[], filter: PaletteFilter, query: string, usedColors: number[],
): T[] {
  const normalized = query.trim().toLowerCase()
  const used = filter === 'used' ? new Set(usedColors) : null
  return colors.filter(color => {
    if (used && !used.has(color.index)) return false
    return !normalized || color.id.toLowerCase().includes(normalized) || color.name.toLowerCase().includes(normalized) || color.hex.toLowerCase().includes(normalized)
  })
}
