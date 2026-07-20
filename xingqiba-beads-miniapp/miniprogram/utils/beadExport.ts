/**
 * 拼豆图纸 PNG 导出（带图例）。
 * 从 web-studio/src/engine/export.ts 移植，适配小程序 Canvas 2D API。
 */

import type { BeadColor } from './mardPalette'

function getTextColor(hex: string): string {
  const value = parseInt(hex.slice(1), 16)
  const r = value >> 16, g = (value >> 8) & 0xff, b = value & 0xff
  return r * 0.299 + g * 0.587 + b * 0.114 > 155 ? '#252126' : '#ffffff'
}

function drawRoundedRect(
  ctx: any,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.arcTo(x + w, y, x + w, y + radius, radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  ctx.lineTo(x + radius, y + h)
  ctx.arcTo(x, y + h, x, y + h - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

function loadCanvasImage(canvas: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('品牌图片加载失败'))
    image.src = src
  })
}

/**
 * 生成带图例的 PNG 图纸，返回临时文件路径。
 * @param grid 一维 Int16Array，-1 = 空格，0..n = 色板索引
 */
export async function exportPatternPng(
  grid: Int16Array,
  palette: BeadColor[],
  name: string,
  gridWidth: number,
  gridHeight: number,
): Promise<string> {
  const cellSize = gridWidth > 80 || gridHeight > 80 ? 18 : 26
  const headerH = 72

  // 统计用量
  const counts = new Map<number, number>()
  for (const v of grid) if (v >= 0) counts.set(v, (counts.get(v) ?? 0) + 1)
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1])

  const canvasW = gridWidth * cellSize
  const gridH = headerH + gridHeight * cellSize
  const legendCols = canvasW >= 1600 ? 5 : canvasW >= 1100 ? 4 : canvasW >= 700 ? 3 : canvasW >= 480 ? 2 : 1
  const legendRows = Math.max(1, Math.ceil(items.length / legendCols))
  const legendRowH = 56
  const footer = 112 + legendRows * legendRowH
  const canvasH = gridH + footer

  // 小程序离屏 canvas
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: canvasW, height: canvasH })
  const ctx = canvas.getContext('2d') as any
  const brandMark = await loadCanvasImage(canvas, '/assets/brand/day8-mark-mono.png').catch(() => null)

  // 背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 头部
  ctx.fillStyle = '#252126'
  ctx.font = '600 24px sans-serif'
  ctx.fillText(name, 16, 32)
  ctx.font = '14px sans-serif'
  ctx.fillStyle = '#6f6b70'
  ctx.fillText(`${gridWidth} × ${gridHeight} · 拼豆图纸`, 16, 56)

  if (canvasW >= 320) {
    if (brandMark) {
      ctx.drawImage(brandMark, canvasW - 58, 15, 42, 42)
    } else {
      ctx.save()
      ctx.fillStyle = '#c42d5d'
      ctx.font = '700 14px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('Day 8', canvasW - 16, 35)
      ctx.restore()
    }
  }

  // 网格
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const v = grid[y * gridWidth + x]
      const left = x * cellSize
      const top = headerH + y * cellSize
      ctx.fillStyle = v >= 0 ? palette[v].hex : '#fafafa'
      ctx.fillRect(left, top, cellSize, cellSize)
      ctx.strokeStyle = '#d9d7d9'
      ctx.lineWidth = 0.6
      ctx.strokeRect(left, top, cellSize, cellSize)
      if (v >= 0 && cellSize >= 24) {
        ctx.fillStyle = getTextColor(palette[v].hex)
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(palette[v].id.replace('ST', ''), left + cellSize / 2, top + cellSize / 2)
      }
    }
  }

  // 参考线（5格虚线，10格实线）
  ctx.save()
  const drawGuide = (pos: number, vertical: boolean) => {
    const is10 = pos % 10 === 0
    ctx.beginPath()
    ctx.setLineDash(is10 ? [] : [4, 3])
    ctx.strokeStyle = is10 ? 'rgba(72,68,74,0.68)' : 'rgba(92,87,94,0.56)'
    ctx.lineWidth = is10 ? 1.4 : 1
    if (vertical) {
      const lx = pos * cellSize
      ctx.moveTo(lx, headerH); ctx.lineTo(lx, gridH)
    } else {
      const ty = headerH + pos * cellSize
      ctx.moveTo(0, ty); ctx.lineTo(canvasW, ty)
    }
    ctx.stroke()
  }
  for (let x = 5; x < gridWidth; x += 5) drawGuide(x, true)
  for (let y = 5; y < gridHeight; y += 5) drawGuide(y, false)
  ctx.restore()

  // 图例区域
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#252126'
  ctx.font = '700 24px sans-serif'
  ctx.fillText(`颜色图例 · ${items.length} 色`, 18, gridH + 40)
  ctx.strokeStyle = '#d8d5d8'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(18, gridH + 58)
  ctx.lineTo(canvasW - 18, gridH + 58)
  ctx.stroke()

  const colW = (canvasW - 36) / legendCols
  items.forEach(([value, count], i) => {
    const col = i % legendCols
    const row = Math.floor(i / legendCols)
    const lx = 18 + col * colW
    const ly = gridH + 88 + row * legendRowH

    ctx.fillStyle = palette[value].hex
    drawRoundedRect(ctx, lx, ly - 17, 34, 34, 7)
    ctx.fill()
    ctx.strokeStyle = '#918d92'
    ctx.lineWidth = 1.2
    drawRoundedRect(ctx, lx, ly - 17, 34, 34, 7)
    ctx.stroke()

    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#2f2c30'
    ctx.font = '700 22px sans-serif'
    ctx.fillText(palette[value].id, lx + 46, ly)
    const idW = ctx.measureText(palette[value].id).width
    ctx.fillStyle = '#656166'
    ctx.font = '19px sans-serif'
    ctx.fillText(`${count.toLocaleString()} 颗`, lx + 60 + idW, ly)
  })

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#8a858b'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Day 8 星期八拼豆工作台', canvasW / 2, canvasH - 20)

  // 导出为临时文件
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'png',
      quality: 1,
      success: (res) => resolve(res.tempFilePath),
      fail: () => reject(new Error('图纸导出失败')),
    })
  })
}
