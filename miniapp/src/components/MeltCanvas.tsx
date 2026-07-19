import { Canvas, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'
import { studioPalette } from '../core/palette'
import type { PatternProject } from '../core/types'
import { MELT_CANVAS_ID } from '../utils/canvas'

interface MeltCanvasProps {
  project: PatternProject
  width: number
  melt: number
}

export function MeltCanvas({ project, width, melt }: MeltCanvasProps) {
  const cellSize = width / project.width
  const height = Math.max(180, Math.round(cellSize * project.height))

  useEffect(() => {
    const context = Taro.createCanvasContext(MELT_CANVAS_ID)
    context.setFillStyle('#eeeeec')
    context.fillRect(0, 0, width, height)
    const bridgeWidth = cellSize * Math.max(0, 0.16 + melt * 0.42)

    if (melt > 0.08) {
      context.setLineCap('round')
      context.setLineWidth(bridgeWidth)
      for (let y = 0; y < project.height; y += 1) {
        for (let x = 0; x < project.width; x += 1) {
          const index = y * project.width + x
          const value = project.cells[index]
          if (value < 0) continue
          const cx = x * cellSize + cellSize / 2
          const cy = y * cellSize + cellSize / 2
          if (x < project.width - 1 && project.cells[index + 1] >= 0) {
            const middle = cx + cellSize / 2
            context.setStrokeStyle(studioPalette[value].hex)
            context.beginPath()
            context.moveTo(cx, cy)
            context.lineTo(middle, cy)
            context.stroke()
            context.setStrokeStyle(studioPalette[project.cells[index + 1]].hex)
            context.beginPath()
            context.moveTo(middle, cy)
            context.lineTo(cx + cellSize, cy)
            context.stroke()
          }
          if (y < project.height - 1 && project.cells[index + project.width] >= 0) {
            const middle = cy + cellSize / 2
            context.setStrokeStyle(studioPalette[value].hex)
            context.beginPath()
            context.moveTo(cx, cy)
            context.lineTo(cx, middle)
            context.stroke()
            context.setStrokeStyle(studioPalette[project.cells[index + project.width]].hex)
            context.beginPath()
            context.moveTo(cx, middle)
            context.lineTo(cx, cy + cellSize)
            context.stroke()
          }
        }
      }
    }

    const radius = cellSize * (0.36 + 0.13 * melt)
    const holeRadius = Math.max(0.38, cellSize * 0.18 * (1 - melt * 0.78))
    for (let y = 0; y < project.height; y += 1) {
      for (let x = 0; x < project.width; x += 1) {
        const value = project.cells[y * project.width + x]
        if (value < 0) continue
        const cx = x * cellSize + cellSize / 2
        const cy = y * cellSize + cellSize / 2
        context.beginPath()
        context.arc(cx, cy, radius, 0, Math.PI * 2)
        context.setFillStyle(studioPalette[value].hex)
        context.fill()
        context.beginPath()
        context.arc(cx, cy, holeRadius, 0, Math.PI * 2)
        context.setFillStyle('#f0f0ed')
        context.fill()
      }
    }
    context.draw()
  }, [height, melt, project, width])

  return (
    <View className='melt-canvas-shell'>
      <Canvas
        id={MELT_CANVAS_ID}
        canvasId={MELT_CANVAS_ID}
        className='melt-canvas'
        style={`width:${width}px;height:${height}px`}
      />
    </View>
  )
}
