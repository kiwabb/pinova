import { callUserService } from '../../utils/cloud'

interface MemberTier {
  code: string
  title: string
  threshold: number
  description: string
  benefits: string[]
}

interface ProfilePayload {
  id: string
  memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  phoneBound: boolean
  phoneMasked: string
  stats: { favorites: number; works: number; bookings: number }
  memberConfig: { status: 'draft' | 'published'; version: number; levels: MemberTier[] }
}

type GetPhoneNumberEvent = WechatMiniprogram.BaseEvent & { detail: { code?: string; errMsg?: string } }

Page({
  data: {
    loading: true,
    loadError: '',
    binding: false,
    bound: false,
    maskedPhone: '',
    memberLevel: 'PUBLIC',
    works: 0,
    favorites: 0,
    bookings: 0,
    points: 0,
  },
  onShow() {
    this.getTabBar()?.setData({ selected: 4, hidden: false })
    if (wx.getStorageSync('xingqiba-open-bind')) {
      wx.removeStorageSync('xingqiba-open-bind')
      wx.showToast({ title: '点击“去绑定”授权微信手机号', icon: 'none' })
    }
    void this.loadProfile()
  },
  async loadProfile() {
    this.setData({ loading: true, loadError: '' })
    try {
      const profile = await callUserService<ProfilePayload>('getProfile')
      this.applyProfile(profile)
    } catch (error) {
      this.setData({ loadError: error instanceof Error ? error.message : '个人信息加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
  applyProfile(profile: ProfilePayload) {
    this.setData({
      bound: profile.phoneBound,
      maskedPhone: profile.phoneMasked,
      memberLevel: profile.memberLevel,
      works: profile.stats.works,
      favorites: profile.stats.favorites,
      bookings: profile.stats.bookings,
      points: profile.points,
    })
    const app = getApp<IAppOption>()
    app.globalData.points = profile.points
    app.globalData.works = profile.stats.works
    app.globalData.phone = profile.phoneBound ? (profile.phoneMasked || '已绑定') : ''
    app.globalData.cloudUser = {
      id: profile.id,
      memberLevel: profile.memberLevel,
      growth: profile.growth,
      points: profile.points,
      phoneBound: profile.phoneBound,
    }
    wx.setStorageSync('xingqiba-cloud-user', app.globalData.cloudUser)
  },
  async bindPhone(event: GetPhoneNumberEvent) {
    if (this.data.binding) return
    if (!event.detail.code) {
      wx.showToast({ title: '未授权手机号，可稍后再试', icon: 'none' })
      return
    }
    this.setData({ binding: true })
    const replacing = this.data.bound
    try {
      const profile = await callUserService<ProfilePayload>('bindPhone', { code: event.detail.code, replace: replacing })
      this.applyProfile(profile)
      wx.showToast({ title: replacing ? '手机号已更新' : '绑定成功', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '绑定失败', icon: 'none' })
    } finally {
      this.setData({ binding: false })
    }
  },
  stopPropagation() {},
  openWorks() { wx.navigateTo({ url: '/pages/records/index?mode=works' }) },
  openFavorites() { wx.navigateTo({ url: '/pages/records/index?mode=favorites' }) },
  openBookings() { wx.navigateTo({ url: '/pages/records/index?mode=bookings' }) },
  openMember() { wx.navigateTo({ url: '/pages/member/index' }) },
  openStore() { wx.switchTab({ url: '/pages/store/index' }) },
})
