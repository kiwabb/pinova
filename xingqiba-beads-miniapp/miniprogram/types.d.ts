declare namespace WechatMiniprogram {
  interface CustomTabBar {
    setData(data: Record<string, unknown>): void
  }
}

interface CloudUser {
  id: string
  memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  phoneBound: boolean
}

interface IAppOption {
  bootstrapCloudUser(): Promise<void>
  globalData: {
    favorites: string[]
    works: number
    points: number
    phone: string
    booking: { date: string; type: string; time: string } | null
    backendReady: boolean
    cloudUser: CloudUser | null
  }
}
