import { callUserService } from '../../utils/cloud'

interface GuideSection {
  id: string
  title: string
  duration: string
  image: string
  steps: string[]
}

interface TutorialContent {
  title: string
  subtitle: string
  safetyNote: string
  sections: GuideSection[]
}

async function resolveCloudImages(sections: GuideSection[]) {
  const fileList = sections.map((item) => item.image).filter((image) => image.startsWith('cloud://'))
  if (!fileList.length) return sections
  const response = await wx.cloud.getTempFileURL({ fileList })
  const urlMap = new Map(response.fileList.map((item) => [item.fileID, item.tempFileURL]))
  return sections.map((item) => ({ ...item, image: urlMap.get(item.image) || item.image }))
}

Page({
  data: {
    title: '第一件拼豆作品',
    subtitle: '从摆放到定型',
    safetyNote: '熨烫和剪切必须由成人操作；儿童制作时需全程陪同。',
    sections: [] as GuideSection[],
    activeId: '',
    loading: true,
    loadError: '',
  },
  onLoad() { void this.loadTutorial() },
  async loadTutorial() {
    this.setData({ loading: true, loadError: '' })
    try {
      const content = await callUserService<TutorialContent>('getTutorial')
      const sections = await resolveCloudImages(content.sections)
      this.setData({
        title: content.title,
        subtitle: content.subtitle,
        safetyNote: content.safetyNote,
        sections,
        activeId: sections[0]?.id || '',
      })
      wx.setNavigationBarTitle({ title: content.title })
    } catch (error) {
      this.setData({ loadError: error instanceof Error ? error.message : '教程加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
  retry() { void this.loadTutorial() },
  selectSection(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id
    this.setData({ activeId: this.data.activeId === id ? '' : id })
  },
  startCreating() { wx.navigateTo({ url: '/pages/editor/index' }) },
})
