Component({
  data: {
    selected: 0,
    hidden: false,
    tabs: [
      { pagePath: '/pages/home/index', text: '首页', icon: '/assets/icons/home.svg', activeIcon: '/assets/icons/home-active.svg' },
      { pagePath: '/pages/gallery/index', text: '图集', icon: '/assets/icons/gallery.svg', activeIcon: '/assets/icons/gallery-active.svg' },
      { pagePath: '/pages/store/index', text: '门店', icon: '/assets/icons/store.svg', activeIcon: '/assets/icons/store-active.svg' },
      { pagePath: '/pages/profile/index', text: '我的', icon: '/assets/icons/profile.svg', activeIcon: '/assets/icons/profile-active.svg' },
    ],
  },
  methods: {
    switchTab(event: WechatMiniprogram.TouchEvent) {
      const { path, index } = event.currentTarget.dataset as { path: string; index: number }
      if (index === this.data.selected) return
      wx.switchTab({ url: path })
    },
  },
})
