import type { BeadColor, PatternProject } from '../domain/types'

export interface PatternRenderOptions {
  annotated?: boolean
}

export function renderPatternSheet(
  project: PatternProject,
  palette: BeadColor[],
  options: PatternRenderOptions = {},
): HTMLCanvasElement {
  const annotated = options.annotated !== false
  const cellSize = annotated
    ? (project.width > 80 || project.height > 80 ? 18 : 26)
    : Math.max(10, Math.min(26, Math.floor(1280 / Math.max(project.width, project.height))))
  const header = annotated ? 72 : 0
  const canvas = document.createElement('canvas')
  canvas.width = project.width * cellSize
  canvas.height = header + project.height * cellSize
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (annotated) {
    context.fillStyle = '#252126'
    context.font = '600 24px system-ui'
    context.fillText(project.name, 16, 32)
    context.font = '14px system-ui'
    context.fillStyle = '#6f6b70'
    context.fillText(`${project.width} x ${project.height} - Day 8`, 16, 56)
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
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function renderPatternBlob(
  project: PatternProject,
  palette: BeadColor[],
  options: PatternRenderOptions = {},
): Promise<Blob> {
  const canvas = renderPatternSheet(project, palette, options)
  const webp = await canvasToBlob(canvas, 'image/webp', 0.92)
  if (webp?.type === 'image/webp') return webp
  const png = await canvasToBlob(canvas, 'image/png')
  if (!png) throw new Error('图纸图片生成失败')
  return png
}

export function exportPatternPng(project: PatternProject, palette: BeadColor[]): void {
  const cellSize = project.width > 80 || project.height > 80 ? 18 : 26
  const header = 72
  const counts = new Map<number, number>()
  project.cells.forEach((value) => value >= 0 && counts.set(value, (counts.get(value) ?? 0) + 1))
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const canvasWidth = project.width * cellSize
  const legendColumns = canvasWidth >= 1600 ? 5 : canvasWidth >= 1100 ? 4 : canvasWidth >= 700 ? 3 : canvasWidth >= 480 ? 2 : 1
  const legendRows = Math.max(1, Math.ceil(items.length / legendColumns))
  const legendRowHeight = 56
  const footer = 112 + legendRows * legendRowHeight
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = header + project.height * cellSize + footer
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#252126'
  context.font = '600 24px system-ui'
  context.fillText(project.name, 16, 32)
  context.font = '14px system-ui'
  context.fillStyle = '#6f6b70'
  context.fillText(`${project.width} × ${project.height} · 星期八拼豆工作台`, 16, 56)
  for (let y = 0; y < project.height; y += 1) {
    for (let x = 0; x < project.width; x += 1) {
      const value = project.cells[y * project.width + x]
      const left = x * cellSize
      const top = header + y * cellSize
      context.fillStyle = value >= 0 ? palette[value].hex : '#fafafa'
      context.fillRect(left, top, cellSize, cellSize)
      context.strokeStyle = '#d9d7d9'
      context.lineWidth = 0.6
      context.strokeRect(left, top, cellSize, cellSize)
      if (value >= 0 && cellSize >= 24) {
        context.fillStyle = getTextColor(palette[value].hex)
        context.font = '9px ui-monospace, monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(palette[value].id.replace('ST', ''), left + cellSize / 2, top + cellSize / 2)
      }
    }
  }

  const boardBottom = header + project.height * cellSize
  const drawGuide = (position: number, vertical: boolean) => {
    const isTenCellGuide = position % 10 === 0
    context.beginPath()
    context.setLineDash(isTenCellGuide ? [] : [4, 3])
    context.strokeStyle = isTenCellGuide ? 'rgba(72, 68, 74, 0.68)' : 'rgba(92, 87, 94, 0.56)'
    context.lineWidth = isTenCellGuide ? 1.4 : 1
    if (vertical) {
      const left = position * cellSize
      context.moveTo(left, header)
      context.lineTo(left, boardBottom)
    } else {
      const top = header + position * cellSize
      context.moveTo(0, top)
      context.lineTo(canvas.width, top)
    }
    context.stroke()
  }
  context.save()
  for (let x = 5; x < project.width; x += 5) drawGuide(x, true)
  for (let y = 5; y < project.height; y += 5) drawGuide(y, false)
  context.restore()

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = '#252126'
  context.font = '700 24px system-ui'
  context.fillText(`颜色图例 · ${items.length} 色`, 18, boardBottom + 40)
  context.strokeStyle = '#d8d5d8'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(18, boardBottom + 58)
  context.lineTo(canvas.width - 18, boardBottom + 58)
  context.stroke()

  const columnWidth = (canvas.width - 36) / legendColumns
  items.forEach(([value, count], index) => {
    const column = index % legendColumns
    const row = Math.floor(index / legendColumns)
    const x = 18 + column * columnWidth
    const itemY = boardBottom + 88 + row * legendRowHeight
    context.fillStyle = palette[value].hex
    drawRoundedRect(context, x, itemY - 17, 34, 34, 7)
    context.fill()
    context.strokeStyle = '#918d92'
    context.lineWidth = 1.2
    drawRoundedRect(context, x, itemY - 17, 34, 34, 7)
    context.stroke()
    context.textBaseline = 'middle'
    context.fillStyle = '#2f2c30'
    context.font = '700 22px system-ui'
    context.fillText(palette[value].id, x + 46, itemY)
    const idWidth = context.measureText(palette[value].id).width
    context.fillStyle = '#656166'
    context.font = '19px system-ui'
    context.fillText(`${count.toLocaleString()} 颗`, x + 60 + idWidth, itemY)
  })
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

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius)
  context.lineTo(x + safeRadius, y + height)
  context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius)
  context.lineTo(x, y + safeRadius)
  context.arcTo(x, y, x + safeRadius, y, safeRadius)
  context.closePath()
}

function getTextColor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = value >> 16
  const g = (value >> 8) & 255
  const b = value & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 155 ? '#252126' : '#ffffff'
}
