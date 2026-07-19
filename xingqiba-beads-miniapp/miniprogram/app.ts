import { CLOUD_ENV_ID, CLOUD_FUNCTIONS } from './config/cloud'
import { cleanupPendingWorkUploads } from './utils/cloud'

App<IAppOption>({
  globalData: {
    favorites: [],
    works: 0,
    points: 0,
    phone: '',
    booking: null,
    backendReady: false,
    cloudUser: null,
  },
  onLaunch() {
    const saved = wx.getStorageSync('xingqiba-state') as Partial<IAppOption['globalData']>
    this.globalData = { ...this.globalData, ...saved }
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发')
      return
    }
    wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true })
    void this.bootstrapCloudUser()
  },
  async bootstrapCloudUser() {
    try {
      const response = await wx.cloud.callFunction({ name: CLOUD_FUNCTIONS.userBootstrap })
      const result = response.result as CloudBootstrapResult
      if (!result?.success || !result.data) throw new Error(result?.message || '用户初始化失败')
      this.globalData.backendReady = true
      this.globalData.cloudUser = result.data
      wx.setStorageSync('xingqiba-cloud-user', result.data)
      void cleanupPendingWorkUploads(result.data.id).catch((error) => console.warn('作品临时文件清理失败', error))
    } catch (error) {
      this.globalData.backendReady = false
      console.error('CloudBase 用户初始化失败，请确认云函数已部署', error)
    }
  },
})

interface CloudUser {
  id: string
  memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  phoneBound: boolean
}

interface CloudBootstrapResult {
  success: boolean
  data?: CloudUser
  message?: string
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
