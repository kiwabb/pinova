import { useCallback, useEffect, useRef } from 'react'
import type { BeadColor, PatternProject } from '../domain/types'

interface ChartViewProps {
  project: PatternProject
  palette: BeadColor[]
  highlightedColor: number | null
  zoom: number
  onZoomChange: (zoom: number) => void
}

function getTextColor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = value >> 16
  const g = (value >> 8) & 255
  const b = value & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 145 ? '#252126' : '#ffffff'
}

export function ChartView({ project, palette, highlightedColor, zoom, onZoomChange }: ChartViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pinchStartRef = useRef({ dist: 0, zoom: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cellSize = project.width > 90 || project.height > 90 ? 18 : 26
    const header = 56
    const canvasWidth = project.width * cellSize
    const canvasHeight = header + project.height * cellSize
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#252126'
    ctx.font = '600 20px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(project.name, 12, 30)
    ctx.font = '12px system-ui'
    ctx.fillStyle = '#6f6b70'
    const highlightLabel = highlightedColor === null ? '' : ` · 高亮 ${palette[highlightedColor].id}`
    ctx.fillText(`${project.width} × ${project.height} 格 · ${new Set(project.cells.filter((c) => c >= 0)).size} 色${highlightLabel}`, 12, 49)

    for (let y = 0; y < project.height; y += 1) {
      for (let x = 0; x < project.width; x += 1) {
        const value = project.cells[y * project.width + x]
        const left = x * cellSize
        const top = header + y * cellSize
        const isHighlighted = highlightedColor !== null && value === highlightedColor
        const isDimmed = highlightedColor !== null && value !== highlightedColor
        ctx.fillStyle = value >= 0 ? (isDimmed ? '#f1eff1' : palette[value].hex) : '#fafafa'
        ctx.fillRect(left + 0.5, top + 0.5, cellSize - 1, cellSize - 1)
        ctx.strokeStyle = isHighlighted ? '#c63868' : '#e0dde0'
        ctx.lineWidth = isHighlighted ? 2.4 : 0.5
        ctx.strokeRect(left + 0.5, top + 0.5, cellSize - 1, cellSize - 1)
        if (value >= 0) {
          ctx.fillStyle = isDimmed ? '#b5b1b6' : getTextColor(palette[value].hex)
          ctx.font = cellSize >= 24 ? '9px ui-monospace, monospace' : '7px ui-monospace, monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const label = palette[value].id.replace('ST', '')
          ctx.fillText(label, left + cellSize / 2, top + cellSize / 2)
        }
      }
    }

    const drawGuide = (position: number, vertical: boolean) => {
      const isTenCellGuide = position % 10 === 0
      ctx.beginPath()
      ctx.setLineDash(isTenCellGuide ? [] : [4, 3])
      ctx.strokeStyle = isTenCellGuide ? 'rgba(72, 68, 74, 0.68)' : 'rgba(92, 87, 94, 0.56)'
      ctx.lineWidth = isTenCellGuide ? 1.4 : 1
      if (vertical) {
        const left = position * cellSize
        ctx.moveTo(left, header)
        ctx.lineTo(left, canvasHeight)
      } else {
        const top = header + position * cellSize
        ctx.moveTo(0, top)
        ctx.lineTo(canvasWidth, top)
      }
      ctx.stroke()
    }

    ctx.save()
    for (let x = 5; x < project.width; x += 5) drawGuide(x, true)
    for (let y = 5; y < project.height; y += 5) drawGuide(y, false)
    ctx.restore()
  }, [highlightedColor, project, palette])

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      const delta = -event.deltaY * 0.005
      onZoomChange(Math.max(0.5, Math.min(3, zoom + delta)))
    }
  }, [zoom, onZoomChange])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      const dx = event.touches[1].clientX - event.touches[0].clientX
      const dy = event.touches[1].clientY - event.touches[0].clientY
      pinchStartRef.current = { dist: Math.hypot(dx, dy), zoom }
    }
  }, [zoom])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 2 && pinchStartRef.current.dist > 0) {
      const dx = event.touches[1].clientX - event.touches[0].clientX
      const dy = event.touches[1].clientY - event.touches[0].clientY
      const dist = Math.hypot(dx, dy)
      const newZoom = pinchStartRef.current.zoom * (dist / pinchStartRef.current.dist)
      onZoomChange(Math.max(0.5, Math.min(3, newZoom)))
    }
  }, [onZoomChange])

  const handleTouchEnd = useCallback(() => {
    pinchStartRef.current = { dist: 0, zoom: 1 }
  }, [])

  return (
    <div className="canvas-scroll" aria-label="方格色号图纸" onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
      <canvas
        ref={canvasRef}
        className="pattern-canvas"
        style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 100}%` }}
      />
    </div>
  )
}
