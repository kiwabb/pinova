import type { ConversionMode } from './beadConverter'
import type { PaletteFilter } from './paletteOperations'

export type PaletteContext = 'brush' | 'eyedropper' | 'fill' | 'replace'

export interface PalettePresentation {
  title: string
  hint: string
  filter: PaletteFilter
}

export interface SettingsDraft {
  conversionMode: ConversionMode
  gridSize: number
  mergeDistance: number
}

export interface ReplacementMeta {
  index: number
  id: string
  hex: string
  count: number
}

const palettePresentations: Record<PaletteContext, PalettePresentation> = {
  brush: { title: '画笔颜色', hint: '选择颜色后在画布上绘制', filter: 'all' },
  eyedropper: { title: '取色', hint: '点击画布中的格子取色', filter: 'used' },
  fill: { title: '填充颜色', hint: '选择颜色后点击画布填充区域', filter: 'all' },
  replace: { title: '全局替换', hint: '① 点击画布选择旧色　② 从色板选择新色', filter: 'all' },
}

export function palettePresentation(context: PaletteContext): PalettePresentation {
  return { ...palettePresentations[context] }
}

export function createSettingsDraft(
  conversionMode: ConversionMode,
  gridSize: number,
  mergeDistance: number,
): SettingsDraft {
  return { conversionMode, gridSize, mergeDistance }
}

export function settingsDraftChanged(current: SettingsDraft, draft: SettingsDraft): boolean {
  return current.conversionMode !== draft.conversionMode
    || current.gridSize !== draft.gridSize
    || current.mergeDistance !== draft.mergeDistance
}

export function createReplacementMeta(
  cells: Int16Array,
  index: number,
  id: string,
  hex: string,
): ReplacementMeta {
  let count = 0
  for (const cell of cells) if (cell === index) count++
  return { index, id, hex, count }
}

export function formatReplacementResult(source: ReplacementMeta, targetId: string): string {
  return `${source.id} → ${targetId}，共替换 ${source.count} 颗`
}

export function canResizeBlankCanvas(hasSourceImage: boolean, totalBeads: number): boolean {
  return hasSourceImage || totalBeads === 0
}

export function formatFocusTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pair = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${pair(hours)}:${pair(minutes)}:${pair(secs)}` : `${pair(minutes)}:${pair(secs)}`
}
