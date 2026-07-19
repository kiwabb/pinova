function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function dateValue(value) {
  if (value instanceof Date) return value.getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function paginationOptions(event = {}, defaultPageSize = 20) {
  const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || defaultPageSize))
  const parsedCursor = Number.parseInt(String(event.cursor || '0'), 10)
  const offset = Number.isFinite(parsedCursor) ? Math.min(100000, Math.max(0, parsedCursor)) : 0
  return { pageSize, offset }
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function canUserCancelBooking(bookingDate, today) {
  return isValidDateString(bookingDate) && isValidDateString(today) && bookingDate >= today
}

function isUserWorkFileId(fileId, userId) {
  if (typeof fileId !== 'string' || typeof userId !== 'string' || !/^[a-f0-9]{64}$/.test(userId) || !fileId.startsWith('cloud://')) return false
  const pathStart = fileId.indexOf('/', 'cloud://'.length)
  if (pathStart < 0) return false
  const prefix = `/user-works/${userId}/`
  const path = fileId.slice(pathStart)
  return path.startsWith(prefix) && path.length > prefix.length && !path.slice(prefix.length).includes('/')
}

function slotAvailability(timeSlots, bookings, capacity) {
  const safeCapacity = Math.min(50, Math.max(1, Number(capacity) || 1))
  const counts = new Map()
  bookings.forEach((booking) => {
    if (booking?.status === 'cancelled' || typeof booking?.timeSlot !== 'string') return
    counts.set(booking.timeSlot, (counts.get(booking.timeSlot) || 0) + 1)
  })
  return [...new Set(timeSlots)].map((timeSlot) => {
    const used = counts.get(timeSlot) || 0
    const remaining = Math.max(0, safeCapacity - used)
    return { timeSlot, used, capacity: safeCapacity, remaining, full: remaining === 0 }
  })
}

function bookingSlotUsage(currentSlot, fallbackCount) {
  const fallback = Math.max(0, Math.floor(Number(fallbackCount) || 0))
  if (!currentSlot || !Number.isFinite(Number(currentSlot.used))) return fallback
  return Math.max(0, Math.floor(Number(currentSlot.used)))
}

function workRewardDecision(created, currentCount, dailyLimit) {
  const count = Math.max(0, Math.floor(Number(currentCount) || 0))
  const limit = Math.min(100, Math.max(0, Math.floor(Number(dailyLimit) || 0)))
  const awarded = Boolean(created) && count < limit
  const nextCount = awarded ? count + 1 : count
  return { awarded, nextCount, remaining: Math.max(0, limit - nextCount) }
}

function workWriteQuotaDecision(created, currentCreatedCount, currentSaveCount, createLimit = 50, saveLimit = 200) {
  const createdCount = Math.max(0, Math.floor(Number(currentCreatedCount) || 0))
  const saveCount = Math.max(0, Math.floor(Number(currentSaveCount) || 0))
  const safeCreateLimit = Math.max(1, Math.floor(Number(createLimit) || 50))
  const safeSaveLimit = Math.max(1, Math.floor(Number(saveLimit) || 200))
  if (saveCount >= safeSaveLimit) return { allowed: false, code: 'WORK_SAVE_LIMIT', nextCreatedCount: createdCount, nextSaveCount: saveCount }
  if (created && createdCount >= safeCreateLimit) return { allowed: false, code: 'WORK_CREATE_LIMIT', nextCreatedCount: createdCount, nextSaveCount: saveCount }
  return { allowed: true, code: '', nextCreatedCount: createdCount + (created ? 1 : 0), nextSaveCount: saveCount + 1 }
}

function workVersionDecision(currentWork, expectedVersion) {
  const currentVersion = currentWork ? Math.max(1, Math.floor(Number(currentWork.version) || 1)) : 0
  const expected = Number(expectedVersion)
  const valid = Number.isInteger(expected) && expected >= 0
  return { valid, conflict: !valid || expected !== currentVersion, currentVersion, nextVersion: currentVersion + 1 }
}

function dailyActionDecision(currentCount, dailyLimit) {
  const count = Math.max(0, Math.floor(Number(currentCount) || 0))
  const limit = Math.max(1, Math.floor(Number(dailyLimit) || 1))
  return { allowed: count < limit, nextCount: count < limit ? count + 1 : count }
}

function phoneBindingRewardDecision(alreadyBound, points, growth) {
  return {
    points: alreadyBound ? 0 : Math.max(0, Number(points) || 0),
    growth: alreadyBound ? 0 : Math.max(0, Number(growth) || 0),
  }
}

function publicMemberConfig(config) {
  const source = config || {}
  const levels = Array.isArray(source.levels) ? source.levels.map((tier) => ({
    code: normalizeText(tier.code, 8),
    title: normalizeText(tier.title, 20),
    threshold: Math.max(0, Number(tier.threshold) || 0),
    description: normalizeText(tier.description, 80),
    benefits: Array.isArray(tier.benefits) ? tier.benefits.map((item) => normalizeText(item, 40)).filter(Boolean).slice(0, 8) : [],
  })).filter((tier) => /^V[1-4]$/.test(tier.code)).sort((a, b) => a.threshold - b.threshold) : []
  const rewardSource = source.rewards || {}
  const rewardValue = (key) => Math.min(10000, Math.max(0, Number(rewardSource[key]) || 0))
  return {
    status: source.status === 'published' ? 'published' : 'draft',
    version: Number(source.version) || 1,
    levels,
    rewards: {
      bindPhonePoints: rewardValue('bindPhonePoints'),
      bindPhoneGrowth: rewardValue('bindPhoneGrowth'),
      createWorkPoints: rewardValue('createWorkPoints'),
      createWorkGrowth: rewardValue('createWorkGrowth'),
      createWorkDailyLimit: Math.min(100, Math.max(0, Number.isFinite(Number(rewardSource.createWorkDailyLimit)) ? Math.floor(Number(rewardSource.createWorkDailyLimit)) : 3)),
    },
  }
}

function levelForGrowth(config, growth, phoneBound) {
  if (!phoneBound) return 'PUBLIC'
  let level = 'V1'
  publicMemberConfig(config).levels.forEach((tier) => { if (growth >= tier.threshold) level = tier.code })
  return level
}

function normalizeGrid(input) {
  if (!Array.isArray(input) || ![16, 24, 32, 48].includes(input.length)) return null
  const size = input.length
  const grid = input.map((row) => Array.isArray(row) && row.length === size
    ? row.map((color) => normalizeText(color, 7).toUpperCase())
    : null)
  if (grid.some((row) => !row || row.some((color) => !/^#[0-9A-F]{6}$/.test(color)))) return null
  return grid
}

function normalizeColorCount(value) {
  const count = Number(value)
  return [6, 8, 12].includes(count) ? count : 12
}

module.exports = { bookingSlotUsage, canUserCancelBooking, dailyActionDecision, dateValue, isUserWorkFileId, isValidDateString, levelForGrowth, normalizeColorCount, normalizeGrid, normalizeText, paginationOptions, phoneBindingRewardDecision, publicMemberConfig, slotAvailability, workRewardDecision, workVersionDecision, workWriteQuotaDecision }
