function assertGridShape(cells: Int16Array, width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || cells.length !== width * height) {
    throw new RangeError('网格尺寸与数据长度不一致')
  }
}

export function replaceGridColor(cells: Int16Array, source: number, target: number): Int16Array {
  const result = cells.slice()
  if (source < 0 || target < 0 || source === target) return result
  for (let index = 0; index < result.length; index++) {
    if (result[index] === source) result[index] = target
  }
  return result
}

export function mirrorGridHorizontal(cells: Int16Array, width: number, height: number): Int16Array {
  assertGridShape(cells, width, height)
  const result = new Int16Array(cells.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) result[y * width + (width - 1 - x)] = cells[y * width + x]
  }
  return result
}

export function usedGridColors(cells: Int16Array): number[] {
  return [...new Set(Array.from(cells).filter(color => color >= 0))].sort((a, b) => a - b)
}
