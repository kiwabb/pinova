import { useCallback, useEffect, useRef } from 'react'
import type { BeadColor, EditorTool, PatternProject } from '../domain/types'

interface PatternCanvasProps {
  project: PatternProject
  palette: BeadColor[]
  tool: EditorTool
  selectedColor: number
  highlightedColor: number | null
  zoom: number
  onZoomChange: (zoom: number) => void
  onBeginEdit: () => void
  onCellsChange: (cells: Int16Array) => void
  onPickColor: (index: number) => void
}

export function PatternCanvas({ project, palette, tool, selectedColor, highlightedColor, zoom, onZoomChange, onBeginEdit, onCellsChange, onPickColor }: PatternCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastIndexRef = useRef(-1)
  const pinchStartRef = useRef({ dist: 0, zoom: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cellSize = project.width > 90 || project.height > 90 ? 9 : 14
    canvas.width = project.width * cellSize
    canvas.height = project.height * cellSize
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f6f6f4'
    context.fillRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < project.height; y += 1) {
      for (let x = 0; x < project.width; x += 1) {
        const value = project.cells[y * project.width + x]
        const cx = x * cellSize + cellSize / 2
        const cy = y * cellSize + cellSize / 2
        const isHighlighted = highlightedColor !== null && value === highlightedColor
        const isDimmed = highlightedColor !== null && value !== highlightedColor
        context.beginPath()
        context.arc(cx, cy, value >= 0 ? cellSize * 0.39 : Math.max(0.7, cellSize * 0.08), 0, Math.PI * 2)
        context.fillStyle = value >= 0 ? (isDimmed ? '#e8e6e8' : palette[value].hex) : '#d9d9d5'
        context.fill()
        if (value >= 0) {
          context.strokeStyle = isHighlighted ? '#c63868' : (isDimmed ? 'rgba(111, 107, 112, 0.12)' : 'rgba(37, 33, 38, 0.16)')
          context.lineWidth = isHighlighted ? Math.max(1.5, cellSize * 0.14) : Math.max(0.5, cellSize * 0.045)
          context.stroke()
        }
      }
    }
    context.strokeStyle = 'rgba(37, 33, 38, 0.13)'
    context.lineWidth = 1
    for (let x = 0; x <= project.width; x += 10) {
      context.beginPath()
      context.moveTo(x * cellSize, 0)
      context.lineTo(x * cellSize, canvas.height)
      context.stroke()
    }
    for (let y = 0; y <= project.height; y += 10) {
      context.beginPath()
      context.moveTo(0, y * cellSize)
      context.lineTo(canvas.width, y * cellSize)
      context.stroke()
    }
  }, [highlightedColor, palette, project, zoom])

  const locate = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / rect.width * project.width)
    const y = Math.floor((event.clientY - rect.top) / rect.height * project.height)
    if (x < 0 || y < 0 || x >= project.width || y >= project.height) return -1
    return y * project.width + x
  }

  const applyAt = (index: number) => {
    if (index < 0 || index === lastIndexRef.current) return
    lastIndexRef.current = index
    if (tool === 'eyedropper') {
      if (project.cells[index] >= 0) onPickColor(project.cells[index])
      return
    }
    const next = project.cells.slice()
    if (tool === 'brush') next[index] = selectedColor
    if (tool === 'eraser') next[index] = -1
    if (tool === 'fill') {
      const source = next[index]
      const replacement = selectedColor
      if (source === replacement) return
      const queue = [index]
      const visited = new Uint8Array(next.length)
      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head]
        if (visited[current] || next[current] !== source) continue
        visited[current] = 1
        next[current] = replacement
        const x = current % project.width
        const y = Math.floor(current / project.width)
        if (x > 0) queue.push(current - 1)
        if (x < project.width - 1) queue.push(current + 1)
        if (y > 0) queue.push(current - project.width)
        if (y < project.height - 1) queue.push(current + project.width)
      }
    }
    onCellsChange(next)
  }

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
    <div className="canvas-scroll" aria-label="拼豆图纸编辑区域" onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
      <canvas
        ref={canvasRef}
        className="pattern-canvas"
        style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 100}%` }}
        onPointerDown={(event) => {
          drawingRef.current = tool === 'brush' || tool === 'eraser'
          lastIndexRef.current = -1
          if (tool !== 'eyedropper') onBeginEdit()
          event.currentTarget.setPointerCapture(event.pointerId)
          applyAt(locate(event))
        }}
        onPointerMove={(event) => drawingRef.current && applyAt(locate(event))}
        onPointerUp={() => { drawingRef.current = false; lastIndexRef.current = -1 }}
        onPointerCancel={() => { drawingRef.current = false; lastIndexRef.current = -1 }}
      />
    </div>
  )
}
