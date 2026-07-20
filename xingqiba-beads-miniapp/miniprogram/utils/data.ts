export interface Collection {
  id: string
  title: string
  category: string
  count: number
  description: string
  background: string
  images: string[]
  items: string[]
  level: '公开' | 'V1' | 'V2' | 'V3' | 'V4'
  locked?: boolean
}

export const categories = ['全部', '精选', '武汉', '情侣', '亲子', '学生', '节日', '其他']
export const memberLevels = ['全部', '公开', 'V1', 'V2', 'V3', 'V4']
