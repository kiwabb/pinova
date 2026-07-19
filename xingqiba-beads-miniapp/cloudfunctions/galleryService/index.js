const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const { filterCollections, galleryFilters } = require('./business')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collectionsRef = db.collection('collections')
const memberProfiles = db.collection('member_profiles')
const memberConfigs = db.collection('member_configs')
const users = db.collection('users')
let collectionsReady = null

const LEVEL_RANK = { '公开': 0, V1: 1, V2: 2, V3: 3, V4: 4 }
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
    collectionsReady = Promise.all(['collections', 'patterns', 'member_profiles', 'member_configs', 'users'].map(ensureCollection))
      .catch((error) => { collectionsReady = null; throw error })
  }
  return collectionsReady
}

function userIdFromOpenid(openid) {
  return crypto.createHash('sha256').update(openid).digest('hex')
}

async function getMemberLevel(userId) {
  try {
    const [profileResult, userResult] = await Promise.all([
      memberProfiles.doc(userId).get(),
      users.doc(userId).get(),
    ])
    if (!userResult.data.phoneBound) return 'PUBLIC'
    let config = null
    try {
      config = (await memberConfigs.doc('published').get()).data
    } catch (error) {
      try {
        const working = (await memberConfigs.doc('default').get()).data
        if (working.status === 'published') config = working
      } catch (workingError) {}
    }
    if (!config || !Array.isArray(config.levels)) return profileResult.data.level || 'V1'
    const growth = Math.max(0, Number(profileResult.data.growth) || 0)
    let level = 'V1'
    config.levels
      .filter((tier) => /^V[1-4]$/.test(tier.code))
      .sort((left, right) => (Number(left.threshold) || 0) - (Number(right.threshold) || 0))
      .forEach((tier) => { if (growth >= (Number(tier.threshold) || 0)) level = tier.code })
    if (profileResult.data.level !== level) await memberProfiles.doc(userId).update({ data: { level, updatedAt: db.serverDate() } })
    return level
  } catch (error) {
    return 'PUBLIC'
  }
}

function rankFor(level) {
  if (level === 'PUBLIC' || level === undefined || level === null || level === '') return 0
  return Object.prototype.hasOwnProperty.call(LEVEL_RANK, level) ? LEVEL_RANK[level] : Number.POSITIVE_INFINITY
}

function paginationOptions(event = {}) {
  const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 20))
  const parsedCursor = Number.parseInt(String(event.cursor || '0'), 10)
  const offset = Number.isFinite(parsedCursor) ? Math.min(100000, Math.max(0, parsedCursor)) : 0
  return { pageSize, offset }
}

async function fetchPublishedCollections() {
  const items = []
  while (items.length < 5000) {
    const result = await collectionsRef.where({ status: 'published' }).skip(items.length).limit(100).get()
    items.push(...result.data)
    if (result.data.length < 100) break
  }
  return items
}

async function listCollections(event, memberLevel) {
  const { pageSize, offset } = paginationOptions(event)
  const filters = galleryFilters(event)
  let resultItems
  let total
  if (filters.category || filters.level || filters.keyword) {
    const allItems = await fetchPublishedCollections()
    const filteredItems = filterCollections(allItems, filters)
    filteredItems.sort((left, right) => (Number(left.sort) || 0) - (Number(right.sort) || 0) || left._id.localeCompare(right._id))
    total = filteredItems.length
    resultItems = filteredItems.slice(offset, offset + pageSize + 1)
  } else {
    try {
      const query = collectionsRef.where({ status: 'published' })
      const [result, countResult] = await Promise.all([
        query.orderBy('sort', 'asc').skip(offset).limit(pageSize + 1).get(),
        query.count(),
      ])
      resultItems = result.data
      total = countResult.total || 0
    } catch (error) {
      console.warn('ordered collection pagination fallback', error)
      const allItems = await fetchPublishedCollections()
      allItems.sort((left, right) => (Number(left.sort) || 0) - (Number(right.sort) || 0) || left._id.localeCompare(right._id))
      total = allItems.length
      resultItems = allItems.slice(offset, offset + pageSize + 1)
    }
  }
  const hasMore = resultItems.length > pageSize
  const pageItems = resultItems.slice(0, pageSize)
  const memberRank = rankFor(memberLevel)
  const collections = pageItems.map((item) => ({
    id: item._id,
    title: item.title,
    category: item.category,
    count: item.count,
    description: item.description,
    background: item.background,
    images: item.images,
    items: [],
    level: item.level,
    locked: rankFor(item.level) > memberRank,
  }))
  return { collections, total, hasMore, nextCursor: hasMore ? String(offset + collections.length) : '' }
}

async function getCollection(collectionId, memberLevel) {
  if (!collectionId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图集 ID' }
  let collection
  try {
    collection = (await collectionsRef.doc(collectionId).get()).data
  } catch (error) {
    return { success: false, code: 'NOT_FOUND', message: '图集不存在' }
  }

  if (collection.status !== 'published') {
    return { success: false, code: 'NOT_FOUND', message: '图集已下架或尚未发布' }
  }

  if (rankFor(collection.level) > rankFor(memberLevel)) {
    return { success: false, code: 'MEMBER_LEVEL_REQUIRED', requiredLevel: collection.level, message: `需要 ${collection.level} 会员` }
  }

  const items = Array.isArray(collection.items) ? collection.items.map((item, index) => typeof item === 'string'
    ? { id: `${collectionId}-${String(index + 1).padStart(2, '0')}`, name: item, image: (collection.images || [])[index % Math.max(1, (collection.images || []).length)] || '' }
    : { id: item.id || `${collectionId}-${String(index + 1).padStart(2, '0')}`, name: item.name, image: item.image || '' }) : []
  return {
    success: true,
    data: {
      collection: {
        id: collection._id,
        title: collection.title,
        category: collection.category,
        count: collection.count,
        description: collection.description,
        background: collection.background,
        images: collection.images,
        items: items.map((item) => item.name),
        level: collection.level,
      },
      patterns: items.map((item) => ({ id: item.id, name: item.name, image: item.image, level: collection.level })),
    },
  }
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return { success: false, code: 'UNAUTHORIZED', message: '无法识别微信用户' }

    await ensureCollectionsReady()
    const userId = userIdFromOpenid(OPENID)
    try {
      const user = (await users.doc(userId).get()).data
      if (user.status === 'suspended') return { success: false, code: 'ACCOUNT_SUSPENDED', message: '账号已暂停使用，请联系门店处理' }
    } catch (error) {}
    const memberLevel = await getMemberLevel(userId)

    if (event.action === 'getCollection') return await getCollection(event.collectionId, memberLevel)
    if (!event.action || event.action === 'listCollections') {
      return { success: true, data: { memberLevel, ...await listCollections(event, memberLevel) } }
    }
    return { success: false, code: 'UNKNOWN_ACTION', message: '不支持的操作' }
  } catch (error) {
    console.error('galleryService failed', error)
    return { success: false, code: 'INTERNAL_ERROR', message: '图集服务暂时不可用' }
  }
}
