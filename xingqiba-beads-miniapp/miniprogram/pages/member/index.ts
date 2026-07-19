import { callUserService } from '../../utils/cloud'

interface Tier {
  code: string
  title: string
  threshold: number
  description: string
  benefits: string[]
  status?: string
}

interface RewardConfig {
  bindPhonePoints: number
  bindPhoneGrowth: number
  createWorkPoints: number
  createWorkGrowth: number
  createWorkDailyLimit: number
}

interface ProfilePayload {
  memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  phoneBound: boolean
  memberConfig: { status: 'draft' | 'published'; version: number; levels: Tier[]; rewards?: RewardConfig }
}

function rewardSummary(points: number, growth: number) {
  return [growth > 0 ? `+${growth} 成长值` : '', points > 0 ? `+${points} 积分` : ''].filter(Boolean).join('、')
}

Page({
  data: {
    loading: true,
    loadError: '',
    bound: false,
    growth: 0,
    currentCode: 'PUBLIC',
    currentTitle: '访客',
    nextCode: '',
    remaining: 0,
    progress: 0,
    tiers: [] as Tier[],
    selectedIndex: 0,
    selectedTier: null as Tier | null,
    configStatus: 'draft',
    bindRewardText: '',
    workRewardText: '',
  },
  onShow() { void this.loadMember() },
  async loadMember() {
    this.setData({ loading: true, loadError: '' })
    try {
      const profile = await callUserService<ProfilePayload>('getProfile')
      this.applyProfile(profile)
    } catch (error) {
      this.setData({ loadError: error instanceof Error ? error.message : '会员信息加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
  applyProfile(profile: ProfilePayload) {
    const source = profile.memberConfig.levels
    const currentIndex = profile.memberLevel === 'PUBLIC' ? -1 : source.findIndex((tier) => tier.code === profile.memberLevel)
    const safeCurrentIndex = Math.max(0, currentIndex)
    const current = currentIndex >= 0 ? source[currentIndex] : null
    const next = source[currentIndex + 1] || null
    const currentThreshold = current?.threshold || 0
    const range = next ? Math.max(1, next.threshold - currentThreshold) : 1
    const progress = next ? Math.min(100, Math.max(0, Math.round(((profile.growth - currentThreshold) / range) * 100))) : 100
    const tiers = source.map((tier, index) => ({
      ...tier,
      status: index < currentIndex ? '已解锁' : index === currentIndex ? '当前等级' : '待解锁',
    }))
    const rewards = profile.memberConfig.rewards || { bindPhonePoints: 0, bindPhoneGrowth: 0, createWorkPoints: 0, createWorkGrowth: 0, createWorkDailyLimit: 0 }
    const bindReward = rewardSummary(rewards.bindPhonePoints, rewards.bindPhoneGrowth)
    const workReward = rewardSummary(rewards.createWorkPoints, rewards.createWorkGrowth)
    this.setData({
      bound: profile.phoneBound,
      growth: profile.growth,
      currentCode: current?.code || 'PUBLIC',
      currentTitle: current?.title || '访客',
      nextCode: next?.code || '',
      remaining: next ? Math.max(0, next.threshold - profile.growth) : 0,
      progress,
      tiers,
      selectedIndex: safeCurrentIndex,
      selectedTier: tiers[safeCurrentIndex] || null,
      configStatus: profile.memberConfig.status,
      bindRewardText: bindReward ? `绑定手机号：${bindReward}` : '绑定手机号：当前不发放额外奖励',
      workRewardText: workReward && rewards.createWorkDailyLimit > 0
        ? `每日前 ${rewards.createWorkDailyLimit} 件新作品：每件 ${workReward}`
        : '新作品：当前不发放额外奖励',
    })
  },
  selectTier(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({ selectedIndex: index, selectedTier: this.data.tiers[index] })
  },
  goBind() {
    wx.setStorageSync('xingqiba-open-bind', true)
    wx.switchTab({ url: '/pages/profile/index' })
  },
})
