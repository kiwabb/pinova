const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadTypeScriptModule(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports
  const source = fs.readFileSync(file, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  cache.set(file, module)
  const localRequire = (request) => {
    if (!request.startsWith('.')) return require(request)
    const resolved = path.resolve(path.dirname(file), request)
    const typescriptFile = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`
    return fs.existsSync(typescriptFile) ? loadTypeScriptModule(typescriptFile, cache) : require(resolved)
  }
  Function('exports', 'require', 'module', '__filename', '__dirname', output)(
    module.exports, localRequire, module, file, path.dirname(file),
  )
  return module.exports
}

const operations = loadTypeScriptModule(path.join(__dirname, '../miniprogram/utils/gridOperations.ts'))
const paletteOperations = loadTypeScriptModule(path.join(__dirname, '../miniprogram/utils/paletteOperations.ts'))
const converter = loadTypeScriptModule(path.join(__dirname, '../miniprogram/utils/beadConverter.ts'))
const mardPalette = loadTypeScriptModule(path.join(__dirname, '../miniprogram/utils/mardPalette.ts'))
const editorState = loadTypeScriptModule(path.join(__dirname, '../miniprogram/utils/editorInteractionState.ts'))

test('全局换色只替换目标颜色且不修改输入网格', () => {
  const input = new Int16Array([1, 2, -1, 1, 3, 1])
  const result = operations.replaceGridColor(input, 1, 9)
  assert.deepEqual([...result], [9, 2, -1, 9, 3, 9])
  assert.deepEqual([...input], [1, 2, -1, 1, 3, 1])
})

test('左右镜像映射正确且连续执行两次恢复原图', () => {
  const input = new Int16Array([1, 2, 3, 4, 5, 6])
  const mirrored = operations.mirrorGridHorizontal(input, 3, 2)
  assert.deepEqual([...mirrored], [3, 2, 1, 6, 5, 4])
  assert.deepEqual([...operations.mirrorGridHorizontal(mirrored, 3, 2)], [...input])
})

test('已用颜色会排除透明格并去重排序', () => {
  assert.deepEqual(operations.usedGridColors(new Int16Array([4, -1, 2, 4, 9, 2])), [2, 4, 9])
})

test('镜像拒绝尺寸与数据长度不一致的网格', () => {
  assert.throws(() => operations.mirrorGridHorizontal(new Int16Array([1, 2, 3]), 2, 2), /网格尺寸/)
})

test('色板支持已用颜色筛选以及色号、名称和色值搜索', () => {
  const colors = [
    { index: 0, id: 'A01', name: '奶油黄', hex: '#fff4c8' },
    { index: 1, id: 'H07', name: '黑色', hex: '#000000' },
    { index: 2, id: 'R01', name: '红色', hex: '#d50d21' },
  ]
  assert.deepEqual(paletteOperations.filterPaletteColors(colors, 'used', '', [2, 0]).map(color => color.id), ['A01', 'R01'])
  assert.deepEqual(paletteOperations.filterPaletteColors(colors, 'all', 'h07', []).map(color => color.id), ['H07'])
  assert.deepEqual(paletteOperations.filterPaletteColors(colors, 'all', '红色', []).map(color => color.id), ['R01'])
  assert.deepEqual(paletteOperations.filterPaletteColors(colors, 'all', '#fff4', []).map(color => color.id), ['A01'])
})

test('排除颜色后会重新匹配其他色号且不会产生空洞', () => {
  const blackIndex = mardPalette.studioPalette.findIndex(color => color.id === 'H07')
  const pixels = new Uint8ClampedArray(12 * 12 * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset + 3] = 255
  }
  const result = converter.convertPixelsToGrid({
    pixels,
    imageWidth: 12,
    imageHeight: 12,
    gridWidth: 12,
    gridHeight: 12,
    mode: 'photo',
    mergeDistance: 0,
    excludedColors: [blackIndex],
  })
  assert.equal([...result].includes(blackIndex), false)
  assert.equal([...result].includes(-1), false)
})

test('排除颜色重新转换时只使用材料清单中的剩余色号', () => {
  const blackIndex = mardPalette.studioPalette.findIndex(color => color.id === 'H07')
  const whiteIndex = mardPalette.studioPalette.findIndex(color => color.id === 'T01')
  const redIndex = mardPalette.studioPalette.findIndex(color => color.id === 'F03')
  const pixels = new Uint8ClampedArray(12 * 12 * 4)
  for (let pixel = 0; pixel < 12 * 12; pixel++) {
    const offset = pixel * 4
    pixels[offset] = pixel % 3 === 0 ? 20 : pixel % 3 === 1 ? 235 : 220
    pixels[offset + 1] = pixel % 3 === 0 ? 20 : pixel % 3 === 1 ? 235 : 45
    pixels[offset + 2] = pixel % 3 === 0 ? 20 : pixel % 3 === 1 ? 235 : 45
    pixels[offset + 3] = 255
  }
  const result = converter.convertPixelsToGrid({
    pixels,
    imageWidth: 12,
    imageHeight: 12,
    gridWidth: 12,
    gridHeight: 12,
    mode: 'photo',
    mergeDistance: 0,
    excludedColors: [blackIndex],
    allowedColors: [whiteIndex, redIndex],
  })
  const used = new Set(result)
  assert.equal(used.has(blackIndex), false)
  assert.deepEqual([...used].sort((a, b) => a - b), [whiteIndex, redIndex].sort((a, b) => a - b))
})

test('小程序色板完整覆盖仓库中的 MARD 映射', () => {
  const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-studio/src/domain/colorSystemMapping.json'), 'utf8'))
  const expected = Object.entries(mapping).map(([hex, brands]) => [hex.toLowerCase(), brands.MARD])
  const actual = new Map(mardPalette.studioPalette.map(color => [color.hex, color.id]))
  assert.equal(actual.size, expected.length)
  for (const [hex, id] of expected) assert.equal(actual.get(hex), id)
})

test('工具色板使用明确的默认筛选和操作提示', () => {
  assert.deepEqual(editorState.palettePresentation('eyedropper'), {
    title: '取色', hint: '点击画布中的格子取色', filter: 'used',
  })
  assert.equal(editorState.palettePresentation('fill').filter, 'all')
  assert.match(editorState.palettePresentation('replace').hint, /①.*②/)
})

test('设置草稿与已应用设置相互独立并能判断变更', () => {
  const current = editorState.createSettingsDraft('illustration', 58, 30)
  const draft = editorState.createSettingsDraft('photo', 58, 30)
  assert.equal(editorState.settingsDraftChanged(current, current), false)
  assert.equal(editorState.settingsDraftChanged(current, draft), true)
  assert.deepEqual(current, { conversionMode: 'illustration', gridSize: 58, mergeDistance: 30 })
})

test('替换来源元数据包含色块、色号和准确颗数', () => {
  const source = editorState.createReplacementMeta(new Int16Array([7, 2, 7, -1, 7]), 7, 'H07', '#000000')
  assert.deepEqual(source, { index: 7, id: 'H07', hex: '#000000', count: 3 })
  assert.equal(editorState.formatReplacementResult(source, 'A14'), 'H07 → A14，共替换 3 颗')
})

test('空白创作只有在画布为空时允许调整尺寸', () => {
  assert.equal(editorState.canResizeBlankCanvas(false, 0), true)
  assert.equal(editorState.canResizeBlankCanvas(false, 1), false)
  assert.equal(editorState.canResizeBlankCanvas(true, 100), true)
})

test('专注模式计时格式覆盖分钟和小时', () => {
  assert.equal(editorState.formatFocusTime(0), '00:00')
  assert.equal(editorState.formatFocusTime(65), '01:05')
  assert.equal(editorState.formatFocusTime(3661), '01:01:01')
})
