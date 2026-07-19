import type { BeadColor, PatternProject } from '../domain/types'

export interface PatternRenderOptions {
  annotated?: boolean
}

export function renderPatternSheet(project: PatternProject, palette: BeadColor[], options: PatternRenderOptions = {}): HTMLCanvasElement {
  const annotated = options.annotated !== false
  const cellSize = annotated
    ? (project.width > 80 || project.height > 80 ? 18 : 26)
    : Math.max(10, Math.min(26, Math.floor(1280 / Math.max(project.width, project.height))))
  const header = annotated ? 72 : 0
  const footer = annotated ? 128 : 0
  const canvas = document.createElement('canvas')
  canvas.width = project.width * cellSize
  canvas.height = header + project.height * cellSize + footer
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (annotated) {
    context.fillStyle = '#252126'
    context.font = '600 24px system-ui'
    context.fillText(project.name, 16, 32)
    context.font = '14px system-ui'
    context.fillStyle = '#6f6b70'
    context.fillText(`${project.width} × ${project.height} · 星期八拼豆工作台`, 16, 56)
  }
  for (let y = 0; y < project.height; y += 1) {
    for (let x = 0; x < project.width; x += 1) {
      const value = project.cells[y * project.width + x]
      const left = x * cellSize
      const top = header + y * cellSize
      context.fillStyle = value >= 0 ? palette[value].hex : '#fafafa'
      context.fillRect(left, top, cellSize, cellSize)
      context.strokeStyle = (x + 1) % 10 === 0 || (y + 1) % 10 === 0 ? '#777276' : '#d9d7d9'
      context.lineWidth = (x + 1) % 10 === 0 || (y + 1) % 10 === 0 ? 1.4 : 0.6
      context.strokeRect(left, top, cellSize, cellSize)
      if (annotated && value >= 0 && cellSize >= 24) {
        context.fillStyle = getTextColor(palette[value].hex)
        context.font = '9px ui-monospace, monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(palette[value].id.replace('ST', ''), left + cellSize / 2, top + cellSize / 2)
      }
    }
  }
  if (annotated) {
    const counts = new Map<number, number>()
    project.cells.forEach((value) => value >= 0 && counts.set(value, (counts.get(value) ?? 0) + 1))
    const items = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    const y = header + project.height * cellSize + 28
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    context.font = '12px system-ui'
    items.forEach(([value, count], index) => {
      const column = index % 4
      const row = Math.floor(index / 4)
      const x = 16 + column * (canvas.width - 32) / 4
      const itemY = y + row * 30
      context.fillStyle = palette[value].hex
      context.fillRect(x, itemY - 12, 14, 14)
      context.strokeStyle = '#aaa'
      context.strokeRect(x, itemY - 12, 14, 14)
      context.fillStyle = '#39363a'
      context.fillText(`${palette[value].id} · ${count}`, x + 20, itemY)
    })
  }
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function renderPatternBlob(project: PatternProject, palette: BeadColor[], options: PatternRenderOptions = {}): Promise<Blob> {
  const canvas = renderPatternSheet(project, palette, options)
  const webp = await canvasToBlob(canvas, 'image/webp', 0.92)
  if (webp && webp.type === 'image/webp') return webp
  const png = await canvasToBlob(canvas, 'image/png')
  if (!png) throw new Error('图纸图片生成失败')
  return png
}

export function exportPatternPng(project: PatternProject, palette: BeadColor[]): void {
  const canvas = renderPatternSheet(project, palette, { annotated: true })
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name || '拼豆图纸'}.png`
    anchor.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function getTextColor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = value >> 16
  const g = (value >> 8) & 255
  const b = value & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 155 ? '#252126' : '#ffffff'
}
