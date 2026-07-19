import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brush,
  CircleDot,
  CloudUpload,
  Dog,
  Download,
  Eraser,
  FileImage,
  Flame,
  Grid3X3,
  Image as ImageIcon,
  Minus,
  Mountain,
  PaintBucket,
  Pipette,
  Plus,
  Redo2,
  Shapes,
  Sparkles,
  Undo2,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PatternCanvas } from './components/PatternCanvas'
import { studioPalette } from './domain/palette'
import { loadProject, saveProject } from './domain/project'
import type { ConvertResult, ConvertSettings, EditorTool, ImageMode, PatternProject } from './domain/types'
import { exportPatternPng } from './engine/export'

const MeltPreview = lazy(() => import('./components/MeltPreview').then((module) => ({ default: module.MeltPreview })))
const ImportDialog = lazy(() => import('./components/ImportDialog').then((module) => ({ default: module.ImportDialog })))

interface WorkerSuccess {
  ok: true
  result: ConvertResult
}

interface WorkerFailure {
  ok: false
  error: string
}

const modeOptions: Array<{ id: ImageMode; label: string; hint: string; icon: LucideIcon }> = [
  { id: 'pixel', label: '像素原图', hint: '不平滑', icon: Grid3X3 },
  { id: 'illustration', label: '动漫插画', hint: '保轮廓', icon: Shapes },
  { id: 'portrait', label: '真人宠物', hint: '保五官', icon: Dog },
  { id: 'photo', label: '风景照片', hint: '保渐变', icon: Mountain },
]

const modeDefaults: Record<ImageMode, Partial<ConvertSettings>> = {
  pixel: { maxColors: 24, contrast: 1, dither: false, cleanupSize: 1 },
  illustration: { maxColors: 20, contrast: 1.08, dither: false, cleanupSize: 3 },
  portrait: { maxColors: 28, contrast: 1.1, dither: false, cleanupSize: 2 },
  photo: { maxColors: 36, contrast: 1.04, dither: true, cleanupSize: 2 },
}

const initialSettings: ConvertSettings = {
  mode: 'portrait',
  width: 64,
  maxColors: 28,
  contrast: 1.1,
  dither: false,
  removeBackground: true,
  cleanupSize: 2,
}

const toolOptions: Array<{ id: EditorTool; label: string; icon: LucideIcon }> = [
  { id: 'brush', label: '画笔', icon: Brush },
  { id: 'eraser', label: '橡皮', icon: Eraser },
  { id: 'eyedropper', label: '吸色', icon: Pipette },
  { id: 'fill', label: '填充', icon: PaintBucket },
]

export default function App() {
  const [project, setProject] = useState<PatternProject>(() => loadProject())
  const [settings, setSettings] = useState(initialSettings)
  const [sourceImage, setSourceImage] = useState<ImageData | null>(null)
  const [sourceName, setSourceName] = useState('')
  const [sourcePreview, setSourcePreview] = useState('')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [tool, setTool] = useState<EditorTool>('brush')
  const [selectedColor, setSelectedColor] = useState(16)
  const [zoom, setZoom] = useState(1)
  const [melt, setMelt] = useState(0.62)
  const [history, setHistory] = useState<Int16Array[]>([])
  const [redoStack, setRedoStack] = useState<Int16Array[]>([])
  const [busy, setBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [message, setMessage] = useState('所有处理均在浏览器本地完成')
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const submittedModeRef = useRef<ImageMode>('portrait')

  useEffect(() => {
    const worker = new Worker(new URL('./workers/converter.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
      setBusy(false)
      if (!event.data.ok) {
        setMessage(event.data.error)
        showToast(event.data.error)
        return
      }
      const now = Date.now()
      const next: PatternProject = {
        id: crypto.randomUUID(),
        name: sourceName ? sourceName.replace(/\.[^.]+$/, '') : '我的拼豆图纸',
        width: event.data.result.width,
        height: event.data.result.height,
        cells: event.data.result.cells,
        createdAt: now,
        updatedAt: now,
        mode: submittedModeRef.current,
      }
      setProject(next)
      setHistory([])
      setRedoStack([])
      setZoom(1)
      setView('edit')
      setMessage(`已生成 ${next.width} × ${next.height} 图纸，可继续精修`)
      showToast('图纸已生成')
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [sourceName])

  useEffect(() => {
    const timer = window.setTimeout(() => saveProject(project), 180)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => () => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview)
  }, [sourcePreview])

  const showToast = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 2800)
  }, [])

  const stats = useMemo(() => {
    const counts = new Map<number, number>()
    let total = 0
    project.cells.forEach((value) => {
      if (value < 0) return
      total += 1
      counts.set(value, (counts.get(value) ?? 0) + 1)
    })
    const colors = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return {
      total,
      colors,
      boards: Math.ceil(project.width / 29) * Math.ceil(project.height / 29),
      physicalWidth: project.width * 0.5,
      physicalHeight: project.height * 0.5,
    }
  }, [project])

  const handleFile = async (file?: File) => {
    if (!file) return
    setMessage('正在读取图片...')
    try {
      const bitmap = await createImageBitmap(file)
      const maxSide = 960
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()
      const image = context.getImageData(0, 0, width, height)
      setSourceImage(image)
      setSourceName(file.name)
      if (sourcePreview) URL.revokeObjectURL(sourcePreview)
      setSourcePreview(URL.createObjectURL(file))
      setMessage(`已载入 ${file.name}，选择模式后生成图纸`)
      showToast('图片已载入')
    } catch {
      setMessage('图片读取失败，请换一张 JPG、PNG 或 WebP')
      showToast('图片读取失败')
    }
  }

  const loadSample = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 640
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.fillStyle = '#d9e2dc'
    context.fillRect(0, 0, 640, 640)
    context.fillStyle = '#6b4938'
    context.beginPath()
    context.ellipse(155, 230, 115, 170, -0.28, 0, Math.PI * 2)
    context.ellipse(485, 230, 115, 170, 0.28, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#e7bd83'
    context.beginPath()
    context.ellipse(320, 300, 225, 245, 0, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#f2d6a6'
    context.beginPath()
    context.ellipse(320, 390, 150, 135, 0, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#2a2524'
    context.beginPath()
    context.ellipse(238, 285, 29, 37, 0, 0, Math.PI * 2)
    context.ellipse(402, 285, 29, 37, 0, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(228, 274, 8, 0, Math.PI * 2)
    context.arc(392, 274, 8, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#3e2d29'
    context.beginPath()
    context.ellipse(320, 380, 48, 38, 0, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = '#4d332c'
    context.lineWidth = 18
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(320, 415)
    context.quadraticCurveTo(300, 452, 270, 446)
    context.moveTo(320, 415)
    context.quadraticCurveTo(340, 452, 370, 446)
    context.stroke()
    const image = context.getImageData(0, 0, 640, 640)
    setSourceImage(image)
    setSourceName('宠物头像示例.png')
    setSourcePreview(canvas.toDataURL('image/png'))
    setSettings((current) => ({ ...current, ...modeDefaults.portrait, mode: 'portrait', width: 64 }))
    setMessage('已载入宠物头像示例，点击生成图纸')
    showToast('示例图片已载入')
  }

  const generate = () => {
    if (!sourceImage || !workerRef.current) {
      fileInputRef.current?.click()
      return
    }
    setBusy(true)
    setMessage('正在分析颜色、匹配色板并清理杂色...')
    submittedModeRef.current = settings.mode
    const copy = new ImageData(new Uint8ClampedArray(sourceImage.data), sourceImage.width, sourceImage.height)
    workerRef.current.postMessage({ image: copy, settings }, [copy.data.buffer])
  }

  const switchMode = (mode: ImageMode) => {
    setSettings((current) => ({ ...current, ...modeDefaults[mode], mode }))
  }

  const beginEdit = useCallback(() => {
    setHistory((current) => [...current, project.cells.slice()].slice(-40))
    setRedoStack([])
  }, [project.cells])

  const changeCells = useCallback((cells: Int16Array) => {
    setProject((current) => ({ ...current, cells, updatedAt: Date.now() }))
  }, [])

  const undo = () => {
    if (!history.length) return
    const previous = history[history.length - 1]
    setRedoStack((current) => [project.cells.slice(), ...current].slice(0, 40))
    setHistory((current) => current.slice(0, -1))
    changeCells(previous)
  }

  const redo = () => {
    if (!redoStack.length) return
    const next = redoStack[0]
    setHistory((current) => [...current, project.cells.slice()].slice(-40))
    setRedoStack((current) => current.slice(1))
    changeCells(next)
  }

  return (
    <div className="studio-app">
      <header className="studio-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span><strong>星期八</strong><small>拼豆工作台</small></span>
        </div>
        <div className="header-status" aria-live="polite">
          <span className={busy ? 'status-dot working' : 'status-dot'} />
          {message}
        </div>
        <div className="header-actions">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
          <button className="button secondary" onClick={() => fileInputRef.current?.click()}><Upload size={18} />导入图片</button>
          <button className="button secondary" onClick={() => exportPatternPng(project, studioPalette)}><Download size={18} />导出图纸</button>
          <button className="button primary" onClick={() => setImportOpen(true)}><CloudUpload size={18} />导入图集</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="control-panel" aria-label="图片转换设置">
          <section className="panel-section upload-section">
            <div className="section-title"><span><FileImage size={18} />源图片</span><small>PNG / JPG / WebP</small></div>
            <button className={`source-drop ${sourcePreview ? 'has-image' : ''}`} onClick={() => fileInputRef.current?.click()}>
              {sourcePreview ? <img src={sourcePreview} alt="待转换的源图片" /> : <><ImageIcon size={28} /><strong>选择一张图片</strong><span>建议主体清晰、背景简单</span></>}
              {sourcePreview && <span className="replace-label">更换图片</span>}
            </button>
            <button className="sample-button" onClick={loadSample}><Dog size={16} />使用宠物头像示例</button>
          </section>

          <section className="panel-section">
            <div className="section-title"><span><Sparkles size={18} />转换模式</span></div>
            <div className="mode-grid">
              {modeOptions.map(({ id, label, hint, icon: Icon }) => (
                <button key={id} className={settings.mode === id ? 'mode-button active' : 'mode-button'} onClick={() => switchMode(id)} aria-pressed={settings.mode === id}>
                  <Icon size={20} /><span><strong>{label}</strong><small>{hint}</small></span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section settings-section">
            <label className="range-field">
              <span>图纸宽度 <b>{settings.width} 格</b></span>
              <input type="range" min="24" max="100" step="2" value={settings.width} onChange={(event) => setSettings({ ...settings, width: Number(event.target.value) })} />
            </label>
            <label className="range-field">
              <span>最多颜色 <b>{settings.maxColors} 色</b></span>
              <input type="range" min="6" max="48" step="1" value={settings.maxColors} onChange={(event) => setSettings({ ...settings, maxColors: Number(event.target.value) })} />
            </label>
            <label className="range-field">
              <span>对比度 <b>{Math.round(settings.contrast * 100)}%</b></span>
              <input type="range" min="0.86" max="1.28" step="0.01" value={settings.contrast} onChange={(event) => setSettings({ ...settings, contrast: Number(event.target.value) })} />
            </label>
            <div className="cleanup-field">
              <span>孤立色清理</span>
              <div className="segmented compact">
                {[1, 2, 3].map((size) => <button key={size} className={settings.cleanupSize === size ? 'active' : ''} onClick={() => setSettings({ ...settings, cleanupSize: size })}>{size === 1 ? '关' : `< ${size}格`}</button>)}
              </div>
            </div>
            <label className="switch-row"><span>移除简单背景<small>从边缘识别连续背景</small></span><input type="checkbox" checked={settings.removeBackground} onChange={(event) => setSettings({ ...settings, removeBackground: event.target.checked })} /></label>
            <label className="switch-row"><span>颜色抖动<small>照片渐变更自然，小图建议关闭</small></span><input type="checkbox" checked={settings.dither} onChange={(event) => setSettings({ ...settings, dither: event.target.checked })} /></label>
          </section>

          <button className="button generate-button" disabled={busy} onClick={generate}>
            {busy ? <span className="spinner" /> : <Sparkles size={19} />}
            {sourceImage ? '生成拼豆图纸' : '先选择图片'}
          </button>
        </aside>

        <section className={`stage-panel ${view === 'preview' ? 'preview-mode' : ''}`} aria-label="图纸工作区">
          <div className="stage-header">
            <div className="segmented" aria-label="工作区视图">
              <button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}><Grid3X3 size={17} />编辑图纸</button>
              <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}><Flame size={17} />烫后预览</button>
            </div>
            <div className="project-meta"><strong>{project.name}</strong><span>{project.width} × {project.height}</span></div>
          </div>

          {view === 'edit' ? (
            <>
              <div className="editor-toolbar" aria-label="编辑工具">
                <div className="tool-group">
                  {toolOptions.map(({ id, label, icon: Icon }) => <button key={id} className={tool === id ? 'tool-button active' : 'tool-button'} onClick={() => setTool(id)} title={label} aria-label={label} aria-pressed={tool === id}><Icon size={20} /><span>{label}</span></button>)}
                </div>
                <div className="tool-group history-tools">
                  <button className="icon-button" onClick={undo} disabled={!history.length} title="撤销" aria-label="撤销"><Undo2 size={20} /></button>
                  <button className="icon-button" onClick={redo} disabled={!redoStack.length} title="重做" aria-label="重做"><Redo2 size={20} /></button>
                </div>
              </div>
              <PatternCanvas project={project} palette={studioPalette} tool={tool} selectedColor={selectedColor} zoom={zoom} onBeginEdit={beginEdit} onCellsChange={changeCells} onPickColor={(index) => { setSelectedColor(index); setTool('brush') }} />
              <div className="stage-footer">
                <span><CircleDot size={16} />{stats.total.toLocaleString()} 颗 · {stats.colors.length} 色</span>
                <div className="zoom-control"><button onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))} aria-label="缩小"><Minus size={17} /></button><b>{Math.round(zoom * 100)}%</b><button onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label="放大"><Plus size={17} /></button></div>
              </div>
            </>
          ) : (
            <>
              <Suspense fallback={<div className="preview-loading"><span className="spinner dark" />正在载入预览引擎</div>}>
                <MeltPreview project={project} palette={studioPalette} melt={melt} />
              </Suspense>
              <div className="melt-controls">
                <div className="melt-presets segmented">
                  {[['摆豆', 0], ['轻烫', 0.35], ['标准', 0.62], ['重烫', 0.92]] .map(([label, value]) => <button key={String(label)} className={Math.abs(melt - Number(value)) < 0.03 ? 'active' : ''} onClick={() => setMelt(Number(value))}>{label}</button>)}
                </div>
                <label className="range-field melt-range"><span>融合程度 <b>{Math.round(melt * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={melt} onChange={(event) => setMelt(Number(event.target.value))} /></label>
                <p>预览用于判断孔洞和整体融合程度，真实效果仍受品牌、温度和压力影响。</p>
              </div>
            </>
          )}
        </section>

        <aside className="inspector-panel" aria-label="颜色和材料统计">
          <section className="summary-band">
            <div><b>{stats.total.toLocaleString()}</b><span>总颗数</span></div>
            <div><b>{stats.colors.length}</b><span>使用颜色</span></div>
            <div><b>{stats.boards}</b><span>29格拼板</span></div>
          </section>
          <section className="panel-section current-color">
            <div className="section-title"><span>当前颜色</span><small>{studioPalette[selectedColor].id}</small></div>
            <button className="selected-color-button" onClick={() => setTool('brush')}>
              <i style={{ background: studioPalette[selectedColor].hex }} />
              <span><strong>{studioPalette[selectedColor].name}</strong><small>{studioPalette[selectedColor].hex.toUpperCase()}</small></span>
            </button>
          </section>
          <section className="panel-section material-section">
            <div className="section-title"><span>材料清单</span><small>{stats.physicalWidth.toFixed(1)} × {stats.physicalHeight.toFixed(1)} cm</small></div>
            <div className="material-list">
              {stats.colors.map(([index, count]) => (
                <button key={index} className={selectedColor === index ? 'material-row active' : 'material-row'} onClick={() => { setSelectedColor(index); setTool('brush') }}>
                  <i style={{ background: studioPalette[index].hex }} />
                  <span><strong>{studioPalette[index].id}</strong><small>{studioPalette[index].name}</small></span>
                  <b>{count}</b>
                </button>
              ))}
            </div>
          </section>
          <section className="panel-section palette-section">
            <div className="section-title"><span>星期八基础色板</span><small>48 色</small></div>
            <div className="palette-grid">
              {studioPalette.map((color, index) => <button key={color.id} className={selectedColor === index ? 'palette-swatch active' : 'palette-swatch'} style={{ '--swatch': color.hex } as React.CSSProperties} onClick={() => { setSelectedColor(index); setTool('brush') }} aria-label={`${color.id} ${color.name}`} title={`${color.id} ${color.name}`} />)}
            </div>
          </section>
        </aside>
      </main>
      {importOpen && (
        <Suspense fallback={<div className="import-layer"><div className="import-loading floating"><span className="spinner dark" />正在载入云端模块</div></div>}>
          <ImportDialog
            project={project}
            palette={studioPalette}
            onClose={(message) => {
              setImportOpen(false)
              if (message) showToast(message)
            }}
          />
        </Suspense>
      )}
      <div className={toast ? 'toast show' : 'toast'} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
