const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const { bookingSlotUsage, canUserCancelBooking, dailyActionDecision, dateValue, isUserWorkFileId, isValidDateString, levelForGrowth, normalizeColorCount, normalizeGrid, normalizeText, paginationOptions, phoneBindingRewardDecision, publicMemberConfig, slotAvailability, workRewardDecision, workVersionDecision, workWriteQuotaDecision } = require('./business')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const memberProfiles = db.collection('member_profiles')
const memberConfigs = db.collection('member_configs')
const storeConfigs = db.collection('store_configs')
const favorites = db.collection('favorites')
const works = db.collection('works')
const bookings = db.collection('bookings')
const bookingSlots = db.collection('booking_slots')
const collections = db.collection('collections')
const tutorialConfigs = db.collection('tutorial_configs')
const rewardCounters = db.collection('reward_counters')
let collectionsReady = null
let maintenanceReady = null
const WORK_CREATE_DAILY_LIMIT = 50
const WORK_SAVE_DAILY_LIMIT = 200
const BOOKING_CREATE_DAILY_LIMIT = 20
const COUNTER_RETENTION_DAYS = 90

const LEVEL_RANK = { PUBLIC: 0, V1: 1, V2: 2, V3: 3, V4: 4, '公开': 0 }
const DEFAULT_MEMBER_CONFIG = {
  status: 'draft',
  version: 1,
  levels: [
    { code: 'V1', title: '初见', threshold: 0, description: '完成会员绑定后开启基础会员服务', benefits: ['云端保存图纸', '到店记录同步', '会员活动提醒'] },
    { code: 'V2', title: '熟客', threshold: 300, description: '累计更多成长值，解锁进阶服务', benefits: ['包含 V1 全部权益', '会员图纸内容', '门店活动优先提醒'] },
    { code: 'V3', title: '达人', threshold: 800, description: '为稳定创作与到店用户提供更多便利', benefits: ['包含 V2 全部权益', '新品体验活动', '专属作品记录'] },
    { code: 'V4', title: '挚友', threshold: 1500, description: '星期八会员体系的最高等级', benefits: ['包含 V3 全部权益', '限定活动邀请', '会员专属服务'] },
  ],
  rewards: {
    bindPhonePoints: 30,
    bindPhoneGrowth: 0,
    createWorkPoints: 10,
    createWorkGrowth: 10,
    createWorkDailyLimit: 3,
  },
}

const DEFAULT_STORE_CONFIG = {
  status: 'draft',
  name: '星期八拼豆工作室',
  city: '武汉市',
  address: '具体地址待完善',
  phone: '',
  latitude: null,
  longitude: null,
  businessHours: '每日 10:00–21:00',
  photos: ['/assets/store/bead-wall-wide.jpg', '/assets/store/color-rack.jpg', '/assets/store/worktable.jpg', '/assets/store/featured-character-work.jpg', '/assets/store/display-wall.jpg', '/assets/store/tools-and-colors.jpg'],
  bookingEnabled: true,
  maxAdvanceDays: 30,
  capacityPerSlot: 6,
  experienceTypes: ['亲子体验', '情侣体验', '自由创作'],
  timeSlots: ['10:00–12:00', '14:00–16:00', '18:00–20:00'],
}

const DEFAULT_TUTORIAL_CONFIG = {
  status: 'published',
  title: '第一件拼豆作品',
  subtitle: '从摆放到定型',
  safetyNote: '熨烫和剪切必须由成人操作；儿童制作时需全程陪同。',
  sections: [
    { id: 'prepare', title: '准备工具和颜色', duration: '2 分钟', image: '/assets/store/tools-and-colors.jpg', steps: ['根据图纸整理所需颜色，将相近色分开放置。', '选择与图纸尺寸匹配的模板，从一个角开始制作。', '长时间制作时保持桌面明亮，避免颜色误判。'] },
    { id: 'bead', title: '按图纸摆放拼豆', duration: '5–20 分钟', image: '/assets/store/worktable.jpg', steps: ['先摆放轮廓和颜色边界，再填充大面积色块。', '每完成一小块就对照图纸检查，及时修正错位。', '不要按压拼豆，保留均匀间隙便于后续熨烫。'] },
    { id: 'iron', title: '覆盖烫纸并定型', duration: '3–5 分钟', image: '/assets/store/featured-character-work.jpg', steps: ['完整覆盖烫纸，确保熨斗不直接接触拼豆。', '使用中低温小范围画圆移动，不要停留在同一位置。', '待表面稍微融合后移开熨斗，压平冷却再取下模板。'] },
  ],
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get()
  } catch (error) {
    try {
      await db.createCollection(name)
    } catch (createError) {
      await db.collection(name).limit(1).get()
    }
  }
}

function ensureCollectionsReady() {
  if (!collectionsReady) {
    collectionsReady = Promise.all(['users', 'member_profiles', 'member_configs', 'store_configs', 'favorites', 'works', 'bookings', 'booking_slots', 'collections', 'tutorial_configs', 'reward_counters'].map(ensureCollection))
      .catch((error) => { collectionsReady = null; throw error })
  }
  return collectionsReady
}

function ensureMaintenanceReady() {
  if (!maintenanceReady) maintenanceReady = pruneExpiredRewardCounters().catch((error) => {
    console.warn('reward counter cleanup failed', error)
    return 0
  })
  return maintenanceReady
}

function userIdFromOpenid(openid) {
  return crypto.createHash('sha256').update(openid).digest('hex')
}

async function fetchAllDocuments(reference, maxItems = 5000) {
  const items = []
  while (items.length < maxItems) {
    const result = await reference.skip(items.length).limit(Math.min(100, maxItems - items.length)).get()
    items.push(...result.data)
    if (result.data.length < 100) break
  }
  return items
}

async function queryPage(reference, event, sortField, direction = 'desc') {
  const { pageSize, offset } = paginationOptions(event)
  let pageItems
  let total
  try {
    const [result, countResult] = await Promise.all([
      reference.orderBy(sortField, direction).skip(offset).limit(pageSize + 1).get(),
      reference.count(),
    ])
    pageItems = result.data
    total = countResult.total || 0
  } catch (error) {
    console.warn(`ordered pagination fallback for ${sortField}`, error)
    const allItems = await fetchAllDocuments(reference)
    allItems.sort((left, right) => {
      const comparison = dateValue(left[sortField]) - dateValue(right[sortField])
      if (comparison !== 0) return direction === 'asc' ? comparison : -comparison
      return direction === 'asc' ? left._id.localeCompare(right._id) : right._id.localeCompare(left._id)
    })
    total = allItems.length
    pageItems = allItems.slice(offset, offset + pageSize + 1)
  }
  const hasMore = pageItems.length > pageSize
  const items = pageItems.slice(0, pageSize)
  return { items, total, hasMore, nextCursor: hasMore ? String(offset + items.length) : '' }
}

async function temporaryUrlMap(fileIds) {
  const ids = [...new Set(fileIds.filter((fileId) => typeof fileId === 'string' && fileId.startsWith('cloud://')))].slice(0, 50)
  if (!ids.length) return {}
  try {
    const result = await cloud.getTempFileURL({ fileList: ids })
    return Object.fromEntries((result.fileList || []).filter((item) => item.status === 0 && item.tempFileURL).map((item) => [item.fileID, item.tempFileURL]))
  } catch (error) {
    console.warn('temporary file url resolution failed', error)
    return {}
  }
}

function rankFor(level) {
  if (level === undefined || level === null || level === '') return 0
  return Object.prototype.hasOwnProperty.call(LEVEL_RANK, level) ? LEVEL_RANK[level] : Number.POSITIVE_INFINITY
}

async function getCurrentMemberLevel(userId) {
  const [user, profile, config] = await Promise.all([
    users.doc(userId).get().then((result) => result.data),
    getOrCreateProfile(userId),
    getMemberConfig(),
  ])
  const memberLevel = levelForGrowth(config, Number(profile.growth) || 0, Boolean(user.phoneBound))
  if (profile.level !== memberLevel) await memberProfiles.doc(userId).update({ data: { level: memberLevel, updatedAt: db.serverDate() } })
  return memberLevel
}

async function getOrCreateUser(userId, openid) {
  try {
    return (await users.doc(userId).get()).data
  } catch (error) {
    const now = db.serverDate()
    const user = { openid, status: 'active', phoneBound: false, createdAt: now, updatedAt: now }
    await users.doc(userId).set({ data: user })
    return user
  }
}

async function getOrCreateProfile(userId) {
  try {
    return (await memberProfiles.doc(userId).get()).data
  } catch (error) {
    const now = db.serverDate()
    const profile = { userId, level: 'PUBLIC', growth: 0, points: 0, createdAt: now, updatedAt: now }
    await memberProfiles.doc(userId).set({ data: profile })
    return profile
  }
}

async function getMemberConfig() {
  try {
    return (await memberConfigs.doc('published').get()).data
  } catch (error) {
    try {
      const working = (await memberConfigs.doc('default').get()).data
      if (working.status === 'published') return working
    } catch (workingError) {
      await memberConfigs.doc('default').set({ data: { ...DEFAULT_MEMBER_CONFIG, createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    }
    return DEFAULT_MEMBER_CONFIG
  }
}

async function getStoreConfig() {
  try {
    return (await storeConfigs.doc('published').get()).data
  } catch (error) {
    try {
      const working = (await storeConfigs.doc('default').get()).data
      if (working.status === 'published') return working
    } catch (workingError) {
      await storeConfigs.doc('default').set({ data: { ...DEFAULT_STORE_CONFIG, createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    }
    return { ...DEFAULT_STORE_CONFIG, bookingEnabled: false }
  }
}

function publicStoreConfig(config) {
  const latitude = config.latitude === null || config.latitude === '' || config.latitude === undefined ? NaN : Number(config.latitude)
  const longitude = config.longitude === null || config.longitude === '' || config.longitude === undefined ? NaN : Number(config.longitude)
  return {
    status: config.status === 'published' ? 'published' : 'draft',
    name: normalizeText(config.name, 40) || DEFAULT_STORE_CONFIG.name,
    city: normalizeText(config.city, 20),
    address: normalizeText(config.address, 100),
    phone: normalizeText(config.phone, 20),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    businessHours: normalizeText(config.businessHours, 60),
    photos: Array.isArray(config.photos) && config.photos.length
      ? [...new Set(config.photos.map((item) => normalizeText(item, 500)).filter(Boolean))].slice(0, 6)
      : DEFAULT_STORE_CONFIG.photos,
    bookingEnabled: config.bookingEnabled !== false,
    maxAdvanceDays: Math.min(90, Math.max(1, Number(config.maxAdvanceDays) || 30)),
    experienceTypes: Array.isArray(config.experienceTypes) ? [...new Set(config.experienceTypes.map((item) => normalizeText(item, 30)).filter(Boolean))].slice(0, 8) : [],
    timeSlots: Array.isArray(config.timeSlots) ? [...new Set(config.timeSlots.map((item) => normalizeText(item, 30)).filter(Boolean))].slice(0, 12) : [],
  }
}

async function countFor(collection, userId) {
  try {
    return (await collection.where({ userId }).count()).total || 0
  } catch (error) {
    return 0
  }
}

async function countActiveBookings(userId) {
  try {
    const result = await bookings.where({ userId, status: _.neq('cancelled') }).count()
    return result.total || 0
  } catch (error) {
    const records = await fetchAllDocuments(bookings.where({ userId }))
    return records.filter((item) => item.status !== 'cancelled').length
  }
}

async function getProfile(userId, openid) {
  const [user, profile, config, favoriteCount, workCount, bookingCount] = await Promise.all([
    getOrCreateUser(userId, openid),
    getOrCreateProfile(userId),
    getMemberConfig(),
    countFor(favorites, userId),
    countFor(works, userId),
    countActiveBookings(userId),
  ])
  const memberLevel = levelForGrowth(config, Number(profile.growth) || 0, Boolean(user.phoneBound))
  if (profile.level !== memberLevel) {
    await memberProfiles.doc(userId).update({ data: { level: memberLevel, updatedAt: db.serverDate() } })
  }
  return {
    success: true,
    data: {
      id: userId,
      memberLevel,
      growth: Number(profile.growth) || 0,
      points: Number(profile.points) || 0,
      phoneBound: Boolean(user.phoneBound),
      phoneMasked: user.phoneMasked || '',
      stats: { favorites: favoriteCount, works: workCount, bookings: bookingCount },
      memberConfig: publicMemberConfig(config),
    },
  }
}

async function bindPhone(event, userId, openid) {
  const code = normalizeText(event.code, 160)
  const replace = event.replace === true
  if (!code) return { success: false, code: 'INVALID_ARGUMENT', message: '未获取到微信手机号授权' }

  const [user, profile, config] = await Promise.all([
    getOrCreateUser(userId, openid),
    getOrCreateProfile(userId),
    getMemberConfig(),
  ])
  if (user.phoneBound && !replace) return await getProfile(userId, openid)

  let phoneInfo
  try {
    const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({ code })
    phoneInfo = phoneResult.phoneInfo || phoneResult.phone_info
  } catch (error) {
    console.error('getPhoneNumber failed', error)
    return { success: false, code: 'PHONE_AUTH_FAILED', message: '手机号授权已失效，请重新授权' }
  }

  const phone = normalizeText(phoneInfo?.purePhoneNumber || phoneInfo?.pure_phone_number, 20)
  const countryCode = normalizeText(phoneInfo?.countryCode || phoneInfo?.country_code, 8)
  if (!/^1\d{10}$/.test(phone)) return { success: false, code: 'PHONE_INVALID', message: '未能识别有效的中国大陆手机号' }

  const rewards = config.rewards || {}
  const pointsReward = Math.max(0, Number(rewards.bindPhonePoints) || 0)
  const growthReward = Math.max(0, Number(rewards.bindPhoneGrowth) || 0)
  await db.runTransaction(async (transaction) => {
    const currentUser = (await transaction.collection('users').doc(userId).get()).data
    const currentProfile = (await transaction.collection('member_profiles').doc(userId).get()).data
    const alreadyBound = Boolean(currentUser.phoneBound)
    if (alreadyBound && !replace) return

    const bindingReward = phoneBindingRewardDecision(alreadyBound, pointsReward, growthReward)
    const nextGrowth = (Number(currentProfile.growth) || 0) + bindingReward.growth
    await transaction.collection('users').doc(userId).update({ data: {
      phone,
      countryCode,
      phoneMasked: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      phoneBound: true,
      phoneBoundAt: currentUser.phoneBoundAt || db.serverDate(),
      phoneUpdatedAt: db.serverDate(),
      updatedAt: db.serverDate(),
    } })
    await transaction.collection('member_profiles').doc(userId).update({ data: {
      level: levelForGrowth(config, nextGrowth, true),
      growth: nextGrowth,
      points: (Number(currentProfile.points) || 0) + bindingReward.points,
      updatedAt: db.serverDate(),
    } })
  })
  return await getProfile(userId, openid)
}

function normalizePatterns(collectionId, collection) {
  const images = Array.isArray(collection.images) ? collection.images : []
  return Array.isArray(collection.items) ? collection.items.map((item, index) => typeof item === 'string'
    ? { id: `${collectionId}-${String(index + 1).padStart(2, '0')}`, name: item, image: images[index % Math.max(1, images.length)] || '' }
    : { id: normalizeText(item?.id, 80) || `${collectionId}-${String(index + 1).padStart(2, '0')}`, name: normalizeText(item?.name, 40), image: normalizeText(item?.image, 500) }) : []
}

async function getAccessiblePattern(event, userId) {
  const collectionId = normalizeText(event.collectionId, 80)
  const patternId = normalizeText(event.patternId, 80)
  if (!collectionId || !patternId) return { error: '缺少图纸信息' }
  let collection
  try {
    collection = (await collections.doc(collectionId).get()).data
  } catch (error) {
    return { error: '图集不存在' }
  }
  if (collection.status !== 'published') return { error: '该图集已下架' }
  const memberLevel = await getCurrentMemberLevel(userId)
  if (rankFor(collection.level) > rankFor(memberLevel)) return { error: `需要 ${collection.level} 会员` }
  const pattern = normalizePatterns(collectionId, collection).find((item) => item.id === patternId)
  if (!pattern) return { error: '图纸不存在' }
  return { collectionId, collection, pattern }
}

async function getFavoriteIds(event, userId) {
  const collectionId = normalizeText(event.collectionId, 80)
  if (!collectionId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图集 ID' }
  const result = await favorites.where({ userId, collectionId }).limit(100).get()
  return { success: true, data: result.data.map((item) => item.patternId) }
}

async function toggleFavorite(event, userId) {
  const collectionId = normalizeText(event.collectionId, 80)
  const patternId = normalizeText(event.patternId, 80)
  if (!collectionId || !patternId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图纸信息' }
  const favoriteId = crypto.createHash('sha256').update(`${userId}:${collectionId}:${patternId}`).digest('hex')
  try {
    const existing = (await favorites.doc(favoriteId).get()).data
    if (existing.userId === userId) {
      await favorites.doc(favoriteId).remove()
      return { success: true, data: { favorite: false } }
    }
  } catch (error) {}

  const accessible = await getAccessiblePattern(event, userId)
  if (accessible.error) return { success: false, code: 'FORBIDDEN', message: accessible.error }
  await favorites.doc(favoriteId).set({ data: {
    userId,
    collectionId: accessible.collectionId,
    collectionTitle: accessible.collection.title,
    patternId: accessible.pattern.id,
    patternName: accessible.pattern.name,
    image: accessible.pattern.image,
    createdAt: db.serverDate(),
  } })
  return { success: true, data: { favorite: true } }
}

async function listFavorites(event, userId) {
  const page = await queryPage(favorites.where({ userId }), event, 'createdAt')
  const memberLevel = await getCurrentMemberLevel(userId)
  const collectionIds = [...new Set(page.items.map((item) => item.collectionId).filter(Boolean))]
  const collectionEntries = await Promise.all(collectionIds.map(async (collectionId) => {
    try {
      return [collectionId, (await collections.doc(collectionId).get()).data]
    } catch (error) {
      return [collectionId, null]
    }
  }))
  const collectionMap = Object.fromEntries(collectionEntries)
  const resolvedItems = page.items.map((item) => {
    const collection = collectionMap[item.collectionId]
    if (collection?.status !== 'published') {
      return { favorite: item, available: false, unavailableReason: '图集已下架' }
    }
    if (rankFor(collection.level) > rankFor(memberLevel)) {
      return { favorite: item, collection, available: false, unavailableReason: `需要 ${collection.level} 会员` }
    }
    const pattern = normalizePatterns(item.collectionId, collection).find((candidate) => candidate.id === item.patternId)
    if (!pattern) return { favorite: item, collection, available: false, unavailableReason: '图纸已移除' }
    return { favorite: item, collection, pattern, available: true, unavailableReason: '' }
  })
  const urlMap = await temporaryUrlMap(resolvedItems.filter((item) => item.available).map((item) => item.pattern.image))
  const data = resolvedItems.map(({ favorite, collection, pattern, available, unavailableReason }) => {
    const result = {
      id: favorite._id,
      collectionId: favorite.collectionId,
      collectionTitle: collection?.title || favorite.collectionTitle || '原图集',
      patternId: favorite.patternId,
      title: pattern?.name || favorite.patternName || '已收藏图纸',
      available,
      unavailableReason,
      createdAt: dateValue(favorite.createdAt),
    }
    if (!available) return result
    return {
      ...result,
      image: pattern.image,
      imageUrl: urlMap[pattern.image] || pattern.image,
    }
  })
  return { success: true, data: event.paginated ? { ...page, items: data } : data }
}

async function saveWork(event, userId, openid) {
  const grid = normalizeGrid(event.grid)
  if (!grid) return { success: false, code: 'INVALID_ARGUMENT', message: '图纸数据不完整' }
  const requestedId = normalizeText(event.workId, 80)
  const workId = /^[a-zA-Z0-9-]{8,80}$/.test(requestedId) ? requestedId : `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const previewFileId = normalizeText(event.previewFileId, 500)
  if (!isUserWorkFileId(previewFileId, userId)) {
    return { success: false, code: 'INVALID_ARGUMENT', message: '作品预览图路径不正确' }
  }

  let previous = null
  try {
    previous = (await works.doc(workId).get()).data
    if (previous.userId !== userId) return { success: false, code: 'FORBIDDEN', message: '无权修改该作品' }
  } catch (error) {}

  const title = normalizeText(event.title, 40) || '未命名作品'
  const [user, config] = await Promise.all([
    getOrCreateUser(userId, openid),
    getMemberConfig(),
    getOrCreateProfile(userId),
  ])
  if (!user.phoneBound) return { success: false, code: 'PHONE_REQUIRED', message: '云端保存前请先绑定微信手机号' }
  const rewards = config.rewards || {}
  const pointsReward = Math.max(0, Number(rewards.createWorkPoints) || 0)
  const growthReward = Math.max(0, Number(rewards.createWorkGrowth) || 0)
  const dailyRewardLimit = Math.min(100, Math.max(0, Number.isFinite(Number(rewards.createWorkDailyLimit)) ? Math.floor(Number(rewards.createWorkDailyLimit)) : 3))
  const rewardDate = shanghaiDate()
  const rewardCounterId = crypto.createHash('sha256').update(`${userId}:work:${rewardDate}`).digest('hex')

  let transactionResult
  try {
    transactionResult = await db.runTransaction(async (transaction) => {
      let currentWork = null
      let rewardCounter = null
      try {
        currentWork = (await transaction.collection('works').doc(workId).get()).data
      } catch (error) {}
      try {
        rewardCounter = (await transaction.collection('reward_counters').doc(rewardCounterId).get()).data
      } catch (error) {}
      if (currentWork && currentWork.userId !== userId) throw new Error('WORK_OWNER_CHANGED')
      const version = workVersionDecision(currentWork, event.expectedVersion)
      if (!version.valid) throw new Error('WORK_VERSION_REQUIRED')
      if (version.conflict) throw new Error('WORK_CHANGED')

      const currentProfile = (await transaction.collection('member_profiles').doc(userId).get()).data
      const created = !currentWork
      const quota = workWriteQuotaDecision(created, rewardCounter?.createdCount ?? rewardCounter?.count, rewardCounter?.saveCount, WORK_CREATE_DAILY_LIMIT, WORK_SAVE_DAILY_LIMIT)
      if (!quota.allowed) throw new Error(quota.code)
      const reward = workRewardDecision(created && (pointsReward > 0 || growthReward > 0), rewardCounter?.count, dailyRewardLimit)
      const nextPoints = (Number(currentProfile.points) || 0) + (reward.awarded ? pointsReward : 0)
      const nextGrowth = (Number(currentProfile.growth) || 0) + (reward.awarded ? growthReward : 0)
      const memberLevel = levelForGrowth(config, nextGrowth, Boolean(user.phoneBound))
      await transaction.collection('works').doc(workId).set({ data: {
        userId,
        title,
        grid,
        gridSize: grid.length,
        colorCount: normalizeColorCount(event.colorCount),
        previewMode: event.previewMode === 'grid' ? 'grid' : 'beads',
        version: version.nextVersion,
        previewFileId,
        sourceCollectionId: normalizeText(event.sourceCollectionId, 80),
        sourcePatternId: normalizeText(event.sourcePatternId, 80),
        createdAt: currentWork?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
      } })
      if (created) {
        await transaction.collection('member_profiles').doc(userId).update({ data: {
          points: nextPoints,
          growth: nextGrowth,
          level: memberLevel,
          updatedAt: db.serverDate(),
        } })
      } else if (currentProfile.level !== memberLevel) {
        await transaction.collection('member_profiles').doc(userId).update({ data: { level: memberLevel, updatedAt: db.serverDate() } })
      }
      await transaction.collection('reward_counters').doc(rewardCounterId).set({ data: {
        userId,
        type: 'workWrite',
        date: rewardDate,
        count: reward.nextCount,
        createdCount: quota.nextCreatedCount,
        saveCount: quota.nextSaveCount,
        updatedAt: db.serverDate(),
      } })
      return { created, rewarded: reward.awarded, pointsAwarded: reward.awarded ? pointsReward : 0, growthAwarded: reward.awarded ? growthReward : 0, rewardRemaining: reward.remaining, points: nextPoints, growth: nextGrowth, memberLevel, version: version.nextVersion, previousPreview: currentWork?.previewFileId || '' }
    })
  } catch (error) {
    if (error?.message === 'WORK_OWNER_CHANGED') return { success: false, code: 'FORBIDDEN', message: '无权修改该作品' }
    if (error?.message === 'WORK_VERSION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少作品版本，请重新打开作品后再保存' }
    if (error?.message === 'WORK_CHANGED') return { success: false, code: 'CONFLICT', message: '作品已在其他设备更新，当前修改未覆盖云端，请重新打开作品后再编辑' }
    if (error?.message === 'WORK_CREATE_LIMIT') return { success: false, code: 'WORK_CREATE_LIMIT', message: `每天最多新建 ${WORK_CREATE_DAILY_LIMIT} 个作品，请明天继续` }
    if (error?.message === 'WORK_SAVE_LIMIT') return { success: false, code: 'WORK_SAVE_LIMIT', message: `当天保存操作已达到 ${WORK_SAVE_DAILY_LIMIT} 次，请明天继续` }
    throw error
  }

  if (transactionResult.previousPreview && transactionResult.previousPreview !== previewFileId && isUserWorkFileId(transactionResult.previousPreview, userId)) {
    await deleteWorkPreviewIfUnused(transactionResult.previousPreview, userId).catch((error) => console.warn('cleanup work preview failed', error))
  }
  return { success: true, data: { id: workId, version: transactionResult.version, points: transactionResult.points, growth: transactionResult.growth, memberLevel: transactionResult.memberLevel, created: transactionResult.created, rewarded: transactionResult.rewarded, pointsAwarded: transactionResult.pointsAwarded, growthAwarded: transactionResult.growthAwarded, rewardRemaining: transactionResult.rewardRemaining } }
}

async function listWorks(event, userId) {
  const page = await queryPage(works.where({ userId }).field({ grid: false }), event, 'updatedAt')
  const urlMap = await temporaryUrlMap(page.items.map((item) => item.previewFileId))
  const data = page.items.map((item) => ({
    id: item._id,
    version: Math.max(1, Number(item.version) || 1),
    title: item.title,
    previewFileId: item.previewFileId,
    previewUrl: urlMap[item.previewFileId] || item.previewFileId,
    gridSize: Number(item.gridSize) || 24,
    colorCount: normalizeColorCount(item.colorCount),
    previewMode: item.previewMode === 'grid' ? 'grid' : 'beads',
    sourceCollectionId: item.sourceCollectionId || '',
    sourcePatternId: item.sourcePatternId || '',
    updatedAt: dateValue(item.updatedAt),
  }))
  return { success: true, data: event.paginated ? { ...page, items: data } : data }
}

async function listBookings(event, userId) {
  const page = await queryPage(bookings.where({ userId }), event, 'createdAt')
  const data = page.items.map((item) => ({
    id: item._id,
    date: item.date,
    experienceType: item.experienceType,
    timeSlot: item.timeSlot,
    status: item.status || 'pending',
    cancellable: item.status !== 'cancelled' && canUserCancelBooking(item.date, shanghaiDate()),
    createdAt: dateValue(item.createdAt),
  }))
  return { success: true, data: event.paginated ? { ...page, items: data } : data }
}

function shanghaiDate(offsetDays = 0) {
  return new Date(Date.now() + (8 * 60 * 60 * 1000) + (offsetDays * 86400000)).toISOString().slice(0, 10)
}

async function pruneExpiredRewardCounters() {
  const expired = await rewardCounters.where({ date: _.lt(shanghaiDate(-COUNTER_RETENTION_DAYS)) }).limit(100).get()
  await Promise.all(expired.data.map((item) => rewardCounters.doc(item._id).remove()))
  return expired.data.length
}

function bookingSlotId(date, timeSlot) {
  return crypto.createHash('sha256').update(`${date}:${timeSlot}`).digest('hex')
}

async function activeSlotCount(date, timeSlot) {
  try {
    const result = await bookings.where({ date, timeSlot, status: _.neq('cancelled') }).count()
    return result.total || 0
  } catch (error) {
    const records = await fetchAllDocuments(bookings.where({ date }), 5000)
    return records.filter((item) => item.timeSlot === timeSlot && item.status !== 'cancelled').length
  }
}

async function getStore(userId) {
  const config = await getStoreConfig()
  const store = publicStoreConfig(config)
  const photoUrlMap = await temporaryUrlMap(store.photos)
  store.photos = store.photos.map((photo) => photoUrlMap[photo] || photo)
  const userBookings = await fetchAllDocuments(bookings.where({ userId }), 2000)
  const activeBooking = userBookings
    .filter((item) => item.status !== 'cancelled' && item.date >= shanghaiDate())
    .sort((a, b) => `${a.date}-${a.timeSlot}`.localeCompare(`${b.date}-${b.timeSlot}`))[0]
  return {
    success: true,
    data: {
      store,
      activeBooking: activeBooking ? {
        id: activeBooking._id,
        date: activeBooking.date,
        experienceType: activeBooking.experienceType,
        timeSlot: activeBooking.timeSlot,
        status: activeBooking.status || 'pending',
      } : null,
    },
  }
}

async function getTutorial() {
  const config = await (async () => {
    try {
      return (await tutorialConfigs.doc('published').get()).data
    } catch (error) {
      try {
        const working = (await tutorialConfigs.doc('default').get()).data
        if (working.status === 'published') return working
      } catch (workingError) {}
      return DEFAULT_TUTORIAL_CONFIG
    }
  })()
  return {
    success: true,
    data: {
      title: normalizeText(config.title, 40) || DEFAULT_TUTORIAL_CONFIG.title,
      subtitle: normalizeText(config.subtitle, 60) || DEFAULT_TUTORIAL_CONFIG.subtitle,
      safetyNote: normalizeText(config.safetyNote, 180) || DEFAULT_TUTORIAL_CONFIG.safetyNote,
      sections: Array.isArray(config.sections) ? config.sections.map((section, index) => ({
        id: normalizeText(section.id, 80) || `section-${index + 1}`,
        title: normalizeText(section.title, 40),
        duration: normalizeText(section.duration, 20),
        image: normalizeText(section.image, 500),
        steps: Array.isArray(section.steps) ? section.steps.map((step) => normalizeText(step, 120)).filter(Boolean).slice(0, 8) : [],
      })).filter((section) => section.title && section.image && section.steps.length).slice(0, 12) : DEFAULT_TUTORIAL_CONFIG.sections,
    },
  }
}

async function getAvailability(event) {
  const configSource = await getStoreConfig()
  const config = publicStoreConfig(configSource)
  if (configSource.status !== 'published' || !config.bookingEnabled) {
    return { success: false, code: 'BOOKING_DISABLED', message: '门店当前未开放线上预约' }
  }
  const date = normalizeText(event.date, 10)
  if (!isValidDateString(date) || date < shanghaiDate() || date > shanghaiDate(config.maxAdvanceDays)) {
    return { success: false, code: 'INVALID_DATE', message: `请选择今天起 ${config.maxAdvanceDays} 天内的日期` }
  }
  const records = await fetchAllDocuments(bookings.where({ date }), 5000)
  return {
    success: true,
    data: {
      date,
      slots: slotAvailability(config.timeSlots, records, configSource.capacityPerSlot),
    },
  }
}

async function createBooking(event, userId, openid) {
  const [user, configSource] = await Promise.all([getOrCreateUser(userId, openid), getStoreConfig()])
  if (!user.phoneBound) return { success: false, code: 'PHONE_REQUIRED', message: '预约前请先绑定微信手机号' }
  if (configSource.status !== 'published') return { success: false, code: 'STORE_NOT_PUBLISHED', message: '门店预约尚未开放' }
  const config = publicStoreConfig(configSource)
  if (!config.bookingEnabled) return { success: false, code: 'BOOKING_DISABLED', message: '门店当前暂停线上预约' }

  const date = normalizeText(event.date, 10)
  const experienceType = normalizeText(event.experienceType, 30)
  const timeSlot = normalizeText(event.timeSlot, 30)
  if (!isValidDateString(date) || date < shanghaiDate() || date > shanghaiDate(config.maxAdvanceDays)) {
    return { success: false, code: 'INVALID_DATE', message: `请选择今天起 ${config.maxAdvanceDays} 天内的日期` }
  }
  if (!config.experienceTypes.includes(experienceType)) return { success: false, code: 'INVALID_TYPE', message: '体验类型已变更，请重新选择' }
  if (!config.timeSlots.includes(timeSlot)) return { success: false, code: 'INVALID_SLOT', message: '预约时段已变更，请重新选择' }

  const capacity = Math.min(50, Math.max(1, Number(configSource.capacityPerSlot) || 6))
  const bookingId = crypto.createHash('sha256').update(`${userId}:${date}:${timeSlot}`).digest('hex')
  const slotId = bookingSlotId(date, timeSlot)
  const bookingCounterId = crypto.createHash('sha256').update(`${userId}:booking:${shanghaiDate()}`).digest('hex')
  const initialCount = await activeSlotCount(date, timeSlot)
  let transactionResult
  try {
    transactionResult = await db.runTransaction(async (transaction) => {
      let currentBooking = null
      let currentSlot = null
      try {
        currentBooking = (await transaction.collection('bookings').doc(bookingId).get()).data
      } catch (error) {}
      try {
        currentSlot = (await transaction.collection('booking_slots').doc(slotId).get()).data
      } catch (error) {}

      if (currentBooking && currentBooking.status !== 'cancelled') {
        return { repeated: true, booking: currentBooking }
      }

      let bookingCounter = null
      try {
        bookingCounter = (await transaction.collection('reward_counters').doc(bookingCounterId).get()).data
      } catch (error) {}
      const bookingQuota = dailyActionDecision(bookingCounter?.count, BOOKING_CREATE_DAILY_LIMIT)
      if (!bookingQuota.allowed) throw new Error('BOOKING_DAILY_LIMIT')

      const used = bookingSlotUsage(currentSlot, initialCount)
      if (used >= capacity) throw new Error('SLOT_FULL')

      await transaction.collection('bookings').doc(bookingId).set({ data: {
        userId,
        date,
        experienceType,
        timeSlot,
        status: 'pending',
        createdAt: currentBooking?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
      } })
      await transaction.collection('booking_slots').doc(slotId).set({ data: {
        date,
        timeSlot,
        used: used + 1,
        capacity,
        updatedAt: db.serverDate(),
      } })
      await transaction.collection('reward_counters').doc(bookingCounterId).set({ data: {
        userId,
        type: 'bookingCreate',
        date: shanghaiDate(),
        count: bookingQuota.nextCount,
        updatedAt: db.serverDate(),
      } })
      return { repeated: false, booking: { date, experienceType, timeSlot, status: 'pending' } }
    })
  } catch (error) {
    if (error?.message === 'SLOT_FULL') return { success: false, code: 'SLOT_FULL', message: '该时段已约满，请选择其他时段' }
    if (error?.message === 'BOOKING_DAILY_LIMIT') return { success: false, code: 'BOOKING_DAILY_LIMIT', message: `每天最多提交 ${BOOKING_CREATE_DAILY_LIMIT} 次新预约，请明天继续` }
    throw error
  }
  return { success: true, data: {
    id: bookingId,
    date: transactionResult.booking.date,
    experienceType: transactionResult.booking.experienceType,
    timeSlot: transactionResult.booking.timeSlot,
    status: transactionResult.booking.status || 'pending',
    repeated: transactionResult.repeated,
  } }
}

async function cancelBooking(event, userId) {
  const bookingId = normalizeText(event.bookingId, 80)
  if (!bookingId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少预约 ID' }
  let booking
  try {
    booking = (await bookings.doc(bookingId).get()).data
  } catch (error) {
    return { success: false, code: 'NOT_FOUND', message: '预约记录不存在' }
  }
  if (booking.userId !== userId) return { success: false, code: 'FORBIDDEN', message: '无权取消该预约' }
  if (booking.status === 'cancelled') return { success: true }
  if (!canUserCancelBooking(booking.date, shanghaiDate())) {
    return { success: false, code: 'PAST_BOOKING', message: '历史预约不能取消' }
  }
  const storeConfig = await getStoreConfig()
  const configuredCapacity = Math.min(50, Math.max(1, Number(storeConfig.capacityPerSlot) || 6))
  const slotId = bookingSlotId(booking.date, booking.timeSlot)
  const initialCount = await activeSlotCount(booking.date, booking.timeSlot)
  try {
    await db.runTransaction(async (transaction) => {
      const currentBooking = (await transaction.collection('bookings').doc(bookingId).get()).data
      if (currentBooking.userId !== userId) throw new Error('BOOKING_OWNER_CHANGED')
      if (currentBooking.status === 'cancelled') return
      if (!canUserCancelBooking(currentBooking.date, shanghaiDate())) throw new Error('PAST_BOOKING')
      let currentSlot = null
      try {
        currentSlot = (await transaction.collection('booking_slots').doc(slotId).get()).data
      } catch (error) {}
      const used = bookingSlotUsage(currentSlot, initialCount)
      await transaction.collection('bookings').doc(bookingId).update({ data: { status: 'cancelled', cancelledAt: db.serverDate(), updatedAt: db.serverDate() } })
      await transaction.collection('booking_slots').doc(slotId).set({ data: {
        date: currentBooking.date,
        timeSlot: currentBooking.timeSlot,
        used: Math.max(0, used - 1),
        capacity: configuredCapacity,
        updatedAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'BOOKING_OWNER_CHANGED') return { success: false, code: 'FORBIDDEN', message: '无权取消该预约' }
    if (error?.message === 'PAST_BOOKING') return { success: false, code: 'PAST_BOOKING', message: '历史预约不能取消' }
    throw error
  }
  return { success: true }
}

async function getWork(event, userId) {
  const workId = normalizeText(event.workId, 80)
  if (!workId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少作品 ID' }
  try {
    const work = (await works.doc(workId).get()).data
    if (work.userId !== userId) return { success: false, code: 'FORBIDDEN', message: '无权访问该作品' }
    return { success: true, data: { id: workId, version: Math.max(1, Number(work.version) || 1), title: work.title, grid: work.grid, gridSize: Number(work.gridSize) || work.grid?.length || 24, colorCount: normalizeColorCount(work.colorCount), previewMode: work.previewMode === 'grid' ? 'grid' : 'beads', sourceCollectionId: work.sourceCollectionId || '', sourcePatternId: work.sourcePatternId || '' } }
  } catch (error) {
    return { success: false, code: 'NOT_FOUND', message: '作品不存在' }
  }
}

async function deleteWork(event, userId) {
  const workId = normalizeText(event.workId, 80)
  if (!workId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少作品 ID' }
  let work = null
  try {
    await db.runTransaction(async (transaction) => {
      let currentWork
      try {
        currentWork = (await transaction.collection('works').doc(workId).get()).data
      } catch (error) {
        throw new Error('WORK_NOT_FOUND')
      }
      if (currentWork.userId !== userId) throw new Error('WORK_OWNER_CHANGED')
      const version = workVersionDecision(currentWork, event.expectedVersion)
      if (!version.valid) throw new Error('WORK_VERSION_REQUIRED')
      if (version.conflict) throw new Error('WORK_CHANGED')
      work = currentWork
      await transaction.collection('works').doc(workId).remove()
    })
  } catch (error) {
    if (error?.message === 'WORK_NOT_FOUND') return { success: false, code: 'NOT_FOUND', message: '作品不存在' }
    if (error?.message === 'WORK_OWNER_CHANGED') return { success: false, code: 'FORBIDDEN', message: '无权删除该作品' }
    if (error?.message === 'WORK_VERSION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少作品版本，请刷新作品列表后重试' }
    if (error?.message === 'WORK_CHANGED') return { success: false, code: 'CONFLICT', message: '作品已在其他设备更新，本次没有删除，请刷新后重试' }
    throw error
  }
  if (isUserWorkFileId(work.previewFileId, userId)) await deleteWorkPreviewIfUnused(work.previewFileId, userId).catch(() => undefined)
  return { success: true }
}

async function deleteWorkPreviewIfUnused(fileId, userId) {
  if (!isUserWorkFileId(fileId, userId)) return false
  const referenced = await works.where({ previewFileId: fileId }).limit(1).get()
  if (referenced.data.length) return false
  await cloud.deleteFile({ fileList: [fileId] })
  return true
}

async function deleteWorkUpload(event, userId) {
  const fileId = normalizeText(event.fileId, 500)
  if (!isUserWorkFileId(fileId, userId)) {
    return { success: false, code: 'INVALID_ARGUMENT', message: '文件路径不正确' }
  }
  const referenced = await works.where({ userId, previewFileId: fileId }).limit(1).get()
  if (referenced.data.length) return { success: false, code: 'FILE_IN_USE', message: '该预览图仍被作品使用' }
  await cloud.deleteFile({ fileList: [fileId] })
  return { success: true }
}

async function deleteWorkUploads(event, userId) {
  const fileIds = Array.isArray(event.fileIds)
    ? [...new Set(event.fileIds.filter((fileId) => isUserWorkFileId(fileId, userId)))].slice(0, 20)
    : []
  if (!fileIds.length) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少可清理的作品文件' }
  const referenced = await works.where({ userId, previewFileId: _.in(fileIds) }).field({ previewFileId: true }).get()
  const referencedIds = new Set(referenced.data.map((item) => item.previewFileId))
  const safeFiles = fileIds.filter((fileId) => !referencedIds.has(fileId))
  if (safeFiles.length) await cloud.deleteFile({ fileList: safeFiles })
  return { success: true, data: { deleted: safeFiles.length, skipped: referencedIds.size } }
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return { success: false, code: 'UNAUTHORIZED', message: '无法识别微信用户' }
    await ensureCollectionsReady()
    await ensureMaintenanceReady()
    const userId = userIdFromOpenid(OPENID)
    const currentUser = await getOrCreateUser(userId, OPENID)
    if (currentUser.status === 'suspended') return { success: false, code: 'ACCOUNT_SUSPENDED', message: '账号已暂停使用，请联系门店处理' }

    if (!event.action || event.action === 'getProfile') return await getProfile(userId, OPENID)
    if (event.action === 'bindPhone') return await bindPhone(event, userId, OPENID)
    if (event.action === 'getFavoriteIds') return await getFavoriteIds(event, userId)
    if (event.action === 'toggleFavorite') return await toggleFavorite(event, userId)
    if (event.action === 'listFavorites') return await listFavorites(event, userId)
    if (event.action === 'saveWork') return await saveWork(event, userId, OPENID)
    if (event.action === 'listWorks') return await listWorks(event, userId)
    if (event.action === 'listBookings') return await listBookings(event, userId)
    if (event.action === 'getStore') return await getStore(userId)
    if (event.action === 'getTutorial') return await getTutorial()
    if (event.action === 'getAvailability') return await getAvailability(event)
    if (event.action === 'createBooking') return await createBooking(event, userId, OPENID)
    if (event.action === 'cancelBooking') return await cancelBooking(event, userId)
    if (event.action === 'getWork') return await getWork(event, userId)
    if (event.action === 'deleteWork') return await deleteWork(event, userId)
    if (event.action === 'deleteWorkUpload') return await deleteWorkUpload(event, userId)
    if (event.action === 'deleteWorkUploads') return await deleteWorkUploads(event, userId)
    return { success: false, code: 'UNKNOWN_ACTION', message: '不支持的用户操作' }
  } catch (error) {
    console.error('userService failed', error)
    return { success: false, code: 'INTERNAL_ERROR', message: '用户服务暂时不可用' }
  }
}
