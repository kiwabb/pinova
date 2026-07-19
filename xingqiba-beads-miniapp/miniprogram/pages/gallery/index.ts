import { categories as defaultCategories, memberLevels, Collection } from '../../utils/data'
import { CLOUD_FUNCTIONS } from '../../config/cloud'

const levelRank: Record<string, number> = { '公开': 0, V1: 1, V2: 2, V3: 3, V4: 4 }

Page({
  data: { categories: defaultCategories, memberLevels, active: '精选', activeLevel: '全部', keyword: '', memberRank: 0, loading: true, loadingMore: false, loadError: '', nextCursor: '', hasMore: false, total: 0, allCollections: [] as Collection[], list: [] as Collection[] },
  requestSerial: 0,
  searchTimer: 0,
  onShow() {
    this.getTabBar()?.setData({ selected: 1, hidden: false })
    void this.loadCollections(true)
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) void this.loadCollections(false)
  },
  onUnload() { if (this.searchTimer) clearTimeout(this.searchTimer) },
  loadMore() { void this.loadCollections(false) },
  async loadCollections(reset = true) {
    if (!reset && (!this.data.hasMore || this.data.loadingMore)) return
    const requestSerial = ++this.requestSerial
    this.setData(reset ? { loading: true, loadError: '', nextCursor: '', hasMore: false } : { loadingMore: true, loadError: '' })
    try {
      const response = await wx.cloud.callFunction({ name: CLOUD_FUNCTIONS.galleryService, data: {
        action: 'listCollections',
        cursor: reset ? '' : this.data.nextCursor,
        pageSize: 20,
        category: this.data.active === '精选' ? '' : this.data.active,
        level: this.data.activeLevel === '全部' ? '' : this.data.activeLevel,
        keyword: this.data.keyword,
      } })
      if (requestSerial !== this.requestSerial) return
      const result = response.result as { success: boolean; data?: { memberLevel: string; collections: Collection[]; nextCursor: string; hasMore: boolean; total: number }; message?: string }
      if (!result?.success || !result.data) throw new Error(result?.message || '图集加载失败')
      const memberRank = result.data.memberLevel === 'PUBLIC' ? 0 : (levelRank[result.data.memberLevel] || 0)
      const allCollections = reset ? result.data.collections : [...this.data.allCollections, ...result.data.collections.filter((item) => !this.data.allCollections.some((existing) => existing.id === item.id))]
      this.setData({ allCollections, list: allCollections, memberRank, nextCursor: result.data.nextCursor, hasMore: result.data.hasMore, total: result.data.total, loading: false, loadingMore: false })
    } catch (error) {
      if (requestSerial !== this.requestSerial) return
      console.error('云端图集加载失败', error)
      const message = error instanceof Error ? error.message : '图集加载失败'
      if (reset) this.setData({ allCollections: [], list: [], loadError: message, loading: false })
      else wx.showToast({ title: message, icon: 'none' })
      this.setData({ loadingMore: false })
    } finally {
      if (requestSerial === this.requestSerial) this.setData({ loading: false, loadingMore: false })
    }
  },
  selectLevel(event: WechatMiniprogram.TouchEvent) {
    this.setData({ activeLevel: event.currentTarget.dataset.value }, () => void this.loadCollections(true))
  },
  selectCategory(event: WechatMiniprogram.TouchEvent) {
    this.setData({ active: event.currentTarget.dataset.value }, () => void this.loadCollections(true))
  },
  search(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value.trim() })
    if (this.searchTimer) clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => void this.loadCollections(true), 280)
  },
  openCollection(event: WechatMiniprogram.TouchEvent) {
    const collection = this.data.allCollections.find((item) => item.id === event.currentTarget.dataset.id)
    if (!collection) return
    if (collection.locked || levelRank[collection.level] > this.data.memberRank) {
      wx.showModal({
        title: `需要 ${collection.level} 会员`,
        content: `该系列为 ${collection.level} 专属图纸，可前往会员中心查看升级方式。`,
        confirmText: '查看会员',
        confirmColor: '#C42D5D',
        success: ({ confirm }) => { if (confirm) wx.navigateTo({ url: '/pages/member/index' }) },
      })
      return
    }
    wx.navigateTo({ url: `/pages/collection/index?id=${collection.id}` })
  },
})
