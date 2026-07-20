function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeHexColor(value, fallback = '#F7F8FA') {
  const color = normalizeText(value, 7).toUpperCase()
  return /^#[0-9A-F]{6}$/.test(color) ? color : fallback
}

function isValidBusinessId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/.test(value)
}

function hasUniqueIds(items) {
  if (!Array.isArray(items)) return false
  const ids = items.map((item) => normalizeText(item?.id, 80))
  return ids.every(isValidBusinessId) && new Set(ids).size === ids.length
}

const DEFAULT_PATTERN_MATERIALS = [
  { id: 'material-board', kind: 'board', name: '29 × 29 底板', description: '标准拼豆底板', amount: '4', unit: '块' },
  { id: 'material-beads', kind: 'beads', name: 'MARD 拼豆', description: '按生成后的颜色清单准备', amount: '≤ 3364', unit: '颗' },
  { id: 'material-paper', kind: 'paper', name: '隔热烫纸', description: '用于完成后的熨烫定型', amount: '1', unit: '张' },
]

function defaultPatternMaterials() {
  return DEFAULT_PATTERN_MATERIALS.map((item) => ({ ...item }))
}

function normalizePatternMaterials(input) {
  if (!Array.isArray(input) || !input.length) return defaultPatternMaterials()
  const usedIds = new Set()
  const materials = input.slice(0, 12).map((item, index) => {
    const kind = ['board', 'beads', 'paper', 'other'].includes(item?.kind) ? item.kind : 'other'
    let id = normalizeText(item?.id, 80)
    if (!isValidBusinessId(id) || usedIds.has(id)) id = `material-${index + 1}`
    while (usedIds.has(id)) id = `${id}-${usedIds.size + 1}`
    usedIds.add(id)
    const name = normalizeText(item?.name, 40)
    const description = normalizeText(item?.description, 60)
    const amount = normalizeText(item?.amount, 16)
    const unit = normalizeText(item?.unit, 8)
    return name && amount && unit ? { id, kind, name, description, amount, unit } : null
  }).filter(Boolean)
  return materials.length ? materials : defaultPatternMaterials()
}

function normalizeImportPattern(input = {}) {
  const name = normalizeText(input.name, 40)
  const image = normalizeText(input.image, 500)
  if (!name) return { error: '请填写图纸名称' }
  if (!isAdminUploadFileId(image, 'collections')) return { error: '图纸图片尚未上传成功，请重新导入' }
  return { data: { name, image } }
}

function importPatternDecision(collection, pattern, options = {}) {
  if (!collection || typeof collection !== 'object') return { error: 'NOT_FOUND' }
  if (collection.status === 'archived') return { error: 'ARCHIVED' }
  const images = Array.isArray(collection.images) ? collection.images.filter((item) => typeof item === 'string' && item) : []
  const collectionKey = normalizeText(options.collectionId, 80) || 'collection'
  const existingItems = Array.isArray(collection.items) ? collection.items.map((item, index) => typeof item === 'string'
    ? { id: `${collectionKey}-pattern-${index + 1}`, name: normalizeText(item, 40), image: images[index % Math.max(1, images.length)] || '', materials: defaultPatternMaterials() }
    : { id: normalizeText(item?.id, 80) || `pattern-${index + 1}`, name: normalizeText(item?.name, 40), image: normalizeText(item?.image, 500), materials: normalizePatternMaterials(item?.materials) }) : []
  if (existingItems.length >= 100) return { error: 'ITEMS_FULL' }
  if (existingItems.some((item) => item.id === pattern.id)) return { error: 'DUPLICATE_ID' }
  const coverAdded = Boolean(options.setAsCover) && images.length < 4 && !images.includes(pattern.image)
  return {
    data: {
      items: [...existingItems, { id: pattern.id, name: pattern.name, image: pattern.image, materials: defaultPatternMaterials() }],
      images: coverAdded ? [...images, pattern.image] : images,
      count: existingItems.length + 1,
      coverAdded,
    },
  }
}

function isAdminUploadFileId(fileId, folder = '') {
  if (typeof fileId !== 'string' || !fileId.startsWith('cloud://')) return false
  const pathStart = fileId.indexOf('/', 'cloud://'.length)
  if (pathStart < 0) return false
  const match = fileId.slice(pathStart).match(/^\/admin\/(collections|tutorials|store)\/[^/]+$/)
  return Boolean(match && (!folder || match[1] === folder))
}

function unreferencedFileIds(previousLists, retainedLists) {
  const previous = new Set((Array.isArray(previousLists) ? previousLists : []).flat().filter((item) => typeof item === 'string' && item))
  const retained = new Set((Array.isArray(retainedLists) ? retainedLists : []).flat().filter((item) => typeof item === 'string' && item))
  return [...previous].filter((fileId) => !retained.has(fileId))
}

function documentPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== '_id' && key !== '_openid'))
}

function memberRecordMatchesExpected(user, profile, expected) {
  if (!expected || typeof expected !== 'object') return true
  const status = user?.status === 'suspended' ? 'suspended' : 'active'
  const expectedStatus = expected.status === 'suspended' ? 'suspended' : 'active'
  const growth = Math.max(0, Math.floor(Number(profile?.growth) || 0))
  const points = Math.max(0, Math.floor(Number(profile?.points) || 0))
  return status === expectedStatus && growth === Math.max(0, Math.floor(Number(expected.growth) || 0)) && points === Math.max(0, Math.floor(Number(expected.points) || 0))
}

function revisionDecision(currentDocument, expectedRevision) {
  const currentRevision = currentDocument ? Math.max(1, Math.floor(Number(currentDocument.revision) || 1)) : 0
  const expected = Number(expectedRevision)
  const valid = Number.isInteger(expected) && expected >= 0
  return { valid, conflict: !valid || expected !== currentRevision, currentRevision, nextRevision: currentRevision + 1 }
}

function normalizeStringList(input, maxItems, maxLength) {
  return Array.isArray(input) ? [...new Set(input.map((item) => normalizeText(item, maxLength)).filter(Boolean))].slice(0, maxItems) : []
}

function normalizeMemberConfig(input = {}) {
  const status = input.status === 'published' ? 'published' : 'draft'
  const levels = Array.isArray(input.levels) ? input.levels.map((tier) => ({
    code: normalizeText(tier?.code, 8),
    title: normalizeText(tier?.title, 20),
    threshold: Math.max(0, Number(tier?.threshold) || 0),
    description: normalizeText(tier?.description, 80),
    benefits: normalizeStringList(tier?.benefits, 8, 40),
  })).filter((tier) => /^V[1-4]$/.test(tier.code)).sort((a, b) => Number(a.code.slice(1)) - Number(b.code.slice(1))) : []
  const codes = levels.map((tier) => tier.code)
  if (status === 'published' && (levels.length !== 4 || new Set(codes).size !== 4)) return { error: '发布前请完整配置 V1–V4' }
  if (status === 'published' && levels[0]?.threshold !== 0) return { error: 'V1 成长值门槛必须为 0，绑定后才能直接开启会员' }
  if (status === 'published' && levels.some((tier, index) => index > 0 && tier.threshold <= levels[index - 1].threshold)) return { error: '会员等级门槛必须逐级增加' }
  if (status === 'published' && levels.some((tier) => !tier.title || !tier.description || !tier.benefits.length)) return { error: '发布前请补齐每个等级的名称、说明和权益' }
  const rewardInput = input.rewards || {}
  const rewardValue = (key) => Math.min(10000, Math.max(0, Number(rewardInput[key]) || 0))
  return {
    data: {
      status,
      version: Math.max(1, Number(input.version) || 1),
      levels,
      rewards: {
        bindPhonePoints: rewardValue('bindPhonePoints'),
        bindPhoneGrowth: rewardValue('bindPhoneGrowth'),
        createWorkPoints: rewardValue('createWorkPoints'),
        createWorkGrowth: rewardValue('createWorkGrowth'),
        createWorkDailyLimit: Math.min(100, Math.max(0, Number.isFinite(Number(rewardInput.createWorkDailyLimit)) ? Math.floor(Number(rewardInput.createWorkDailyLimit)) : 3)),
      },
    },
  }
}

function normalizeStoreConfig(input = {}) {
  const status = input.status === 'published' ? 'published' : 'draft'
  const name = normalizeText(input.name, 40)
  const city = normalizeText(input.city, 20)
  const address = normalizeText(input.address, 100)
  const phone = normalizeText(input.phone, 20)
  const latitude = input.latitude === '' || input.latitude === null || input.latitude === undefined ? null : Number(input.latitude)
  const longitude = input.longitude === '' || input.longitude === null || input.longitude === undefined ? null : Number(input.longitude)
  const experienceTypes = normalizeStringList(input.experienceTypes, 8, 30)
  const timeSlots = normalizeStringList(input.timeSlots, 12, 30)
  const photos = Array.isArray(input.photos) ? [...new Set(input.photos.map((item) => normalizeText(item, 500)).filter(Boolean))].slice(0, 6) : []
  const businessHours = normalizeText(input.businessHours, 60)
  if (status === 'published' && !name) return { error: '发布前请填写门店名称' }
  if (status === 'published' && (!city || !address || address.includes('待完善'))) return { error: '发布前请填写完整门店地址' }
  if (status === 'published' && !/^[0-9+\-\s]{7,20}$/.test(phone)) return { error: '发布前请填写有效门店电话' }
  if (status === 'published' && !businessHours) return { error: '发布前请填写营业时间' }
  if (status === 'published' && !photos.length) return { error: '发布前请至少上传一张门店实景图' }
  if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) return { error: '门店经纬度不正确' }
  if (status === 'published' && (latitude === null || longitude === null)) return { error: '发布前请填写门店经纬度' }
  if (status === 'published' && input.bookingEnabled !== false && (!experienceTypes.length || !timeSlots.length)) return { error: '开启预约时请至少配置一种体验和一个时段' }
  return { data: {
    status,
    name,
    city,
    address,
    phone,
    latitude,
    longitude,
    businessHours,
    photos,
    bookingEnabled: input.bookingEnabled !== false,
    maxAdvanceDays: Math.min(90, Math.max(1, Number(input.maxAdvanceDays) || 30)),
    capacityPerSlot: Math.min(50, Math.max(1, Number(input.capacityPerSlot) || 6)),
    experienceTypes,
    timeSlots,
  } }
}

function bookingUsageTransition(currentStatus, nextStatus, used, capacity) {
  const wasActive = currentStatus !== 'cancelled'
  const willBeActive = nextStatus !== 'cancelled'
  const nextUsed = Math.max(0, Math.max(0, Number(used) || 0) + (willBeActive ? 1 : 0) - (wasActive ? 1 : 0))
  return { changed: wasActive !== willBeActive, nextUsed, slotFull: !wasActive && willBeActive && nextUsed > Math.max(1, Number(capacity) || 1) }
}

function bookingSlotUsage(currentSlot, fallbackCount) {
  const fallback = Math.max(0, Math.floor(Number(fallbackCount) || 0))
  if (!currentSlot || !Number.isFinite(Number(currentSlot.used))) return fallback
  return Math.max(0, Math.floor(Number(currentSlot.used)))
}

function workVersionDecision(currentDocument, expectedVersion) {
  const currentVersion = currentDocument ? Math.max(1, Math.floor(Number(currentDocument.version) || 1)) : 0
  const expected = Number(expectedVersion)
  const valid = Number.isInteger(expected) && expected >= 0
  return { valid, conflict: !valid || expected !== currentVersion, currentVersion }
}

function canReactivateBooking(currentStatus, nextStatus, bookingDate, today) {
  return !(currentStatus === 'cancelled' && nextStatus !== 'cancelled' && bookingDate < today)
}

function auditRetentionCutoff(now = Date.now(), retentionDays = 365) {
  const timestamp = Number(now)
  const days = Math.min(3650, Math.max(1, Math.floor(Number(retentionDays) || 365)))
  return new Date((Number.isFinite(timestamp) ? timestamp : Date.now()) - days * 86400000)
}

module.exports = { auditRetentionCutoff, bookingSlotUsage, bookingUsageTransition, canReactivateBooking, defaultPatternMaterials, documentPayload, hasUniqueIds, importPatternDecision, isAdminUploadFileId, isValidBusinessId, memberRecordMatchesExpected, normalizeHexColor, normalizeImportPattern, normalizeMemberConfig, normalizePatternMaterials, normalizeStoreConfig, normalizeStringList, normalizeText, revisionDecision, unreferencedFileIds, workVersionDecision }
