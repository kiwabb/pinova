import type { ImageMode, PatternProject, PatternStats } from './types'

export const PROJECT_STORAGE_KEY = 'xingqiba-pingdou-mini-project-v1'

function makeId(): string {
  return `mini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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
  setEllipse(18, 24, 11, 9, 16)
  setEllipse(8, 12, 4, 5, 18)
  setEllipse(15, 8, 4, 5, 16)
  setEllipse(22, 8, 4, 5, 16)
  setEllipse(29, 12, 4, 5, 18)
  const now = Date.now()
  return {
    id: makeId(),
    name: '第一张图纸',
    width,
    height,
    cells,
    createdAt: now,
    updatedAt: now,
    mode: 'illustration',
  }
}

export function createProject(
  name: string,
  width: number,
  height: number,
  cells: Int16Array,
  mode: ImageMode,
): PatternProject {
  const now = Date.now()
  return {
    id: makeId(),
    name,
    width,
    height,
    cells,
    createdAt: now,
    updatedAt: now,
    mode,
  }
}

export function getPatternStats(project: PatternProject): PatternStats {
  const counts = new Map<number, number>()
  let total = 0
  project.cells.forEach((value) => {
    if (value < 0) return
    total += 1
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })
  return {
    total,
    colors: [...counts.entries()].sort((a, b) => b[1] - a[1]),
    boards: Math.ceil(project.width / 29) * Math.ceil(project.height / 29),
    physicalWidth: project.width * 0.5,
    physicalHeight: project.height * 0.5,
  }
}

export function serializeProject(project: PatternProject) {
  return { ...project, cells: Array.from(project.cells) }
}

export function parseProject(value: unknown): PatternProject | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Omit<PatternProject, 'cells'> & { cells?: number[] }
  if (!parsed.width || !parsed.height || !Array.isArray(parsed.cells)) return null
  if (parsed.cells.length !== parsed.width * parsed.height) return null
  return { ...parsed, cells: Int16Array.from(parsed.cells) }
}
