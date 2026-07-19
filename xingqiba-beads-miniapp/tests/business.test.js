const test = require('node:test')
const assert = require('node:assert/strict')

const {
  bookingSlotUsage: userBookingSlotUsage,
  canUserCancelBooking,
  isUserWorkFileId,
  levelForGrowth,
  dailyActionDecision,
  isValidDateString,
  normalizeColorCount,
  normalizeGrid,
  paginationOptions,
  phoneBindingRewardDecision,
  publicMemberConfig,
  slotAvailability,
  workRewardDecision,
  workVersionDecision,
  workWriteQuotaDecision,
} = require('../cloudfunctions/userService/business')
const {
  auditRetentionCutoff,
  bookingSlotUsage: adminBookingSlotUsage,
  bookingUsageTransition,
  canReactivateBooking,
  documentPayload,
  hasUniqueIds,
  isAdminUploadFileId,
  isValidBusinessId,
  memberRecordMatchesExpected,
  normalizeHexColor,
  normalizeMemberConfig,
  normalizeStoreConfig,
  revisionDecision,
  unreferencedFileIds,
  workVersionDecision: adminWorkVersionDecision,
} = require('../cloudfunctions/adminService/business')
const { filterCollections, galleryFilters } = require('../cloudfunctions/galleryService/business')

const publishedLevels = [
  { code: 'V1', title: '初见', threshold: 0, description: '基础会员', benefits: ['云端作品'] },
  { code: 'V2', title: '熟客', threshold: 300, description: '进阶会员', benefits: ['会员图纸'] },
  { code: 'V3', title: '达人', threshold: 800, description: '活跃会员', benefits: ['新品体验'] },
  { code: 'V4', title: '挚友', threshold: 1500, description: '最高等级', benefits: ['限定活动'] },
]

test('会员等级按绑定状态和成长值计算', () => {
  const config = { status: 'published', version: 2, levels: publishedLevels }
  assert.equal(levelForGrowth(config, 2000, false), 'PUBLIC')
  assert.equal(levelForGrowth(config, 0, true), 'V1')
  assert.equal(levelForGrowth(config, 799, true), 'V2')
  assert.equal(levelForGrowth(config, 1500, true), 'V4')
})

test('小程序只暴露规范化的 V1–V4 配置和奖励规则', () => {
  const result = publicMemberConfig({ status: 'published', version: 3, levels: [...publishedLevels].reverse().concat({ code: 'VIP', title: 'x', threshold: -1, description: '', benefits: [] }), rewards: { bindPhonePoints: 30, createWorkGrowth: 10, createWorkDailyLimit: 3.9 } })
  assert.deepEqual(result.levels.map((item) => item.code), ['V1', 'V2', 'V3', 'V4'])
  assert.equal(result.version, 3)
  assert.deepEqual(result.rewards, { bindPhonePoints: 30, bindPhoneGrowth: 0, createWorkPoints: 0, createWorkGrowth: 10, createWorkDailyLimit: 3 })
})

test('作品网格仅接受 16/24/32/48 正方形和六位颜色', () => {
  const valid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => '#c42d5d'))
  assert.equal(normalizeGrid(valid)[0][0], '#C42D5D')
  assert.equal(normalizeGrid(valid.slice(0, 15)), null)
  const invalidColor = valid.map((row) => [...row])
  invalidColor[0][0] = 'pink'
  assert.equal(normalizeGrid(invalidColor), null)
})

test('作品色彩档位只接受 6、8、12 色', () => {
  assert.equal(normalizeColorCount(6), 6)
  assert.equal(normalizeColorCount('8'), 8)
  assert.equal(normalizeColorCount(12), 12)
  assert.equal(normalizeColorCount(5), 12)
  assert.equal(normalizeColorCount(undefined), 12)
})

test('分页参数有上限且拒绝负偏移', () => {
  assert.deepEqual(paginationOptions({ pageSize: 500, cursor: '-20' }), { pageSize: 50, offset: 0 })
  assert.deepEqual(paginationOptions({ pageSize: 12, cursor: '40' }), { pageSize: 12, offset: 40 })
})

test('预约日期必须是实际存在的公历日期', () => {
  assert.equal(isValidDateString('2026-07-13'), true)
  assert.equal(isValidDateString('2024-02-29'), true)
  assert.equal(isValidDateString('2026-02-29'), false)
  assert.equal(isValidDateString('2026-04-31'), false)
  assert.equal(isValidDateString('2026-7-13'), false)
})

test('用户只能取消今天及未来的有效预约', () => {
  assert.equal(canUserCancelBooking('2026-07-12', '2026-07-13'), false)
  assert.equal(canUserCancelBooking('2026-07-13', '2026-07-13'), true)
  assert.equal(canUserCancelBooking('2026-07-14', '2026-07-13'), true)
  assert.equal(canUserCancelBooking('not-a-date', '2026-07-13'), false)
})

test('用户作品文件必须位于自己的单层云目录', () => {
  const userId = 'a'.repeat(64)
  assert.equal(isUserWorkFileId(`cloud://env.bucket/user-works/${userId}/work.png`, userId), true)
  assert.equal(isUserWorkFileId(`cloud://env.bucket/other/user-works/${userId}/work.png`, userId), false)
  assert.equal(isUserWorkFileId(`cloud://env.bucket/user-works/${userId}/nested/work.png`, userId), false)
  assert.equal(isUserWorkFileId(`https://example.com/user-works/${userId}/work.png`, userId), false)
})

test('更换手机号不会重复发放首次绑定奖励', () => {
  assert.deepEqual(phoneBindingRewardDecision(false, 30, 10), { points: 30, growth: 10 })
  assert.deepEqual(phoneBindingRewardDecision(true, 30, 10), { points: 0, growth: 0 })
})

test('预约时段余量忽略已取消记录并正确标记约满', () => {
  assert.deepEqual(slotAvailability(['10:00–12:00', '14:00–16:00'], [
    { timeSlot: '10:00–12:00', status: 'pending' },
    { timeSlot: '10:00–12:00', status: 'confirmed' },
    { timeSlot: '10:00–12:00', status: 'cancelled' },
  ], 2), [
    { timeSlot: '10:00–12:00', used: 2, capacity: 2, remaining: 0, full: true },
    { timeSlot: '14:00–16:00', used: 0, capacity: 2, remaining: 2, full: false },
  ])
})

test('新作品奖励受每日次数上限约束且不影响作品保存', () => {
  assert.deepEqual(workRewardDecision(true, 0, 3), { awarded: true, nextCount: 1, remaining: 2 })
  assert.deepEqual(workRewardDecision(true, 3, 3), { awarded: false, nextCount: 3, remaining: 0 })
  assert.deepEqual(workRewardDecision(false, 1, 3), { awarded: false, nextCount: 1, remaining: 2 })
  assert.deepEqual(workRewardDecision(true, 0, 0), { awarded: false, nextCount: 0, remaining: 0 })
})

test('发布会员配置要求等级完整且门槛递增', () => {
  const valid = normalizeMemberConfig({ status: 'published', version: 1, levels: publishedLevels, rewards: { createWorkPoints: 10 } })
  assert.equal(valid.error, undefined)
  assert.equal(valid.data.rewards.createWorkPoints, 10)
  assert.equal(valid.data.rewards.createWorkDailyLimit, 3)
  assert.match(normalizeMemberConfig({ status: 'published', levels: publishedLevels.slice(0, 3) }).error, /V1–V4/)
  const duplicateThreshold = publishedLevels.map((item) => ({ ...item }))
  duplicateThreshold[2].threshold = duplicateThreshold[1].threshold
  assert.match(normalizeMemberConfig({ status: 'published', levels: duplicateThreshold }).error, /逐级增加/)
  const invalidV1 = publishedLevels.map((item) => ({ ...item }))
  invalidV1[0].threshold = 1
  assert.match(normalizeMemberConfig({ status: 'published', levels: invalidV1 }).error, /必须为 0/)
})

test('门店正式发布要求联系、定位和预约规则完整', () => {
  const valid = normalizeStoreConfig({
    status: 'published',
    name: '星期八拼豆工作室',
    city: '武汉市',
    address: '江岸区示例路 8 号',
    phone: '027-88888888',
    latitude: 30.5928,
    longitude: 114.3055,
    businessHours: '每日 10:00–21:00',
    bookingEnabled: true,
    experienceTypes: ['自由创作'],
    timeSlots: ['14:00–16:00'],
    photos: ['cloud://env/admin/store/one.jpg', 'cloud://env/admin/store/one.jpg', 'cloud://env/admin/store/two.webp'],
  })
  assert.equal(valid.error, undefined)
  assert.deepEqual(valid.data.photos, ['cloud://env/admin/store/one.jpg', 'cloud://env/admin/store/two.webp'])
  assert.equal(normalizeStoreConfig({ photos: Array.from({ length: 10 }, (_, index) => `photo-${index}`) }).data.photos.length, 6)
  assert.match(normalizeStoreConfig({ status: 'published', name: '星期八', city: '武汉', address: '待完善' }).error, /完整门店地址/)
  assert.match(normalizeStoreConfig({ status: 'published', name: '星期八', city: '武汉', address: '江岸区示例路 8 号', phone: '027-88888888', latitude: 30.5, longitude: 114.3, businessHours: '10:00–21:00' }).error, /实景图/)
})

test('预约取消、恢复和容量上限保持一致', () => {
  assert.deepEqual(bookingUsageTransition('pending', 'cancelled', 4, 6), { changed: true, nextUsed: 3, slotFull: false })
  assert.deepEqual(bookingUsageTransition('cancelled', 'pending', 5, 6), { changed: true, nextUsed: 6, slotFull: false })
  assert.deepEqual(bookingUsageTransition('cancelled', 'confirmed', 6, 6), { changed: true, nextUsed: 7, slotFull: true })
  assert.deepEqual(bookingUsageTransition('pending', 'confirmed', 4, 6), { changed: false, nextUsed: 4, slotFull: false })
})

test('预约事务重试使用已存在的时段计数，避免并发取消后容量偏高', () => {
  assert.equal(userBookingSlotUsage(null, 4), 4)
  assert.equal(userBookingSlotUsage({ used: 3 }, 4), 3)
  assert.equal(adminBookingSlotUsage({ used: 2 }, 5), 2)
  assert.equal(adminBookingSlotUsage({ used: 'invalid' }, 5), 5)
})

test('操作日志保留策略按自然日跨度计算并限制异常参数', () => {
  const now = Date.UTC(2026, 6, 13, 0, 0, 0)
  assert.equal(auditRetentionCutoff(now, 365).getTime(), now - 365 * 86400000)
  assert.equal(auditRetentionCutoff(now, 0).getTime(), now - 365 * 86400000)
  assert.equal(auditRetentionCutoff(now, 5000).getTime(), now - 3650 * 86400000)
})

test('历史已取消预约不能恢复占用容量', () => {
  assert.equal(canReactivateBooking('cancelled', 'pending', '2026-07-12', '2026-07-13'), false)
  assert.equal(canReactivateBooking('cancelled', 'confirmed', '2026-07-13', '2026-07-13'), true)
  assert.equal(canReactivateBooking('pending', 'confirmed', '2026-07-12', '2026-07-13'), true)
})

test('图集颜色和业务 ID 使用严格格式', () => {
  assert.equal(normalizeHexColor('#f7e8ee'), '#F7E8EE')
  assert.equal(normalizeHexColor('red;display:none'), '#F7F8FA')
  assert.equal(hasUniqueIds([{ id: 'one' }, { id: 'two' }]), true)
  assert.equal(hasUniqueIds([{ id: 'same' }, { id: 'same' }]), false)
  assert.equal(hasUniqueIds([{ id: '' }]), false)
  assert.equal(hasUniqueIds([{ id: 'pattern/escape' }]), false)
  assert.equal(isValidBusinessId('collection-2026_01'), true)
  assert.equal(isValidBusinessId('../collection'), false)
})

test('后台上传文件只接受固定目录下的单层云文件', () => {
  assert.equal(isAdminUploadFileId('cloud://env.bucket/admin/collections/cover.webp'), true)
  assert.equal(isAdminUploadFileId('cloud://env.bucket/admin/store/shop.webp', 'store'), true)
  assert.equal(isAdminUploadFileId('cloud://env.bucket/admin/store/shop.webp', 'tutorials'), false)
  assert.equal(isAdminUploadFileId('cloud://env.bucket/other/admin/store/shop.webp'), false)
  assert.equal(isAdminUploadFileId('cloud://env.bucket/admin/store/nested/shop.webp'), false)
})

test('草稿发布后会清理旧发布版不再引用的媒体文件', () => {
  const oldPublished = 'cloud://env.bucket/admin/store/old.webp'
  const nextPublished = 'cloud://env.bucket/admin/store/new.webp'
  assert.deepEqual(unreferencedFileIds([[nextPublished], [oldPublished]], [[nextPublished], [nextPublished]]), [oldPublished])
  assert.deepEqual(unreferencedFileIds([[oldPublished], [oldPublished]], [[nextPublished], [oldPublished]]), [])
})

test('发布快照迁移会移除 CloudBase 保留字段', () => {
  assert.deepEqual(documentPayload({ _id: 'default', _openid: 'owner', status: 'published', title: '教程' }), { status: 'published', title: '教程' })
  assert.deepEqual(documentPayload(null), {})
})

test('后台会员编辑会拒绝覆盖已变化的积分或成长值', () => {
  const user = { status: 'active' }
  const profile = { growth: 120, points: 40 }
  assert.equal(memberRecordMatchesExpected(user, profile, { status: 'active', growth: 120, points: 40 }), true)
  assert.equal(memberRecordMatchesExpected(user, profile, { status: 'active', growth: 120, points: 30 }), false)
  assert.equal(memberRecordMatchesExpected({ status: 'suspended' }, profile, { status: 'active', growth: 120, points: 40 }), false)
})

test('后台修订号校验阻止多管理员静默覆盖', () => {
  assert.deepEqual(revisionDecision(null, 0), { valid: true, conflict: false, currentRevision: 0, nextRevision: 1 })
  assert.deepEqual(revisionDecision({ revision: 4 }, 4), { valid: true, conflict: false, currentRevision: 4, nextRevision: 5 })
  assert.deepEqual(revisionDecision({ revision: 4 }, 3), { valid: true, conflict: true, currentRevision: 4, nextRevision: 5 })
  assert.deepEqual(revisionDecision({ revision: undefined }, undefined), { valid: false, conflict: true, currentRevision: 1, nextRevision: 2 })
})

test('作品和预约写入限额在事务前给出确定决策', () => {
  assert.deepEqual(workWriteQuotaDecision(true, 49, 199, 50, 200), { allowed: true, code: '', nextCreatedCount: 50, nextSaveCount: 200 })
  assert.deepEqual(workWriteQuotaDecision(true, 50, 80, 50, 200), { allowed: false, code: 'WORK_CREATE_LIMIT', nextCreatedCount: 50, nextSaveCount: 80 })
  assert.deepEqual(workWriteQuotaDecision(false, 20, 200, 50, 200), { allowed: false, code: 'WORK_SAVE_LIMIT', nextCreatedCount: 20, nextSaveCount: 200 })
  assert.deepEqual(dailyActionDecision(19, 20), { allowed: true, nextCount: 20 })
  assert.deepEqual(dailyActionDecision(20, 20), { allowed: false, nextCount: 20 })
})

test('作品版本校验阻止跨设备静默覆盖', () => {
  assert.deepEqual(workVersionDecision(null, 0), { valid: true, conflict: false, currentVersion: 0, nextVersion: 1 })
  assert.deepEqual(workVersionDecision({ version: 3 }, 3), { valid: true, conflict: false, currentVersion: 3, nextVersion: 4 })
  assert.deepEqual(workVersionDecision({ version: 3 }, 2), { valid: true, conflict: true, currentVersion: 3, nextVersion: 4 })
  assert.deepEqual(workVersionDecision({ version: undefined }, undefined), { valid: false, conflict: true, currentVersion: 1, nextVersion: 2 })
})

test('店主删除作品同样要求匹配当前版本', () => {
  assert.deepEqual(adminWorkVersionDecision({ version: 4 }, 4), { valid: true, conflict: false, currentVersion: 4 })
  assert.deepEqual(adminWorkVersionDecision({ version: 4 }, 3), { valid: true, conflict: true, currentVersion: 4 })
  assert.deepEqual(adminWorkVersionDecision({ version: undefined }, undefined), { valid: false, conflict: true, currentVersion: 1 })
})

test('图集搜索和筛选在服务端对完整数据集生效', () => {
  const items = [
    { title: '武汉漫游', description: '黄鹤楼与大桥', category: '武汉', level: '公开' },
    { title: '恋爱纪念', description: '情侣拼豆', category: '情侣', level: 'V2' },
  ]
  assert.deepEqual(galleryFilters({ category: '情侣', level: 'V2', keyword: ' 恋爱 ' }), { category: '情侣', level: 'V2', keyword: '恋爱' })
  assert.deepEqual(filterCollections(items, galleryFilters({ keyword: '黄鹤楼' })), [items[0]])
  assert.deepEqual(filterCollections(items, galleryFilters({ category: '情侣', level: 'V2' })), [items[1]])
  assert.deepEqual(filterCollections(items, galleryFilters({ level: 'VIP' })), items)
})
