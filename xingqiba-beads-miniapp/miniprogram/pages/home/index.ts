import { CLOUD_FUNCTIONS } from '../../config/cloud'
import type { Collection } from '../../utils/data'

interface FeaturedCollection extends Collection {
  meta: string
}

Page({
  data: {
    featured: [] as FeaturedCollection[],
    featuredSkeletons: [1, 2, 3],
    featuredLoading: true,
    featuredError: '',
  },
  onLoad() { void this.loadFeatured() },
  onShow() {
    this.getTabBar()?.setData({ selected: 0, hidden: false })
  },
  onPullDownRefresh() {
    void this.loadFeatured().finally(() => wx.stopPullDownRefresh())
  },
  async loadFeatured() {
    this.setData({ featuredLoading: true, featuredError: '' })
    try {
      const response = await wx.cloud.callFunction({ name: CLOUD_FUNCTIONS.galleryService, data: { action: 'listCollections', pageSize: 3 } })
      const result = response.result as { success: boolean; data?: { collections: Collection[] }; message?: string }
      if (!result?.success || !result.data) throw new Error(result?.message || '精选图集加载失败')
      const featured = result.data.collections.slice(0, 3).map((item) => ({
        ...item,
        meta: item.level === '公开' ? `${item.count} 张图纸` : `${item.level} 专属 · ${item.count} 张`,
      }))
      this.setData({ featured, featuredLoading: false })
    } catch (error) {
      console.error('首页精选图集加载失败', error)
      this.setData({ featured: [], featuredLoading: false, featuredError: error instanceof Error ? error.message : '精选图集加载失败' })
    }
  },
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: ({ tempFiles }) => {
        const file = tempFiles[0]
        if (!file?.tempFilePath) return wx.showToast({ title: '未读取到照片，请重新选择', icon: 'none' })
        if (Number(file.size) > 20 * 1024 * 1024) return wx.showToast({ title: '照片不能超过 20MB', icon: 'none' })
        wx.navigateTo({ url: `/pages/editor/index?image=${encodeURIComponent(file.tempFilePath)}` })
      },
      fail: ({ errMsg }) => {
        if (!errMsg.toLowerCase().includes('cancel')) wx.showToast({ title: '照片选择失败，请重试', icon: 'none' })
      },
    })
  },
  openEditor() { wx.navigateTo({ url: '/pages/editor/index' }) },
  openTutorial() { wx.navigateTo({ url: '/pages/tutorial/index' }) },
  openStore() { wx.switchTab({ url: '/pages/store/index' }) },
  openGallery() { wx.switchTab({ url: '/pages/gallery/index' }) },
  openCollection(event: WechatMiniprogram.TouchEvent) {
    const collection = this.data.featured.find((item) => item.id === event.currentTarget.dataset.id)
    if (!collection) return
    wx.navigateTo({ url: `/pages/collection/index?id=${collection.id}` })
  },
  onShareAppMessage() {
    return { title: '把照片变成拼豆图纸', path: '/pages/home/index', imageUrl: '/assets/reference/hero-beads.jpg' }
  },
})
