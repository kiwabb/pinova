import { callUserService, isCloudServiceError } from '../../utils/cloud'

type ValueEvent = WechatMiniprogram.BaseEvent & { detail: { value: string } }
type GetPhoneNumberEvent = WechatMiniprogram.BaseEvent & { detail: { code?: string } }

interface BindProfilePayload {
  id: string
  memberLevel: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  phoneBound: boolean
  phoneMasked: string
}

interface StoreConfig {
  status: 'draft' | 'published'
  name: string
  city: string
  address: string
  phone: string
  latitude: number | null
  longitude: number | null
  businessHours: string
  photos: string[]
  bookingEnabled: boolean
  maxAdvanceDays: number
  experienceTypes: string[]
  timeSlots: string[]
}

interface BookingRecord {
  id: string
  date: string
  experienceType: string
  timeSlot: string
  status: 'pending' | 'confirmed' | 'cancelled'
  repeated?: boolean
}

interface SlotAvailability {
  timeSlot: string
  used: number
  capacity: number
  remaining: number
  full: boolean
}

function dateString(offsetDays = 0) {
  return new Date(Date.now() + (8 * 60 * 60 * 1000) + offsetDays * 86400000).toISOString().slice(0, 10)
}

Page({
  data: {
    photos: ['/assets/store/bead-wall-wide.jpg','/assets/store/color-rack.jpg','/assets/store/worktable.jpg','/assets/store/featured-character-work.jpg','/assets/store/display-wall.jpg','/assets/store/tools-and-colors.jpg'],
    loading: true,
    loadError: '',
    showBooking: false,
    bookingSubmitting: false,
    bookingCancelling: false,
    phoneRequired: false,
    bindingPhone: false,
    bookingError: '',
    availabilityLoading: false,
    availabilityError: '',
    availability: [] as SlotAvailability[],
    booked: false,
    activeBookingId: '',
    bookingStatus: 'pending',
    storeName: '星期八拼豆工作室',
    addressText: '武汉市 · 具体地址待完善',
    businessHours: '每日 10:00–21:00',
    phone: '',
    latitude: null as number | null,
    longitude: null as number | null,
    bookingEnabled: false,
    minDate: dateString(),
    maxDate: dateString(30),
    bookingDate: dateString(1),
    experienceTypes: [] as string[],
    bookingType: '',
    timeSlots: [] as string[],
    timeIndex: 0,
    bookingTime: '',
  },
  onShow() {
    this.getTabBar()?.setData({ selected: 3, hidden: false })
    void this.loadStore()
  },
  async loadStore() {
    this.setData({ loading: true, loadError: '' })
    try {
      const result = await callUserService<{ store: StoreConfig; activeBooking: BookingRecord | null }>('getStore')
      const store = result.store
      const booking = result.activeBooking
      this.setData({
        storeName: store.name,
        addressText: [store.city, store.address].filter(Boolean).join(' · '),
        businessHours: store.businessHours,
        photos: store.photos,
        phone: store.phone,
        latitude: store.latitude,
        longitude: store.longitude,
        bookingEnabled: store.bookingEnabled,
        maxDate: dateString(store.maxAdvanceDays),
        experienceTypes: store.experienceTypes,
        bookingType: booking?.experienceType || store.experienceTypes[0] || '',
        timeSlots: store.timeSlots,
        bookingTime: booking?.timeSlot || store.timeSlots[0] || '',
        timeIndex: Math.max(0, store.timeSlots.indexOf(booking?.timeSlot || store.timeSlots[0])),
        booked: Boolean(booking),
        activeBookingId: booking?.id || '',
        bookingDate: booking?.date || dateString(1),
        bookingStatus: booking?.status || 'pending',
      })
    } catch (error) {
      this.setData({ bookingEnabled: false, availability: [], loadError: error instanceof Error ? error.message : '门店信息加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
  navigate() {
    if (this.data.latitude === null || this.data.longitude === null) {
      wx.showToast({ title: '门店地址完善后可使用导航', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: this.data.latitude,
      longitude: this.data.longitude,
      name: this.data.storeName,
      address: this.data.addressText,
      fail: ({ errMsg }) => { if (!errMsg.toLowerCase().includes('cancel')) wx.showToast({ title: '导航打开失败，请重试', icon: 'none' }) },
    })
  },
  call() {
    if (!this.data.phone) {
      wx.showToast({ title: '门店电话完善后可一键拨打', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: this.data.phone, fail: ({ errMsg }) => { if (!errMsg.toLowerCase().includes('cancel')) wx.showToast({ title: '拨号失败，请重试', icon: 'none' }) } })
  },
  book() {
    if (!this.data.bookingEnabled) return wx.showToast({ title: '当前暂停线上预约', icon: 'none' })
    if (!this.data.experienceTypes.length || !this.data.timeSlots.length) return wx.showToast({ title: '预约规则尚未配置', icon: 'none' })
    this.getTabBar()?.setData({ hidden: true })
    this.setData({ showBooking: true, phoneRequired: false, bookingError: '' })
    void this.loadAvailability(this.data.bookingDate)
  },
  closeBooking() {
    if (this.data.bookingSubmitting || this.data.bindingPhone) return
    this.getTabBar()?.setData({ hidden: false })
    this.setData({ showBooking: false, phoneRequired: false, bookingError: '' })
  },
  noop() {},
  changeDate(event: ValueEvent) {
    const bookingDate = event.detail.value
    this.setData({ bookingDate, bookingError: '' })
    void this.loadAvailability(bookingDate)
  },
  selectType(event: WechatMiniprogram.TouchEvent) { this.setData({ bookingType: event.currentTarget.dataset.value, bookingError: '' }) },
  changeTime(event: ValueEvent) {
    const timeIndex = Number(event.detail.value)
    this.setData({ timeIndex, bookingTime: this.data.timeSlots[timeIndex], bookingError: '' })
  },
  selectTime(event: WechatMiniprogram.TouchEvent) {
    const timeSlot = event.currentTarget.dataset.value
    const slot = this.data.availability.find((item) => item.timeSlot === timeSlot)
    if (!slot || slot.full) return
    this.setData({ bookingTime: timeSlot, timeIndex: Math.max(0, this.data.timeSlots.indexOf(timeSlot)), bookingError: '' })
  },
  async loadAvailability(date: string) {
    if (!this.data.bookingEnabled) return
    this.setData({ availabilityLoading: true, availabilityError: '' })
    try {
      const result = await callUserService<{ date: string; slots: SlotAvailability[] }>('getAvailability', { date })
      if (result.date !== this.data.bookingDate) return
      const current = result.slots.find((item) => item.timeSlot === this.data.bookingTime && !item.full)
      const next = current || result.slots.find((item) => !item.full)
      this.setData({
        availability: result.slots,
        bookingTime: next?.timeSlot || '',
        timeIndex: next ? Math.max(0, this.data.timeSlots.indexOf(next.timeSlot)) : 0,
      })
    } catch (error) {
      if (date === this.data.bookingDate) this.setData({ availability: [], availabilityError: error instanceof Error ? error.message : '时段余量加载失败' })
    } finally {
      if (date === this.data.bookingDate) this.setData({ availabilityLoading: false })
    }
  },
  retryAvailability() { void this.loadAvailability(this.data.bookingDate) },
  async bindPhoneAndBook(event: GetPhoneNumberEvent) {
    if (this.data.bindingPhone) return
    if (!event.detail.code) return void this.setData({ bookingError: '未授权手机号，可稍后再试' })
    this.setData({ bindingPhone: true, bookingError: '' })
    let bound = false
    try {
      const profile = await callUserService<BindProfilePayload>('bindPhone', { code: event.detail.code })
      const app = getApp<IAppOption>()
      app.globalData.cloudUser = {
        id: profile.id,
        memberLevel: profile.memberLevel,
        growth: profile.growth,
        points: profile.points,
        phoneBound: profile.phoneBound,
      }
      app.globalData.points = profile.points
      app.globalData.phone = profile.phoneMasked || '已绑定'
      wx.setStorageSync('xingqiba-cloud-user', app.globalData.cloudUser)
      this.setData({ phoneRequired: false })
      bound = true
      wx.showToast({ title: '绑定成功，继续预约', icon: 'success' })
    } catch (error) {
      this.setData({ bookingError: error instanceof Error ? error.message : '手机号绑定失败' })
    } finally {
      this.setData({ bindingPhone: false })
    }
    if (bound) void this.confirmBooking()
  },
  async confirmBooking() {
    if (this.data.bookingSubmitting || this.data.phoneRequired) return
    if (!this.data.bookingTime) return void this.setData({ bookingError: '当前日期暂无可预约时段' })
    this.setData({ bookingSubmitting: true, bookingError: '' })
    try {
      const booking = await callUserService<BookingRecord>('createBooking', {
        date: this.data.bookingDate,
        experienceType: this.data.bookingType,
        timeSlot: this.data.bookingTime,
      })
      this.getTabBar()?.setData({ hidden: false })
      this.setData({
        booked: true,
        activeBookingId: booking.id,
        bookingDate: booking.date,
        bookingType: booking.experienceType,
        bookingTime: booking.timeSlot,
        bookingStatus: booking.status,
        showBooking: false,
      })
      wx.showToast({ title: booking.repeated ? '该时段已预约' : '预约已提交', icon: booking.repeated ? 'none' : 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '预约失败'
      this.setData({ bookingError: message })
      if (isCloudServiceError(error, 'SLOT_FULL')) void this.loadAvailability(this.data.bookingDate)
      if (isCloudServiceError(error, 'PHONE_REQUIRED')) {
        this.setData({ phoneRequired: true, bookingError: '' })
      }
    } finally {
      this.setData({ bookingSubmitting: false })
    }
  },
  cancelBooking() {
    if (!this.data.activeBookingId) return
    wx.showModal({
      title: '取消预约',
      content: `确认取消 ${this.data.bookingDate} ${this.data.bookingTime} 的到店预约？`,
      confirmText: '取消预约',
      confirmColor: '#B42318',
      success: ({ confirm }) => { if (confirm) void this.confirmCancelBooking() },
    })
  },
  async confirmCancelBooking() {
    if (this.data.bookingCancelling) return
    this.setData({ bookingCancelling: true })
    try {
      await callUserService('cancelBooking', { bookingId: this.data.activeBookingId })
      this.setData({ booked: false, activeBookingId: '' })
      wx.showToast({ title: '预约已取消', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '取消失败', icon: 'none' })
    } finally {
      this.setData({ bookingCancelling: false })
    }
  },
  preview(event: WechatMiniprogram.TouchEvent) {
    wx.previewImage({ current: event.currentTarget.dataset.src, urls: this.data.photos, fail: ({ errMsg }) => { if (!errMsg.toLowerCase().includes('cancel')) wx.showToast({ title: '图片预览失败', icon: 'none' }) } })
  },
  onShareAppMessage() {
    const photo = this.data.photos[0]
    const imageUrl = photo && !photo.startsWith('cloud://') ? photo : '/assets/store/studio-wide.jpg'
    return { title: `${this.data.storeName}，一起来做拼豆`, path: '/pages/store/index', imageUrl }
  },
})
