import { callUserService, isCloudServiceError } from '../../utils/cloud'

type RecordMode = 'works' | 'favorites' | 'bookings'

interface RecordItem {
  id: string
  version?: number
  title?: string
  image?: string
  previewFileId?: string
  previewUrl?: string
  imageUrl?: string
  gridSize?: number
  colorCount?: number
  previewMode?: 'beads' | 'grid'
  collectionId?: string
  collectionTitle?: string
  patternId?: string
  date?: string
  experienceType?: string
  timeSlot?: string
  status?: string
  cancellable?: boolean
  updatedAt?: number
  updatedAtText?: string
  available?: boolean
  unavailableReason?: string
}

interface RecordPage {
  items: RecordItem[]
  nextCursor: string
  hasMore: boolean
  total: number
}

const modeMeta: Record<RecordMode, { title: string; empty: string; action: string }> = {
  works: { title: '我的作品', empty: '还没有保存作品', action: 'listWorks' },
  favorites: { title: '我的收藏', empty: '还没有收藏图纸', action: 'listFavorites' },
  bookings: { title: '我的预约', empty: '还没有到店预约', action: 'listBookings' },
}

function formatDate(timestamp = 0) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    mode: 'works' as RecordMode,
    title: modeMeta.works.title,
    emptyText: modeMeta.works.empty,
    loading: false,
    loadingMore: false,
    error: '',
    items: [] as RecordItem[],
    nextCursor: '',
    hasMore: false,
    total: 0,
    busyIds: {} as Record<string, boolean>,
  },
  onLoad(options: Record<string, string>) {
    const mode = (['works', 'favorites', 'bookings'].includes(options.mode) ? options.mode : 'works') as RecordMode
    this.setData({ mode, title: modeMeta[mode].title, emptyText: modeMeta[mode].empty })
    wx.setNavigationBarTitle({ title: modeMeta[mode].title })
  },
  onShow() { void this.loadRecords() },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) void this.loadRecords(false)
  },
  loadMore() { void this.loadRecords(false) },
  async loadRecords(reset = true) {
    if ((!reset && (!this.data.hasMore || this.data.loadingMore)) || (reset && this.data.loading)) return
    this.setData(reset ? { loading: true, error: '', items: [], nextCursor: '', hasMore: false } : { loadingMore: true, error: '' })
    try {
      const page = await callUserService<RecordPage>(modeMeta[this.data.mode].action, { paginated: true, cursor: reset ? '' : this.data.nextCursor, pageSize: 20 })
      const nextItems = page.items.map((item) => ({ ...item, updatedAtText: formatDate(item.updatedAt) }))
      const items = reset ? nextItems : [...this.data.items, ...nextItems.filter((item) => !this.data.items.some((existing) => existing.id === item.id))]
      this.setData({ items, nextCursor: page.nextCursor, hasMore: page.hasMore, total: page.total })
    } catch (error) {
      const message = error instanceof Error ? error.message : '记录加载失败'
      if (reset) this.setData({ error: message })
      else wx.showToast({ title: message, icon: 'none' })
    } finally {
      this.setData({ loading: false, loadingMore: false })
    }
  },
  openItem(event: WechatMiniprogram.TouchEvent) {
    const item = this.data.items.find((record) => record.id === event.currentTarget.dataset.id)
    if (!item) return
    if (this.data.mode === 'works') {
      wx.navigateTo({ url: `/pages/editor/index?workId=${encodeURIComponent(item.id)}` })
      return
    }
    if (this.data.mode === 'favorites' && item.available === false) {
      wx.showToast({ title: item.unavailableReason || '该收藏暂时不可用', icon: 'none' })
      return
    }
    if (this.data.mode === 'favorites' && item.patternId && item.collectionId) {
      wx.navigateTo({
        url: `/pages/editor/index?sourcePatternId=${encodeURIComponent(item.patternId)}&sourceCollectionId=${encodeURIComponent(item.collectionId)}&sourceImage=${encodeURIComponent(item.imageUrl || item.image || '')}&title=${encodeURIComponent(item.title || '收藏图纸')}`,
      })
    }
  },
  removeItem(event: WechatMiniprogram.TouchEvent) {
    const item = this.data.items.find((record) => record.id === event.currentTarget.dataset.id)
    if (!item || this.data.busyIds[item.id]) return
    const isWork = this.data.mode === 'works'
    const isBooking = this.data.mode === 'bookings'
    wx.showModal({
      title: isWork ? '删除作品' : isBooking ? '取消预约' : '取消收藏',
      content: isWork
        ? `确认删除“${item.title || '未命名作品'}”？此操作无法恢复。`
        : isBooking
          ? `确认取消 ${item.date || ''} ${item.timeSlot || ''} 的到店预约？`
          : `确认取消收藏“${item.title || '该图纸'}”？`,
      confirmText: isWork ? '删除' : isBooking ? '取消预约' : '取消收藏',
      confirmColor: '#B42318',
      success: ({ confirm }) => { if (confirm) void this.confirmRemove(item) },
    })
  },
  async confirmRemove(item: RecordItem) {
    this.setData({ busyIds: { ...this.data.busyIds, [item.id]: true } })
    try {
      if (this.data.mode === 'works') {
        await callUserService('deleteWork', { workId: item.id, expectedVersion: item.version })
      } else if (this.data.mode === 'bookings') {
        await callUserService('cancelBooking', { bookingId: item.id })
      } else if (item.patternId && item.collectionId) {
        await callUserService('toggleFavorite', { patternId: item.patternId, collectionId: item.collectionId })
      }
      if (this.data.mode === 'bookings') {
        this.setData({ items: this.data.items.map((record) => record.id === item.id ? { ...record, status: 'cancelled' } : record) })
      } else {
        await this.loadRecords()
      }
      wx.showToast({ title: this.data.mode === 'works' ? '作品已删除' : this.data.mode === 'bookings' ? '预约已取消' : '已取消收藏', icon: 'none' })
    } catch (error) {
      if (this.data.mode === 'works' && isCloudServiceError(error, 'CONFLICT')) {
        wx.showModal({ title: '作品已更新', content: '其他设备保存了新版本，本次没有删除。列表将重新加载。', showCancel: false, confirmText: '知道了', success: () => void this.loadRecords() })
      } else wx.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    } finally {
      const busyIds = { ...this.data.busyIds }
      delete busyIds[item.id]
      this.setData({ busyIds })
    }
  },
  goCreate() { wx.navigateTo({ url: '/pages/editor/index' }) },
  goGallery() { wx.switchTab({ url: '/pages/gallery/index' }) },
  goStore() { wx.switchTab({ url: '/pages/store/index' }) },
})
