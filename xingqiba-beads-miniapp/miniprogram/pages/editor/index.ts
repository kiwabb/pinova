import { callUserService, isCloudServiceError, releasePendingWorkUploads, trackPendingWorkUpload } from '../../utils/cloud'

interface PaletteItem { hex: string; code: string; name: string }
interface ColorStat extends PaletteItem { count: number; percent: number }

const paletteItems: PaletteItem[] = [
  { hex: '#C72E64', code: 'XQ01', name: '莓果红' },
  { hex: '#F47D61', code: 'XQ02', name: '珊瑚橙' },
  { hex: '#F6CF62', code: 'XQ03', name: '奶油黄' },
  { hex: '#77C8A3', code: 'XQ04', name: '薄荷绿' },
  { hex: '#3978B8', code: 'XQ05', name: '湖水蓝' },
  { hex: '#7058A3', code: 'XQ06', name: '葡萄紫' },
  { hex: '#D88FB3', code: 'XQ07', name: '柔粉' },
  { hex: '#9B6548', code: 'XQ08', name: '可可棕' },
  { hex: '#E8C8A8', code: 'XQ09', name: '燕麦色' },
  { hex: '#73747A', code: 'XQ10', name: '中性灰' },
  { hex: '#252126', code: 'XQ11', name: '墨黑' },
  { hex: '#FFFFFF', code: 'XQ12', name: '纯白' },
]
const palette = paletteItems.map((item) => item.hex)
const allowedSizes = [16, 24, 32, 48]
const allowedColorCounts = [6, 8, 12]

function hexToRgb(hex: string) {
  return { red: parseInt(hex.slice(1, 3), 16), green: parseInt(hex.slice(3, 5), 16), blue: parseInt(hex.slice(5, 7), 16) }
}

const paletteRgb = paletteItems.map((item) => ({ ...item, ...hexToRgb(item.hex) }))

function paletteForCount(count: number) {
  const indexes = count === 6 ? [0, 2, 3, 4, 10, 11] : count === 8 ? [0, 1, 2, 3, 4, 5, 10, 11] : paletteRgb.map((_, index) => index)
  return indexes.map((index) => paletteRgb[index])
}

function normalizedColorCount(value: number) {
  return allowedColorCounts.includes(value) ? value : 12
}

function paletteHexes(count: number) {
  return paletteForCount(normalizedColorCount(count)).map((item) => item.hex)
}

function nearestPaletteColor(red: number, green: number, blue: number, colors: typeof paletteRgb) {
  let closest = colors[0]
  let closestDistance = Number.POSITIVE_INFINITY
  colors.forEach((color) => {
    const redDistance = red - color.red
    const greenDistance = green - color.green
    const blueDistance = blue - color.blue
    const distance = (redDistance * redDistance * .3) + (greenDistance * greenDistance * .59) + (blueDistance * blueDistance * .11)
    if (distance < closestDistance) { closestDistance = distance; closest = color }
  })
  return closest.hex
}

function adjustedChannel(value: number, brightness: number, contrast: number) {
  const brightened = value + brightness * 2.55
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  return Math.max(0, Math.min(255, Math.round(factor * (brightened - 128) + 128)))
}

function decodeOption(value = '') {
  try { return decodeURIComponent(value) } catch { return value }
}

interface WorkPayload {
  id: string
  version: number
  title: string
  grid: string[][]
  gridSize?: number
  colorCount?: number
  previewMode?: 'beads' | 'grid'
  sourceCollectionId: string
  sourcePatternId: string
}

interface BindProfilePayload {
  id: string
  memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  phoneBound: boolean
  phoneMasked: string
}

type GetPhoneNumberEvent = WechatMiniprogram.BaseEvent & { detail: { code?: string } }

Page({
  data: {
    palette,
    paletteItems,
    activeColor: palette[0],
    hasUndo: false,
    hasRedo: false,
    saving: false,
    exporting: false,
    converting: false,
    workLoading: false,
    workLoadError: '',
    showPhoneBinding: false,
    bindingPhone: false,
    convertError: '',
    hasSourceImage: false,
    title: '未命名作品',
    showSettings: false,
    showStats: false,
    gridSize: 24,
    colorCount: 12,
    fitMode: 'cover' as 'cover' | 'contain',
    cropX: 0,
    cropY: 0,
    brightness: 0,
    contrast: 0,
    previewMode: 'beads' as 'beads' | 'grid',
    colorStats: [] as ColorStat[],
  },
  grid: [] as string[][],
  history: [] as string[][][],
  redoHistory: [] as string[][][],
  canvas: null as WechatMiniprogram.Canvas | null,
  context: null as WechatMiniprogram.RenderingContext | null,
  canvasSize: 0,
  canvasLeft: 0,
  canvasTop: 0,
  drawing: false,
  dirty: false,
  workId: '',
  workVersion: 0,
  sourcePatternId: '',
  sourceCollectionId: '',
  sourceImagePath: '',
  onLoad(options: Record<string, string>) {
    this.workId = options.workId || `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.sourcePatternId = options.sourcePatternId || ''
    this.sourceCollectionId = options.sourceCollectionId || ''
    this.sourceImagePath = decodeOption(options.image || options.sourceImage || '')
    this.setData({ hasSourceImage: Boolean(this.sourceImagePath), title: options.title ? decodeOption(options.title) : this.sourceImagePath ? '照片拼豆图纸' : '未命名作品' })
    this.resetGrid(Boolean(options.sourcePatternId || options.pattern) && !this.sourceImagePath, 24)
    if (options.workId) void this.loadWork(options.workId)
  },
  async loadWork(workId: string) {
    this.setData({ workLoading: true, workLoadError: '' })
    try {
      const work = await callUserService<WorkPayload>('getWork', { workId })
      this.grid = work.grid.map((row) => [...row])
      this.sourcePatternId = work.sourcePatternId
      this.sourceCollectionId = work.sourceCollectionId
      this.workVersion = Math.max(1, Number(work.version) || 1)
      this.history = []
      this.redoHistory = []
      const colorCount = normalizedColorCount(Number(work.colorCount))
      const availablePalette = paletteHexes(colorCount)
      this.setData({ title: work.title, gridSize: work.gridSize || work.grid.length, colorCount, palette: availablePalette, activeColor: availablePalette.includes(this.data.activeColor) ? this.data.activeColor : availablePalette[0], previewMode: work.previewMode || 'beads', hasUndo: false, hasRedo: false })
      this.updateStats()
      this.draw()
    } catch (error) {
      this.setData({ workLoadError: error instanceof Error ? error.message : '作品加载失败' })
    } finally {
      this.setData({ workLoading: false })
    }
  },
  retryLoadWork() { if (this.workId) void this.loadWork(this.workId) },
  onReady() {
    wx.createSelectorQuery().select('#beadCanvas').fields({ node: true, size: true, rect: true }).exec((result) => {
      if (!result[0]?.node) return
      const canvas = result[0].node as WechatMiniprogram.Canvas
      const width = result[0].width as number
      const dpr = wx.getSystemInfoSync().pixelRatio
      canvas.width = width * dpr
      canvas.height = width * dpr
      const context = canvas.getContext('2d')
      context.scale(dpr, dpr)
      this.canvas = canvas
      this.context = context as WechatMiniprogram.RenderingContext
      this.canvasSize = width
      this.canvasLeft = result[0].left as number
      this.canvasTop = result[0].top as number
      this.draw()
      if (this.sourceImagePath) void this.convertSourceImage()
    })
  },
  async resolveSourceImage(path: string) {
    if (!path.startsWith('cloud://')) return path
    return (await wx.cloud.downloadFile({ fileID: path })).tempFilePath
  },
  async convertSourceImage() {
    if (!this.canvas || !this.context || !this.sourceImagePath || this.data.converting) return
    const previousGrid = this.grid.map((row) => [...row])
    const preserveUndo = this.dirty && previousGrid.length > 0
    this.setData({ converting: true, convertError: '' })
    try {
      const path = await this.resolveSourceImage(this.sourceImagePath)
      await new Promise<void>((resolve, reject) => {
        const image = this.canvas!.createImage()
        image.onload = () => {
          try {
            const context = this.context as CanvasRenderingContext2D
            const sourceWidth = image.width
            const sourceHeight = image.height
            context.clearRect(0, 0, this.canvasSize, this.canvasSize)
            context.fillStyle = '#FFFFFF'
            context.fillRect(0, 0, this.canvasSize, this.canvasSize)
            if (this.data.fitMode === 'contain') {
              const scale = Math.min(this.canvasSize / sourceWidth, this.canvasSize / sourceHeight)
              const width = sourceWidth * scale
              const height = sourceHeight * scale
              context.drawImage(image as unknown as CanvasImageSource, (this.canvasSize - width) / 2, (this.canvasSize - height) / 2, width, height)
            } else {
              const cropSize = Math.min(sourceWidth, sourceHeight)
              const maxX = Math.max(0, sourceWidth - cropSize)
              const maxY = Math.max(0, sourceHeight - cropSize)
              const sourceX = maxX * (Number(this.data.cropX) + 100) / 200
              const sourceY = maxY * (Number(this.data.cropY) + 100) / 200
              context.drawImage(image as unknown as CanvasImageSource, sourceX, sourceY, cropSize, cropSize, 0, 0, this.canvasSize, this.canvasSize)
            }
            const canvasWidth = this.canvas!.width
            const canvasHeight = this.canvas!.height
            const pixels = context.getImageData(0, 0, canvasWidth, canvasHeight).data
            const size = Number(this.data.gridSize)
            const colors = paletteForCount(Number(this.data.colorCount))
            this.grid = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
              const sampleX = Math.min(canvasWidth - 1, Math.floor((x + .5) * canvasWidth / size))
              const sampleY = Math.min(canvasHeight - 1, Math.floor((y + .5) * canvasHeight / size))
              const offset = (sampleY * canvasWidth + sampleX) * 4
              const alpha = pixels[offset + 3] / 255
              const red = adjustedChannel((pixels[offset] * alpha) + (255 * (1 - alpha)), Number(this.data.brightness), Number(this.data.contrast))
              const green = adjustedChannel((pixels[offset + 1] * alpha) + (255 * (1 - alpha)), Number(this.data.brightness), Number(this.data.contrast))
              const blue = adjustedChannel((pixels[offset + 2] * alpha) + (255 * (1 - alpha)), Number(this.data.brightness), Number(this.data.contrast))
              return nearestPaletteColor(red, green, blue, colors)
            }))
            resolve()
          } catch (error) { reject(error) }
        }
        image.onerror = () => reject(new Error('照片读取失败'))
        image.src = path
      })
      if (preserveUndo) {
        this.history.push(previousGrid)
        if (this.history.length > 20) this.history.shift()
      } else {
        this.history = []
      }
      this.redoHistory = []
      this.setData({ hasUndo: this.history.length > 0, hasRedo: false })
      this.markDirty()
      this.updateStats()
      this.draw()
    } catch (error) { this.setData({ convertError: error instanceof Error ? error.message : '照片转换失败' }) }
    finally { this.setData({ converting: false }) }
  },
  resetGrid(withPattern: boolean, size: number) {
    this.grid = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
      if (!withPattern) return '#FFFFFF'
      const center = (size - 1) / 2
      const distance = (x - center) ** 2 + (y - center) ** 2
      if (distance < size * size * .13 && (x + y) % 3 !== 0) return palette[(x + y) % 5]
      return '#FFFFFF'
    }))
    this.updateStats()
  },
  draw() {
    if (!this.context || !this.canvasSize || !this.grid.length) return
    const context = this.context as CanvasRenderingContext2D
    const size = this.grid.length
    const cell = this.canvasSize / size
    context.clearRect(0, 0, this.canvasSize, this.canvasSize)
    context.fillStyle = '#F4F2F3'
    context.fillRect(0, 0, this.canvasSize, this.canvasSize)
    this.grid.forEach((row, y) => row.forEach((color, x) => {
      context.fillStyle = color
      context.strokeStyle = 'rgba(37,33,38,.16)'
      context.lineWidth = .5
      if (this.data.previewMode === 'grid') {
        context.fillRect(x * cell, y * cell, cell, cell)
        context.strokeRect(x * cell, y * cell, cell, cell)
      } else {
        context.beginPath()
        context.arc(x * cell + cell / 2, y * cell + cell / 2, cell * .39, 0, Math.PI * 2)
        context.fill()
        context.stroke()
      }
    }))
  },
  updateStats() {
    if (!this.grid.length) return
    const counts = new Map<string, number>()
    this.grid.forEach((row) => row.forEach((color) => counts.set(color, (counts.get(color) || 0) + 1)))
    const total = this.grid.length * this.grid.length
    const colorStats = paletteItems.map((item) => ({ ...item, count: counts.get(item.hex) || 0, percent: Math.round((counts.get(item.hex) || 0) / total * 100) })).filter((item) => item.count).sort((a, b) => b.count - a.count)
    this.setData({ colorStats })
  },
  pushUndo() {
    this.history.push(this.grid.map((row) => [...row]))
    if (this.history.length > 20) this.history.shift()
    this.redoHistory = []
    this.setData({ hasUndo: true, hasRedo: false })
  },
  markDirty() {
    if (this.dirty) return
    this.dirty = true
    wx.enableAlertBeforeUnload?.({ message: '当前修改尚未保存，确认离开？' })
  },
  paintTouch(touch: WechatMiniprogram.TouchDetail) {
    const size = this.grid.length
    const x = Math.floor((touch.clientX - this.canvasLeft) / this.canvasSize * size)
    const y = Math.floor((touch.clientY - this.canvasTop) / this.canvasSize * size)
    if (x < 0 || y < 0 || x >= size || y >= size) return
    this.grid[y][x] = this.data.activeColor
    this.draw()
  },
  startPaint(event: WechatMiniprogram.TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    this.pushUndo(); this.markDirty(); this.drawing = true; this.paintTouch(touch)
  },
  movePaint(event: WechatMiniprogram.TouchEvent) { const touch = event.touches[0]; if (this.drawing && touch) this.paintTouch(touch) },
  endPaint() { this.drawing = false; this.updateStats() },
  chooseColor(event: WechatMiniprogram.TouchEvent) { this.setData({ activeColor: event.currentTarget.dataset.color }) },
  undo() {
    const previous = this.history.pop()
    if (!previous) return
    this.redoHistory.push(this.grid.map((row) => [...row]))
    if (this.redoHistory.length > 20) this.redoHistory.shift()
    this.grid = previous
    this.markDirty()
    this.setData({ hasUndo: this.history.length > 0, hasRedo: true, gridSize: previous.length })
    this.updateStats(); this.draw()
  },
  redo() {
    const next = this.redoHistory.pop()
    if (!next) return
    this.history.push(this.grid.map((row) => [...row]))
    if (this.history.length > 20) this.history.shift()
    this.grid = next
    this.markDirty()
    this.setData({ hasUndo: true, hasRedo: this.redoHistory.length > 0, gridSize: next.length })
    this.updateStats(); this.draw()
  },
  clear() {
    wx.showModal({ title: '清空图纸', content: '当前画布会被清空，你仍可使用撤销恢复。', confirmText: '清空', confirmColor: '#B42318', success: ({ confirm }) => {
      if (!confirm) return
      this.pushUndo(); this.markDirty(); this.resetGrid(false, this.grid.length); this.draw()
    } })
  },
  toggleSettings() { this.setData({ showSettings: !this.data.showSettings }) },
  toggleStats() { this.setData({ showStats: !this.data.showStats }) },
  selectGridSize(event: WechatMiniprogram.TouchEvent) {
    const size = Number(event.currentTarget.dataset.value)
    if (!allowedSizes.includes(size) || size === this.grid.length) return
    if (this.sourceImagePath) {
      this.setData({ gridSize: size }, () => void this.convertSourceImage())
      return
    }
    this.pushUndo()
    const previous = this.grid
    this.grid = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => previous[Math.min(previous.length - 1, Math.floor(y * previous.length / size))][Math.min(previous.length - 1, Math.floor(x * previous.length / size))]))
    this.setData({ gridSize: size })
    this.markDirty(); this.updateStats(); this.draw()
  },
  selectColorCount(event: WechatMiniprogram.TouchEvent) {
    const value = normalizedColorCount(Number(event.currentTarget.dataset.value))
    if (value === this.data.colorCount) return
    const availableColors = paletteForCount(value)
    const availablePalette = availableColors.map((item) => item.hex)
    const activeColor = availablePalette.includes(this.data.activeColor) ? this.data.activeColor : availablePalette[0]
    if (this.sourceImagePath) {
      this.setData({ colorCount: value, palette: availablePalette, activeColor }, () => void this.convertSourceImage())
      return
    }
    this.pushUndo()
    this.grid = this.grid.map((row) => row.map((hex) => {
      const rgb = hexToRgb(hex)
      return nearestPaletteColor(rgb.red, rgb.green, rgb.blue, availableColors)
    }))
    this.markDirty()
    this.setData({ colorCount: value, palette: availablePalette, activeColor })
    this.updateStats()
    this.draw()
  },
  selectFitMode(event: WechatMiniprogram.TouchEvent) { this.setData({ fitMode: event.currentTarget.dataset.value }) },
  selectPreviewMode(event: WechatMiniprogram.TouchEvent) {
    const previewMode = event.currentTarget.dataset.value === 'grid' ? 'grid' : 'beads'
    if (previewMode === this.data.previewMode) return
    this.markDirty()
    this.setData({ previewMode }, () => this.draw())
  },
  changeCropX(event: WechatMiniprogram.SliderChange) { this.setData({ cropX: Number(event.detail.value) }) },
  changeCropY(event: WechatMiniprogram.SliderChange) { this.setData({ cropY: Number(event.detail.value) }) },
  changeBrightness(event: WechatMiniprogram.SliderChange) { this.setData({ brightness: Number(event.detail.value) }) },
  changeContrast(event: WechatMiniprogram.SliderChange) { this.setData({ contrast: Number(event.detail.value) }) },
  applyImageSettings() { void this.convertSourceImage() },
  inputTitle(event: WechatMiniprogram.Input) { this.setData({ title: event.detail.value.slice(0, 40) }); this.markDirty() },
  closePhoneBinding() {
    if (!this.data.bindingPhone) this.setData({ showPhoneBinding: false })
  },
  noop() {},
  async bindPhoneAndSave(event: GetPhoneNumberEvent) {
    if (this.data.bindingPhone) return
    if (!event.detail.code) return wx.showToast({ title: '未授权手机号，可稍后再试', icon: 'none' })
    this.setData({ bindingPhone: true })
    let bound = false
    try {
      const profile = await callUserService<BindProfilePayload>('bindPhone', { code: event.detail.code })
      const app = getApp<IAppOption>()
      app.globalData.cloudUser = {
        id: profile.id,
        memberLevel: profile.memberLevel,
        growth: profile.growth,
        points: profile.points,
        phoneBound: profile.phoneBound,
      }
      app.globalData.points = profile.points
      app.globalData.phone = profile.phoneMasked || '已绑定'
      wx.setStorageSync('xingqiba-cloud-user', app.globalData.cloudUser)
      this.setData({ showPhoneBinding: false })
      bound = true
      wx.showToast({ title: '绑定成功，继续保存', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '绑定失败', icon: 'none' })
    } finally {
      this.setData({ bindingPhone: false })
    }
    if (bound) void this.save()
  },
  async save() {
    if (this.data.saving || this.data.converting || this.data.workLoading || this.data.workLoadError || !this.canvas) return
    this.setData({ saving: true }); wx.showLoading({ title: '正在保存', mask: true })
    let uploadedFileId = ''
    try {
      const app = getApp<IAppOption>()
      if (!app.globalData.cloudUser) await app.bootstrapCloudUser()
      const userId = app.globalData.cloudUser?.id
      if (!userId) throw new Error('用户信息尚未准备好')
      if (!app.globalData.cloudUser?.phoneBound) {
        this.setData({ showPhoneBinding: true })
        return
      }
      const tempFilePath = await this.exportPreview()
      const upload = await wx.cloud.uploadFile({ cloudPath: `user-works/${userId}/${this.workId}-${Date.now()}.png`, filePath: tempFilePath })
      uploadedFileId = upload.fileID
      trackPendingWorkUpload(userId, uploadedFileId)
      const result = await callUserService<{ id: string; version: number; points: number; growth: number; memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'; created: boolean; rewarded: boolean; pointsAwarded: number; growthAwarded: number; rewardRemaining: number }>('saveWork', { workId: this.workId, expectedVersion: this.workVersion, title: this.data.title.trim() || '未命名作品', grid: this.grid, colorCount: this.data.colorCount, previewMode: this.data.previewMode, previewFileId: upload.fileID, sourcePatternId: this.sourcePatternId, sourceCollectionId: this.sourceCollectionId })
      releasePendingWorkUploads([uploadedFileId])
      this.workId = result.id; this.workVersion = result.version; this.dirty = false; wx.disableAlertBeforeUnload?.()
      if (app.globalData.cloudUser) {
        app.globalData.cloudUser.points = result.points
        app.globalData.cloudUser.growth = result.growth
        app.globalData.cloudUser.memberLevel = result.memberLevel
        wx.setStorageSync('xingqiba-cloud-user', app.globalData.cloudUser)
      }
      app.globalData.points = result.points
      if (result.created) app.globalData.works += 1
      wx.showToast({ title: result.rewarded && result.pointsAwarded ? `已保存 +${result.pointsAwarded}积分` : result.created ? '作品已保存' : '作品已更新', icon: 'success' })
    } catch (error) {
      if (uploadedFileId) {
        try {
          await callUserService('deleteWorkUpload', { fileId: uploadedFileId })
          releasePendingWorkUploads([uploadedFileId])
        } catch (cleanupError) {
          if (isCloudServiceError(cleanupError, 'FILE_IN_USE')) releasePendingWorkUploads([uploadedFileId])
        }
      }
      const message = error instanceof Error ? error.message : '作品保存失败'
      if (isCloudServiceError(error, 'PHONE_REQUIRED')) {
        this.setData({ showPhoneBinding: true })
      } else if (isCloudServiceError(error, 'CONFLICT')) {
        wx.showModal({ title: '云端作品已更新', content: '当前画布没有覆盖云端版本。请返回“我的作品”重新打开后再编辑。', showCancel: false, confirmText: '知道了', confirmColor: '#C42D5D' })
      } else wx.showToast({ title: message, icon: 'none' })
    } finally { wx.hideLoading(); this.setData({ saving: false }) }
  },
  async exportImage() {
    if (this.data.exporting || this.data.converting || !this.canvas) return
    this.setData({ exporting: true })
    try {
      const tempFilePath = await this.exportPreview()
      await wx.saveImageToPhotosAlbum({ filePath: tempFilePath })
      wx.showToast({ title: '图纸已保存到相册', icon: 'success' })
    } catch (error) {
      const message = (error as { errMsg?: string })?.errMsg || ''
      if (message.includes('auth deny') || message.includes('auth denied')) {
        wx.showModal({ title: '需要相册权限', content: '请在设置中允许保存图片到相册。', confirmText: '去设置', confirmColor: '#C42D5D', success: ({ confirm }) => { if (confirm) wx.openSetting() } })
      } else wx.showToast({ title: '图纸导出失败', icon: 'none' })
    } finally { this.setData({ exporting: false }) }
  },
  exportPreview() {
    return new Promise<string>((resolve, reject) => wx.canvasToTempFilePath({ canvas: this.canvas || undefined, fileType: 'png', quality: 1, success: ({ tempFilePath }) => resolve(tempFilePath), fail: () => reject(new Error('作品预览图生成失败')) }))
  },
})
