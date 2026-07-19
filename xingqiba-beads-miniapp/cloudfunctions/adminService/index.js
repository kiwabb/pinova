const cloud = require('wx-server-sdk')
const cloudbase = require('@cloudbase/node-sdk')
const { auditRetentionCutoff, bookingSlotUsage, bookingUsageTransition, canReactivateBooking, documentPayload, hasUniqueIds, isAdminUploadFileId, isValidBusinessId, memberRecordMatchesExpected, normalizeHexColor, normalizeMemberConfig, normalizeStoreConfig, normalizeStringList, normalizeText, revisionDecision, unreferencedFileIds, workVersionDecision } = require('./business')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const adminsRef = db.collection('admins')
const collectionsRef = db.collection('collections')
const bookingsRef = db.collection('bookings')
const usersRef = db.collection('users')
const memberProfilesRef = db.collection('member_profiles')
const favoritesRef = db.collection('favorites')
const worksRef = db.collection('works')
const memberConfigsRef = db.collection('member_configs')
const storeConfigsRef = db.collection('store_configs')
const tutorialConfigsRef = db.collection('tutorial_configs')
const auditLogsRef = db.collection('admin_audit_logs')
const LEVELS = ['公开', 'V1', 'V2', 'V3', 'V4']
const STATUSES = ['draft', 'published', 'offline']
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled']
const AUDIT_RETENTION_DAYS = 365
let collectionsReady = null

function bookingSlotId(date, timeSlot) {
  return require('crypto').createHash('sha256').update(`${date}:${timeSlot}`).digest('hex')
}

function auditSummary(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item) || item === null).slice(0, 12))
}

async function writeAudit(action, targetId, operatorId, before = null, after = null) {
  await auditLogsRef.add({ data: {
    action,
    targetId,
    operatorId,
    before: before ? auditSummary(before) : null,
    after: after ? auditSummary(after) : null,
    createdAt: db.serverDate(),
  } })
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
    collectionsReady = Promise.all(['admins', 'collections', 'bookings', 'booking_slots', 'users', 'member_profiles', 'favorites', 'works', 'member_configs', 'store_configs', 'tutorial_configs', 'admin_audit_logs'].map(ensureCollection))
      .catch((error) => { collectionsReady = null; throw error })
  }
  return collectionsReady
}

async function requireAdmin() {
  const cloudbaseContext = cloudbase.getCloudbaseContext()
  const wxContext = cloud.getWXContext()
  const uid = cloudbaseContext.TCB_UUID || wxContext.UID
  if (!uid) return { ok: false, response: { success: false, code: 'UNAUTHORIZED', message: '请先登录管理后台' } }

  try {
    const admin = (await adminsRef.doc(uid).get()).data
    if (!admin.active) throw new Error('inactive')
    return { ok: true, uid, admin: { name: admin.name || '管理员', role: admin.role || 'editor' } }
  } catch (error) {
    return { ok: false, response: { success: false, code: 'FORBIDDEN', message: '该账号没有管理权限' } }
  }
}

async function fetchAll(reference, maxItems = 2000) {
  const data = []
  const batchSize = 100
  while (data.length < maxItems) {
    const result = await reference.skip(data.length).limit(Math.min(batchSize, maxItems - data.length)).get()
    data.push(...result.data)
    if (result.data.length < batchSize) break
  }
  return data
}

function paginationOptions(event = {}, defaultPageSize = 50) {
  const pageSize = Math.min(100, Math.max(1, Number(event.pageSize) || defaultPageSize))
  const parsedCursor = Number.parseInt(String(event.cursor || '0'), 10)
  const offset = Number.isFinite(parsedCursor) ? Math.min(100000, Math.max(0, parsedCursor)) : 0
  return { pageSize, offset }
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
    const allItems = await fetchAll(reference, 5000)
    allItems.sort((left, right) => {
      const leftValue = sortField === 'date' ? String(left[sortField] || '') : dateValue(left[sortField])
      const rightValue = sortField === 'date' ? String(right[sortField] || '') : dateValue(right[sortField])
      const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
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

function normalizeCollection(input = {}) {
  const title = normalizeText(input.title, 40)
  const category = normalizeText(input.category, 20)
  const description = normalizeText(input.description, 120)
  const level = LEVELS.includes(input.level) ? input.level : ''
  const status = STATUSES.includes(input.status) ? input.status : 'draft'
  const images = Array.isArray(input.images) ? input.images.filter((item) => typeof item === 'string' && item.length < 500).slice(0, 4) : []
  const items = Array.isArray(input.items) ? input.items.map((item, index) => {
    if (typeof item === 'string') {
      const name = normalizeText(item, 40)
      return name ? { id: `pattern-${index + 1}`, name, image: images[index % Math.max(1, images.length)] || '' } : null
    }
    const name = normalizeText(item?.name, 40)
    const image = normalizeText(item?.image, 500)
    const id = normalizeText(item?.id, 80) || `pattern-${Date.now()}-${index}`
    return name ? { id, name, image } : null
  }).filter(Boolean).slice(0, 100) : []

  if (!title) return { error: '请输入图集名称' }
  if (!category) return { error: '请选择图集分类' }
  if (!level) return { error: '图集访问等级不正确' }
  if (!hasUniqueIds(items)) return { error: '图纸 ID 重复，请删除重复图纸后重试' }
  if (status === 'published' && !images.length) return { error: '发布前请至少上传一张封面图片' }
  if (status === 'published' && !items.length) return { error: '发布前请至少添加一张图纸' }
  if (status === 'published' && items.some((item) => !item.image)) return { error: '发布前请为每张图纸上传图片' }

  return {
    data: {
      title,
      category,
      description,
      level,
      status,
      images,
      items,
      count: items.length,
      background: normalizeHexColor(input.background),
      sort: Number.isFinite(Number(input.sort)) ? Math.max(0, Number(input.sort)) : 0,
    },
  }
}

async function listCollections() {
  const records = await fetchAll(collectionsRef, 5000)
  const data = records.sort((a, b) => (a.sort || 0) - (b.sort || 0) || a._id.localeCompare(b._id)).map((item) => ({
    id: item._id,
    revision: Math.max(1, Number(item.revision) || 1),
    title: item.title,
    category: item.category,
    description: item.description || '',
    level: item.level || '公开',
    status: item.status || 'draft',
    images: item.images || [],
    items: (item.items || []).map((pattern, index) => typeof pattern === 'string'
      ? { id: `${item._id}-pattern-${index + 1}`, name: pattern, image: (item.images || [])[index % Math.max(1, (item.images || []).length)] || '' }
      : pattern),
    count: item.count || 0,
    background: item.background || '#F7F8FA',
    sort: item.sort || 0,
  }))
  return { success: true, data }
}

async function saveCollection(event, uid) {
  const normalized = normalizeCollection(event.collection)
  if (normalized.error) return { success: false, code: 'INVALID_ARGUMENT', message: normalized.error }

  const requestedId = normalizeText(event.collectionId, 80)
  if (requestedId && !isValidBusinessId(requestedId)) return { success: false, code: 'INVALID_ARGUMENT', message: '图集 ID 格式不正确' }
  const collectionId = requestedId || `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let previous = null
  let nextRevision = 0
  const auditId = `collection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await db.runTransaction(async (transaction) => {
      let current = null
      try {
        current = (await transaction.collection('collections').doc(collectionId).get()).data
      } catch (error) {}
      const revision = revisionDecision(current, event.expectedRevision)
      if (!revision.valid) throw new Error('COLLECTION_REVISION_REQUIRED')
      if (revision.conflict) throw new Error('COLLECTION_CHANGED')
      previous = current
      nextRevision = revision.nextRevision
      await transaction.collection('collections').doc(collectionId).set({ data: {
        ...normalized.data,
        revision: nextRevision,
        createdAt: current?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
        updatedBy: uid,
      } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: current ? 'updateCollection' : 'createCollection',
        targetId: collectionId,
        operatorId: uid,
        before: current ? auditSummary({ title: current.title, status: current.status, level: current.level, count: current.count, sort: current.sort, revision: revision.currentRevision }) : null,
        after: auditSummary({ title: normalized.data.title, status: normalized.data.status, level: normalized.data.level, count: normalized.data.count, sort: normalized.data.sort, revision: nextRevision }),
        createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'COLLECTION_REVISION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图集修订号，请重新打开后再保存' }
    if (error?.message === 'COLLECTION_CHANGED') return { success: false, code: 'CONFLICT', message: '图集已被其他管理员更新，本次未覆盖，请重新打开后编辑' }
    throw error
  }

  const previousFiles = []
  if (previous) {
    try {
      previousFiles.push(...[...(previous.images || []), ...(previous.items || []).map((item) => typeof item === 'string' ? '' : item.image)].filter(Boolean))
    } catch (error) {}
  }
  const nextFiles = [...normalized.data.images, ...normalized.data.items.map((item) => item.image)].filter(Boolean)
  const removedFiles = previousFiles.filter((fileId) => !nextFiles.includes(fileId) && isAdminUploadFileId(fileId, 'collections'))
  if (removedFiles.length) await deleteUnreferencedAdminFiles(removedFiles).catch((error) => console.warn('cleanup removed files failed', error))
  return { success: true, data: { id: collectionId, revision: nextRevision } }
}

async function referencedAdminFileIds(fileList) {
  const candidates = new Set(fileList)
  const referenced = new Set()
  if (!candidates.size) return referenced
  const [collectionRecords, tutorialDraft, tutorialPublished, storeDraft, storePublished] = await Promise.all([
    fetchAll(collectionsRef, 5000),
    getDocumentOrNull(tutorialConfigsRef, 'default'),
    getDocumentOrNull(tutorialConfigsRef, 'published'),
    getDocumentOrNull(storeConfigsRef, 'default'),
    getDocumentOrNull(storeConfigsRef, 'published'),
  ])
  collectionRecords.forEach((record) => {
    ;[...(record.images || []), ...(record.items || []).map((item) => typeof item === 'string' ? '' : item.image)].forEach((fileId) => {
      if (candidates.has(fileId)) referenced.add(fileId)
    })
  })
  ;[tutorialDraft, tutorialPublished].filter(Boolean).forEach((config) => {
    ;(config.sections || []).forEach((section) => {
      if (candidates.has(section.image)) referenced.add(section.image)
    })
  })
  ;[storeDraft, storePublished].filter(Boolean).forEach((config) => {
    ;(config.photos || []).forEach((fileId) => {
      if (candidates.has(fileId)) referenced.add(fileId)
    })
  })
  return referenced
}

async function deleteUnreferencedAdminFiles(fileList) {
  const uniqueFiles = [...new Set(fileList)]
  const referenced = await referencedAdminFileIds(uniqueFiles)
  const safeFiles = uniqueFiles.filter((fileId) => !referenced.has(fileId))
  if (safeFiles.length) await cloud.deleteFile({ fileList: safeFiles })
  return { deleted: safeFiles.length, skipped: referenced.size }
}

async function deleteFiles(event) {
  const fileList = Array.isArray(event.fileList)
    ? event.fileList.filter((fileId) => isAdminUploadFileId(fileId)).slice(0, 20)
    : []
  if (!fileList.length) return { success: true, data: { deleted: 0, skipped: 0 } }
  return { success: true, data: await deleteUnreferencedAdminFiles(fileList) }
}

function shanghaiDate(offsetDays = 0) {
  return new Date(Date.now() + (8 * 60 * 60 * 1000) + (offsetDays * 86400000)).toISOString().slice(0, 10)
}

async function getDashboard() {
  const today = shanghaiDate()
  const levelKeys = ['PUBLIC', 'V1', 'V2', 'V3', 'V4']
  const [collectionCount, userCount, workCount, bookingCount, levelCountResults, bookings] = await Promise.all([
    collectionsRef.count(),
    usersRef.count(),
    worksRef.count(),
    bookingsRef.count(),
    Promise.all(levelKeys.map((level) => memberProfilesRef.where({ level }).count())),
    fetchAll(bookingsRef.where({ date: _.gte(today) }), 5000),
  ])
  const upcoming = bookings.filter((item) => item.status !== 'cancelled')
  const todayBookings = upcoming.filter((item) => item.date === today).length
  const levelCounts = Object.fromEntries(levelKeys.map((level, index) => [level, levelCountResults[index].total || 0]))
  const recent = upcoming.sort((a, b) => `${a.date}-${a.timeSlot}`.localeCompare(`${b.date}-${b.timeSlot}`)).slice(0, 6)
  const userIds = [...new Set(recent.map((item) => item.userId).filter(Boolean))]
  const userEntries = await Promise.all(userIds.map(async (userId) => [userId, (await getDocumentOrNull(usersRef, userId))?.phoneMasked || '未绑定']))
  const phoneMap = Object.fromEntries(userEntries)
  return {
    success: true,
    data: {
      totals: {
        collections: collectionCount.total || 0,
        users: userCount.total || 0,
        members: levelCounts.V1 + levelCounts.V2 + levelCounts.V3 + levelCounts.V4,
        works: workCount.total || 0,
        bookings: bookingCount.total || 0,
        todayBookings,
        pendingBookings: upcoming.filter((item) => item.status === 'pending').length,
      },
      levelCounts,
      upcomingBookings: recent.map((item) => ({
        id: item._id,
        date: item.date,
        timeSlot: item.timeSlot,
        experienceType: item.experienceType,
        status: item.status || 'pending',
        phoneMasked: phoneMap[item.userId] || '未绑定',
      })),
    },
  }
}

function increment(map, key) {
  if (key) map.set(key, (map.get(key) || 0) + 1)
}

async function fetchByUserIds(reference, userIds, maxItems = 5000) {
  const data = []
  for (let index = 0; index < userIds.length; index += 20) {
    const chunk = userIds.slice(index, index + 20)
    if (chunk.length) data.push(...await fetchAll(reference.where({ userId: _.in(chunk) }), maxItems - data.length))
    if (data.length >= maxItems) break
  }
  return data
}

async function fetchDocumentsByIds(reference, ids) {
  const data = []
  for (let index = 0; index < ids.length; index += 20) {
    const chunk = ids.slice(index, index + 20)
    if (chunk.length) data.push(...await fetchAll(reference.where({ _id: _.in(chunk) }), 100))
  }
  return data
}

async function enrichUsers(userItems) {
  const userIds = userItems.map((item) => item._id)
  const [profiles, favorites, works, bookings, memberConfig] = await Promise.all([
    fetchDocumentsByIds(memberProfilesRef, userIds),
    fetchByUserIds(favoritesRef, userIds),
    fetchByUserIds(worksRef.field({ userId: true }), userIds),
    fetchByUserIds(bookingsRef, userIds),
    getPublishedDocument(memberConfigsRef),
  ])
  const profileMap = new Map(profiles.map((item) => [item._id, item]))
  const favoriteCounts = new Map()
  const workCounts = new Map()
  const bookingCounts = new Map()
  favorites.forEach((item) => increment(favoriteCounts, item.userId))
  works.forEach((item) => increment(workCounts, item.userId))
  bookings.filter((item) => item.status !== 'cancelled').forEach((item) => increment(bookingCounts, item.userId))
  return userItems.map((user) => {
      const profile = profileMap.get(user._id) || {}
      const growth = Math.max(0, Number(profile.growth) || 0)
      return {
        id: user._id,
        phoneMasked: user.phoneMasked || '未绑定',
        phoneBound: Boolean(user.phoneBound),
        status: user.status === 'suspended' ? 'suspended' : 'active',
        level: levelForGrowth(memberConfig, growth, Boolean(user.phoneBound)),
        growth,
        points: Math.max(0, Number(profile.points) || 0),
        favorites: favoriteCounts.get(user._id) || 0,
        works: workCounts.get(user._id) || 0,
        bookings: bookingCounts.get(user._id) || 0,
        createdAt: dateValue(user.createdAt),
      }
    })
}

async function listUsers(event) {
  const statusFilter = ['active', 'suspended'].includes(event.status) ? event.status : ''
  const levelFilter = ['PUBLIC', 'V1', 'V2', 'V3', 'V4'].includes(event.level) ? event.level : ''
  const keyword = normalizeText(event.keyword, 80).toLocaleLowerCase('zh-CN')
  const hasFilters = Boolean(statusFilter || levelFilter || keyword)
  if (hasFilters) {
    let sourceUsers = await fetchAll(usersRef, 5000)
    sourceUsers = sourceUsers.filter((user) => {
      const status = user.status === 'suspended' ? 'suspended' : 'active'
      if (statusFilter && status !== statusFilter) return false
      if (!keyword) return true
      return [user._id, user.phone, user.phoneMasked].some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword))
    })
    let data = await enrichUsers(sourceUsers)
    if (levelFilter) data = data.filter((item) => item.level === levelFilter)
    data.sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))
    const { pageSize, offset } = paginationOptions(event)
    const total = data.length
    const items = data.slice(offset, offset + pageSize)
    const hasMore = offset + items.length < total
    return { success: true, data: event.paginated ? { items, total, hasMore, nextCursor: hasMore ? String(offset + items.length) : '' } : data }
  }
  const page = event.paginated
    ? await queryPage(usersRef, event, 'createdAt')
    : { items: await fetchAll(usersRef), total: 0, hasMore: false, nextCursor: '' }
  if (!event.paginated) page.total = page.items.length
  const data = await enrichUsers(page.items)
  return { success: true, data: event.paginated ? { ...page, items: data } : data }
}

function levelForGrowth(config, growth, phoneBound) {
  if (!phoneBound) return 'PUBLIC'
  let level = 'V1'
  const tiers = Array.isArray(config?.levels) ? config.levels : []
  tiers.sort((a, b) => (Number(a.threshold) || 0) - (Number(b.threshold) || 0)).forEach((tier) => {
    if (/^V[1-4]$/.test(tier.code) && growth >= (Number(tier.threshold) || 0)) level = tier.code
  })
  return level
}

async function saveUser(event, uid) {
  const userId = normalizeText(event.userId, 80)
  const status = event.status === 'suspended' ? 'suspended' : 'active'
  const growth = Math.min(10000000, Math.max(0, Math.floor(Number(event.growth) || 0)))
  const points = Math.min(10000000, Math.max(0, Math.floor(Number(event.points) || 0)))
  if (!userId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少用户 ID' }
  const [user, config] = await Promise.all([
    getDocumentOrNull(usersRef, userId),
    getPublishedDocument(memberConfigsRef),
  ])
  if (!user) return { success: false, code: 'NOT_FOUND', message: '用户不存在' }
  let nextLevel = 'PUBLIC'
  const auditId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await db.runTransaction(async (transaction) => {
      const currentUser = (await transaction.collection('users').doc(userId).get()).data
      let currentProfile = null
      try {
        currentProfile = (await transaction.collection('member_profiles').doc(userId).get()).data
      } catch (error) {}
      if (!memberRecordMatchesExpected(currentUser, currentProfile, event.expected)) throw new Error('USER_CHANGED')
      nextLevel = levelForGrowth(config, growth, Boolean(currentUser.phoneBound))
      await transaction.collection('users').doc(userId).update({ data: { status, updatedAt: db.serverDate() } })
      await transaction.collection('member_profiles').doc(userId).set({ data: {
        userId,
        level: nextLevel,
        growth,
        points,
        createdAt: currentProfile?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
      } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'saveUser',
        targetId: userId,
        operatorId: uid,
        before: { status: currentUser.status || 'active', level: currentProfile?.level || 'PUBLIC', growth: currentProfile?.growth || 0, points: currentProfile?.points || 0 },
        after: { status, level: nextLevel, growth, points },
        createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'USER_CHANGED') return { success: false, code: 'CONFLICT', message: '用户资料已在其他操作中更新，请重新加载后再修改' }
    throw error
  }
  return { success: true, data: { level: nextLevel } }
}

async function enrichWorks(workItems) {
  const users = await fetchDocumentsByIds(usersRef, [...new Set(workItems.map((item) => item.userId).filter(Boolean))])
  const userMap = new Map(users.map((item) => [item._id, item]))
  return workItems.map((work) => ({
      id: work._id,
      version: Math.max(1, Number(work.version) || 1),
      title: work.title || '未命名作品',
      previewFileId: work.previewFileId || '',
      phoneMasked: userMap.get(work.userId)?.phoneMasked || '未绑定',
      userId: work.userId,
      sourceCollectionId: work.sourceCollectionId || '',
      sourcePatternId: work.sourcePatternId || '',
      gridSize: Number(work.gridSize) || 24,
      colorCount: Number(work.colorCount) || 0,
      previewMode: work.previewMode === 'grid' ? 'grid' : 'beads',
      updatedAt: dateValue(work.updatedAt),
    }))
}

async function listWorks(event) {
  const reference = worksRef.field({ version: true, title: true, previewFileId: true, userId: true, sourceCollectionId: true, sourcePatternId: true, gridSize: true, colorCount: true, previewMode: true, updatedAt: true })
  const keyword = normalizeText(event.keyword, 80).toLocaleLowerCase('zh-CN')
  if (keyword) {
    let data = await enrichWorks(await fetchAll(reference, 5000))
    data = data.filter((work) => [work.id, work.title, work.phoneMasked, work.userId, work.sourceCollectionId, work.sourcePatternId]
      .some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword)))
      .sort((left, right) => right.updatedAt - left.updatedAt || right.id.localeCompare(left.id))
    const { pageSize, offset } = paginationOptions(event)
    const total = data.length
    const items = data.slice(offset, offset + pageSize)
    const hasMore = offset + items.length < total
    return { success: true, data: event.paginated ? { items, total, hasMore, nextCursor: hasMore ? String(offset + items.length) : '' } : data }
  }
  const page = event.paginated
    ? await queryPage(reference, event, 'updatedAt')
    : { items: await fetchAll(reference), total: 0, hasMore: false, nextCursor: '' }
  if (!event.paginated) page.total = page.items.length
  const data = await enrichWorks(page.items)
  return { success: true, data: event.paginated ? { ...page, items: data } : data }
}

async function deleteWork(event, uid) {
  const workId = normalizeText(event.workId, 80)
  if (!workId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少作品 ID' }
  let work = null
  const auditId = `work-delete-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await db.runTransaction(async (transaction) => {
      let currentWork
      try {
        currentWork = (await transaction.collection('works').doc(workId).get()).data
      } catch (error) {
        throw new Error('WORK_NOT_FOUND')
      }
      const version = workVersionDecision(currentWork, event.expectedVersion)
      if (!version.valid) throw new Error('WORK_VERSION_REQUIRED')
      if (version.conflict) throw new Error('WORK_CHANGED')
      work = currentWork
      await transaction.collection('works').doc(workId).remove()
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'deleteWork',
        targetId: workId,
        operatorId: uid,
        userId: currentWork.userId,
        before: auditSummary({ title: currentWork.title, version: version.currentVersion }),
        createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'WORK_NOT_FOUND') return { success: false, code: 'NOT_FOUND', message: '作品不存在' }
    if (error?.message === 'WORK_VERSION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少作品版本，请刷新列表后重试' }
    if (error?.message === 'WORK_CHANGED') return { success: false, code: 'CONFLICT', message: '作品已被用户更新，本次没有删除，请刷新后重试' }
    throw error
  }
  if (work.previewFileId?.includes('/user-works/')) {
    const remainingReference = await worksRef.where({ previewFileId: work.previewFileId }).limit(1).get()
    if (!remainingReference.data.length) await cloud.deleteFile({ fileList: [work.previewFileId] }).catch((error) => console.warn('delete work preview failed', error))
  }
  return { success: true }
}

function normalizeTutorialConfig(input = {}) {
  const status = input.status === 'published' ? 'published' : 'draft'
  const title = normalizeText(input.title, 40)
  const subtitle = normalizeText(input.subtitle, 60)
  const safetyNote = normalizeText(input.safetyNote, 180)
  const sections = Array.isArray(input.sections) ? input.sections.map((section, index) => ({
    id: normalizeText(section?.id, 80) || `section-${Date.now()}-${index}`,
    title: normalizeText(section?.title, 40),
    duration: normalizeText(section?.duration, 20),
    image: normalizeText(section?.image, 500),
    steps: normalizeStringList(section?.steps, 8, 120),
  })).filter((section) => section.title || section.image || section.steps.length).slice(0, 12) : []
  if (!hasUniqueIds(sections)) return { error: '教程章节 ID 重复，请删除重复章节后重试' }
  if (status === 'published' && (!title || !subtitle)) return { error: '发布前请填写教程标题和副标题' }
  if (status === 'published' && !sections.length) return { error: '发布前请至少添加一个教程章节' }
  if (status === 'published' && sections.some((section) => !section.title || !section.duration || !section.image || !section.steps.length)) return { error: '发布前请补齐每个章节的标题、时长、图片和步骤' }
  if (status === 'published' && !safetyNote) return { error: '发布前请填写安全提醒' }
  return { data: { status, title, subtitle, safetyNote, sections } }
}

async function getTutorialConfig() {
  const config = await getDocumentOrNull(tutorialConfigsRef, 'default') || await getDocumentOrNull(tutorialConfigsRef, 'published')
  return { success: true, data: config ? { ...config, revision: Math.max(1, Number(config.revision) || 1) } : null }
}

async function saveTutorialConfig(event, uid) {
  const normalized = normalizeTutorialConfig(event.config)
  if (normalized.error) return { success: false, code: 'INVALID_ARGUMENT', message: normalized.error }
  let previous = null
  let previousPublished = null
  let data = null
  const auditId = `tutorial-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await db.runTransaction(async (transaction) => {
      try { previous = (await transaction.collection('tutorial_configs').doc('default').get()).data } catch (error) {}
      try { previousPublished = (await transaction.collection('tutorial_configs').doc('published').get()).data } catch (error) {}
      const working = previous || previousPublished
      const revision = revisionDecision(working, event.expectedRevision)
      if (!revision.valid) throw new Error('TUTORIAL_REVISION_REQUIRED')
      if (revision.conflict) throw new Error('TUTORIAL_CHANGED')
      data = {
        ...normalized.data,
        revision: revision.nextRevision,
        createdAt: working?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
        updatedBy: uid,
      }
      if (!previousPublished && previous?.status === 'published') {
        await transaction.collection('tutorial_configs').doc('published').set({ data: { ...documentPayload(previous), publishedAt: previous.updatedAt || db.serverDate() } })
      }
      await transaction.collection('tutorial_configs').doc('default').set({ data })
      if (normalized.data.status === 'published') await transaction.collection('tutorial_configs').doc('published').set({ data: { ...data, publishedAt: db.serverDate() } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'saveTutorialConfig', targetId: 'default', operatorId: uid,
        before: working ? auditSummary({ status: working.status, title: working.title, sections: working.sections?.length || 0, revision: revision.currentRevision }) : null,
        after: auditSummary({ status: data.status, title: data.title, sections: data.sections.length, revision: revision.nextRevision }), createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'TUTORIAL_REVISION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少教程修订号，请重新加载后再保存' }
    if (error?.message === 'TUTORIAL_CHANGED') return { success: false, code: 'CONFLICT', message: '教程已被其他管理员更新，本次未覆盖，请重新加载' }
    throw error
  }
  const previousFiles = (previous?.sections || []).map((item) => item.image).filter(Boolean)
  const previousPublishedFiles = (previousPublished?.sections || []).map((item) => item.image).filter(Boolean)
  const nextFiles = normalized.data.sections.map((item) => item.image).filter(Boolean)
  const effectivePublished = previousPublished || (previous?.status === 'published' ? previous : null)
  const publishedFiles = normalized.data.status === 'published' ? nextFiles : (effectivePublished?.sections || []).map((item) => item.image).filter(Boolean)
  const removed = unreferencedFileIds([previousFiles, previousPublishedFiles], [nextFiles, publishedFiles]).filter((fileId) => isAdminUploadFileId(fileId, 'tutorials'))
  if (removed.length) await deleteUnreferencedAdminFiles(removed).catch((error) => console.warn('cleanup tutorial images failed', error))
  return { success: true, data: { revision: data.revision } }
}

async function updateStatus(event, uid) {
  const collectionId = normalizeText(event.collectionId, 80)
  const status = STATUSES.includes(event.status) ? event.status : ''
  if (!collectionId || !status) return { success: false, code: 'INVALID_ARGUMENT', message: '状态参数不正确' }
  const auditId = `collection-status-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  let nextRevision = 0
  try {
    await db.runTransaction(async (transaction) => {
      let collection
      try {
        collection = (await transaction.collection('collections').doc(collectionId).get()).data
      } catch (error) {
        throw new Error('COLLECTION_NOT_FOUND')
      }
      const revision = revisionDecision(collection, event.expectedRevision)
      if (!revision.valid) throw new Error('COLLECTION_REVISION_REQUIRED')
      if (revision.conflict) throw new Error('COLLECTION_CHANGED')
      if (status === 'published') {
        const validation = normalizeCollection({ ...collection, status })
        if (validation.error) throw new Error(`COLLECTION_INVALID:${validation.error}`)
      }
      nextRevision = revision.nextRevision
      await transaction.collection('collections').doc(collectionId).update({ data: { status, revision: nextRevision, updatedAt: db.serverDate(), updatedBy: uid } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'updateCollectionStatus', targetId: collectionId, operatorId: uid,
        before: auditSummary({ status: collection.status, title: collection.title, revision: revision.currentRevision }),
        after: auditSummary({ status, title: collection.title, revision: nextRevision }), createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'COLLECTION_NOT_FOUND') return { success: false, code: 'NOT_FOUND', message: '图集不存在或已被删除' }
    if (error?.message === 'COLLECTION_REVISION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图集修订号，请刷新后重试' }
    if (error?.message === 'COLLECTION_CHANGED') return { success: false, code: 'CONFLICT', message: '图集状态已变化，本次未覆盖，列表将重新加载' }
    if (error?.message?.startsWith('COLLECTION_INVALID:')) return { success: false, code: 'INVALID_ARGUMENT', message: error.message.slice('COLLECTION_INVALID:'.length) }
    throw error
  }
  return { success: true, data: { revision: nextRevision } }
}

async function archiveCollection(event, uid) {
  const collectionId = normalizeText(event.collectionId, 80)
  if (!collectionId) return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图集 ID' }
  const auditId = `collection-archive-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  let nextRevision = 0
  try {
    await db.runTransaction(async (transaction) => {
      let collection
      try {
        collection = (await transaction.collection('collections').doc(collectionId).get()).data
      } catch (error) {
        throw new Error('COLLECTION_NOT_FOUND')
      }
      const revision = revisionDecision(collection, event.expectedRevision)
      if (!revision.valid) throw new Error('COLLECTION_REVISION_REQUIRED')
      if (revision.conflict) throw new Error('COLLECTION_CHANGED')
      nextRevision = revision.nextRevision
      await transaction.collection('collections').doc(collectionId).update({ data: { status: 'archived', revision: nextRevision, updatedAt: db.serverDate(), updatedBy: uid } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'archiveCollection', targetId: collectionId, operatorId: uid,
        before: auditSummary({ status: collection.status, title: collection.title, revision: revision.currentRevision }),
        after: auditSummary({ status: 'archived', title: collection.title, revision: nextRevision }), createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'COLLECTION_NOT_FOUND') return { success: false, code: 'NOT_FOUND', message: '图集不存在或已被删除' }
    if (error?.message === 'COLLECTION_REVISION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少图集修订号，请刷新后重试' }
    if (error?.message === 'COLLECTION_CHANGED') return { success: false, code: 'CONFLICT', message: '图集已被其他管理员更新，本次未归档' }
    throw error
  }
  return { success: true, data: { revision: nextRevision } }
}

function dateValue(value) {
  if (value instanceof Date) return value.getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

async function listBookings(event) {
  const statusFilter = BOOKING_STATUSES.includes(event.status) ? event.status : ''
  const keyword = normalizeText(event.keyword, 60).toLocaleLowerCase('zh-CN')
  const hasFilters = Boolean(statusFilter || keyword)
  const sourceItems = hasFilters ? await fetchAll(bookingsRef, 5000) : null
  const page = hasFilters ? null : await queryPage(bookingsRef, event, 'date', 'desc')
  const items = sourceItems || page.items
  const userIds = [...new Set(items.map((item) => item.userId).filter(Boolean))]
  const userEntries = await Promise.all(userIds.map(async (userId) => {
    try {
      const user = (await usersRef.doc(userId).get()).data
      return [userId, { phone: user.phone || '', phoneMasked: user.phoneMasked || '' }]
    } catch (error) {
      return [userId, { phone: '', phoneMasked: '' }]
    }
  }))
  const phoneMap = Object.fromEntries(userEntries)
  let data = items.map((item) => ({
    id: item._id,
    userId: item.userId,
    phone: phoneMap[item.userId]?.phone || '',
    phoneMasked: phoneMap[item.userId]?.phoneMasked || '未绑定',
    date: item.date,
    experienceType: item.experienceType,
    timeSlot: item.timeSlot,
    status: BOOKING_STATUSES.includes(item.status) ? item.status : 'pending',
    createdAt: dateValue(item.createdAt),
  }))
  if (hasFilters) {
    data = data.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false
      if (!keyword) return true
      return [item.phone, item.phoneMasked, item.date, item.timeSlot, item.experienceType, item.id]
        .some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword))
    }).sort((left, right) => right.date.localeCompare(left.date) || right.createdAt - left.createdAt || right.id.localeCompare(left.id))
    const { pageSize, offset } = paginationOptions(event)
    const total = data.length
    const pagedItems = data.slice(offset, offset + pageSize)
    const hasMore = offset + pagedItems.length < total
    return { success: true, data: event.paginated ? { items: pagedItems, total, hasMore, nextCursor: hasMore ? String(offset + pagedItems.length) : '' } : data }
  }
  return { success: true, data: event.paginated ? { ...page, items: data } : data }
}

async function activeSlotCount(date, timeSlot) {
  try {
    const result = await bookingsRef.where({ date, timeSlot, status: _.neq('cancelled') }).count()
    return result.total || 0
  } catch (error) {
    const sameDay = await fetchAll(bookingsRef.where({ date }), 5000)
    return sameDay.filter((item) => item.timeSlot === timeSlot && item.status !== 'cancelled').length
  }
}

async function updateBookingStatus(event, uid) {
  const bookingId = normalizeText(event.bookingId, 80)
  const status = BOOKING_STATUSES.includes(event.status) ? event.status : ''
  const expectedStatus = BOOKING_STATUSES.includes(event.expectedStatus) ? event.expectedStatus : ''
  if (!bookingId || !status || !expectedStatus) return { success: false, code: 'INVALID_ARGUMENT', message: '预约状态参数不正确' }
  let booking
  try {
    booking = (await bookingsRef.doc(bookingId).get()).data
  } catch (error) {
    return { success: false, code: 'NOT_FOUND', message: '预约记录不存在' }
  }
  if (!canReactivateBooking(booking.status, status, booking.date, shanghaiDate())) {
    return { success: false, code: 'PAST_BOOKING', message: '历史预约不能恢复，请新建有效日期的预约' }
  }

  const slotId = bookingSlotId(booking.date, booking.timeSlot)
  const auditId = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const initialCount = await activeSlotCount(booking.date, booking.timeSlot)
  const store = await getPublishedDocument(storeConfigsRef)
  const capacity = Math.min(50, Math.max(1, Number(store?.capacityPerSlot) || 6))
  try {
    await db.runTransaction(async (transaction) => {
      const currentBooking = (await transaction.collection('bookings').doc(bookingId).get()).data
      if (currentBooking.status !== expectedStatus) throw new Error('BOOKING_CHANGED')
      if (currentBooking.status === status) return
      if (!canReactivateBooking(currentBooking.status, status, currentBooking.date, shanghaiDate())) throw new Error('PAST_BOOKING')
      let currentSlot = null
      try {
        currentSlot = (await transaction.collection('booking_slots').doc(slotId).get()).data
      } catch (error) {}
      const used = bookingSlotUsage(currentSlot, initialCount)
      const transition = bookingUsageTransition(currentBooking.status, status, used, capacity)
      if (transition.slotFull) throw new Error('SLOT_FULL')

      await transaction.collection('bookings').doc(bookingId).update({ data: { status, updatedAt: db.serverDate(), updatedBy: uid } })
      if (transition.changed) {
        await transaction.collection('booking_slots').doc(slotId).set({ data: {
          date: currentBooking.date,
          timeSlot: currentBooking.timeSlot,
          used: transition.nextUsed,
          capacity,
          updatedAt: db.serverDate(),
        } })
      }
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'updateBookingStatus',
        targetId: bookingId,
        operatorId: uid,
        before: { status: currentBooking.status },
        after: { status },
        createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'SLOT_FULL') return { success: false, code: 'SLOT_FULL', message: '该时段已满，无法恢复预约' }
    if (error?.message === 'PAST_BOOKING') return { success: false, code: 'PAST_BOOKING', message: '历史预约不能恢复，请新建有效日期的预约' }
    if (error?.message === 'BOOKING_CHANGED') return { success: false, code: 'CONFLICT', message: '预约状态已被其他管理员更新，本次未覆盖' }
    throw error
  }
  return { success: true }
}

async function getDocumentOrNull(collection, id) {
  try {
    return (await collection.doc(id).get()).data
  } catch (error) {
    return null
  }
}

async function getPublishedDocument(collection) {
  const published = await getDocumentOrNull(collection, 'published')
  if (published) return published
  const working = await getDocumentOrNull(collection, 'default')
  return working?.status === 'published' ? working : null
}

async function getConfigs() {
  const [membership, store] = await Promise.all([
    getDocumentOrNull(memberConfigsRef, 'default').then((value) => value || getDocumentOrNull(memberConfigsRef, 'published')),
    getDocumentOrNull(storeConfigsRef, 'default').then((value) => value || getDocumentOrNull(storeConfigsRef, 'published')),
  ])
  return {
    success: true,
    data: {
      membership: membership ? {
        status: membership.status === 'published' ? 'published' : 'draft',
        version: Number(membership.version) || 1,
        revision: Math.max(1, Number(membership.revision) || 1),
        levels: Array.isArray(membership.levels) ? membership.levels : [],
        rewards: {
          bindPhonePoints: Math.max(0, Number(membership.rewards?.bindPhonePoints) || 0),
          bindPhoneGrowth: Math.max(0, Number(membership.rewards?.bindPhoneGrowth) || 0),
          createWorkPoints: Math.max(0, Number(membership.rewards?.createWorkPoints) || 0),
          createWorkGrowth: Math.max(0, Number(membership.rewards?.createWorkGrowth) || 0),
          createWorkDailyLimit: Number.isFinite(Number(membership.rewards?.createWorkDailyLimit)) ? Math.min(100, Math.max(0, Math.floor(Number(membership.rewards.createWorkDailyLimit)))) : 3,
        },
      } : null,
      store: store ? {
        status: store.status === 'published' ? 'published' : 'draft',
        revision: Math.max(1, Number(store.revision) || 1),
        name: store.name || '',
        city: store.city || '',
        address: store.address || '',
        phone: store.phone || '',
        latitude: store.latitude ?? null,
        longitude: store.longitude ?? null,
        businessHours: store.businessHours || '',
        photos: Array.isArray(store.photos) ? store.photos : [],
        bookingEnabled: store.bookingEnabled !== false,
        maxAdvanceDays: Number(store.maxAdvanceDays) || 30,
        capacityPerSlot: Number(store.capacityPerSlot) || 6,
        experienceTypes: Array.isArray(store.experienceTypes) ? store.experienceTypes : [],
        timeSlots: Array.isArray(store.timeSlots) ? store.timeSlots : [],
      } : null,
    },
  }
}

async function listAuditLogs(event) {
  await pruneExpiredAuditLogs()
  const page = await queryPage(auditLogsRef, event, 'createdAt')
  const operatorIds = [...new Set(page.items.map((item) => item.operatorId).filter(Boolean))]
  const operators = await fetchDocumentsByIds(adminsRef, operatorIds)
  const operatorMap = new Map(operators.map((item) => [item._id, item.name || '管理员']))
  const items = page.items.map((item) => ({
    id: item._id,
    action: item.action || 'unknown',
    targetId: item.targetId || '',
    operatorId: item.operatorId || '',
    operatorName: operatorMap.get(item.operatorId) || '管理员',
    before: item.before || null,
    after: item.after || null,
    createdAt: dateValue(item.createdAt),
  }))
  return { success: true, data: { ...page, items, retentionDays: AUDIT_RETENTION_DAYS } }
}

async function pruneExpiredAuditLogs() {
  try {
    const expired = await auditLogsRef.where({ createdAt: _.lt(auditRetentionCutoff(Date.now(), AUDIT_RETENTION_DAYS)) }).limit(100).get()
    await Promise.all(expired.data.map((item) => auditLogsRef.doc(item._id).remove()))
    return expired.data.length
  } catch (error) {
    console.warn('audit retention cleanup failed', error)
    return 0
  }
}

async function saveMemberConfig(event, uid) {
  const normalized = normalizeMemberConfig(event.config)
  if (normalized.error) return { success: false, code: 'INVALID_ARGUMENT', message: normalized.error }
  let previous = null
  let published = null
  let data = null
  const auditId = `member-config-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await db.runTransaction(async (transaction) => {
      try { previous = (await transaction.collection('member_configs').doc('default').get()).data } catch (error) {}
      try { published = (await transaction.collection('member_configs').doc('published').get()).data } catch (error) {}
      const working = previous || published
      const revision = revisionDecision(working, event.expectedRevision)
      if (!revision.valid) throw new Error('MEMBER_CONFIG_REVISION_REQUIRED')
      if (revision.conflict) throw new Error('MEMBER_CONFIG_CHANGED')
      data = {
        ...normalized.data,
        version: normalized.data.status === 'published' ? Math.max(normalized.data.version, (Number(published?.version) || 0) + 1) : normalized.data.version,
        revision: revision.nextRevision,
        createdAt: working?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
        updatedBy: uid,
      }
      if (!published && previous?.status === 'published') {
        await transaction.collection('member_configs').doc('published').set({ data: { ...documentPayload(previous), publishedAt: previous.updatedAt || db.serverDate() } })
      }
      await transaction.collection('member_configs').doc('default').set({ data })
      if (normalized.data.status === 'published') await transaction.collection('member_configs').doc('published').set({ data: { ...data, publishedAt: db.serverDate() } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'saveMemberConfig', targetId: 'default', operatorId: uid,
        before: working ? auditSummary({ status: working.status, version: working.version, revision: revision.currentRevision }) : null,
        after: auditSummary({ status: data.status, version: data.version, revision: revision.nextRevision }), createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'MEMBER_CONFIG_REVISION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少会员配置修订号，请重新加载' }
    if (error?.message === 'MEMBER_CONFIG_CHANGED') return { success: false, code: 'CONFLICT', message: '会员配置已被其他管理员更新，本次未覆盖，请重新加载' }
    throw error
  }
  return { success: true, data: { version: data.version, revision: data.revision } }
}

async function saveStoreConfig(event, uid) {
  const normalized = normalizeStoreConfig(event.config)
  if (normalized.error) return { success: false, code: 'INVALID_ARGUMENT', message: normalized.error }
  let previous = null
  let published = null
  let data = null
  const auditId = `store-config-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await db.runTransaction(async (transaction) => {
      try { previous = (await transaction.collection('store_configs').doc('default').get()).data } catch (error) {}
      try { published = (await transaction.collection('store_configs').doc('published').get()).data } catch (error) {}
      const working = previous || published
      const revision = revisionDecision(working, event.expectedRevision)
      if (!revision.valid) throw new Error('STORE_CONFIG_REVISION_REQUIRED')
      if (revision.conflict) throw new Error('STORE_CONFIG_CHANGED')
      data = {
        ...normalized.data,
        revision: revision.nextRevision,
        createdAt: working?.createdAt || db.serverDate(),
        updatedAt: db.serverDate(),
        updatedBy: uid,
      }
      if (!published && previous?.status === 'published') {
        await transaction.collection('store_configs').doc('published').set({ data: { ...documentPayload(previous), publishedAt: previous.updatedAt || db.serverDate() } })
      }
      await transaction.collection('store_configs').doc('default').set({ data })
      if (normalized.data.status === 'published') await transaction.collection('store_configs').doc('published').set({ data: { ...data, publishedAt: db.serverDate() } })
      await transaction.collection('admin_audit_logs').doc(auditId).set({ data: {
        action: 'saveStoreConfig', targetId: 'default', operatorId: uid,
        before: working ? auditSummary({ status: working.status, bookingEnabled: working.bookingEnabled, capacityPerSlot: working.capacityPerSlot, photos: working.photos?.length || 0, revision: revision.currentRevision }) : null,
        after: auditSummary({ status: data.status, bookingEnabled: data.bookingEnabled, capacityPerSlot: data.capacityPerSlot, photos: data.photos.length, revision: revision.nextRevision }), createdAt: db.serverDate(),
      } })
    })
  } catch (error) {
    if (error?.message === 'STORE_CONFIG_REVISION_REQUIRED') return { success: false, code: 'INVALID_ARGUMENT', message: '缺少门店配置修订号，请重新加载' }
    if (error?.message === 'STORE_CONFIG_CHANGED') return { success: false, code: 'CONFLICT', message: '门店配置已被其他管理员更新，本次未覆盖，请重新加载' }
    throw error
  }
  const previousFiles = Array.isArray(previous?.photos) ? previous.photos : []
  const previousPublishedFiles = Array.isArray(published?.photos) ? published.photos : []
  const nextFiles = data.photos
  const effectivePublished = published || (previous?.status === 'published' ? previous : null)
  const publishedFiles = normalized.data.status === 'published' ? nextFiles : (effectivePublished?.photos || [])
  const removed = unreferencedFileIds([previousFiles, previousPublishedFiles], [nextFiles, publishedFiles]).filter((fileId) => isAdminUploadFileId(fileId, 'store'))
  if (removed.length) await deleteUnreferencedAdminFiles(removed).catch((error) => console.warn('cleanup store images failed', error))
  return { success: true, data: { revision: data.revision } }
}

function ownerOnly(admin) {
  return admin.role === 'owner' ? null : { success: false, code: 'FORBIDDEN', message: '仅店主账号可修改运营配置' }
}

exports.main = async (event = {}) => {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    await ensureCollectionsReady()

    if (!event.action || event.action === 'session') return { success: true, data: auth.admin }
    if (event.action === 'getDashboard') return await getDashboard()
    if (event.action === 'listCollections') return await listCollections()
    if (event.action === 'saveCollection') return await saveCollection(event, auth.uid)
    if (event.action === 'updateStatus') return await updateStatus(event, auth.uid)
    if (event.action === 'archiveCollection') return await archiveCollection(event, auth.uid)
    if (event.action === 'deleteFiles') return await deleteFiles(event)
    if (event.action === 'listBookings') return await listBookings(event)
    if (event.action === 'updateBookingStatus') return await updateBookingStatus(event, auth.uid)
    if (event.action === 'listUsers') return await listUsers(event)
    if (event.action === 'saveUser') return ownerOnly(auth.admin) || await saveUser(event, auth.uid)
    if (event.action === 'listWorks') return await listWorks(event)
    if (event.action === 'deleteWork') return ownerOnly(auth.admin) || await deleteWork(event, auth.uid)
    if (event.action === 'getTutorialConfig') return await getTutorialConfig()
    if (event.action === 'saveTutorialConfig') return await saveTutorialConfig(event, auth.uid)
    if (event.action === 'getConfigs') return await getConfigs()
    if (event.action === 'listAuditLogs') return ownerOnly(auth.admin) || await listAuditLogs(event)
    if (event.action === 'saveMemberConfig') return ownerOnly(auth.admin) || await saveMemberConfig(event, auth.uid)
    if (event.action === 'saveStoreConfig') return ownerOnly(auth.admin) || await saveStoreConfig(event, auth.uid)
    return { success: false, code: 'UNKNOWN_ACTION', message: '不支持的管理操作' }
  } catch (error) {
    console.error('adminService failed', error)
    return { success: false, code: 'INTERNAL_ERROR', message: '管理服务暂时不可用' }
  }
}
