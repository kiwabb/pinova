import { deltaE2000, hexToRgb, rgbToLab } from './color'
import colorSystemMapping from './colorSystemMapping.json'
import type { BeadColor } from './types'

interface ColorSystemEntry {
  MARD: string
  COCO: string
  漫漫: string
  盼盼: string
  咪小窝: string
}

const legacyEntries: Array<[string, string]> = [
  ['瓷白', '#f4f1e8'], ['暖白', '#fff8df'], ['奶油', '#f7e5b7'], ['浅灰', '#c8c8c2'],
  ['中灰', '#858681'], ['炭灰', '#4d4f4c'], ['墨黑', '#202220'], ['柠檬黄', '#f5df43'],
  ['向日黄', '#f2c332'], ['杏黄', '#f5b657'], ['浅橙', '#ee9660'], ['橘橙', '#e96e32'],
  ['珊瑚', '#e76850'], ['正红', '#c94743'], ['深红', '#963c3f'], ['酒红', '#6f343b'],
  ['浅粉', '#f2b6bf'], ['蜜桃粉', '#ea8e94'], ['玫粉', '#d65374'], ['莓红', '#b92f5d'],
  ['浅紫', '#c8b3d9'], ['薰衣草', '#9b82bd'], ['葡萄紫', '#695184'], ['深紫', '#463954'],
  ['冰蓝', '#b9dce0'], ['天蓝', '#79bfd3'], ['湖蓝', '#3c9abb'], ['正蓝', '#3975b7'],
  ['深蓝', '#2f5079'], ['藏蓝', '#26384d'], ['薄荷', '#a8d6bd'], ['青绿', '#5fb79b'],
  ['翡翠', '#268778'], ['墨绿', '#315b4a'], ['浅草绿', '#b8cd78'], ['草绿', '#7aaa54'],
  ['橄榄', '#7b793e'], ['森林绿', '#3f5e37'], ['浅肤', '#f1cfad'], ['蜜桃肤', '#e9ae86'],
  ['暖棕', '#b77e58'], ['焦糖', '#9b603e'], ['深棕', '#66483b'], ['咖啡', '#48352f'],
  ['浅卡其', '#d3c29f'], ['暖灰棕', '#a99b85'], ['砖红', '#9b5147'], ['苔绿灰', '#697568'],
]

export const studioPalette: BeadColor[] = Object.entries(colorSystemMapping as Record<string, ColorSystemEntry>)
  .map(([hex, systems]) => {
    const rgb = hexToRgb(hex)
    return {
      id: systems.MARD,
      name: `MARD ${systems.MARD}`,
      hex: hex.toLowerCase(),
      rgb,
      lab: rgbToLab(rgb),
    }
  })

export function paletteIndexById(id: string): number {
  const index = studioPalette.findIndex((color) => color.id === id)
  return index >= 0 ? index : 0
}

// Projects saved with the original 48-color studio palette are migrated to the
// nearest MARD color so upgrading the palette does not corrupt their appearance.
export const legacyToStudioIndex = legacyEntries.map(([, hex]) => {
  const lab = rgbToLab(hexToRgb(hex))
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  studioPalette.forEach((color, index) => {
    const distance = deltaE2000(lab, color.lab)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
})
