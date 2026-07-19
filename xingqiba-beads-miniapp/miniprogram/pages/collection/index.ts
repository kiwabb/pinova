import { Collection } from '../../utils/data'
import { CLOUD_FUNCTIONS } from '../../config/cloud'
import { callUserService } from '../../utils/cloud'

interface PatternItem { id: string; name: string; image: string; level: string }

Page({
  data: {
    collection: null as Collection | null,
    items: [] as PatternItem[],
    loading: true,
    loadError: '',
    sortAscending: true,
    sortApplied: false,
    favoriteIds: {} as Record<string, boolean>,
    favoriteBusyIds: {} as Record<string, boolean>,
  },
  collectionId: '',
  onLoad(options: Record<string, string>) {
    this.collectionId = options.id || ''
    if (!this.collectionId) {
      this.setData({ loading: false, loadError: '缺少图集信息' })
      return
    }
    void this.loadCollection(this.collectionId)
  },
  async loadCollection(id: string) {
    this.setData({ loading: true, loadError: '' })
    try {
      const response = await wx.cloud.callFunction({ name: CLOUD_FUNCTIONS.galleryService, data: { action: 'getCollection', collectionId: id } })
      const result = response.result as { success: boolean; data?: { collection: Collection; patterns: PatternItem[] }; code?: string; requiredLevel?: string; message?: string }
      if (!result?.success || !result.data) {
        if (result?.code === 'MEMBER_LEVEL_REQUIRED') {
          this.setData({ loading: false })
          wx.showModal({
            title: `需要 ${result.requiredLevel} 会员`,
            content: '当前等级无法打开该系列，可前往会员中心查看升级方式。',
            confirmText: '查看会员',
            confirmColor: '#C42D5D',
            success: ({ confirm }) => confirm ? wx.redirectTo({ url: '/pages/member/index' }) : wx.navigateBack(),
          })
          return
        }
        throw new Error(result?.message || '图集加载失败')
      }
      this.setData({ collection: result.data.collection, items: result.data.patterns, loading: false })
      wx.setNavigationBarTitle({ title: result.data.collection.title })
      void this.loadFavoriteIds(result.data.collection.id)
    } catch (error) {
      console.error('云端系列加载失败', error)
      this.setData({ collection: null, items: [], loading: false, loadError: error instanceof Error ? error.message : '系列加载失败' })
    }
  },
  retry() { void this.loadCollection(this.collectionId) },
  async loadFavoriteIds(collectionId: string) {
    try {
      const ids = await callUserService<string[]>('getFavoriteIds', { collectionId })
      this.setData({ favoriteIds: Object.fromEntries(ids.map((id) => [id, true])) })
    } catch (error) {
      console.error('收藏状态加载失败', error)
    }
  },
  openPattern(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const pattern = this.data.items[index]
    const collection = this.data.collection
    if (!pattern || !collection) return
    wx.navigateTo({
      url: `/pages/editor/index?sourcePatternId=${encodeURIComponent(pattern.id || '')}&sourceCollectionId=${encodeURIComponent(collection.id)}&sourceImage=${encodeURIComponent(pattern.image)}&title=${encodeURIComponent(pattern.name)}`,
    })
  },
  async toggleFavorite(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const pattern = this.data.items[index]
    const collection = this.data.collection
    const patternId = pattern?.id || ''
    if (!patternId || !collection || this.data.favoriteBusyIds[patternId]) return
    this.setData({ favoriteBusyIds: { ...this.data.favoriteBusyIds, [patternId]: true } })
    try {
      const result = await callUserService<{ favorite: boolean }>('toggleFavorite', {
        collectionId: collection.id,
        patternId,
      })
      this.setData({ favoriteIds: { ...this.data.favoriteIds, [patternId]: result.favorite } })
      wx.showToast({ title: result.favorite ? '已加入收藏' : '已取消收藏', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '收藏操作失败', icon: 'none' })
    } finally {
      const favoriteBusyIds = { ...this.data.favoriteBusyIds }
      delete favoriteBusyIds[patternId]
      this.setData({ favoriteBusyIds })
    }
  },
  sort() {
    const sortAscending = this.data.sortApplied ? !this.data.sortAscending : true
    const items = [...this.data.items].sort((left, right) => sortAscending
      ? left.name.localeCompare(right.name, 'zh-CN')
      : right.name.localeCompare(left.name, 'zh-CN'))
    this.setData({ items, sortAscending, sortApplied: true })
  },
  onShareAppMessage() {
    const collection = this.data.collection
    const base = { title: collection ? `${collection.title} · 拼豆图纸` : '星期八拼豆图集', path: collection ? `/pages/collection/index?id=${encodeURIComponent(collection.id)}` : '/pages/gallery/index' }
    const imageUrl = collection?.images[0] || ''
    return imageUrl && !imageUrl.startsWith('cloud://') ? { ...base, imageUrl } : base
  },
})
