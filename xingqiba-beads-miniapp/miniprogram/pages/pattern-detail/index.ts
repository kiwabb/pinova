import { CLOUD_FUNCTIONS } from '../../config/cloud'
import { callUserService } from '../../utils/cloud'
import type { Collection } from '../../utils/data'

interface PatternMaterial {
  id: string
  kind: 'board' | 'beads' | 'paper' | 'other'
  name: string
  description: string
  amount: string
  unit: string
}

interface PatternItem {
  id: string
  name: string
  image: string
  level: string
  materials: PatternMaterial[]
}

const defaultPatternMaterials = (): PatternMaterial[] => [
  { id: 'material-board', kind: 'board', name: '29 × 29 底板', description: '标准拼豆底板', amount: '4', unit: '块' },
  { id: 'material-beads', kind: 'beads', name: 'MARD 拼豆', description: '按生成后的颜色清单准备', amount: '≤ 3364', unit: '颗' },
  { id: 'material-paper', kind: 'paper', name: '隔热烫纸', description: '用于完成后的熨烫定型', amount: '1', unit: '张' },
]

Page({
  data: {
    loading: true,
    loadError: '',
    collection: null as Collection | null,
    pattern: null as PatternItem | null,
    favorite: false,
    favoriteBusy: false,
    gridSize: 58,
    materialCount: 3,
    boardSummary: '4 块',
    beadSummary: '≤ 3364 颗',
  },
  collectionId: '',
  patternId: '',
  onLoad(options: Record<string, string>) {
    this.collectionId = options.collectionId || ''
    this.patternId = options.patternId || ''
    if (!this.collectionId || !this.patternId) {
      this.setData({ loading: false, loadError: '缺少图纸信息' })
      return
    }
    void this.loadPattern()
  },
  async loadPattern() {
    this.setData({ loading: true, loadError: '' })
    try {
      const response = await wx.cloud.callFunction({
        name: CLOUD_FUNCTIONS.galleryService,
        data: { action: 'getCollection', collectionId: this.collectionId },
      })
      const result = response.result as {
        success: boolean
        data?: { collection: Collection; patterns: PatternItem[] }
        code?: string
        requiredLevel?: string
        message?: string
      }
      if (!result?.success || !result.data) {
        if (result?.code === 'MEMBER_LEVEL_REQUIRED') {
          this.setData({ loading: false })
          wx.showModal({
            title: `需要 ${result.requiredLevel} 会员`,
            content: '当前等级无法查看该图纸，可前往会员中心查看升级方式。',
            confirmText: '查看会员',
            confirmColor: '#C42D5D',
            success: ({ confirm }) => confirm
              ? wx.redirectTo({ url: '/pages/member/index' })
              : wx.navigateBack(),
          })
          return
        }
        throw new Error(result?.message || '图纸加载失败')
      }
      const pattern = result.data.patterns.find(item => item.id === this.patternId)
      if (!pattern) throw new Error('图纸不存在或已下架')
      const materials = pattern.materials?.length ? pattern.materials : defaultPatternMaterials()
      const boardMaterial = materials.find(item => item.kind === 'board')
      const beadMaterial = materials.find(item => item.kind === 'beads')
      this.setData({
        collection: result.data.collection,
        pattern: { ...pattern, materials },
        materialCount: materials.length,
        boardSummary: boardMaterial ? `${boardMaterial.amount} ${boardMaterial.unit}` : '按清单',
        beadSummary: beadMaterial ? `${beadMaterial.amount} ${beadMaterial.unit}` : '按清单',
        loading: false,
      })
      wx.setNavigationBarTitle({ title: pattern.name })
      void this.loadFavoriteState()
    } catch (error) {
      this.setData({ loading: false, collection: null, pattern: null, loadError: error instanceof Error ? error.message : '图纸加载失败' })
    }
  },
  retry() { void this.loadPattern() },
  async loadFavoriteState() {
    try {
      const ids = await callUserService<string[]>('getFavoriteIds', { collectionId: this.collectionId })
      this.setData({ favorite: ids.includes(this.patternId) })
    } catch (error) {
      console.error('图纸收藏状态加载失败', error)
    }
  },
  async toggleFavorite() {
    if (this.data.favoriteBusy || !this.data.pattern || !this.data.collection) return
    this.setData({ favoriteBusy: true })
    try {
      const result = await callUserService<{ favorite: boolean }>('toggleFavorite', {
        collectionId: this.collectionId,
        patternId: this.patternId,
      })
      this.setData({ favorite: result.favorite })
      wx.showToast({ title: result.favorite ? '已加入收藏' : '已取消收藏', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '收藏操作失败', icon: 'none' })
    } finally {
      this.setData({ favoriteBusy: false })
    }
  },
  openPattern() {
    const pattern = this.data.pattern
    const collection = this.data.collection
    if (!pattern || !collection) return
    wx.navigateTo({
      url: `/pages/editor/index?sourcePatternId=${encodeURIComponent(pattern.id)}&sourceCollectionId=${encodeURIComponent(collection.id)}&sourceImage=${encodeURIComponent(pattern.image)}&title=${encodeURIComponent(pattern.name)}`,
    })
  },
  openStore() { wx.switchTab({ url: '/pages/store/index' }) },
  onShareAppMessage() {
    const pattern = this.data.pattern
    const collection = this.data.collection
    const base = {
      title: pattern ? `${pattern.name} · 拼豆图纸` : '星期八拼豆图纸',
      path: collection && pattern
        ? `/pages/pattern-detail/index?collectionId=${encodeURIComponent(collection.id)}&patternId=${encodeURIComponent(pattern.id)}`
        : '/pages/gallery/index',
    }
    return pattern?.image && !pattern.image.startsWith('cloud://') ? { ...base, imageUrl: pattern.image } : base
  },
})
