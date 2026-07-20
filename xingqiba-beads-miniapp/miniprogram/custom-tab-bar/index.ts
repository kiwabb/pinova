Component({
  data: {
    selected: 0,
    hidden: false,
    tabs: [
      { pagePath: '/pages/home/index', text: '首页', action: 'switch', icon: '/assets/icons/home.svg', activeIcon: '/assets/icons/home-active.svg' },
      { pagePath: '/pages/editor/index', text: '工具', action: 'navigate', icon: '/assets/icons/tool.svg', activeIcon: '/assets/icons/tool-active.svg' },
      { pagePath: '/pages/gallery/index', text: '图集', action: 'switch', icon: '/assets/icons/gallery.svg', activeIcon: '/assets/icons/gallery-active.svg' },
      { pagePath: '/pages/store/index', text: '门店', action: 'switch', icon: '/assets/icons/store.svg', activeIcon: '/assets/icons/store-active.svg' },
      { pagePath: '/pages/profile/index', text: '我的', action: 'switch', icon: '/assets/icons/profile.svg', activeIcon: '/assets/icons/profile-active.svg' },
    ],
  },
  methods: {
    switchTab(event: WechatMiniprogram.TouchEvent) {
      const { path, index, action } = event.currentTarget.dataset as { path: string; index: number; action: 'switch' | 'navigate' }
      if (action === 'navigate') {
        wx.navigateTo({ url: path })
        return
      }
      if (index === this.data.selected) return
      wx.switchTab({ url: path })
    },
  },
})
