import { Button, Canvas, Image, ScrollView, Slider, Switch, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MeltCanvas } from '../../components/MeltCanvas'
import { PatternCanvas } from '../../components/PatternCanvas'
import { convertImage } from '../../core/converter'
import { studioPalette } from '../../core/palette'
import {
  createProject,
  createSampleProject,
  getPatternStats,
  parseProject,
  PROJECT_STORAGE_KEY,
  serializeProject,
} from '../../core/project'
import { createPetRaster } from '../../core/sample'
import type { ConvertSettings, EditorTool, ImageMode, PatternProject, RasterImage } from '../../core/types'
import {
  MELT_CANVAS_ID,
  PATTERN_CANVAS_ID,
  readImageRaster,
  saveCanvasToAlbum,
  SOURCE_CANVAS_ID,
} from '../../utils/canvas'
import './index.scss'

interface ModeOption {
  id: ImageMode
  label: string
  hint: string
}

const modeOptions: ModeOption[] = [
  { id: 'pixel', label: '像素原图', hint: '保持硬边' },
  { id: 'illustration', label: '动漫插画', hint: '优先轮廓' },
  { id: 'portrait', label: '真人宠物', hint: '保护五官' },
  { id: 'photo', label: '风景照片', hint: '保留渐变' },
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

const toolOptions: Array<{ id: EditorTool; label: string }> = [
  { id: 'brush', label: '画笔' },
  { id: 'eraser', label: '橡皮' },
  { id: 'eyedropper', label: '吸色' },
  { id: 'fill', label: '填充' },
]

function loadInitialProject(): PatternProject {
  try {
    return parseProject(Taro.getStorageSync(PROJECT_STORAGE_KEY)) ?? createSampleProject()
  } catch {
    return createSampleProject()
  }
}

const fileNameFromPath = (path: string) => {
  const value = path.split('/').pop() ?? '相册图片'
  return value.replace(/\.[^.]+$/, '') || '相册图片'
}

export default function StudioPage() {
  const windowInfo = Taro.getWindowInfo()
  const boardWidth = Math.min(720, Math.max(280, windowInfo.windowWidth - 32))
  const [project, setProject] = useState<PatternProject>(() => loadInitialProject())
  const [sourceImage, setSourceImage] = useState<RasterImage | null>(null)
  const [sourcePath, setSourcePath] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [settings, setSettings] = useState(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('图片只在本机处理，不会上传')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [tool, setTool] = useState<EditorTool>('brush')
  const [selectedColor, setSelectedColor] = useState(16)
  const [zoom, setZoom] = useState(1)
  const [melt, setMelt] = useState(0.62)
  const [history, setHistory] = useState<Int16Array[]>([])
  const [redoStack, setRedoStack] = useState<Int16Array[]>([])
  const stats = useMemo(() => getPatternStats(project), [project])

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        Taro.setStorageSync(PROJECT_STORAGE_KEY, serializeProject(project))
      } catch {
        setStatus('本地空间不足，当前修改尚未保存')
      }
    }, 180)
    return () => clearTimeout(timer)
  }, [project])

  const toast = useCallback((title: string) => {
    Taro.showToast({ title, icon: 'none', duration: 1800 })
  }, [])

  const chooseImage = async () => {
    if (busy) return
    try {
      const selection = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      const path = selection.tempFiles[0]?.tempFilePath
      if (!path) return
      setBusy(true)
      setStatus('正在读取图片像素...')
      const info = await Taro.getImageInfo({ src: path })
      const image = await readImageRaster(path, info.width, info.height)
      setSourceImage(image)
      setSourcePath(path)
      setSourceName(fileNameFromPath(path))
      setStatus(`已载入 ${image.width} × ${image.height} 图片`)
      toast('图片已载入')
    } catch (error) {
      const message = String((error as { errMsg?: string })?.errMsg ?? error)
      if (!message.includes('cancel')) {
        setStatus('图片读取失败，请换一张 JPG 或 PNG')
        toast('图片读取失败')
      }
    } finally {
      setBusy(false)
    }
  }

  const loadSample = () => {
    const image = createPetRaster()
    setSourceImage(image)
    setSourcePath('')
    setSourceName('宠物头像示例')
    setSettings((current) => ({ ...current, ...modeDefaults.portrait, mode: 'portrait', width: 64 }))
    setStatus('已载入宠物头像示例，可以直接生成')
    toast('示例已载入')
  }

  const switchMode = (mode: ImageMode) => {
    setSettings((current) => ({ ...current, ...modeDefaults[mode], mode }))
  }

  const generate = async () => {
    if (!sourceImage) {
      await chooseImage()
      return
    }
    setBusy(true)
    setStatus('正在匹配色板并清理杂色...')
    await new Promise((resolve) => setTimeout(resolve, 40))
    try {
      const result = convertImage({ image: sourceImage, settings })
      const next = createProject(
        sourceName || '我的拼豆图纸',
        result.width,
        result.height,
        result.cells,
        settings.mode,
      )
      setProject(next)
      setHistory([])
      setRedoStack([])
      setZoom(1)
      setView('edit')
      setStatus(`已生成 ${next.width} × ${next.height} 图纸`)
      Taro.vibrateShort({ type: 'light' }).catch(() => undefined)
      toast('图纸已生成')
    } catch {
      setStatus('转换失败，请降低图纸宽度后重试')
      toast('转换失败')
    } finally {
      setBusy(false)
    }
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

  const exportCurrent = async () => {
    const canvasId = view === 'preview' ? MELT_CANVAS_ID : PATTERN_CANVAS_ID
    const width = Math.round(boardWidth * (view === 'edit' ? zoom : 1))
    const height = Math.round(width * project.height / project.width)
    try {
      await saveCanvasToAlbum(canvasId, width, height)
      Taro.vibrateShort({ type: 'medium' }).catch(() => undefined)
      toast('已保存到相册')
    } catch (error) {
      const message = String((error as { errMsg?: string })?.errMsg ?? error)
      if (!message.includes('cancel')) {
        Taro.showModal({
          title: '没有保存成功',
          content: '请允许访问相册后重试，或在微信设置中开启照片权限。',
          showCancel: false,
        })
      }
    }
  }

  return (
    <View className='studio-page'>
      <View className='brand-bar'>
        <View className='brand-lockup'>
          <View className='brand-mark' aria-hidden='true'>
            <View /><View /><View /><View />
          </View>
          <View className='brand-copy'>
            <Text className='brand-name'>星期八</Text>
            <Text className='brand-subtitle'>拼豆工作台</Text>
          </View>
        </View>
        <View className='local-badge'><View className='local-dot' />本机处理</View>
      </View>

      <View className='status-line' aria-live='polite'>
        <View className={busy ? 'status-indicator busy' : 'status-indicator'} />
        <Text>{status}</Text>
      </View>

      <View className='surface source-section'>
        <View className='section-heading'>
          <View>
            <Text className='section-title'>图片转图纸</Text>
            <Text className='section-caption'>支持相册和相机</Text>
          </View>
          <Text className='file-support'>JPG / PNG</Text>
        </View>

        <View className='source-row'>
          <Button className='source-preview' onClick={chooseImage} aria-label='选择或更换图片'>
            {sourcePath ? (
              <Image className='source-image' src={sourcePath} mode='aspectFit' />
            ) : (
              <View className='source-placeholder'>
                <View className='mini-mark'><View /><View /><View /><View /></View>
                <Text>{sourceImage ? '宠物示例' : '选择图片'}</Text>
              </View>
            )}
          </Button>
          <View className='source-actions'>
            <Text className='source-name'>{sourceName || '还没有选择源图片'}</Text>
            <Text className='source-hint'>主体清晰、背景简单的图片效果更好</Text>
            <View className='button-row'>
              <Button className='button secondary compact' onClick={chooseImage} disabled={busy}>选择图片</Button>
              <Button className='button ghost compact' onClick={loadSample} disabled={busy}>宠物示例</Button>
            </View>
          </View>
        </View>

        <Text className='field-label'>转换模式</Text>
        <View className='mode-grid'>
          {modeOptions.map((option) => (
            <Button
              key={option.id}
              className={settings.mode === option.id ? 'mode-button active' : 'mode-button'}
              onClick={() => switchMode(option.id)}
              aria-label={`${option.label}，${option.hint}`}
            >
              <Text className='mode-label'>{option.label}</Text>
              <Text className='mode-hint'>{option.hint}</Text>
            </Button>
          ))}
        </View>

        <Button className='settings-toggle' onClick={() => setSettingsOpen((current) => !current)}>
          <Text>转换设置</Text>
          <Text>{settingsOpen ? '收起' : `${settings.width}格 · 最多${settings.maxColors}色`}</Text>
        </Button>

        {settingsOpen && (
          <View className='settings-panel'>
            <View className='slider-field'>
              <View className='field-value'><Text>图纸宽度</Text><Text>{settings.width} 格</Text></View>
              <Slider min={24} max={100} step={2} value={settings.width} activeColor='#c42d5d' blockSize={22} onChange={(event) => setSettings({ ...settings, width: event.detail.value })} />
            </View>
            <View className='slider-field'>
              <View className='field-value'><Text>最多颜色</Text><Text>{settings.maxColors} 色</Text></View>
              <Slider min={6} max={48} step={1} value={settings.maxColors} activeColor='#c42d5d' blockSize={22} onChange={(event) => setSettings({ ...settings, maxColors: event.detail.value })} />
            </View>
            <View className='slider-field'>
              <View className='field-value'><Text>对比度</Text><Text>{Math.round(settings.contrast * 100)}%</Text></View>
              <Slider min={86} max={128} step={1} value={Math.round(settings.contrast * 100)} activeColor='#c42d5d' blockSize={22} onChange={(event) => setSettings({ ...settings, contrast: event.detail.value / 100 })} />
            </View>
            <View className='setting-row'>
              <View><Text>移除简单背景</Text><Text className='setting-note'>从画面边缘识别连续背景</Text></View>
              <Switch checked={settings.removeBackground} color='#c42d5d' onChange={(event) => setSettings({ ...settings, removeBackground: event.detail.value })} />
            </View>
            <View className='setting-row'>
              <View><Text>颜色抖动</Text><Text className='setting-note'>照片渐变更自然，小图建议关闭</Text></View>
              <Switch checked={settings.dither} color='#c42d5d' onChange={(event) => setSettings({ ...settings, dither: event.detail.value })} />
            </View>
            <View className='cleanup-row'>
              <Text>孤立色清理</Text>
              <View className='segmented small'>
                {[1, 2, 3].map((size) => (
                  <Button key={size} className={settings.cleanupSize === size ? 'active' : ''} onClick={() => setSettings({ ...settings, cleanupSize: size })}>
                    {size === 1 ? '关' : `< ${size}格`}
                  </Button>
                ))}
              </View>
            </View>
          </View>
        )}

        <Button className='button primary generate-button' onClick={generate} loading={busy} disabled={busy}>
          {sourceImage ? '生成拼豆图纸' : '选择图片开始转换'}
        </Button>
      </View>

      <View className='surface stage-section'>
        <View className='stage-topline'>
          <View className='segmented view-tabs'>
            <Button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>编辑图纸</Button>
            <Button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>烫后预览</Button>
          </View>
          <View className='project-meta'><Text>{project.name}</Text><Text>{project.width} × {project.height}</Text></View>
        </View>

        {view === 'edit' ? (
          <>
            <View className='editor-toolbar'>
              {toolOptions.map((option) => (
                <Button key={option.id} className={tool === option.id ? 'tool-button active' : 'tool-button'} onClick={() => setTool(option.id)}>{option.label}</Button>
              ))}
              <Button className='tool-button history-button' onClick={undo} disabled={!history.length}>撤销</Button>
              <Button className='tool-button history-button' onClick={redo} disabled={!redoStack.length}>重做</Button>
            </View>
            <PatternCanvas
              project={project}
              tool={tool}
              selectedColor={selectedColor}
              viewportWidth={boardWidth}
              zoom={zoom}
              onBeginEdit={beginEdit}
              onCellsChange={changeCells}
              onPickColor={(index) => { setSelectedColor(index); setTool('brush') }}
            />
            <View className='stage-footline'>
              <Text>{stats.total.toLocaleString()} 颗 · {stats.colors.length} 色</Text>
              <View className='segmented zoom-control'>
                <Button className={zoom === 1 ? 'active' : ''} onClick={() => setZoom(1)}>适合</Button>
                <Button className={zoom === 2 ? 'active' : ''} onClick={() => setZoom(2)}>2×</Button>
              </View>
            </View>
          </>
        ) : (
          <>
            <MeltCanvas project={project} width={boardWidth} melt={melt} />
            <View className='melt-controls'>
              <View className='segmented melt-presets'>
                {([['摆豆', 0], ['轻烫', 0.35], ['标准', 0.62], ['重烫', 0.92]] as Array<[string, number]>).map(([label, value]) => (
                  <Button key={label} className={Math.abs(melt - value) < 0.03 ? 'active' : ''} onClick={() => setMelt(value)}>{label}</Button>
                ))}
              </View>
              <View className='slider-field melt-slider'>
                <View className='field-value'><Text>融合程度</Text><Text>{Math.round(melt * 100)}%</Text></View>
                <Slider min={0} max={100} step={1} value={Math.round(melt * 100)} activeColor='#c42d5d' blockSize={22} onChange={(event) => setMelt(event.detail.value / 100)} />
              </View>
              <Text className='preview-note'>二维 SDF 融合预览用于判断孔洞和粘连程度，实物仍受温度、压力和品牌影响。</Text>
            </View>
          </>
        )}

        <View className='export-row'>
          <Button className='button secondary' onClick={exportCurrent}>保存当前画面</Button>
        </View>
      </View>

      <View className='surface palette-section'>
        <View className='section-heading compact-heading'>
          <View>
            <Text className='section-title'>颜色</Text>
            <Text className='section-caption'>{studioPalette[selectedColor].id} {studioPalette[selectedColor].name}</Text>
          </View>
          <View className='selected-color' style={`background:${studioPalette[selectedColor].hex}`} />
        </View>
        <ScrollView className='palette-scroll' scrollX enhanced showScrollbar={false}>
          <View className='palette-track'>
            {studioPalette.map((color, index) => (
              <Button
                key={color.id}
                className={selectedColor === index ? 'palette-swatch active' : 'palette-swatch'}
                style={`background:${color.hex}`}
                onClick={() => { setSelectedColor(index); setTool('brush') }}
                aria-label={`${color.id} ${color.name}`}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View className='surface material-section'>
        <View className='summary-grid'>
          <View><Text>{stats.total.toLocaleString()}</Text><Text>总颗数</Text></View>
          <View><Text>{stats.colors.length}</Text><Text>使用颜色</Text></View>
          <View><Text>{stats.boards}</Text><Text>29格拼板</Text></View>
        </View>
        <View className='material-heading'>
          <Text>材料清单</Text>
          <Text>{stats.physicalWidth.toFixed(1)} × {stats.physicalHeight.toFixed(1)} cm</Text>
        </View>
        <View className='material-list'>
          {stats.colors.map(([index, count]) => (
            <Button key={index} className='material-row' onClick={() => { setSelectedColor(index); setTool('brush') }}>
              <View className='material-swatch' style={`background:${studioPalette[index].hex}`} />
              <View className='material-name'><Text>{studioPalette[index].id}</Text><Text>{studioPalette[index].name}</Text></View>
              <Text className='material-count'>{count}</Text>
            </Button>
          ))}
        </View>
      </View>

      <Text className='palette-disclaimer'>当前为 48 色体验色板，正式生产前需替换为实物校准色卡。</Text>

      <Canvas
        id={SOURCE_CANVAS_ID}
        canvasId={SOURCE_CANVAS_ID}
        className='source-decoder-canvas'
        style='width:720px;height:720px'
      />
    </View>
  )
}
