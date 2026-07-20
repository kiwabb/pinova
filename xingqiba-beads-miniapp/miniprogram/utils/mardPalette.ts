/**
 * MARD 标准拼豆色板。
 * 从 web-studio/src/domain/ 移植，包含完整的 CIE ΔE 2000 色彩科学。
 */

export interface RGB { r: number; g: number; b: number }
export interface Lab { l: number; a: number; b: number }

export interface BeadColor {
  id: string
  name: string
  hex: string
  rgb: RGB
  lab: Lab
}

// ── 色彩转换 ────────────────────────────────────────────

const clamp = (v: number, min = 0, max = 255) => Math.min(max, Math.max(min, v))

export function hexToRgb(hex: string): RGB {
  const value = parseInt(hex.replace('#', ''), 16)
  return { r: value >> 16, g: (value >> 8) & 0xff, b: value & 0xff }
}

function linearize(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function rgbToLab(rgb: RGB): Lab {
  const r = linearize(rgb.r)
  const g = linearize(rgb.g)
  const b = linearize(rgb.b)
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
  const z = (r * 0.0193339 + g * 0.119192  + b * 0.9503041) / 1.08883
  const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116
  const fx = f(x), fy = f(y), fz = f(z)
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

export function deltaE2000(first: Lab, second: Lab): number {
  const avgL = (first.l + second.l) / 2
  const c1 = Math.hypot(first.a, first.b)
  const c2 = Math.hypot(second.a, second.b)
  const avgC = (c1 + c2) / 2
  const g = 0.5 * (1 - Math.sqrt(avgC ** 7 / (avgC ** 7 + 25 ** 7)))
  const a1 = (1 + g) * first.a
  const a2 = (1 + g) * second.a
  const cc1 = Math.hypot(a1, first.b)
  const cc2 = Math.hypot(a2, second.b)
  const avgCC = (cc1 + cc2) / 2
  const hue = (a: number, bv: number) => {
    const angle = (Math.atan2(bv, a) * 180) / Math.PI
    return angle >= 0 ? angle : angle + 360
  }
  const h1 = hue(a1, first.b)
  const h2 = hue(a2, second.b)
  const dh = Math.abs(h1 - h2) <= 180 ? h2 - h1 : h2 <= h1 ? h2 - h1 + 360 : h2 - h1 - 360
  const avgH = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : (h1 + h2 + 360) / 2 % 360
  const t = 1 - 0.17 * Math.cos(((avgH - 30) * Math.PI) / 180)
    + 0.24 * Math.cos((2 * avgH * Math.PI) / 180)
    + 0.32 * Math.cos(((3 * avgH + 6) * Math.PI) / 180)
    - 0.2  * Math.cos(((4 * avgH - 63) * Math.PI) / 180)
  const dL = second.l - first.l
  const dC = cc2 - cc1
  const dH = 2 * Math.sqrt(cc1 * cc2) * Math.sin((dh * Math.PI) / 360)
  const sl = 1 + (0.015 * (avgL - 50) ** 2) / Math.sqrt(20 + (avgL - 50) ** 2)
  const sc = 1 + 0.045 * avgCC
  const sh = 1 + 0.015 * avgCC * t
  const rot = 30 * Math.exp(-1 * (((avgH - 275) / 25) ** 2))
  const rc = 2 * Math.sqrt(avgCC ** 7 / (avgCC ** 7 + 25 ** 7))
  const rt = -rc * Math.sin((2 * rot * Math.PI) / 180)
  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh))
}

export function rgbDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

// ── 色板数据 ────────────────────────────────────────────

const colorData: Record<string, string> = {
  '#FAF4C8':'A01','#FFFFD5':'A02','#FEFF8B':'A03','#FBED56':'A04',
  '#F4D738':'A05','#FEAC4C':'A06','#FE8B4C':'A07','#FFDA45':'A08',
  '#FF995B':'A09','#F77C31':'A10','#FFDD99':'A11','#FE9F72':'A12',
  '#FFC365':'A13','#FD543D':'A14','#FFF365':'A15','#FFFF9F':'A16',
  '#FFE36E':'A17','#FEBE7D':'A18','#FD7C72':'A19','#FFD568':'A20',
  '#FFE395':'A21','#F4F57D':'A22','#E6C9B7':'A23','#F7F8A2':'A24',
  '#FFD67D':'A25','#FFC830':'A26',
  '#E6EE31':'B01','#63F347':'B02','#9EF780':'B03','#5DE035':'B04',
  '#35E352':'B05','#65E2A6':'B06','#3DAF80':'B07','#1C9C4F':'B08',
  '#27523A':'B09','#95D3C2':'B10','#5D722A':'B11','#166F41':'B12',
  '#CAEB7B':'B13','#ADE946':'B14','#2E5132':'B15','#C5ED9C':'B16',
  '#9BB13A':'B17','#E6EE49':'B18','#24B88C':'B19','#C2F0CC':'B20',
  '#156A6B':'B21','#0B3C43':'B22','#303A21':'B23','#EEFCA5':'B24',
  '#4E846D':'B25','#8D7A35':'B26','#CCE1AF':'B27','#9EE5B9':'B28',
  '#C5E254':'B29','#E2FCB1':'B30','#B0E792':'B31','#9CAB5A':'B32',
  '#E8FFE7':'C01','#A9F9FC':'C02','#A0E2FB':'C03','#41CCFF':'C04',
  '#01ACEB':'C05','#50AAF0':'C06','#3677D2':'C07','#0F54C0':'C08',
  '#324BCA':'C09','#3EBCE2':'C10','#28DDDE':'C11','#1C334D':'C12',
  '#CDE8FF':'C13','#D5FDFF':'C14','#22C4C6':'C15','#1557A8':'C16',
  '#04D1F6':'C17','#1D3344':'C18','#1887A2':'C19','#176DAF':'C20',
  '#BEDDFF':'C21','#67B4BE':'C22','#C8E2FF':'C23','#7CC4FF':'C24',
  '#A9E5E5':'C25','#3CAED8':'C26','#D3DFFA':'C27','#BBCFED':'C28','#34488E':'C29',
  '#AEB4F2':'D01','#858EDD':'D02','#2F54AF':'D03','#182A84':'D04',
  '#B843C5':'D05','#AC7BDE':'D06','#8854B3':'D07','#E2D3FF':'D08',
  '#D5B9F8':'D09','#361851':'D10','#B9BAE1':'D11','#DE9AD4':'D12',
  '#B90095':'D13','#8B279B':'D14','#2F1F90':'D15','#E3E1EE':'D16',
  '#C4D4F6':'D17','#A45EC7':'D18','#D8C3D7':'D19','#9C32B2':'D20',
  '#9A009B':'D21','#333A95':'D22','#EBDAFC':'D23','#7786E5':'D24',
  '#494FC7':'D25','#DFC2F8':'D26',
  '#FDD3CC':'E01','#FEC0DF':'E02','#FFB7E7':'E03','#E8649E':'E04',
  '#F551A2':'E05','#F13D74':'E06','#C63478':'E07','#FFDBE9':'E08',
  '#E970CC':'E09','#D33793':'E10','#FCDDD2':'E11','#F78FC3':'E12',
  '#B5006D':'E13','#FFD1BA':'E14','#F8C7C9':'E15','#FFF3EB':'E16',
  '#FFE2EA':'E17','#FFC7DB':'E18','#FEBAD5':'E19','#D8C7D1':'E20',
  '#BD9DA1':'E21','#B785A1':'E22','#937A8D':'E23','#E1BCE8':'E24',
  '#FD957B':'F01','#FC3D46':'F02','#F74941':'F03','#FC283C':'F04',
  '#E7002F':'F05','#943630':'F06','#971937':'F07','#BC0028':'F08',
  '#E2677A':'F09','#8A4526':'F10','#5A2121':'F11','#FD4E6A':'F12',
  '#F35744':'F13','#FFA9AD':'F14','#D30022':'F15','#FEC2A6':'F16',
  '#E69C79':'F17','#D37C46':'F18','#C1444A':'F19','#CD9391':'F20',
  '#F7B4C6':'F21','#FDC0D0':'F22','#F67E66':'F23','#E698AA':'F24','#E54B4F':'F25',
  '#FFE2CE':'G01','#FFC4AA':'G02','#F4C3A5':'G03','#E1B383':'G04',
  '#EDB045':'G05','#E99C17':'G06','#9D5B3E':'G07','#753832':'G08',
  '#E6B483':'G09','#D98C39':'G10','#E0C593':'G11','#FFC890':'G12',
  '#B7714A':'G13','#8D614C':'G14','#FCF9E0':'G15','#F2D9BA':'G16',
  '#78524B':'G17','#FFE4CC':'G18','#E07935':'G19','#A94023':'G20','#B88558':'G21',
  '#FDFBFF':'H01','#FEFFFF':'H02','#B6B1BA':'H03','#89858C':'H04',
  '#48464E':'H05','#2F2B2F':'H06','#000000':'H07','#E7D6DB':'H08',
  '#EDEDED':'H09','#EEE9EA':'H10','#CECDD5':'H11','#FFF5ED':'H12',
  '#F5ECD2':'H13','#CFD7D3':'H14','#98A6A8':'H15','#1D1414':'H16',
  '#F1EDED':'H17','#FFFDF0':'H18','#F6EFE2':'H19','#949FA3':'H20',
  '#FFFBE1':'H21','#CACAD4':'H22','#9A9D94':'H23',
  '#BCC6B8':'M01','#8AA386':'M02','#697D80':'M03','#E3D2BC':'M04',
  '#D0CCAA':'M05','#B0A782':'M06','#B4A497':'M07','#B38281':'M08',
  '#A58767':'M09','#C5B2BC':'M10','#9F7594':'M11','#644749':'M12',
  '#D19066':'M13','#C77362':'M14','#757D78':'M15',
  '#FCF7F8':'P01','#B0A9AC':'P02','#AFDCAB':'P03','#FEA49F':'P04',
  '#EE8C3E':'P05','#5FD0A7':'P06','#EB9270':'P07','#F0D958':'P08',
  '#D9D9D9':'P09','#D9C7EA':'P10','#F3ECC9':'P11','#E6EEF2':'P12',
  '#AACBEF':'P13','#337680':'P14','#668575':'P15','#FEBF45':'P16',
  '#FEA324':'P17','#FEB89F':'P18','#FFFEEC':'P19','#FEBECF':'P20',
  '#ECBEBF':'P21','#E4A89F':'P22','#A56268':'P23',
  '#F2A5E8':'Q01','#E9EC91':'Q02','#FFFF00':'Q03','#FFEBFA':'Q04','#76CEDE':'Q05',
  '#D50D21':'R01','#F92F83':'R02','#FD8324':'R03','#F8EC31':'R04',
  '#35C75B':'R05','#238891':'R06','#19779D':'R07','#1A60C3':'R08',
  '#9A56B4':'R09','#FFDB4C':'R10','#FFEBFB':'R11','#D8D5CE':'R12',
  '#55514C':'R13','#9FE4DF':'R14','#77CEE9':'R15','#3ECFCA':'R16',
  '#4A867A':'R17','#7FCD9D':'R18','#CDE55D':'R19','#E8C7B4':'R20',
  '#AD6F3C':'R21','#6C372F':'R22','#FEB872':'R23','#F3C1C0':'R24',
  '#C9675E':'R25','#D293BE':'R26','#EA8CB1':'R27','#9C87D6':'R28',
  '#FFFFFF':'T01',
  '#FD6FB4':'Y01','#FEB481':'Y02','#D7FAA0':'Y03','#8BDBFA':'Y04','#E987EA':'Y05',
  '#DAABB3':'ZG1','#D6AA87':'ZG2','#C1BD8D':'ZG3','#96869F':'ZG4',
  '#8490A6':'ZG5','#94BFE2':'ZG6','#E2A9D2':'ZG7','#AB91C0':'ZG8',
}

// ── 构建色板 ────────────────────────────────────────────

function buildPalette(): BeadColor[] {
  return Object.entries(colorData).map(([hex, id]) => {
    const rgb = hexToRgb(hex)
    return { id, name: `MARD ${id}`, hex: hex.toLowerCase(), rgb, lab: rgbToLab(rgb) }
  })
}

export const studioPalette: BeadColor[] = buildPalette()

// ── 查找 ────────────────────────────────────────────────

export function paletteIndexById(id: string): number {
  const idx = studioPalette.findIndex(c => c.id === id)
  return idx >= 0 ? idx : 0
}

// ── 旧版 48 色迁移 ──────────────────────────────────────

const legacyEntries: Array<[string, string]> = [
  ['瓷白','#f4f1e8'],['暖白','#fff8df'],['奶油','#f7e5b7'],['浅灰','#c8c8c2'],
  ['中灰','#858681'],['炭灰','#4d4f4c'],['墨黑','#202220'],['柠檬黄','#f5df43'],
  ['向日黄','#f2c332'],['杏黄','#f5b657'],['浅橙','#ee9660'],['橘橙','#e96e32'],
  ['珊瑚','#e76850'],['正红','#c94743'],['深红','#963c3f'],['酒红','#6f343b'],
  ['浅粉','#f2b6bf'],['蜜桃粉','#ea8e94'],['玫粉','#d65374'],['莓红','#b92f5d'],
  ['浅紫','#c8b3d9'],['薰衣草','#9b82bd'],['葡萄紫','#695184'],['深紫','#463954'],
  ['冰蓝','#b9dce0'],['天蓝','#79bfd3'],['湖蓝','#3c9abb'],['正蓝','#3975b7'],
  ['深蓝','#2f5079'],['藏蓝','#26384d'],['薄荷','#a8d6bd'],['青绿','#5fb79b'],
  ['翡翠','#268778'],['墨绿','#315b4a'],['浅草绿','#b8cd78'],['草绿','#7aaa54'],
  ['橄榄','#7b793e'],['森林绿','#3f5e37'],['浅肤','#f1cfad'],['蜜桃肤','#e9ae86'],
  ['暖棕','#b77e58'],['焦糖','#9b603e'],['深棕','#66483b'],['咖啡','#48352f'],
  ['浅卡其','#d3c29f'],['暖灰棕','#a99b85'],['砖红','#9b5147'],['苔绿灰','#697568'],
]

/** 旧版 48 色到 MARD 的映射（按 ΔE 2000 找最近色） */
export const legacyToStudioIndex: number[] = legacyEntries.map(([, hex]) => {
  const lab = rgbToLab(hexToRgb(hex))
  let best = 0
  let bestDist = Infinity
  studioPalette.forEach((c, i) => {
    const d = deltaE2000(lab, c.lab)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
})
