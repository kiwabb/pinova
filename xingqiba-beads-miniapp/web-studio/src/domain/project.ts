import type { ImageMode, PatternProject } from './types'
import { legacyToStudioIndex } from './palette'

const STORAGE_KEY = 'xingqiba-pingdou-project-v2'
const LEGACY_STORAGE_KEY = 'xingqiba-pingdou-project-v1'

export function createSampleProject(): PatternProject {
  const width = 36
  const height = 36
  const cells = new Int16Array(width * height).fill(-1)
  const setEllipse = (cx: number, cy: number, rx: number, ry: number, color: number) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) cells[y * width + x] = color
      }
    }
  }
  setEllipse(18, 24, 11, 9, legacyToStudioIndex[16])
  setEllipse(8, 12, 4, 5, legacyToStudioIndex[18])
  setEllipse(15, 8, 4, 5, legacyToStudioIndex[16])
  setEllipse(22, 8, 4, 5, legacyToStudioIndex[16])
  setEllipse(29, 12, 4, 5, legacyToStudioIndex[18])
  return {
    id: crypto.randomUUID(),
    name: '第一张图纸',
    width,
    height,
    cells,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode: 'illustration',
  }
}

export function loadProject(): PatternProject {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    const raw = current ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return createSampleProject()
    const parsed = JSON.parse(raw) as Omit<PatternProject, 'cells'> & { cells: number[]; mode: ImageMode }
    if (!parsed.width || !parsed.height || parsed.cells.length !== parsed.width * parsed.height) return createSampleProject()
    const cells = current
      ? Int16Array.from(parsed.cells)
      : Int16Array.from(parsed.cells, (cell) => cell < 0 ? -1 : legacyToStudioIndex[cell] ?? -1)
    return { ...parsed, cells }
  } catch {
    return createSampleProject()
  }
}

export function saveProject(project: PatternProject): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, cells: Array.from(project.cells) }))
}
