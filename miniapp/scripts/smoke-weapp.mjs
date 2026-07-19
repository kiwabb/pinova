import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import automatorModule from 'miniprogram-automator'

const automator = automatorModule.default ?? automatorModule
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectPath = path.resolve(scriptDirectory, '..')
const artifactsPath = path.join(projectPath, 'artifacts')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'

await fs.mkdir(artifactsPath, { recursive: true })

const consoleMessages = []
const exceptions = []
let miniProgram

try {
  miniProgram = await automator.launch({
    cliPath,
    projectPath,
    trustProject: true,
    timeout: 90000,
  })
  miniProgram.on('console', (message) => consoleMessages.push(message))
  miniProgram.on('exception', (exception) => exceptions.push(exception))

  const page = await miniProgram.reLaunch('/pages/studio/index')
  if (!page) throw new Error('无法打开工作台页面')
  await page.waitFor(1800)

  const root = await page.$('.studio-page')
  const patternCanvas = await page.$('.pattern-canvas')
  const modeButtons = await page.$$('.mode-button')
  const toolButtons = await page.$$('.tool-button')
  if (!root || !patternCanvas || modeButtons.length !== 4 || toolButtons.length !== 6) {
    throw new Error('工作台关键控件未完整渲染')
  }
  const toolSizes = []
  for (const button of toolButtons) toolSizes.push(await button.size())
  if (toolSizes.some((size) => Number(size.width) < 44 || Number(size.height) < 44)) {
    throw new Error(`编辑按钮触控尺寸不足：${JSON.stringify(toolSizes)}`)
  }

  await miniProgram.screenshot({ path: path.join(artifactsPath, 'weapp-home.png') })

  const sampleButton = await page.$('.source-actions .ghost')
  if (!sampleButton) throw new Error('找不到宠物示例按钮')
  await sampleButton.tap()
  await page.waitFor(250)

  const generateButton = await page.$('.generate-button')
  if (!generateButton) throw new Error('找不到生成图纸按钮')
  await generateButton.tap()
  await page.waitFor(2200)

  const metadata = await page.$('.project-meta')
  const stageFooter = await page.$('.stage-footline')
  const generatedMetadata = metadata ? await metadata.text() : ''
  const generatedStats = stageFooter ? await stageFooter.text() : ''
  if (!generatedMetadata.includes('64 × 64')) {
    throw new Error(`宠物示例没有生成 64 × 64 图纸：${generatedMetadata}`)
  }

  const stage = await page.$('.stage-section')
  const stageOffset = stage ? await stage.offset() : null
  const stageScrollTop = Math.max(0, Number(stageOffset?.top ?? 1000) - 12)
  await miniProgram.pageScrollTo(stageScrollTop)
  await page.waitFor(300)

  const generatedCanvas = await page.$('.pattern-canvas')
  const generatedTools = await page.$$('.tool-button')
  if (!generatedCanvas || generatedTools.length !== 6) throw new Error('生成后的编辑器不完整')
  const canvasOffset = await generatedCanvas.offset()
  const touch = {
    clientX: Number(canvasOffset.left) + 10,
    clientY: Number(canvasOffset.top) + 10,
  }
  await generatedCanvas.touchstart({ touches: [touch] })
  await generatedCanvas.touchend({ changeTouches: [touch] })
  await page.waitFor(250)
  await generatedTools[4].tap()
  await page.waitFor(250)
  const restoredStats = stageFooter ? await stageFooter.text() : ''
  if (restoredStats !== generatedStats) {
    throw new Error(`撤销没有恢复材料统计：${generatedStats} -> ${restoredStats}`)
  }

  await miniProgram.screenshot({ path: path.join(artifactsPath, 'weapp-editor.png') })

  const viewTabs = await page.$$('.view-tabs button')
  if (viewTabs.length !== 2) throw new Error('编辑/预览切换控件不完整')
  await viewTabs[1].tap()
  await page.waitFor(700)
  const meltCanvas = await page.$('.melt-canvas')
  const presets = await page.$$('.melt-presets button')
  if (!meltCanvas || presets.length !== 4) throw new Error('烫后预览未完整渲染')

  await miniProgram.pageScrollTo(stageScrollTop)
  await page.waitFor(300)
  await miniProgram.screenshot({ path: path.join(artifactsPath, 'weapp-preview.png') })

  const errorLogs = consoleMessages.filter((entry) => {
    const level = String(entry?.level ?? entry?.type ?? '').toLowerCase()
    return level.includes('error') || level.includes('warning')
  })

  console.log(JSON.stringify({
    page: page.path,
    modeButtons: modeButtons.length,
    toolButtons: toolButtons.length,
    toolSizes,
    previewPresets: presets.length,
    generatedMetadata,
    generatedStats,
    undoRestoredStats: restoredStats,
    consoleErrors: errorLogs,
    exceptions,
    screenshots: [
      path.join(artifactsPath, 'weapp-home.png'),
      path.join(artifactsPath, 'weapp-editor.png'),
      path.join(artifactsPath, 'weapp-preview.png'),
    ],
  }, null, 2))

  if (errorLogs.length || exceptions.length) process.exitCode = 1
} finally {
  miniProgram?.disconnect()
}
