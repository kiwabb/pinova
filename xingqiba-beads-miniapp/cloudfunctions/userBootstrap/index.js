const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('users')
const memberProfiles = db.collection('member_profiles')
const memberConfigs = db.collection('member_configs')
let collectionsReady = null

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
    collectionsReady = Promise.all(['users', 'member_profiles', 'member_configs'].map(ensureCollection))
      .catch((error) => { collectionsReady = null; throw error })
  }
  return collectionsReady
}

async function getOrCreateUser(userId, openid) {
  try {
    const result = await users.doc(userId).get()
    return result.data
  } catch (error) {
    const now = db.serverDate()
    const user = {
      openid,
      status: 'active',
      phoneBound: false,
      createdAt: now,
      updatedAt: now,
    }
    await users.doc(userId).set({ data: user })
    return user
  }
}

async function getOrCreateMemberProfile(userId) {
  try {
    const result = await memberProfiles.doc(userId).get()
    return result.data
  } catch (error) {
    const now = db.serverDate()
    const profile = {
      userId,
      level: 'PUBLIC',
      growth: 0,
      points: 0,
      createdAt: now,
      updatedAt: now,
    }
    await memberProfiles.doc(userId).set({ data: profile })
    return profile
  }
}

async function currentMemberLevel(user, profile) {
  if (!user.phoneBound) return 'PUBLIC'
  let config = null
  try {
    config = (await memberConfigs.doc('published').get()).data
  } catch (error) {
    try {
      const working = (await memberConfigs.doc('default').get()).data
      if (working.status === 'published') config = working
    } catch (workingError) {}
  }
  if (!config || !Array.isArray(config.levels)) return profile.level || 'V1'
  const growth = Math.max(0, Number(profile.growth) || 0)
  let level = 'V1'
  config.levels
    .filter((tier) => /^V[1-4]$/.test(tier.code))
    .sort((left, right) => (Number(left.threshold) || 0) - (Number(right.threshold) || 0))
    .forEach((tier) => { if (growth >= (Number(tier.threshold) || 0)) level = tier.code })
  return level
}

exports.main = async () => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return { success: false, code: 'UNAUTHORIZED', message: '无法识别微信用户' }

    await ensureCollectionsReady()

    const userId = crypto.createHash('sha256').update(OPENID).digest('hex')
    const [user, profile] = await Promise.all([
      getOrCreateUser(userId, OPENID),
      getOrCreateMemberProfile(userId),
    ])

    if (user.status === 'suspended') {
      return { success: false, code: 'ACCOUNT_SUSPENDED', message: '账号已暂停使用，请联系门店处理' }
    }

    const memberLevel = await currentMemberLevel(user, profile)
    if (profile.level !== memberLevel) await memberProfiles.doc(userId).update({ data: { level: memberLevel, updatedAt: db.serverDate() } })

    return {
      success: true,
      data: {
        id: userId,
        memberLevel,
        growth: profile.growth,
        points: profile.points,
        phoneBound: Boolean(user.phoneBound),
      },
    }
  } catch (error) {
    console.error('userBootstrap failed', error)
    return { success: false, code: 'INTERNAL_ERROR', message: '用户初始化失败' }
  }
}
