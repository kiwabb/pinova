# Mini Program Photo-to-Bead Editor Upgrade Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the mini program editor (`pages/editor/`) to match the web-studio photo-to-bead workbench feature set — MARD palette, chart view, color exclusion, background removal, enhanced stats, and pixel-level editing parity.

**Architecture:** The mini program cannot use Web Workers or Three.js, so conversion runs synchronously on the main thread via Canvas API. All web-studio domain logic (colors, converter, export) is ported to `utils/` as pure TypeScript. The editor page acts as a single-file controller (existing mini program pattern) with canvas-based rendering for chart/edit/preview views.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), Canvas 2D API, cloud functions for save

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `utils/mardPalette.ts` | CREATE | MARD palette data (~290 colors) with Lab color space utilities |
| `utils/beadConverter.ts` | CREATE | Full image-to-bead conversion engine (port from web-studio) |
| `utils/beadExport.ts` | CREATE | PNG export with legend and material bill |
| `pages/editor/index.ts` | MODIFY | Major: new data, methods, events for all features |
| `pages/editor/index.wxml` | MODIFY | Major: new UI for mode, slider, views, color list |
| `pages/editor/index.wxss` | MODIFY | Major: new styles for chart view, stats, controls |
| `utils/imageConverter.ts` | DELETE | Replaced by beadConverter.ts |

---

## Chunk 1: Core Engine — Palette & Converter

### Task 1.1: Create MARD Palette Module

**Files:**
- Create: `miniprogram/utils/mardPalette.ts`

- [ ] **Step 1: Port color utilities from web-studio**

Copy `color.ts` + `palette.ts` logic, adapted for mini program. Include:
- `hexToRgb`, `rgbToLab`, `deltaE2000` (from `domain/color.ts`)
- `BeadColor` type and `studioPalette` generation (from `domain/palette.ts`)
- `colorSystemMapping.json` data inlined as TypeScript object
- `paletteIndexById()` helper

```typescript
// utils/mardPalette.ts
export interface RGB { r: number; g: number; b: number }
export interface Lab { l: number; a: number; b: number }
export interface BeadColor { id: string; name: string; hex: string; rgb: RGB; lab: Lab }

// Build MARD palette from colorSystemMapping
export const studioPalette: BeadColor[] = [...]
export function paletteIndexById(id: string): number { ... }
```

- [ ] **Step 2: Verify palette builds correctly**

Run: `npx tsx -e "const p = require('./miniprogram/utils/mardPalette.ts'); console.log(p.studioPalette.length)"`
Expected: ~290 colors, no errors

### Task 1.2: Create Bead Converter Engine

**Files:**
- Create: `miniprogram/utils/beadConverter.ts`

- [ ] **Step 1: Port converter.ts from web-studio**

Adapt `engine/converter.ts` for mini program (no ImageData type). Key functions:
- `nearestPaletteIndex(rgb, allowed?)` — find closest MARD color
- `mergeSimilarColors(cells, maxDistance)` — merge nearby colors
- `removeBackgroundByVote(cells, width, height)` — flood-fill board edge
- `cleanupSmallRegions(cells, width, height, threshold)` — remove noise
- `removeSourceImageBackground(imageData, tolerance)` — source image BG removal
- `convertPixelsToGrid(options)` — main conversion entry point

```typescript
// utils/beadConverter.ts
export interface ConvertOptions {
  pixels: Uint8ClampedArray
  imageWidth: number; imageHeight: number
  gridWidth: number; gridHeight: number
  mode: 'illustration' | 'photo' | 'pixel' | 'portrait'
  imageScale?: number
  imageOffsetX?: number; imageOffsetY?: number
  mergeDistance?: number
  cleanupSize?: number
  excludedColors?: number[]
}
export function convertPixelsToGrid(options: ConvertOptions): Int16Array { ... }
export function removeBackgroundByVote(grid: Int16Array, w: number, h: number): Int16Array { ... }
```

- [ ] **Step 2: Verify converter with sample data**

Create a quick test: generate a small test image, run converter, check output grid dimensions and values are valid palette indices.

### Task 1.3: Create Export Engine

**Files:**
- Create: `miniprogram/utils/beadExport.ts`

- [ ] **Step 1: Port export.ts from web-studio**

Adapt for mini program canvas-to-tempFilePath. Include:
- `exportPatternPng(grid, palette, projectName, gridWidth)` — draws chart + legend on offscreen canvas, returns tempFilePath
- Color legend with rounded rect swatches, count per color

```typescript
// utils/beadExport.ts
export function exportPatternPng(
  canvas: WechatMiniprogram.Canvas,
  grid: Int16Array,
  palette: BeadColor[],
  name: string,
  width: number,
  height: number,
): Promise<string>
```

---

## Chunk 2: Editor Page Logic

### Task 2.1: Replace Data & State Model

**Files:**
- Modify: `miniprogram/pages/editor/index.ts`

- [ ] **Step 1: Import new modules, remove old palette**

Replace the top of `index.ts`:
```typescript
import { studioPalette, type BeadColor } from '../../utils/mardPalette'
import { convertPixelsToGrid, removeBackgroundByVote, type ConvertOptions } from '../../utils/beadConverter'
import { exportPatternPng } from '../../utils/beadExport'
```

Remove old `paletteItems`, `palette`, `paletteRgb` constants and `hexToRgb`, `nearestPaletteColor` helpers.

- [ ] **Step 2: Replace grid data structure**

Change `grid: string[][]` (hex strings) to `grid: Int16Array` (palette indices, -1 = empty).
Replace `history: string[][][]` and `redoHistory` to `Int16Array[]`.

- [ ] **Step 3: Update data object**

Add new reactive data:
```typescript
data: {
  // Keep existing: saving, exporting, converting, workLoading, etc.
  // Replace: gridSize → 58, remove colorCount/palette/paletteItems/activeColor
  // Add:
  conversionMode: 'illustration' as 'illustration' | 'photo',
  mergeDistance: 30,
  cleanupSize: 1,
  highlightedColor: -1, // -1 = none
  selectedColor: 0,     // palette index
  excludedColors: [] as number[],
  view: 'chart' as 'chart' | 'edit' | 'preview',  // was 'beads' | 'grid'
  meltAmount: 62,       // for 2D melt preview
  sourceImageRemoved: false,
  sourcePreview: '',
  // Stats remain: totalBeads, boardCount
  // Remove: colorCount, palette, paletteItems, activeColor
}
```

- [ ] **Step 4: Update draw() method**

Replace bead/grid rendering to use Int16Array. Three view modes:
- `chart`: Grid squares with color ID labels (like ChartView.tsx)
- `edit`: Circles with border (like PatternCanvas.tsx)
- `preview`: 2D melt effect approximation (circles with varying radii + hole)

### Task 2.2: Add Conversion & Settings Methods

**Files:**
- Modify: `miniprogram/pages/editor/index.ts`

- [ ] **Step 1: Rewrite convertSourceImage()**

Use new `convertPixelsToGrid()`:
```typescript
async convertSourceImage() {
  // ... load image to canvas, get pixels
  const grid = convertPixelsToGrid({
    pixels, imageWidth, imageHeight,
    gridWidth: this.data.gridSize, gridHeight: this.data.gridSize,
    mode: this.data.conversionMode,
    mergeDistance: this.data.mergeDistance,
    cleanupSize: this.data.cleanupSize,
    excludedColors: new Set(this.data.excludedColors),
  })
  this.grid = grid
  this.updateStats()
  this.draw()
}
```

- [ ] **Step 2: Add mode switch**

```typescript
selectMode(event) { this.setData({ conversionMode: event.currentTarget.dataset.mode }) }
```

- [ ] **Step 3: Add merge distance slider handler**

```typescript
changeMergeDistance(event) { this.setData({ mergeDistance: Number(event.detail.value) }) }
```

- [ ] **Step 4: Add background removal for source image**

Port `removeSourceImageBackground()` logic to work with mini program canvas. Toggle source image between original and BG-removed.

- [ ] **Step 5: Add board background removal**

```typescript
removeBoardBackground() {
  this.pushUndo()
  this.grid = removeBackgroundByVote(this.grid, this.data.gridSize, this.data.gridSize)
  this.markDirty()
  this.updateStats()
  this.draw()
}
```

- [ ] **Step 6: Add grid size slider**

Replace segmented button with slider (12-120):
```typescript
changeGridSize(event) {
  const size = Number(event.detail.value)
  this.setData({ gridSize: size })
  if (this.sourceImagePath) this.convertSourceImage()
}
```

### Task 2.3: Add Color Exclusion & Highlight

**Files:**
- Modify: `miniprogram/pages/editor/index.ts`

- [ ] **Step 1: Add color exclusion**

```typescript
excludeColor(event) {
  const index = Number(event.currentTarget.dataset.index)
  // Replace excluded color cells with nearest allowed color
  // Add to excludedColors list, re-convert
}
restoreColor(event) { /* remove from excluded, re-convert */ }
restoreAllColors() { /* clear excluded, re-convert */ }
```

- [ ] **Step 2: Add color highlighting**

```typescript
highlightColor(event) {
  const index = Number(event.currentTarget.dataset.index)
  this.setData({
    highlightedColor: this.data.highlightedColor === index ? -1 : index,
    selectedColor: index,
  })
  this.draw() // re-render with dimming
}
```

- [ ] **Step 3: Update stats to use palette indices**

```typescript
updateStats() {
  const counts = new Map<number, number>()
  let total = 0
  for (const v of this.grid) {
    if (v >= 0) { counts.set(v, (counts.get(v) ?? 0) + 1); total++ }
  }
  const colorStats = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([index, count]) => ({
      index, count,
      id: studioPalette[index].id,
      name: studioPalette[index].name,
      hex: studioPalette[index].hex,
    }))
  this.setData({ colorStats, totalBeads: total })
}
```

### Task 2.4: Add 2D Melt Preview

**Files:**
- Modify: `miniprogram/pages/editor/index.ts`

- [ ] **Step 1: Add melt preview drawing**

Cannot use Three.js shaders. Instead, draw circles with:
- Radius: `mix(0.385, 0.545, melt) * cellSize`
- Hole: `mix(0.155, 0.026, melt) * cellSize`
- Neighbor bridges: `mix(0.035, 0.28, melt) * cellSize`
- 3D shading via radial gradient
```typescript
drawMeltPreview() {
  // For each cell, draw bead with fill + hole cutout
  // Add neighbor bridges where adjacent cells are occupied
  // Apply radial gradient for 3D effect
}
```

- [ ] **Step 2: Add melt amount slider**

```typescript
changeMelt(event) { this.setData({ meltAmount: Number(event.detail.value) }) }
```

- [ ] **Step 3: Add melt presets**

摆豆(0) / 轻烫(35) / 标准(62) / 重烫(92)

### Task 2.5: Update Save & Export

**Files:**
- Modify: `miniprogram/pages/editor/index.ts`

- [ ] **Step 1: Update save() to use Int16Array grid**

Convert grid (Int16Array) to 2D hex array for cloud save (backward compatible format):
```typescript
const gridForSave = // convert Int16Array to string[][] using studioPalette
```

- [ ] **Step 2: Update exportImage() to use enhanced export**

```typescript
async exportImage() {
  const tempPath = await exportPatternPng(
    this.canvas, this.grid, studioPalette,
    this.data.title, this.data.gridSize, this.data.gridSize,
  )
  await wx.saveImageToPhotosAlbum({ filePath: tempPath })
}
```

- [ ] **Step 3: Update loadWork() to handle new grid format**

Parse saved grid (string[][]) back to Int16Array using palette index lookup.

---

## Chunk 3: Template (WXML) Upgrade

### Task 3.1: Redesign Control Panel

**Files:**
- Modify: `miniprogram/pages/editor/index.wxml`

- [ ] **Step 1: Replace settings panel with web-studio controls**

New settings panel:
```xml
<!-- Mode selector -->
<view class="mode-grid">
  <button data-mode="illustration" class="{{conversionMode === 'illustration' ? 'active' : ''}}" bindtap="selectMode">卡通模式</button>
  <button data-mode="photo" class="{{conversionMode === 'photo' ? 'active' : ''}}" bindtap="selectMode">真实模式</button>
</view>

<!-- Grid size slider 12-120 -->
<view class="slider-field">
  <text>板子尺寸 {{gridSize}}×{{gridSize}}</text>
  <slider min="12" max="120" value="{{gridSize}}" bindchange="changeGridSize" />
</view>

<!-- Merge distance slider 0-100 -->
<view class="slider-field">
  <text>颜色合并 {{mergeDistance}}</text>
  <slider min="0" max="100" value="{{mergeDistance}}" bindchange="changeMergeDistance" />
</view>

<!-- Source image actions -->
<button bindtap="removeSourceBackground" disabled="{{sourceImageRemoved}}">原图去背景</button>
<button bindtap="restoreSource" disabled="{{!sourceImageRemoved}}">恢复原图</button>

<!-- Board background removal -->
<button bindtap="removeBoardBackground">一键去除背景</button>

<!-- Apply settings -->
<button bindtap="applyImageSettings">生成图纸</button>
```

- [ ] **Step 2: Replace toolbar segmented buttons**

Replace grid size button group with slider. Keep mode selector.

- [ ] **Step 3: Add view switcher**

```xml
<view class="segmented">
  <button class="{{view === 'chart' ? 'active' : ''}}" bindtap="switchView" data-view="chart">图纸</button>
  <button class="{{view === 'edit' ? 'active' : ''}}" bindtap="switchView" data-view="edit">编辑</button>
  <button class="{{view === 'preview' ? 'active' : ''}}" bindtap="switchView" data-view="preview">烫后</button>
</view>
```

- [ ] **Step 4: Add melt controls (visible when view='preview')**

```xml
<view wx:if="{{view === 'preview'}}" class="melt-controls">
  <view class="segments">
    <button class="{{meltAmount === 0 ? 'active' : ''}}" data-melt="0" bindtap="selectMeltPreset">摆豆</button>
    <button class="{{meltAmount === 35 ? 'active' : ''}}" data-melt="35" bindtap="selectMeltPreset">轻烫</button>
    <button class="{{meltAmount === 62 ? 'active' : ''}}" data-melt="62" bindtap="selectMeltPreset">标准</button>
    <button class="{{meltAmount === 92 ? 'active' : ''}}" data-melt="92" bindtap="selectMeltPreset">重烫</button>
  </view>
  <slider min="0" max="100" value="{{meltAmount}}" bindchange="changeMelt" />
</view>
```

### Task 3.2: Redesign Color Panel

**Files:**
- Modify: `miniprogram/pages/editor/index.wxml`

- [ ] **Step 1: Replace simple palette row with material list**

```xml
<!-- Material list with highlight + exclude -->
<view class="material-list">
  <view wx:for="{{colorStats}}" wx:key="index" class="material-row {{highlightedColor === item.index ? 'active' : ''}}">
    <view class="material-main" data-index="{{item.index}}" bindtap="highlightColor">
      <view class="swatch-sm" style="background:{{item.hex}}" />
      <text>{{item.id}}</text>
      <text class="color-name">{{item.name}}</text>
      <text class="color-count">{{item.count}}</text>
    </view>
    <button class="exclude-btn" data-index="{{item.index}}" bindtap="excludeColor">×</button>
  </view>
</view>

<!-- Excluded colors -->
<view wx:if="{{excludedColors.length}}" class="excluded-section">
  <view class="section-title">
    <text>已排除 {{excludedColors.length}} 色</text>
    <button bindtap="restoreAllColors">全部恢复</button>
  </view>
  <view wx:for="{{excludedColors}}" wx:key="*this" class="excluded-row" data-index="{{item}}" bindtap="restoreColor">
    <view class="swatch-sm" style="background:{{studioPalette[item].hex}}" />
    <text>{{studioPalette[item].id}}</text>
    <text class="restore-label">恢复</text>
  </view>
</view>
```

- [ ] **Step 2: Update summary band**

Already exists — just update values to reflect new data fields.

---

## Chunk 4: Styles (WXSS) Upgrade

### Task 4.1: Add New Component Styles

**Files:**
- Modify: `miniprogram/pages/editor/index.wxss`

- [ ] **Step 1: Add mode grid and slider styles**

```css
.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-bottom: 24rpx; }
.mode-btn { padding: 20rpx; border: 1rpx solid #dedcdf; border-radius: 14rpx; text-align: center; }
.mode-btn.active { border-color: #c42d5d; background: #faeef3; }

.slider-field { margin-bottom: 16rpx; }
.slider-field text { color: #5f5b62; font-size: 23rpx; font-weight: 600; }
.slider-field text b { color: #1f1e25; }
```

- [ ] **Step 2: Add material list styles**

```css
.material-list { max-height: 600rpx; overflow-y: auto; }
.material-row { display: flex; align-items: center; padding: 12rpx; border-bottom: 1rpx solid #f0f1f3; }
.material-row.active { background: #faeef3; border-left: 6rpx solid #c42d5d; }
.material-main { flex: 1; display: flex; align-items: center; gap: 16rpx; }
.swatch-sm { width: 40rpx; height: 40rpx; border-radius: 50%; border: 1rpx solid #dedee2; }
.color-name { color: #858189; font-size: 20rpx; }
.color-count { margin-left: auto; font-variant-numeric: tabular-nums; }
.exclude-btn { width: 48rpx; height: 48rpx; border: 0; background: transparent; color: #b5b1b6; font-size: 32rpx; }
```

- [ ] **Step 3: Add melt control styles**

```css
.melt-controls { margin: 16rpx 0; padding: 16rpx; border: 1rpx solid #dedcdf; border-radius: 14rpx; }
```

- [ ] **Step 4: Add source image actions styles**

```css
.source-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-bottom: 16rpx; }
.source-actions button { padding: 14rpx; border: 1rpx solid #dedcdf; border-radius: 12rpx; }
```

- [ ] **Step 5: Update existing styles**

Adjust existing `.palette`, `.swatch`, `.segments` styles to work with new layout.

---

## Chunk 5: Verification & Cleanup

### Task 5.1: Remove Unused Code

**Files:**
- Delete: `miniprogram/utils/imageConverter.ts` (replaced by beadConverter.ts)
- Modify: `miniprogram/pages/editor/index.ts` (remove old imports and methods)

- [ ] **Step 1: Delete imageConverter.ts**

```bash
rm miniprogram/utils/imageConverter.ts
```

- [ ] **Step 2: Remove old palette constants from editor**

Remove `paletteItems`, `palette`, `paletteRgb`, `hexToRgb`, `nearestPaletteColor`, `paletteForCount`, `normalizedColorCount`, `paletteHexes`.

### Task 5.2: Build & Type Check

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Fix any TypeScript errors (missing types, import paths, etc.)

- [ ] **Step 2: Verify editor page loads in WeChat DevTools**

Open project in WeChat Developer Tools, navigate to editor page, verify:
- No console errors
- Page renders with new settings UI
- Sample grid displays correctly

### Task 5.3: Functional Testing

- [ ] **Step 1: Test image conversion**

Load a photo → select mode → adjust grid size → generate → verify grid appears

- [ ] **Step 2: Test chart/edit/preview views**

Switch between views → verify rendering

- [ ] **Step 3: Test color tools**

Brush, eraser, eyedropper, fill → verify on dark/light colors

- [ ] **Step 4: Test color highlight and exclusion**

Click color in list → verify dimming. Exclude color → verify replacement. Restore → verify re-conversion.

- [ ] **Step 5: Test background removal**

Both source image and board background removal → verify edges removed

- [ ] **Step 6: Test undo/redo**

Multiple paint strokes → undo/redo → verify state

- [ ] **Step 7: Test save and load**

Save to cloud → close and reopen → verify work loads correctly

- [ ] **Step 8: Test export**

Export to album → verify PNG has legend and correct colors

---

## Appendix: Key Differences Note

The mini program cannot replicate the web-studio's Three.js melt preview exactly. The 2D approximation uses circle rendering with variable radii and hole sizes, plus radial gradients for shading. This is visually similar but not pixel-identical to the fragment shader approach.

The color space calculations (Lab, deltaE2000) are preserved exactly from web-studio for color merging accuracy.
