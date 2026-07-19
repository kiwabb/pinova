import { Canvas, ScrollView, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef } from 'react'
import { studioPalette } from '../core/palette'
import type { EditorTool, PatternProject } from '../core/types'
import { PATTERN_CANVAS_ID } from '../utils/canvas'

interface PatternCanvasProps {
  project: PatternProject
  tool: EditorTool
  selectedColor: number
  viewportWidth: number
  zoom: number
  onBeginEdit: () => void
  onCellsChange: (cells: Int16Array) => void
  onPickColor: (index: number) => void
}

interface TouchLike {
  x?: number
  y?: number
  clientX?: number
  clientY?: number
}

export function PatternCanvas({
  project,
  tool,
  selectedColor,
  viewportWidth,
  zoom,
  onBeginEdit,
  onCellsChange,
  onPickColor,
}: PatternCanvasProps) {
  const drawingRef = useRef(false)
  const lastIndexRef = useRef(-1)
  const cellsRef = useRef(project.cells)
  const rectRef = useRef({ left: 0, top: 0 })
  const baseWidth = Math.max(280, viewportWidth)
  const canvasWidth = Math.round(baseWidth * zoom)
  const cellSize = canvasWidth / project.width
  const canvasHeight = Math.max(180, Math.round(cellSize * project.height))

  const refreshRect = useCallback(() => {
    Taro.createSelectorQuery()
      .select(`#${PATTERN_CANVAS_ID}`)
      .boundingClientRect((rect) => {
        if (rect && !Array.isArray(rect)) rectRef.current = { left: rect.left, top: rect.top }
      })
      .exec()
  }, [])

  useEffect(() => {
    cellsRef.current = project.cells
    const context = Taro.createCanvasContext(PATTERN_CANVAS_ID)
    context.setFillStyle('#f6f6f4')
    context.fillRect(0, 0, canvasWidth, canvasHeight)
    for (let y = 0; y < project.height; y += 1) {
      for (let x = 0; x < project.width; x += 1) {
        const value = project.cells[y * project.width + x]
        const cx = x * cellSize + cellSize / 2
        const cy = y * cellSize + cellSize / 2
        context.beginPath()
        context.arc(cx, cy, value >= 0 ? cellSize * 0.38 : Math.max(0.55, cellSize * 0.075), 0, Math.PI * 2)
        context.setFillStyle(value >= 0 ? studioPalette[value].hex : '#d9d9d5')
        context.fill()
        if (value >= 0 && cellSize >= 5) {
          context.setStrokeStyle('rgba(37,33,38,0.16)')
          context.setLineWidth(Math.max(0.4, cellSize * 0.045))
          context.stroke()
        }
      }
    }
    context.setStrokeStyle('rgba(37,33,38,0.12)')
    context.setLineWidth(0.7)
    for (let x = 0; x <= project.width; x += 10) {
      context.beginPath()
      context.moveTo(x * cellSize, 0)
      context.lineTo(x * cellSize, canvasHeight)
      context.stroke()
    }
    for (let y = 0; y <= project.height; y += 10) {
      context.beginPath()
      context.moveTo(0, y * cellSize)
      context.lineTo(canvasWidth, y * cellSize)
      context.stroke()
    }
    context.draw(false, () => refreshRect())
  }, [canvasHeight, canvasWidth, cellSize, project, refreshRect])

  const locate = (event: { touches?: TouchLike[]; changedTouches?: TouchLike[]; detail?: TouchLike }) => {
    const point = event.touches?.[0] ?? event.changedTouches?.[0] ?? event.detail
    if (!point) return -1
    const x = point.x ?? ((point.clientX ?? 0) - rectRef.current.left)
    const y = point.y ?? ((point.clientY ?? 0) - rectRef.current.top)
    const column = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    if (column < 0 || row < 0 || column >= project.width || row >= project.height) return -1
    return row * project.width + column
  }

  const applyAt = (index: number) => {
    if (index < 0 || index === lastIndexRef.current) return
    lastIndexRef.current = index
    if (tool === 'eyedropper') {
      if (cellsRef.current[index] >= 0) onPickColor(cellsRef.current[index])
      return
    }
    const next = cellsRef.current.slice()
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
    cellsRef.current = next
    onCellsChange(next)
  }

  return (
    <View className='pattern-shell'>
      <ScrollView
        className='pattern-scroll'
        scrollX
        enhanced
        showScrollbar={false}
        onScroll={() => refreshRect()}
      >
        <Canvas
          id={PATTERN_CANVAS_ID}
          canvasId={PATTERN_CANVAS_ID}
          className='pattern-canvas'
          disableScroll
          style={`width:${canvasWidth}px;height:${canvasHeight}px`}
          onTouchStart={(event) => {
            refreshRect()
            drawingRef.current = tool === 'brush' || tool === 'eraser'
            lastIndexRef.current = -1
            if (tool !== 'eyedropper') onBeginEdit()
            applyAt(locate(event))
          }}
          onTouchMove={(event) => {
            if (drawingRef.current) applyAt(locate(event))
          }}
          onTouchEnd={() => {
            drawingRef.current = false
            lastIndexRef.current = -1
          }}
          onTouchCancel={() => {
            drawingRef.current = false
            lastIndexRef.current = -1
          }}
        />
      </ScrollView>
    </View>
  )
}
