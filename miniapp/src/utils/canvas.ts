import Taro from '@tarojs/taro'
import type { RasterImage } from '../core/types'

export const SOURCE_CANVAS_ID = 'source-canvas'
export const PATTERN_CANVAS_ID = 'pattern-canvas'
export const MELT_CANVAS_ID = 'melt-canvas'

export async function readImageRaster(
  path: string,
  naturalWidth: number,
  naturalHeight: number,
): Promise<RasterImage> {
  const maxSide = 720
  const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  const context = Taro.createCanvasContext(SOURCE_CANVAS_ID)

  return new Promise((resolve, reject) => {
    try {
      context.clearRect(0, 0, width, height)
      context.drawImage(path, 0, 0, width, height)
      context.draw(false, async () => {
        try {
          const result = await Taro.canvasGetImageData({
            canvasId: SOURCE_CANVAS_ID,
            x: 0,
            y: 0,
            width,
            height,
          })
          resolve({ width, height, data: new Uint8ClampedArray(result.data) })
        } catch (error) {
          reject(error)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

export async function saveCanvasToAlbum(canvasId: string, width: number, height: number): Promise<void> {
  const file = await Taro.canvasToTempFilePath({
    canvasId,
    fileType: 'png',
    quality: 1,
    destWidth: Math.max(width, 720),
    destHeight: Math.max(height, 720 * height / Math.max(1, width)),
  })
  await Taro.saveImageToPhotosAlbum({ filePath: file.tempFilePath })
}
