/// <reference lib="webworker" />

import { convertImage } from '../engine/converter'
import type { ConvertRequest } from '../domain/types'

self.onmessage = (event: MessageEvent<ConvertRequest>) => {
  try {
    const result = convertImage(event.data)
    self.postMessage({ ok: true, result }, { transfer: [result.cells.buffer] })
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : '图片转换失败' })
  }
}
