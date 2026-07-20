import { callUserService, isCloudServiceError, releasePendingWorkUploads, trackPendingWorkUpload } from '../../utils/cloud'
import { studioPalette, type BeadColor } from '../../utils/mardPalette'
import { convertPixelsToGrid, removeBackgroundByVote, removeSourceImageBackground, type ConversionMode } from '../../utils/beadConverter'
import { exportPatternPng } from '../../utils/beadExport'
import { mirrorGridHorizontal, replaceGridColor, usedGridColors } from '../../utils/gridOperations'
import { filterPaletteColors, type PaletteFilter } from '../../utils/paletteOperations'
import {
  canResizeBlankCanvas,
  createReplacementMeta,
  createSettingsDraft,
  formatFocusTime,
  formatReplacementResult,
  palettePresentation,
  settingsDraftChanged,
  type PaletteContext,
  type ReplacementMeta,
  type SettingsDraft,
} from '../../utils/editorInteractionState'

interface ColorStat { index: number; id: string; name: string; hex: string; foreground: string; count: number }
interface PaletteColor { index: number; id: string; name: string; hex: string }
interface GridSnapshot { cells: Int16Array; gridSize: number; conversionMode: ConversionMode; mergeDistance: number }
interface WorkPayload {
  id: string; version: number; title: string; grid: string[][] | number[][]
  gridSize?: number; colorCount?: number; previewMode?: string
  sourceCollectionId: string; sourcePatternId: string
}
type GetPhoneNumberEvent = WechatMiniprogram.BaseEvent & { detail: { code?: string } }
type EditorTool = 'brush' | 'eraser' | 'eyedropper' | 'fill' | 'move' | 'replace' | 'exclude'

function decodeOption(v = '') { try { return decodeURIComponent(v) } catch { return v } }

const defaultBrushColor = Math.max(0, studioPalette.findIndex(color => color.id === 'H07'))
const paletteColors: PaletteColor[] = studioPalette.map((color, index) => ({ index, id: color.id, name: color.name, hex: color.hex }))
const initialPalette = palettePresentation('brush')
const initialSettingsDraft = createSettingsDraft('illustration', 58, 30)
const emptyReplacementMeta: ReplacementMeta = { index: -1, id: '', hex: 'transparent', count: 0 }

Page({
  data: {
    hasSourceImage: false,
    sourcePreview: '',
    sourceImageRemoved: false,
    converting: false,
    convertError: '',

    conversionMode: 'illustration' as ConversionMode,
    gridSize: 58,
    mergeDistance: 30,

    view: 'chart' as 'source' | 'chart' | 'edit' | 'preview',
    meltAmount: 62,

    tool: 'move' as EditorTool,
    selectedColor: defaultBrushColor,
    selectedColorHex: studioPalette[defaultBrushColor].hex,
    selectedColorId: studioPalette[defaultBrushColor].id,
    paletteOpen: false,
    paletteContext: 'brush' as PaletteContext,
    paletteTitle: initialPalette.title,
    paletteHint: initialPalette.hint,
    paletteFilter: 'all' as PaletteFilter,
    paletteQuery: '',
    paletteScrollIntoView: '',
    visiblePaletteColors: paletteColors,
    usedColorIndices: [] as number[],
    replaceSourceColor: -1,
    replaceSourceColorId: '',
    replaceSourceMeta: emptyReplacementMeta,
    replaceResultText: '',
    replaceResultSourceHex: 'transparent',
    replaceResultTargetHex: 'transparent',
    highlightedColor: -1,
    excludedColors: [] as number[],
    excludedItems: [] as Array<{ index: number; id: string; hex: string; name: string; count: number }>,
    exclusionAllowedColors: [] as number[],
    hasUndo: false,
    hasRedo: false,
    hasManualGridChanges: false,
    focusMode: false,
    focusRunning: false,
    focusElapsedSeconds: 0,
    focusTimeText: '00:00',
    focusColorIndex: -1,
    focusColorId: '',
    focusColorHex: 'transparent',

    canvasScale: 1,
    zoomPercent: '100',
    canvasTranslateX: 0,
    canvasTranslateY: 0,

    totalBeads: 0,
    boardCount: 0,
    colorStats: [] as ColorStat[],

    title: '未命名作品',
    saving: false,
    exporting: false,
    workLoading: false,
    workLoadError: '',
    showPhoneBinding: false,
    bindingPhone: false,

    showSettings: false,
    settingsDraft: initialSettingsDraft as SettingsDraft,
    settingsChanged: false,
  },

  grid: null as any as Int16Array,
  history: [] as GridSnapshot[],
  redoHistory: [] as GridSnapshot[],
  canvas: null as WechatMiniprogram.Canvas | null,
  sourcePreviewCanvas: null as WechatMiniprogram.Canvas | null,
  context: null as WechatMiniprogram.RenderingContext | null,
  canvasSize: 0,
  canvasLeft: 0, canvasTop: 0,
  viewportW: 0, viewportH: 0, // 视口 CSS 尺寸
  drawing: false, dirty: false,
  lastTouchX: -1, lastTouchY: -1, // 防止连续画笔误触
  _zoomStartDist: 0, _zoomBaseScale: 1, _zoomBaseTx: 0, _zoomBaseTy: 0,
  _focalCanvasX: 0, _focalCanvasY: 0,
  _panStartX: 0, _panStartY: 0, _panBaseTx: 0, _panBaseTy: 0,
  _gestureType: '' as '' | 'paint' | 'pan' | 'pinch',
  _wasPinching: false,
  _lastTapTime: 0,
  _viewportLeft: 0, _viewportTop: 0,
  workId: '', workVersion: 0,
  sourcePatternId: '', sourceCollectionId: '',
  sourceImagePath: '',
  modifiedSourcePixels: null as Uint8ClampedArray | null,
  _focusTimer: null as ReturnType<typeof setInterval> | null,
  _focusStartedAt: 0,
  _focusAccumulatedSeconds: 0,

  onLoad(options: Record<string, string>) {
    this.workId = options.workId || `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.sourcePatternId = options.sourcePatternId || ''
    this.sourceCollectionId = options.sourceCollectionId || ''
    this.sourceImagePath = decodeOption(options.image || options.sourceImage || '')
    const size = 58
    this.grid = new Int16Array(size * size).fill(-1)
    this.setData({
      hasSourceImage: Boolean(this.sourceImagePath),
      sourcePreview: this.sourceImagePath || '',
      title: options.title ? decodeOption(options.title) : this.sourceImagePath ? '照片拼豆图纸' : '未命名作品',
      gridSize: size,
      tool: 'move',
      paletteOpen: false,
    })
    if (options.workId) void this.loadWork(options.workId)
  },

  async loadWork(workId: string) {
    this.setData({ workLoading: true, workLoadError: '' })
    try {
      const work = await callUserService<WorkPayload>('getWork', { workId })
      const size = work.grid.length
      const cells = work.grid.map(row => row.map(cell => {
        if (typeof cell === 'number') return cell
        const idx = studioPalette.findIndex(c => c.hex.toUpperCase() === (cell as string).toUpperCase())
        return idx >= 0 ? idx : -1
      }))
      this.grid = new Int16Array(size * size)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) this.grid[y * size + x] = cells[y][x]
      this.sourcePatternId = work.sourcePatternId; this.sourceCollectionId = work.sourceCollectionId
      this.workVersion = Math.max(1, Number(work.version) || 1)
      this.history = []; this.redoHistory = []
      this.setData({ title: work.title, gridSize: work.gridSize || size, tool: 'move', paletteOpen: false, hasUndo: false, hasRedo: false })
      this.updateStats(); this.draw()
    } catch (error) {
      this.setData({ workLoadError: error instanceof Error ? error.message : '作品加载失败' })
    } finally { this.setData({ workLoading: false }) }
  },
  retryLoadWork() { if (this.workId) void this.loadWork(this.workId) },
  retryConvertSourceImage() { void this.convertSourceImage() },

  onReady() {
    wx.createSelectorQuery().select('#sourcePreviewCanvas').fields({ node: true }).exec(res => {
      this.sourcePreviewCanvas = (res[0]?.node as WechatMiniprogram.Canvas) || null
    })
    wx.createSelectorQuery().select('#beadCanvas').fields({ node: true, size: true, rect: true }).exec(res => {
      if (!res[0]?.node) return
      const c = res[0].node as WechatMiniprogram.Canvas
      const w = res[0].width as number; const h = res[0].height as number
      const dpr = wx.getSystemInfoSync().pixelRatio
      c.width = w * dpr; c.height = h * dpr
      const ctx = c.getContext('2d'); ctx.scale(dpr, dpr)
      this.canvas = c; this.context = ctx as WechatMiniprogram.RenderingContext
      this.canvasSize = Math.min(w, h)
      this.canvasLeft = res[0].left as number; this.canvasTop = res[0].top as number
      this.draw()
      if (this.sourceImagePath) void this.convertSourceImage()
    })
    wx.createSelectorQuery().select('.canvas-viewport').boundingClientRect().exec(vp => {
      if (vp[0]) { this._viewportLeft = vp[0].left; this._viewportTop = vp[0].top; this.viewportW = vp[0].width; this.viewportH = vp[0].height }
    })
  },
  onHide() { pauseFocusClock.call(this) },
  onUnload() { clearFocusInterval.call(this) },

  // ── 源图片（离屏 canvas 处理，不污染主画布）───────────

  async resolveSourceImage(path: string) {
    if (!path.startsWith('cloud://')) return path
    return (await wx.cloud.downloadFile({ fileID: path })).tempFilePath
  },

  /** 用离屏 canvas 加载并裁剪图片，返回像素数据 */
  async loadSourcePixels(): Promise<{ pixels: Uint8ClampedArray; w: number; h: number }> {
    const path = await this.resolveSourceImage(this.sourceImagePath)
    return new Promise((resolve, reject) => {
      const img = this.canvas!.createImage()
      img.onload = () => {
        const sw = img.width, sh = img.height
        const cropSize = Math.min(sw, sh)
        const off = wx.createOffscreenCanvas({ type: '2d', width: this.canvas!.width, height: this.canvas!.height })
        const octx = off.getContext('2d') as any
        octx.fillStyle = '#FFFFFF'; octx.fillRect(0, 0, off.width, off.height)
        const sx = (sw - cropSize) / 2, sy = (sh - cropSize) / 2
        octx.drawImage(img as any, sx, sy, cropSize, cropSize, 0, 0, off.width, off.height)
        const data = octx.getImageData(0, 0, off.width, off.height)
        resolve({ pixels: data.data, w: off.width, h: off.height })
      }
      img.onerror = () => reject(new Error('照片读取失败'))
      img.src = path
    })
  },

  async convertSourceImage(settings?: SettingsDraft): Promise<boolean> {
    if (!this.canvas || !this.sourceImagePath || this.data.converting) return false
    const prevSnapshot = createGridSnapshot.call(this)
    const preserveUndo = this.dirty && prevSnapshot.cells.some(v => v >= 0)
    const appliedSettings = settings ?? createSettingsDraft(this.data.conversionMode, this.data.gridSize, this.data.mergeDistance)
    this.setData({ converting: true, convertError: '' })
    try {
      let pixels: Uint8ClampedArray, cw: number, ch: number
      if (this.data.sourceImageRemoved && this.modifiedSourcePixels) {
        pixels = this.modifiedSourcePixels; cw = this.canvas!.width; ch = this.canvas!.height
      } else {
        const loaded = await this.loadSourcePixels()
        pixels = loaded.pixels; cw = loaded.w; ch = loaded.h
      }
      const size = Number(appliedSettings.gridSize)
      const nextGrid = convertPixelsToGrid({
        pixels, imageWidth: cw, imageHeight: ch, gridWidth: size, gridHeight: size,
        mode: appliedSettings.conversionMode, mergeDistance: appliedSettings.mergeDistance,
        excludedColors: this.data.excludedColors,
        allowedColors: this.data.excludedColors.length ? this.data.exclusionAllowedColors : undefined,
      })
      if (preserveUndo) { this.history.push(prevSnapshot); if (this.history.length > 40) this.history.shift() }
      else this.history = []
      this.redoHistory = []
      this.grid = nextGrid
      await new Promise<void>(resolve => this.setData({
        conversionMode: appliedSettings.conversionMode,
        gridSize: appliedSettings.gridSize,
        mergeDistance: appliedSettings.mergeDistance,
        hasUndo: this.history.length > 0,
        hasRedo: false,
        hasManualGridChanges: false,
      }, resolve))
      this.markDirty(); this.updateStats(); this.draw()
      return true
    } catch (e) {
      this.setData({ convertError: e instanceof Error ? e.message : '照片转换失败' })
      return false
    } finally { this.setData({ converting: false }) }
  },

  async removeSourceBackground() {
    if (!this.canvas || !this.sourceImagePath || this.data.sourceImageRemoved) return
    this.setData({ converting: true })
    let removedPixels = 0
    try {
      const loaded = await this.loadSourcePixels()
      const result = removeSourceImageBackground(loaded.pixels, loaded.w, loaded.h)
      if (result.removedPixels === 0) {
        wx.showToast({ title: '原图边缘没有识别到连续背景', icon: 'none' })
        return
      }
      removedPixels = result.removedPixels
      this.modifiedSourcePixels = result.data
      this.setData({ sourceImageRemoved: true })
      try {
        const previewPath = await this.pixelsToTempFile(result.data, loaded.w, loaded.h)
        this.setData({ sourcePreview: previewPath })
      } catch (previewError) {
        console.warn('去背景预览生成失败，继续使用处理后的像素生成图纸', previewError)
      }
    } catch (error) {
      console.error('去背景失败', error)
      this.modifiedSourcePixels = null
      this.setData({ sourceImageRemoved: false })
      wx.showToast({ title: error instanceof Error ? error.message : '去背景失败', icon: 'none' })
    } finally { this.setData({ converting: false }) }
    if (removedPixels > 0) {
      await this.convertSourceImage()
      wx.showToast({ title: '去背景完成', icon: 'success' })
    }
  },

  async restoreSource() {
    if (!this.data.sourceImageRemoved) return
    this.modifiedSourcePixels = null
    await new Promise<void>(resolve => this.setData({ sourceImageRemoved: false, sourcePreview: this.sourceImagePath }, resolve))
    await this.convertSourceImage()
    if (!this.data.convertError) wx.showToast({ title: '已恢复原图', icon: 'success' })
  },

  /** 将像素数据写入离屏 canvas 导出为临时文件 */
  pixelsToTempFile(pixels: Uint8ClampedArray, w: number, h: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = this.sourcePreviewCanvas
      if (!canvas) { reject(new Error('预览画布尚未就绪')); return }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d') as any
      const imageData = ctx.createImageData(w, h)
      imageData.data.set(pixels)
      ctx.clearRect(0, 0, w, h)
      ctx.putImageData(imageData, 0, 0)
      wx.canvasToTempFilePath({ canvas, fileType: 'png', quality: 1, success: r => resolve(r.tempFilePath), fail: error => reject(new Error(error.errMsg || '预览生成失败')) })
    })
  },

  removeBoardBackground() {
    if (!this.grid.some(color => color >= 0) || this.data.converting) return
    pushUndo.call(this)
    this.grid = removeBackgroundByVote(this.grid, this.data.gridSize, this.data.gridSize)
    this.markDirty(); markManualGridEdit.call(this); this.updateStats(); this.draw()
    wx.showToast({ title: '已去除板子边缘背景色', icon: 'success' })
  },

  async applyImageSettings() {
    if (this.data.converting) return
    const draft = { ...this.data.settingsDraft } as SettingsDraft
    if (this.data.hasSourceImage) {
      const applied = await this.convertSourceImage(draft)
      if (applied) this.setData({ showSettings: false, settingsChanged: false })
      return
    }
    if (!canResizeBlankCanvas(false, this.data.totalBeads) && draft.gridSize !== this.data.gridSize) {
      wx.showToast({ title: '已有内容时不能修改画布尺寸', icon: 'none' })
      return
    }
    const sizeChanged = draft.gridSize !== this.data.gridSize
    if (sizeChanged) {
      this.grid = new Int16Array(draft.gridSize * draft.gridSize).fill(-1)
      this.history = []; this.redoHistory = []
    }
    await new Promise<void>(resolve => this.setData({
      conversionMode: draft.conversionMode,
      gridSize: draft.gridSize,
      mergeDistance: draft.mergeDistance,
      showSettings: false,
      settingsChanged: false,
      hasUndo: false,
      hasRedo: false,
      hasManualGridChanges: false,
    }, resolve))
    if (sizeChanged) {
      this.markDirty(); this.updateStats(); this.draw(); this.resetZoom()
    }
  },

  // ── 渲染 ──────────────────────────────────────────────

  draw() {
    if (!this.context || !this.canvasSize || !this.grid.length) return
    const ctx = this.context as CanvasRenderingContext2D
    const size = this.data.gridSize; const cell = this.canvasSize / size
    const view = this.data.view
    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize)
    if (view === 'preview') { this.drawMeltPreview(ctx, size, cell); return }

    ctx.fillStyle = '#f6f6f4'; ctx.fillRect(0, 0, this.canvasSize, this.canvasSize)
    const hl = this.data.highlightedColor

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = this.grid[y * size + x]
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2
        const isHL = hl >= 0 && v === hl; const isDim = hl >= 0 && v >= 0 && v !== hl
        if (view === 'chart') {
          ctx.fillStyle = v >= 0 ? (isDim ? '#f5f3f5' : studioPalette[v].hex) : '#fafafa'
          ctx.fillRect(x * cell, y * cell, cell, cell)
          ctx.strokeStyle = isHL ? '#c63868' : '#eae7ea'
          ctx.lineWidth = isHL ? 2 : cell > 12 ? 0.35 : 0.25
          ctx.strokeRect(x * cell, y * cell, cell, cell)
          if (v >= 0 && cell >= 18) {
            const hex = studioPalette[v].hex
            ctx.fillStyle = isDim ? '#bbb7bc' : (parseInt(hex.slice(1), 16) > 0x999999 ? '#252126' : '#ffffff')
            ctx.font = cell >= 24 ? '9px monospace' : '7px monospace'
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.fillText(studioPalette[v].id.replace('ST', ''), cx, cy)
          }
        } else {
          ctx.beginPath(); ctx.arc(cx, cy, v >= 0 ? cell * 0.39 : Math.max(0.7, cell * 0.08), 0, Math.PI * 2)
          ctx.fillStyle = v >= 0 ? (isDim ? '#e8e6e8' : studioPalette[v].hex) : '#d9d9d5'
          ctx.fill()
          if (v >= 0) {
            ctx.strokeStyle = isHL ? '#c63868' : (isDim ? 'rgba(111,107,112,0.12)' : 'rgba(37,33,38,0.16)')
            ctx.lineWidth = isHL ? Math.max(1.5, cell * 0.14) : Math.max(0.5, cell * 0.045)
            ctx.stroke()
          }
        }
      }
    }
    // 参考线
    ctx.save()
    for (let p = 5; p < size; p += 5) {
      const is10 = p % 10 === 0
      ctx.beginPath(); ctx.setLineDash(is10 ? [] : [4, 3])
      ctx.strokeStyle = is10 ? 'rgba(72,68,74,0.68)' : 'rgba(92,87,94,0.56)'
      ctx.lineWidth = is10 ? 1.3 : 0.9
      ctx.moveTo(p * cell, 0); ctx.lineTo(p * cell, this.canvasSize); ctx.stroke()
      ctx.beginPath(); ctx.setLineDash(is10 ? [] : [4, 3])
      ctx.moveTo(0, p * cell); ctx.lineTo(this.canvasSize, p * cell); ctx.stroke()
    }
    ctx.restore()
  },

  drawMeltPreview(ctx: CanvasRenderingContext2D, size: number, cell: number) {
    const melt = this.data.meltAmount / 100
    ctx.fillStyle = '#eeeeec'; ctx.fillRect(0, 0, this.canvasSize, this.canvasSize)
    const R = (0.385 + 0.16 * melt) * cell, r = (0.155 - 0.129 * melt) * cell, b = (0.035 + 0.245 * melt) * cell
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = this.grid[y * size + x]; if (v < 0) continue
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2, color = studioPalette[v].hex
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()
        if (r > 0.3) {
          const grad = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.3, r * 0.6, cx, cy, R)
          grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.9, color); grad.addColorStop(1, color)
          ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
        }
        const d = b / 2
        const nb: Array<[number, number]> = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
        for (const [nx, ny] of nb) {
          if (nx < 0 || ny < 0 || nx >= size || ny >= size || this.grid[ny * size + nx] < 0) continue
          ctx.fillStyle = color
          if (nx === x + 1) ctx.fillRect(cx, cy - d, R, d * 2)
          if (nx === x - 1) ctx.fillRect(cx - R, cy - d, R, d * 2)
          if (ny === y + 1) ctx.fillRect(cx - d, cy, d * 2, R)
          if (ny === y - 1) ctx.fillRect(cx - d, cy - R, d * 2, R)
        }
      }
    }
  },

  // ── 统计 ──────────────────────────────────────────────

  updateStats() {
    if (!this.grid.length) return
    const counts = new Map<number, number>(); let total = 0
    for (const v of this.grid) { if (v >= 0) { counts.set(v, (counts.get(v) ?? 0) + 1); total++ } }
    const colorStats: ColorStat[] = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([idx, ct]) => ({
      index: idx,
      count: ct,
      id: studioPalette[idx].id,
      name: studioPalette[idx].name,
      hex: studioPalette[idx].hex,
      foreground: readableColorText(studioPalette[idx].hex),
    }))
    const usedColorIndices = usedGridColors(this.grid)
    const visiblePaletteColors = filterPaletteColors(paletteColors, this.data.paletteFilter, this.data.paletteQuery, usedColorIndices)
    const bc = Math.ceil(this.data.gridSize / 29) * Math.ceil(this.data.gridSize / 29)
    this.setData({ colorStats, usedColorIndices, visiblePaletteColors, totalBeads: total, boardCount: bc })
  },

  // ── 编辑工具 ──────────────────────────────────────────

  pushUndo() { pushUndo.call(this) },
  markDirty() { markDirty.call(this) },

  selectTool(e: WechatMiniprogram.TouchEvent) {
    if (this.data.converting || this.data.focusMode) return
    const tool = e.currentTarget.dataset.tool as EditorTool
    if (!['brush', 'eraser', 'eyedropper', 'fill', 'move', 'replace', 'exclude'].includes(tool)) return
    if (tool === 'exclude' && !this.data.hasSourceImage) {
      wx.showToast({ title: '空白创作无法自动排除颜色', icon: 'none' })
      return
    }
    const usesPalette = tool === 'brush' || tool === 'eyedropper' || tool === 'fill' || tool === 'replace'
    if (usesPalette && this.data.tool === tool && this.data.paletteOpen) {
      this.setData({ paletteOpen: false })
      return
    }
    const leavingReplace = this.data.tool === 'replace' && tool !== 'replace'
    const clearHighlight = this.data.highlightedColor >= 0 && tool !== this.data.tool
    this.setData({
      tool,
      paletteOpen: false,
      showSettings: false,
      highlightedColor: leavingReplace || clearHighlight ? -1 : this.data.highlightedColor,
      replaceSourceColor: tool === 'replace' ? this.data.replaceSourceColor : -1,
      replaceSourceColorId: tool === 'replace' ? this.data.replaceSourceColorId : '',
      replaceSourceMeta: tool === 'replace' ? this.data.replaceSourceMeta : emptyReplacementMeta,
      replaceResultText: tool === 'replace' ? this.data.replaceResultText : '',
    }, () => {
      if (usesPalette) {
        const locate = tool === 'brush' || tool === 'fill' ? this.data.selectedColor : -1
        showToolPalette.call(this, tool as PaletteContext, undefined, undefined, locate)
      }
      if (leavingReplace || clearHighlight) this.draw()
    })
    hapticLight()
  },
  selectView(e: WechatMiniprogram.TouchEvent) {
    const v = e.currentTarget.dataset.view as string
    if (this.data.focusMode && v !== 'chart') { wx.showToast({ title: '请先退出专注模式', icon: 'none' }); return }
    if (v === 'source' && !this.data.hasSourceImage) return
    if (['source', 'chart', 'edit', 'preview'].includes(v)) {
      this.setData({ view: v, paletteOpen: v === 'source' ? false : this.data.paletteOpen } as any)
      this.draw()
    }
  },
  selectColor(e: WechatMiniprogram.TouchEvent) {
    if (this.data.converting) return
    const index = Number(e.currentTarget.dataset.index)
    const color = studioPalette[index]
    if (!color) return
    if (this.data.tool === 'replace') {
      const source = this.data.replaceSourceColor
      if (source < 0) { wx.showToast({ title: '请先点击画布中的旧颜色', icon: 'none' }); return }
      if (source === index) { wx.showToast({ title: '新旧颜色相同，请选择其他颜色', icon: 'none' }); return }
      const sourceMeta = createReplacementMeta(this.grid, source, studioPalette[source].id, studioPalette[source].hex)
      if (sourceMeta.count === 0) {
        resetReplacementSource.call(this)
        wx.showToast({ title: '旧色已不存在，请重新选择', icon: 'none' })
        return
      }
      pushUndo.call(this)
      this.grid = replaceGridColor(this.grid, source, index)
      markDirty.call(this)
      markManualGridEdit.call(this)
      this.setData({
        selectedColor: index,
        selectedColorHex: color.hex,
        selectedColorId: color.id,
        highlightedColor: -1,
        replaceSourceColor: -1,
        replaceSourceColorId: '',
        replaceSourceMeta: emptyReplacementMeta,
        replaceResultText: formatReplacementResult(sourceMeta, color.id),
        replaceResultSourceHex: sourceMeta.hex,
        replaceResultTargetHex: color.hex,
        paletteHint: '替换完成，可继续点击画布选择旧色',
      })
      this.updateStats(); this.draw()
      hapticLight()
      wx.showToast({ title: `已替换 ${sourceMeta.count} 颗`, icon: 'success' })
      return
    }
    if (this.data.tool === 'fill') {
      const presentation = palettePresentation('fill')
      this.setData({
        selectedColor: index,
        selectedColorHex: color.hex,
        selectedColorId: color.id,
        tool: 'fill',
        paletteContext: 'fill',
        paletteTitle: presentation.title,
        paletteHint: `当前填充颜色 ${color.id}`,
        paletteOpen: false,
      })
      hapticLight()
      return
    }
    const fromEyedropper = this.data.tool === 'eyedropper'
    const presentation = palettePresentation('brush')
    this.setData({
      selectedColor: index,
      selectedColorHex: color.hex,
      selectedColorId: color.id,
      tool: 'brush',
      paletteContext: 'brush',
      paletteTitle: presentation.title,
      paletteHint: fromEyedropper ? `已选择 ${color.id}，可直接绘制` : presentation.hint,
      paletteOpen: true,
    }, () => locatePaletteColor.call(this, index))
    hapticLight()
  },
  togglePalette() {
    if (!['brush', 'eyedropper', 'fill', 'replace'].includes(this.data.tool)) return
    if (this.data.paletteOpen) { this.setData({ paletteOpen: false }); return }
    showToolPalette.call(this, this.data.tool as PaletteContext, this.data.paletteFilter, this.data.paletteHint, this.data.selectedColor)
  },
  selectPaletteFilter(e: WechatMiniprogram.TouchEvent) {
    const filter = e.currentTarget.dataset.filter as PaletteFilter
    if (filter !== 'all' && filter !== 'used') return
    this.setData({ paletteFilter: filter, paletteScrollIntoView: '', visiblePaletteColors: filterPaletteColors(paletteColors, filter, this.data.paletteQuery, this.data.usedColorIndices) })
  },
  inputPaletteSearch(e: WechatMiniprogram.Input) {
    const paletteQuery = e.detail.value.slice(0, 24)
    this.setData({ paletteQuery, paletteScrollIntoView: '', visiblePaletteColors: filterPaletteColors(paletteColors, this.data.paletteFilter, paletteQuery, this.data.usedColorIndices) })
  },
  highlightColor(e: WechatMiniprogram.TouchEvent) {
    const idx = Number(e.currentTarget.dataset.index)
    if (!studioPalette[idx]) return
    if (this.data.focusMode) { activateFocusColor.call(this, idx); return }
    this.setData({ highlightedColor: this.data.highlightedColor === idx ? -1 : idx }, () => this.draw())
  },
  resetReplaceSource() { resetReplacementSource.call(this) },
  excludeColor(e: WechatMiniprogram.TouchEvent) {
    void this.excludeColorIndex(Number(e.currentTarget.dataset.index))
  },
  async excludeColorIndex(idx: number) {
    if (this.data.converting) return
    if (!this.data.hasSourceImage || !this.sourceImagePath) { wx.showToast({ title: '空白创作无法自动排除颜色', icon: 'none' }); return }
    if (!studioPalette[idx]) return
    if (this.data.excludedColors.includes(idx)) return
    const ex = [...this.data.excludedColors, idx]
    const allowed = usedGridColors(this.grid).filter(color => !ex.includes(color))
    if (allowed.length === 0) {
      wx.showToast({ title: '材料清单至少需要保留一种颜色', icon: 'none' })
      return
    }
    const excludedCount = this.data.colorStats.find((item: ColorStat) => item.index === idx)?.count ?? 0
    const items = [...this.data.excludedItems, {
      index: idx,
      id: studioPalette[idx].id,
      hex: studioPalette[idx].hex,
      name: studioPalette[idx].name,
      count: excludedCount,
    }]
    const previous = {
      excludedColors: [...this.data.excludedColors],
      excludedItems: [...this.data.excludedItems],
      exclusionAllowedColors: [...this.data.exclusionAllowedColors],
    }
    await new Promise<void>(resolve => this.setData({ excludedColors: ex, excludedItems: items, exclusionAllowedColors: allowed }, resolve))
    const converted = await this.convertSourceImage()
    if (!converted) {
      this.setData(previous)
      return
    }
    wx.showToast({ title: `已排除 ${studioPalette[idx].id}，未增加新色`, icon: 'success' })
  },
  async restoreColor(e: WechatMiniprogram.TouchEvent) {
    if (this.data.converting) return
    const idx = Number(e.currentTarget.dataset.index)
    const ex = this.data.excludedColors.filter(i => i !== idx)
    const items = this.data.excludedItems.filter(i => i.index !== idx)
    const allowed = ex.length
      ? [...new Set([...this.data.exclusionAllowedColors, idx])].sort((a, b) => a - b)
      : []
    const previous = {
      excludedColors: [...this.data.excludedColors],
      excludedItems: [...this.data.excludedItems],
      exclusionAllowedColors: [...this.data.exclusionAllowedColors],
    }
    await new Promise<void>(resolve => this.setData({ excludedColors: ex, excludedItems: items, exclusionAllowedColors: allowed }, resolve))
    if (this.sourceImagePath && !(await this.convertSourceImage())) this.setData(previous)
  },
  async restoreAllColors() {
    if (this.data.converting) return
    const previous = {
      excludedColors: [...this.data.excludedColors],
      excludedItems: [...this.data.excludedItems],
      exclusionAllowedColors: [...this.data.exclusionAllowedColors],
    }
    await new Promise<void>(resolve => this.setData({ excludedColors: [], excludedItems: [], exclusionAllowedColors: [] }, resolve))
    if (this.sourceImagePath && !(await this.convertSourceImage())) this.setData(previous)
  },
  mirrorHorizontal() {
    if (!this.grid.length || this.data.view === 'source' || this.data.converting || this.data.workLoading || this.data.workLoadError) return
    if (this.grid.length !== this.data.gridSize * this.data.gridSize) { wx.showToast({ title: '请先重新生成图纸', icon: 'none' }); return }
    pushUndo.call(this)
    this.grid = mirrorGridHorizontal(this.grid, this.data.gridSize, this.data.gridSize)
    markDirty.call(this)
    markManualGridEdit.call(this)
    this.updateStats(); this.draw()
    wx.showToast({ title: '已左右镜像', icon: 'success' })
  },

  // ── 专注拼豆 ──────────────────────────────────────────

  toggleFocusMode() {
    if (this.data.focusMode) { exitFocusMode.call(this); return }
    if (this.data.converting || this.data.workLoading || this.data.workLoadError) {
      wx.showToast({ title: this.data.workLoadError ? '请先重新加载图纸' : '图纸准备中，请稍候', icon: 'none' })
      return
    }
    if (this.data.totalBeads === 0) { wx.showToast({ title: '当前图纸还没有可拼颜色', icon: 'none' }); return }
    clearFocusInterval.call(this)
    this._focusStartedAt = 0
    this._focusAccumulatedSeconds = 0
    this.setData({
      focusMode: true,
      focusRunning: false,
      focusElapsedSeconds: 0,
      focusTimeText: '00:00',
      focusColorIndex: -1,
      focusColorId: '',
      focusColorHex: 'transparent',
      view: 'chart',
      tool: 'move',
      paletteOpen: false,
      showSettings: false,
      highlightedColor: -1,
      replaceSourceColor: -1,
      replaceSourceColorId: '',
      replaceSourceMeta: emptyReplacementMeta,
      replaceResultText: '',
    }, () => this.draw())
    hapticLight()
  },
  selectFocusColor(e: WechatMiniprogram.TouchEvent) {
    activateFocusColor.call(this, Number(e.currentTarget.dataset.index))
  },
  toggleFocusTimer() {
    if (this.data.focusColorIndex < 0) { wx.showToast({ title: '请先选择正在拼的颜色', icon: 'none' }); return }
    if (this.data.focusRunning) pauseFocusClock.call(this)
    else startFocusClock.call(this)
  },
  exitFocusMode() { exitFocusMode.call(this) },

  // ── 设置 ──────────────────────────────────────────────

  toggleSettings() {
    if (this.data.focusMode) { wx.showToast({ title: '请先退出专注模式', icon: 'none' }); return }
    if (this.data.showSettings) { this.cancelSettings(); return }
    this.openSettings()
  },
  openSettings() {
    const settingsDraft = createSettingsDraft(this.data.conversionMode, this.data.gridSize, this.data.mergeDistance)
    this.setData({ showSettings: true, paletteOpen: false, settingsDraft, settingsChanged: false, convertError: '' })
  },
  cancelSettings() {
    if (this.data.converting) return
    const settingsDraft = createSettingsDraft(this.data.conversionMode, this.data.gridSize, this.data.mergeDistance)
    this.setData({ showSettings: false, settingsDraft, settingsChanged: false, convertError: '' })
  },
  selectMode(e: WechatMiniprogram.TouchEvent) {
    updateSettingsDraft.call(this, { conversionMode: e.currentTarget.dataset.mode as ConversionMode })
  },
  changeGridSize(e: WechatMiniprogram.SliderChange) {
    if (!canResizeBlankCanvas(this.data.hasSourceImage, this.data.totalBeads)) return
    updateSettingsDraft.call(this, { gridSize: Math.round(Number(e.detail.value)) })
  },
  changeMergeDistance(e: WechatMiniprogram.SliderChange) {
    updateSettingsDraft.call(this, { mergeDistance: Number(e.detail.value) })
  },
  changeMelt(e: WechatMiniprogram.SliderChange) { this.setData({ meltAmount: Number(e.detail.value) }); if (this.data.view === 'preview') this.draw() },
  selectMeltPreset(e: WechatMiniprogram.TouchEvent) { this.setData({ meltAmount: Number(e.currentTarget.dataset.melt) }); if (this.data.view === 'preview') this.draw() },

  // ── 撤销/重做 ─────────────────────────────────────────

  undo() {
    if (this.data.converting) return
    const prev = this.history.pop(); if (!prev) return
    this.redoHistory.push(createGridSnapshot.call(this)); if (this.redoHistory.length > 40) this.redoHistory.shift()
    this.grid = new Int16Array(prev.cells); this.markDirty()
    markManualGridEdit.call(this)
    this.setData({
      gridSize: prev.gridSize,
      conversionMode: prev.conversionMode,
      mergeDistance: prev.mergeDistance,
      hasUndo: this.history.length > 0,
      hasRedo: true,
      highlightedColor: -1,
      replaceSourceColor: -1,
      replaceSourceColorId: '',
      replaceSourceMeta: emptyReplacementMeta,
      replaceResultText: '',
      paletteHint: this.data.tool === 'replace' ? palettePresentation('replace').hint : this.data.paletteHint,
    }); this.updateStats(); this.draw()
  },
  redo() {
    if (this.data.converting) return
    const next = this.redoHistory.pop(); if (!next) return
    this.history.push(createGridSnapshot.call(this)); if (this.history.length > 40) this.history.shift()
    this.grid = new Int16Array(next.cells); this.markDirty()
    markManualGridEdit.call(this)
    this.setData({
      gridSize: next.gridSize,
      conversionMode: next.conversionMode,
      mergeDistance: next.mergeDistance,
      hasUndo: true,
      hasRedo: this.redoHistory.length > 0,
      highlightedColor: -1,
      replaceSourceColor: -1,
      replaceSourceColorId: '',
      replaceSourceMeta: emptyReplacementMeta,
      replaceResultText: '',
      paletteHint: this.data.tool === 'replace' ? palettePresentation('replace').hint : this.data.paletteHint,
    }); this.updateStats(); this.draw()
  },

  // ── 缩放 ──────────────────────────────────────────────

  zoomIn() { this.zoomTo(Math.min(3, this.data.canvasScale + 0.25), this.viewportW / 2, this.viewportH / 2) },
  zoomOut() { this.zoomTo(Math.max(0.5, this.data.canvasScale - 0.25), this.viewportW / 2, this.viewportH / 2) },
  toggleZoom(t?: WechatMiniprogram.TouchDetail) {
    const target = this.data.canvasScale > 1.01 ? 1 : 2
    if (target === 1) { this.setZoom(1, 0, 0); return }
    const fx = t ? t.clientX - this._viewportLeft : this.viewportW / 2
    const fy = t ? t.clientY - this._viewportTop : this.viewportH / 2
    this.zoomTo(target, fx, fy)
  },
  resetZoom() { this.setZoom(1, 0, 0) },

  setZoom(scale: number, tx: number, ty: number) {
    this.setData({
      canvasScale: Math.round(scale * 100) / 100,
      canvasTranslateX: Math.round(tx),
      canvasTranslateY: Math.round(ty),
      zoomPercent: String(Math.round(scale * 100)),
    })
  },

  zoomTo(scale: number, focalX: number, focalY: number) {
    const cfx = (focalX - this.data.canvasTranslateX) / this.data.canvasScale
    const cfy = (focalY - this.data.canvasTranslateY) / this.data.canvasScale
    const ns = Math.max(0.5, Math.min(3, scale))
    this.setZoom(ns, focalX - cfx * ns, focalY - cfy * ns)
  },

  // ── 触摸（修复：放大后不误画笔）───────────────────────

  onCanvasTouch(e: WechatMiniprogram.TouchEvent) { onCanvasTouch.call(this, e) },

  // ── 标题 ──────────────────────────────────────────────
  inputTitle(e: WechatMiniprogram.Input) { this.setData({ title: e.detail.value.slice(0, 40) }); this.markDirty() },

  // ── 保存 / 导出 ───────────────────────────────────────
  async importImage() {
    if (this.data.converting || this.data.saving || this.data.exporting) return
    if (this.data.focusMode) { wx.showToast({ title: '请先退出专注模式', icon: 'none' }); return }
    if (this.dirty) {
      const confirmed = await new Promise<boolean>(resolve => {
        wx.showModal({
          title: '导入新图片',
          content: '当前未保存的修改将被替换，是否继续？',
          confirmText: '继续导入',
          confirmColor: '#C42D5D',
          success: ({ confirm }) => resolve(confirm),
          fail: () => resolve(false),
        })
      })
      if (!confirmed) return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: ({ tempFiles }) => {
        const file = tempFiles[0]
        if (!file?.tempFilePath) { wx.showToast({ title: '未读取到图片', icon: 'none' }); return }
        if (Number(file.size) > 20 * 1024 * 1024) { wx.showToast({ title: '图片不能超过20MB', icon: 'none' }); return }
        void this.replaceSourceImage(file.tempFilePath)
      },
      fail: ({ errMsg }) => {
        if (!errMsg.toLowerCase().includes('cancel')) wx.showToast({ title: '图片选择失败', icon: 'none' })
      },
    })
  },

  async replaceSourceImage(path: string) {
    this.sourceImagePath = path
    this.modifiedSourcePixels = null
    this.sourcePatternId = ''; this.sourceCollectionId = ''
    this.workId = `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.workVersion = 0
    this.history = []; this.redoHistory = []
    this.grid = new Int16Array(this.data.gridSize * this.data.gridSize).fill(-1)
    this.dirty = false
    wx.disableAlertBeforeUnload?.()
    this.setZoom(1, 0, 0)
    await new Promise<void>(resolve => this.setData({
      hasSourceImage: true,
      sourcePreview: path,
      sourceImageRemoved: false,
      convertError: '',
      view: 'chart',
      tool: 'move',
      paletteOpen: false,
      paletteContext: 'brush',
      paletteTitle: initialPalette.title,
      paletteHint: initialPalette.hint,
      paletteFilter: 'all',
      paletteQuery: '',
      paletteScrollIntoView: '',
      visiblePaletteColors: paletteColors,
      replaceSourceColor: -1,
      replaceSourceColorId: '',
      replaceSourceMeta: emptyReplacementMeta,
      replaceResultText: '',
      showSettings: false,
      title: '照片拼豆图纸',
      highlightedColor: -1,
      excludedColors: [],
      excludedItems: [],
      exclusionAllowedColors: [],
      hasUndo: false,
      hasRedo: false,
      hasManualGridChanges: false,
    }, resolve))
    const converted = await this.convertSourceImage()
    if (converted) this.openSettings()
  },

  async save() { await save.call(this) },
  async exportImage() { await exportImage.call(this) },
  exportPreview() { return exportPreview.call(this) },

  // ── 手机绑定 ──────────────────────────────────────────
  noop() {},
  closePhoneBinding() { if (!this.data.bindingPhone) this.setData({ showPhoneBinding: false }) },
  async bindPhoneAndSave(e: GetPhoneNumberEvent) { await bindPhoneAndSave.call(this, e) },
})

// ══════════════════════════════════════════════════════════
// 模块级辅助函数
// ══════════════════════════════════════════════════════════

function createGridSnapshot(this: any): GridSnapshot {
  return {
    cells: new Int16Array(this.grid),
    gridSize: this.data.gridSize,
    conversionMode: this.data.conversionMode,
    mergeDistance: this.data.mergeDistance,
  }
}
function readableColorText(hex: string): '#252126' | '#ffffff' {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return (red * 299 + green * 587 + blue * 114) / 1000 > 156 ? '#252126' : '#ffffff'
}
function pushUndo(this: any) {
  this.history.push(createGridSnapshot.call(this)); if (this.history.length > 40) this.history.shift()
  this.redoHistory = []; this.setData({ hasUndo: true, hasRedo: false })
}
function markDirty(this: any) {
  if (this.dirty) return; this.dirty = true
  wx.enableAlertBeforeUnload?.({ message: '当前修改尚未保存，确认离开？' })
}
function markManualGridEdit(this: any) {
  if (!this.data.hasManualGridChanges) this.setData({ hasManualGridChanges: true })
}
function hapticLight() {
  wx.vibrateShort({ type: 'light', fail: () => undefined })
}
function locatePaletteColor(this: any, index: number) {
  if (index < 0 || !this.data.visiblePaletteColors.some((color: PaletteColor) => color.index === index)) return
  const target = `palette-color-${index}`
  this.setData({ paletteScrollIntoView: '' }, () => this.setData({ paletteScrollIntoView: target }))
}
function showToolPalette(
  this: any,
  context: PaletteContext,
  filter?: PaletteFilter,
  hint?: string,
  locateIndex = -1,
) {
  const presentation = palettePresentation(context)
  const paletteFilter = filter ?? presentation.filter
  const visiblePaletteColors = filterPaletteColors(paletteColors, paletteFilter, '', this.data.usedColorIndices)
  this.setData({
    paletteOpen: true,
    showSettings: false,
    paletteContext: context,
    paletteTitle: presentation.title,
    paletteHint: hint ?? presentation.hint,
    paletteFilter,
    paletteQuery: '',
    paletteScrollIntoView: '',
    visiblePaletteColors,
  }, () => {
    locatePaletteColor.call(this, locateIndex)
    revealCanvasAbovePalette()
  })
}
function revealCanvasAbovePalette() {
  wx.nextTick(() => {
    wx.pageScrollTo({ selector: '#editor-canvas-card', duration: 180 })
  })
}
function resetReplacementSource(this: any) {
  const presentation = palettePresentation('replace')
  this.setData({
    replaceSourceColor: -1,
    replaceSourceColorId: '',
    replaceSourceMeta: emptyReplacementMeta,
    replaceResultText: '',
    highlightedColor: -1,
    paletteHint: presentation.hint,
  }, () => this.draw())
}
function updateSettingsDraft(this: any, patch: Partial<SettingsDraft>) {
  const settingsDraft = { ...this.data.settingsDraft, ...patch } as SettingsDraft
  const current = createSettingsDraft(this.data.conversionMode, this.data.gridSize, this.data.mergeDistance)
  this.setData({ settingsDraft, settingsChanged: settingsDraftChanged(current, settingsDraft) })
}
function currentFocusElapsed(this: any): number {
  const activeSeconds = this._focusStartedAt > 0 ? Math.floor((Date.now() - this._focusStartedAt) / 1000) : 0
  return Math.max(0, this._focusAccumulatedSeconds + activeSeconds)
}
function syncFocusClock(this: any) {
  const focusElapsedSeconds = currentFocusElapsed.call(this)
  this.setData({ focusElapsedSeconds, focusTimeText: formatFocusTime(focusElapsedSeconds) })
}
function clearFocusInterval(this: any) {
  if (this._focusTimer !== null) clearInterval(this._focusTimer)
  this._focusTimer = null
}
function startFocusClock(this: any) {
  if (!this.data.focusMode || this.data.focusRunning) return
  clearFocusInterval.call(this)
  this._focusStartedAt = Date.now()
  this.setData({ focusRunning: true })
  syncFocusClock.call(this)
  this._focusTimer = setInterval(() => syncFocusClock.call(this), 500)
}
function pauseFocusClock(this: any) {
  if (this._focusStartedAt > 0) this._focusAccumulatedSeconds = currentFocusElapsed.call(this)
  this._focusStartedAt = 0
  clearFocusInterval.call(this)
  if (this.data.focusRunning) {
    this.setData({
      focusRunning: false,
      focusElapsedSeconds: this._focusAccumulatedSeconds,
      focusTimeText: formatFocusTime(this._focusAccumulatedSeconds),
    })
  }
}
function activateFocusColor(this: any, index: number) {
  const color = studioPalette[index]
  if (!this.data.focusMode || !color || !this.grid.includes(index)) return
  this.setData({
    focusColorIndex: index,
    focusColorId: color.id,
    focusColorHex: color.hex,
    highlightedColor: index,
  }, () => {
    this.draw()
    if (!this.data.focusRunning) startFocusClock.call(this)
  })
  hapticLight()
}
function exitFocusMode(this: any) {
  const elapsed = currentFocusElapsed.call(this)
  this._focusAccumulatedSeconds = elapsed
  this._focusStartedAt = 0
  clearFocusInterval.call(this)
  this.setData({
    focusMode: false,
    focusRunning: false,
    focusElapsedSeconds: 0,
    focusTimeText: '00:00',
    focusColorIndex: -1,
    focusColorId: '',
    focusColorHex: 'transparent',
    highlightedColor: -1,
  }, () => this.draw())
  wx.showToast({ title: elapsed > 0 ? `本次专注 ${formatFocusTime(elapsed)}` : '已退出专注模式', icon: 'none' })
}
function toolStartsUndo(tool: EditorTool) { return tool === 'brush' || tool === 'eraser' }

// ── 触摸（修复手势冲突）─────────────────────────────────

function onCanvasTouch(this: any, event: WechatMiniprogram.TouchEvent) {
  const touches = event.touches, type = event.type
  const vx = (t: any) => t.clientX - this._viewportLeft
  const vy = (t: any) => t.clientY - this._viewportTop

  if (type === 'touchstart') {
    if (touches.length >= 2) {
      this._gestureType = 'pinch'; this.drawing = false; this._wasPinching = true
      const t1 = touches[0], t2 = touches[1]
      this._zoomStartDist = Math.hypot(vx(t2) - vx(t1), vy(t2) - vy(t1))
      this._zoomBaseScale = this.data.canvasScale; this._zoomBaseTx = this.data.canvasTranslateX; this._zoomBaseTy = this.data.canvasTranslateY
      const mx = (vx(t1) + vx(t2)) / 2, my = (vy(t1) + vy(t2)) / 2
      this._focalCanvasX = (mx - this._zoomBaseTx) / this._zoomBaseScale
      this._focalCanvasY = (my - this._zoomBaseTy) / this._zoomBaseScale
      return
    }
    if (touches.length === 1) {
      const now = Date.now()
      if (now - this._lastTapTime < 300) { this._lastTapTime = 0; this.toggleZoom(touches[0]); return }
      this._lastTapTime = now
      if (this.data.tool === 'move') {
        this._gestureType = 'pan'
        this._panStartX = vx(touches[0]); this._panStartY = vy(touches[0])
        this._panBaseTx = this.data.canvasTranslateX; this._panBaseTy = this.data.canvasTranslateY
      } else {
        this._gestureType = 'paint'
        if (toolStartsUndo(this.data.tool)) { pushUndo.call(this); markDirty.call(this) }
        this.drawing = true
        this.lastTouchX = -1; this.lastTouchY = -1
        paintTouch.call(this, touches[0])
      }
      return
    }
    return
  }

  if (type === 'touchmove') {
    if (this._gestureType === 'pinch' && touches.length >= 2) {
      const t1 = touches[0], t2 = touches[1]; const dist = Math.hypot(vx(t2) - vx(t1), vy(t2) - vy(t1))
      if (this._zoomStartDist < 1) return
      const ratio = dist / this._zoomStartDist
      const ns = Math.max(0.5, Math.min(3, this._zoomBaseScale * ratio))
      const ds = this._zoomBaseScale - ns
      this.setZoom(ns,
        Math.round(this._focalCanvasX * ds + this._zoomBaseTx),
        Math.round(this._focalCanvasY * ds + this._zoomBaseTy),
      )
      return
    }
    if (this._gestureType === 'pan' && touches.length === 1) {
      this.setData({
        canvasTranslateX: Math.round(this._panBaseTx + vx(touches[0]) - this._panStartX),
        canvasTranslateY: Math.round(this._panBaseTy + vy(touches[0]) - this._panStartY),
      })
      return
    }
    if (this._gestureType === 'paint' && touches.length >= 1 && this.drawing) {
      paintTouch.call(this, touches[0]); return
    }
    return
  }

  if (type === 'touchend' || type === 'touchcancel') {
    if (this._gestureType === 'paint') { this.drawing = false; this.updateStats() }
    if (touches.length === 0) { this._gestureType = ''; this.drawing = false; this._wasPinching = false }
    else if (touches.length === 1) {
      // 捏合后松手 → 永远优先平移
      if (this._wasPinching || this.data.tool === 'move') {
        this._gestureType = 'pan'; this.drawing = false
        this._panStartX = vx(touches[0]); this._panStartY = vy(touches[0])
        this._panBaseTx = this.data.canvasTranslateX; this._panBaseTy = this.data.canvasTranslateY
      } else {
        this._gestureType = 'paint'; this.drawing = true
        if (toolStartsUndo(this.data.tool)) { pushUndo.call(this); markDirty.call(this) }
        this.lastTouchX = -1; this.lastTouchY = -1
      }
    }
    return
  }
}

function paintTouch(this: any, touch: any) {
  const size = this.data.gridSize, s = this.data.canvasScale
  const tx = this.data.canvasTranslateX, ty = this.data.canvasTranslateY
  const lx = ((touch.clientX - this._viewportLeft - tx) / s) / this.canvasSize * size
  const ly = ((touch.clientY - this._viewportTop - ty) / s) / this.canvasSize * size
  const x = Math.floor(lx), y = Math.floor(ly)
  if (x < 0 || y < 0 || x >= size || y >= size) return
  // 防连续误触
  if (this.lastTouchX === x && this.lastTouchY === y) return
  this.lastTouchX = x; this.lastTouchY = y
  applyToolAt.call(this, x, y)
}

function applyToolAt(this: any, x: number, y: number) {
  const size = this.data.gridSize, tool = this.data.tool, idx = y * size + x
  if (tool === 'eyedropper') {
    const v = this.grid[idx]
    if (v < 0) {
      wx.showToast({ title: '这个格子没有颜色，请点击有颜色的格子', icon: 'none' })
    } else {
      const color = studioPalette[v]
      this.setData({ selectedColor: v, selectedColorHex: color.hex, selectedColorId: color.id, tool: 'brush' }, () => {
        showToolPalette.call(this, 'brush', 'used', `已取色 ${color.id}，可直接绘制`, v)
      })
      hapticLight()
    }
    this.drawing = false
    return
  }
  if (tool === 'replace') {
    const source = this.grid[idx]
    if (source < 0) wx.showToast({ title: '请选择有颜色的格子', icon: 'none' })
    else {
      const color = studioPalette[source]
      const sourceMeta = createReplacementMeta(this.grid, source, color.id, color.hex)
      this.setData({
        replaceSourceColor: source,
        replaceSourceColorId: color.id,
        replaceSourceMeta: sourceMeta,
        replaceResultText: '',
        highlightedColor: source,
      }, () => {
        showToolPalette.call(this, 'replace', 'all', `已选择旧色 ${color.id}，请选择新颜色`)
        this.draw()
      })
      hapticLight()
    }
    this.drawing = false
    return
  }
  if (tool === 'exclude') {
    const source = this.grid[idx]
    if (source < 0) wx.showToast({ title: '请选择有颜色的格子', icon: 'none' })
    else void this.excludeColorIndex(source)
    this.drawing = false
    return
  }
  if (tool === 'fill') {
    if (this.grid[idx] !== this.data.selectedColor) {
      pushUndo.call(this)
      markDirty.call(this)
      markManualGridEdit.call(this)
      floodFill.call(this, x, y)
      hapticLight()
    }
    this.drawing = false
    return
  }
  const color = tool === 'eraser' ? -1 : this.data.selectedColor
  if (this.grid[idx] === color) return
  this.grid[idx] = color
  markManualGridEdit.call(this)
  this.draw()
}
function floodFill(this: any, sx: number, sy: number) {
  const size = this.data.gridSize, src = this.grid[sy * size + sx]
  const repl = this.data.tool === 'eraser' ? -1 : this.data.selectedColor
  if (src === repl) return
  const q = [sy * size + sx]; const v = new Uint8Array(size * size)
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (v[i] || this.grid[i] !== src) continue
    v[i] = 1; this.grid[i] = repl
    const cx = i % size, cy = Math.floor(i / size)
    if (cx > 0) q.push(i - 1); if (cx < size - 1) q.push(i + 1)
    if (cy > 0) q.push(i - size); if (cy < size - 1) q.push(i + size)
  }
  this.draw()
}

// ── 保存 ────────────────────────────────────────────────

async function save(this: any) {
  if (this.data.saving || this.data.converting || this.data.workLoading || this.data.workLoadError || !this.canvas) return
  this.setData({ saving: true }); wx.showLoading({ title: '正在保存', mask: true })
  let uploadedFileId = ''
  try {
    const app = getApp<IAppOption>()
    if (!app.globalData.cloudUser) await app.bootstrapCloudUser()
    const userId = app.globalData.cloudUser?.id
    if (!userId) throw new Error('用户信息尚未准备好')
    if (!app.globalData.cloudUser?.phoneBound) { this.setData({ showPhoneBinding: true }); return }
    const tempFilePath = await exportPreview.call(this)
    const upload = await wx.cloud.uploadFile({ cloudPath: `user-works/${userId}/${this.workId}-${Date.now()}.png`, filePath: tempFilePath })
    uploadedFileId = upload.fileID; trackPendingWorkUpload(userId, uploadedFileId)
    const size = this.data.gridSize
    const gridForSave: string[][] = []
    for (let y = 0; y < size; y++) {
      const row: string[] = []
      for (let x = 0; x < size; x++) { const v = this.grid[y * size + x]; row.push(v >= 0 ? studioPalette[v].hex : '#FFFFFF') }
      gridForSave.push(row)
    }
    const result = await callUserService<any>('saveWork', {
      workId: this.workId, expectedVersion: this.workVersion,
      title: this.data.title.trim() || '未命名作品', grid: gridForSave,
      colorCount: studioPalette.length, previewMode: this.data.view,
      previewFileId: upload.fileID, sourcePatternId: this.sourcePatternId, sourceCollectionId: this.sourceCollectionId,
    })
    releasePendingWorkUploads([uploadedFileId])
    this.workId = result.id; this.workVersion = result.version; this.dirty = false; wx.disableAlertBeforeUnload?.()
    if (app.globalData.cloudUser) {
      app.globalData.cloudUser.points = result.points; app.globalData.cloudUser.growth = result.growth
      app.globalData.cloudUser.memberLevel = result.memberLevel; wx.setStorageSync('xingqiba-cloud-user', app.globalData.cloudUser)
    }
    app.globalData.points = result.points; if (result.created) app.globalData.works += 1
    wx.showToast({ title: result.rewarded && result.pointsAwarded ? `已保存 +${result.pointsAwarded}积分` : result.created ? '作品已保存' : '作品已更新', icon: 'success' })
  } catch (error) {
    if (uploadedFileId) { try { await callUserService('deleteWorkUpload', { fileId: uploadedFileId }); releasePendingWorkUploads([uploadedFileId]) } catch {} }
    const msg = error instanceof Error ? error.message : '作品保存失败'
    if (isCloudServiceError(error, 'PHONE_REQUIRED')) this.setData({ showPhoneBinding: true })
    else if (isCloudServiceError(error, 'CONFLICT')) wx.showModal({ title: '云端作品已更新', content: '当前画布没有覆盖云端版本。请返回"我的作品"重新打开后再编辑。', showCancel: false, confirmText: '知道了', confirmColor: '#C42D5D' })
    else wx.showToast({ title: msg, icon: 'none' })
  } finally { wx.hideLoading(); this.setData({ saving: false }) }
}

function exportPreview(this: any): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({ canvas: this.canvas || undefined, fileType: 'png', quality: 1, success: ({ tempFilePath }) => resolve(tempFilePath), fail: () => reject(new Error('预览图生成失败')) })
  })
}

async function exportImage(this: any) {
  if (this.data.exporting || this.data.converting || !this.canvas) return
  this.setData({ exporting: true })
  try {
    const path = await exportPatternPng(this.grid, studioPalette, this.data.title, this.data.gridSize, this.data.gridSize)
    await wx.saveImageToPhotosAlbum({ filePath: path }); wx.showToast({ title: '图纸已保存到相册', icon: 'success' })
  } catch (e: any) {
    if ((e?.errMsg || '').includes('auth deny')) wx.showModal({ title: '需要相册权限', content: '请在设置中允许保存图片到相册。', confirmText: '去设置', confirmColor: '#C42D5D', success: ({ confirm }) => { if (confirm) wx.openSetting() } })
    else wx.showToast({ title: '图纸导出失败', icon: 'none' })
  } finally { this.setData({ exporting: false }) }
}

async function bindPhoneAndSave(this: any, event: GetPhoneNumberEvent) {
  if (this.data.bindingPhone || !event.detail.code) return wx.showToast({ title: '未授权手机号', icon: 'none' })
  this.setData({ bindingPhone: true }); let bound = false
  try {
    const profile = await callUserService<any>('bindPhone', { code: event.detail.code })
    const app = getApp<IAppOption>()
    app.globalData.cloudUser = { id: profile.id, memberLevel: profile.memberLevel, growth: profile.growth, points: profile.points, phoneBound: profile.phoneBound }
    app.globalData.points = profile.points; app.globalData.phone = profile.phoneMasked || '已绑定'
    wx.setStorageSync('xingqiba-cloud-user', app.globalData.cloudUser)
    this.setData({ showPhoneBinding: false }); bound = true
    wx.showToast({ title: '绑定成功，继续保存', icon: 'success' })
  } catch (e) { wx.showToast({ title: e instanceof Error ? e.message : '绑定失败', icon: 'none' }) }
  finally { this.setData({ bindingPhone: false }) }
  if (bound) void save.call(this)
}
