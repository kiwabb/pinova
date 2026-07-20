export type ImageMode = 'pixel' | 'illustration' | 'portrait' | 'photo'

export type EditorTool = 'brush' | 'eraser' | 'eyedropper' | 'fill'

export interface RGB {
  r: number
  g: number
  b: number
}

export interface Lab {
  l: number
  a: number
  b: number
}

export interface BeadColor {
  id: string
  name: string
  hex: string
  rgb: RGB
  lab: Lab
}

export interface PatternProject {
  id: string
  name: string
  width: number
  height: number
  cells: Int16Array
  createdAt: number
  updatedAt: number
  mode: ImageMode
}

export interface ConvertSettings {
  mode: ImageMode
  width: number
  maxColors: number
  contrast: number
  dither: boolean
  removeBackground: boolean
  cleanupSize: number
}

export interface ConvertRequest {
  image: ImageData
  settings: ConvertSettings
}

export interface ConvertResult {
  width: number
  height: number
  cells: Int16Array
}
