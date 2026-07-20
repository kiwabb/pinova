<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Gauge,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Palette,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Settings2,
  Users,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import { ADMIN_AUTH_EXPIRED_EVENT, callAdmin, cleanupPendingAdminUploads, hasLoginState, isAdminServiceError, releaseAdminUploads, resolveImageUrls, signInAdmin, signOutAdmin, uploadCollectionImage, uploadStoreImage, validateAdminImage } from './cloud'
import type { BookingRecord, BookingStatus, CollectionInput, CollectionRecord, CollectionStatus, MemberConfig, MemberLevel, OperationsConfig, PaginatedResult, PatternMaterialInput, StoreConfig } from './types'

type ViewState = 'checking' | 'guest' | 'admin'
type AdminView = 'overview' | 'collections' | 'bookings' | 'users' | 'works' | 'tutorials' | 'settings' | 'audits'

const OverviewView = defineAsyncComponent(() => import('./components/OverviewView.vue'))
const TutorialsView = defineAsyncComponent(() => import('./components/TutorialsView.vue'))
const UsersView = defineAsyncComponent(() => import('./components/UsersView.vue'))
const WorksView = defineAsyncComponent(() => import('./components/WorksView.vue'))
const AuditLogsView = defineAsyncComponent(() => import('./components/AuditLogsView.vue'))

const viewState = ref<ViewState>('checking')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loginBusy = ref(false)
const loginError = ref('')
const adminName = ref('管理员')
const adminRole = ref('editor')
const currentView = ref<AdminView>('overview')
const collections = ref<CollectionRecord[]>([])
const loading = ref(false)
const actionError = ref('')
const searchText = ref('')
const levelFilter = ref<'全部' | MemberLevel>('全部')
const statusFilter = ref<'全部' | CollectionStatus>('全部')
const editorOpen = ref(false)
const editingId = ref('')
const editingRevision = ref(0)
const creatingId = ref('')
const saving = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const formError = ref('')
const pendingRecordIds = ref<string[]>([])
const successMessage = ref('')
let successTimer: number | undefined
const bookings = ref<BookingRecord[]>([])
const bookingLoading = ref(false)
const bookingLoadingMore = ref(false)
const bookingError = ref('')
const bookingCursor = ref('')
const bookingHasMore = ref(false)
const bookingTotal = ref(0)
const bookingStatusFilter = ref<'全部' | BookingStatus>('全部')
const bookingKeyword = ref('')
const bookingBusyIds = ref<string[]>([])
let bookingRequestSerial = 0
let bookingFilterTimer: number | undefined
const configLoading = ref(false)
const configError = ref('')
const memberSaving = ref(false)
const storeSaving = ref(false)
const storeUploading = ref(false)
const storeUploadProgress = ref(0)
const storeImagePreviews = ref<string[]>([])
const activeChildDirty = ref(false)
const initialMemberSnapshot = ref('')
const initialStoreSnapshot = ref('')

const emptyMemberConfig = (): MemberConfig => ({
  status: 'draft',
  version: 1,
  revision: 0,
  levels: (['V1', 'V2', 'V3', 'V4'] as const).map((code) => ({ code, title: '', threshold: 0, description: '', benefits: [] })),
  rewards: { bindPhonePoints: 0, bindPhoneGrowth: 0, createWorkPoints: 0, createWorkGrowth: 0, createWorkDailyLimit: 3 },
})
const emptyStoreConfig = (): StoreConfig => ({
  status: 'draft', revision: 0, name: '', city: '', address: '', phone: '', latitude: null, longitude: null, businessHours: '', bookingEnabled: true,
  photos: [], maxAdvanceDays: 30, capacityPerSlot: 6, experienceTypes: [], timeSlots: [],
})
const memberConfig = reactive<MemberConfig>(emptyMemberConfig())
const storeConfig = reactive<StoreConfig>(emptyStoreConfig())
const experienceTypesText = ref('')
const timeSlotsText = ref('')

const levels: MemberLevel[] = ['公开', 'V1', 'V2', 'V3', 'V4']
const categories = ['武汉', '情侣', '亲子', '学生', '精选', '节日', '其他']
const statuses: Array<{ value: Exclude<CollectionStatus, 'archived'>; label: string }> = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'offline', label: '已下架' },
]

const defaultPatternMaterials = (): PatternMaterialInput[] => [
  { id: 'material-board', kind: 'board', name: '29 × 29 底板', description: '标准拼豆底板', amount: '4', unit: '块' },
  { id: 'material-beads', kind: 'beads', name: 'MARD 拼豆', description: '按生成后的颜色清单准备', amount: '≤ 3364', unit: '颗' },
  { id: 'material-paper', kind: 'paper', name: '隔热烫纸', description: '用于完成后的熨烫定型', amount: '1', unit: '张' },
]

const editablePatternMaterials = (materials?: PatternMaterialInput[]) => materials?.length
  ? materials.map((item) => ({ ...item }))
  : defaultPatternMaterials()

const form = reactive<CollectionInput>({
  title: '',
  category: '精选',
  description: '',
  level: '公开',
  status: 'draft',
  images: [],
  items: [],
  background: '#F7F8FA',
  sort: 0,
})
const imagePreviews = ref<string[]>([])
const patternPreviews = ref<Record<string, string>>({})
const initialFormSnapshot = ref('')
const sessionUploads = new Set<string>()
const storeSessionUploads = new Set<string>()

const filteredCollections = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return collections.value.filter((item) => {
    const matchesKeyword = !keyword || item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword)
    const matchesLevel = levelFilter.value === '全部' || item.level === levelFilter.value
    const matchesStatus = statusFilter.value === '全部' || item.status === statusFilter.value
    return matchesKeyword && matchesLevel && matchesStatus
  })
})

const filteredBookings = computed(() => {
  const keyword = bookingKeyword.value.trim().toLowerCase()
  return bookings.value.filter((item) => {
    const matchesStatus = bookingStatusFilter.value === '全部' || item.status === bookingStatusFilter.value
    const matchesKeyword = !keyword || (item.phone || '').includes(keyword) || item.phoneMasked.toLowerCase().includes(keyword) || item.experienceType.toLowerCase().includes(keyword) || item.date.includes(keyword)
    return matchesStatus && matchesKeyword
  })
})

watch([bookingStatusFilter, bookingKeyword], () => {
  window.clearTimeout(bookingFilterTimer)
  if (currentView.value !== 'bookings') return
  bookingFilterTimer = window.setTimeout(() => { void loadBookings(true) }, 280)
})

const memberSnapshot = () => JSON.stringify(memberConfig)
const storeSnapshot = () => JSON.stringify({ config: storeConfig, experienceTypesText: experienceTypesText.value, timeSlotsText: timeSlotsText.value })
const settingsDirty = computed(() => currentView.value === 'settings' && !configLoading.value && adminRole.value === 'owner' && Boolean(initialMemberSnapshot.value) && Boolean(initialStoreSnapshot.value) && (
  memberSnapshot() !== initialMemberSnapshot.value || storeSnapshot() !== initialStoreSnapshot.value
))
const collectionEditorDirty = computed(() => editorOpen.value && JSON.stringify(form) !== initialFormSnapshot.value)
const hasUnsavedChanges = computed(() => collectionEditorDirty.value || activeChildDirty.value || settingsDirty.value)

const statusLabel = (status: CollectionStatus) => ({ draft: '草稿', published: '已发布', offline: '已下架', archived: '已归档' })[status]
const isRecordBusy = (id: string) => pendingRecordIds.value.includes(id)

function showSuccess(message: string) {
  successMessage.value = message
  window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => { successMessage.value = '' }, 3200)
}

function revokePreview(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

function revokeObjectPreviews() {
  imagePreviews.value.forEach(revokePreview)
  Object.values(patternPreviews.value).forEach(revokePreview)
}

async function verifySession() {
  const profile = await callAdmin<{ name: string; role: string }>('session')
  adminName.value = profile.name
  adminRole.value = profile.role
  viewState.value = 'admin'
  void cleanupPendingAdminUploads().catch((error) => console.warn('cleanup pending uploads failed', error))
  await loadAdminView(currentView.value)
}

async function loadAdminView(view: AdminView) {
  const reloadsCurrentSettings = view === currentView.value && view === 'settings'
  if ((view !== currentView.value || reloadsCurrentSettings) && hasUnsavedChanges.value && !window.confirm(reloadsCurrentSettings ? '当前配置尚未保存，确认重新加载？' : '当前修改尚未保存，确认离开此页面？')) return
  if (currentView.value === 'settings' && (view !== currentView.value || reloadsCurrentSettings)) {
    await cleanupStoreSessionUploads()
    revokeStorePreviews()
  }
  if (view !== currentView.value) activeChildDirty.value = false
  currentView.value = view
  if (view === 'collections') await loadCollections()
  if (view === 'bookings') await loadBookings()
  if (view === 'settings') await loadConfigs()
}

async function submitLogin() {
  loginBusy.value = true
  loginError.value = ''
  try {
    await signInAdmin(username.value.trim(), password.value)
    await verifySession()
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : '登录失败，请检查账号和密码'
    await signOutAdmin().catch(() => undefined)
  } finally {
    loginBusy.value = false
  }
}

async function logout() {
  if (hasUnsavedChanges.value && !window.confirm('当前修改尚未保存，确认退出登录？')) return
  await cleanupSessionUploads()
  await cleanupStoreSessionUploads()
  revokeObjectPreviews()
  revokeStorePreviews()
  editorOpen.value = false
  await signOutAdmin()
  collections.value = []
  password.value = ''
  viewState.value = 'guest'
}

async function handleAuthExpired() {
  if (viewState.value === 'guest') return
  activeChildDirty.value = false
  editorOpen.value = false
  collections.value = []
  password.value = ''
  loginError.value = '登录状态已失效，请重新登录'
  viewState.value = 'guest'
  sessionUploads.clear()
  storeSessionUploads.clear()
  revokeObjectPreviews()
  revokeStorePreviews()
  await signOutAdmin().catch(() => undefined)
}

async function loadCollections() {
  loading.value = true
  actionError.value = ''
  try {
    const records = await callAdmin<CollectionRecord[]>('listCollections')
    const fileIds = records.flatMap((item) => item.images)
    const urlMap = await resolveImageUrls(fileIds)
    collections.value = records.map((item) => ({
      ...item,
      previewImages: item.images.map((image) => urlMap.get(image) || (image.startsWith('/') ? '' : image)),
    }))
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '图集加载失败'
  } finally {
    loading.value = false
  }
}

async function loadBookings(reset = true) {
  if (!reset && (!bookingHasMore.value || bookingLoadingMore.value)) return
  const requestSerial = ++bookingRequestSerial
  if (reset) {
    bookingLoading.value = true
    bookingCursor.value = ''
    bookingHasMore.value = false
  } else {
    bookingLoadingMore.value = true
  }
  bookingError.value = ''
  try {
    const page = await callAdmin<PaginatedResult<BookingRecord>>('listBookings', { paginated: true, cursor: reset ? '' : bookingCursor.value, pageSize: 50, status: bookingStatusFilter.value === '全部' ? '' : bookingStatusFilter.value, keyword: bookingKeyword.value.trim() })
    if (requestSerial !== bookingRequestSerial) return
    bookings.value = reset ? page.items : [...bookings.value, ...page.items.filter((item) => !bookings.value.some((existing) => existing.id === item.id))]
    bookingCursor.value = page.nextCursor
    bookingHasMore.value = page.hasMore
    bookingTotal.value = page.total
  } catch (error) {
    if (requestSerial !== bookingRequestSerial) return
    const message = error instanceof Error ? error.message : '预约加载失败'
    bookingError.value = message
  } finally {
    if (requestSerial === bookingRequestSerial) {
      bookingLoading.value = false
      bookingLoadingMore.value = false
    }
  }
}

function loadMoreBookings() { void loadBookings(false) }

const bookingStatusLabel = (status: BookingStatus) => ({ pending: '待确认', confirmed: '已确认', cancelled: '已取消' })[status]
const isBookingBusy = (id: string) => bookingBusyIds.value.includes(id)

async function updateBooking(record: BookingRecord, status: BookingStatus) {
  if (isBookingBusy(record.id) || record.status === status) return
  if (status === 'cancelled' && !window.confirm(`确认取消 ${record.date} ${record.timeSlot} 的预约？`)) return
  bookingBusyIds.value = [...bookingBusyIds.value, record.id]
  bookingError.value = ''
  try {
    await callAdmin('updateBookingStatus', { bookingId: record.id, status, expectedStatus: record.status })
    bookings.value = bookings.value.map((item) => item.id === record.id ? { ...item, status } : item)
    showSuccess(status === 'confirmed' ? '预约已确认' : status === 'cancelled' ? '预约已取消' : '预约已恢复为待确认')
  } catch (error) {
    bookingError.value = error instanceof Error ? error.message : '预约状态更新失败'
    if (isAdminServiceError(error, 'CONFLICT')) await loadBookings(true)
  } finally {
    bookingBusyIds.value = bookingBusyIds.value.filter((id) => id !== record.id)
  }
}

async function copyBookingPhone(phone: string) {
  if (!phone) return void (bookingError.value = '该预约没有可用手机号')
  try {
    await navigator.clipboard.writeText(phone)
    showSuccess('手机号已复制')
  } catch {
    bookingError.value = '浏览器未允许复制，请手动选择手机号'
  }
}

function copyConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

async function loadConfigs() {
  await cleanupStoreSessionUploads()
  revokeStorePreviews()
  configLoading.value = true
  configError.value = ''
  try {
    const configs = await callAdmin<OperationsConfig>('getConfigs')
    Object.assign(memberConfig, copyConfig(configs.membership || emptyMemberConfig()))
    const nextStore = copyConfig(configs.store || emptyStoreConfig())
    nextStore.photos = Array.isArray(nextStore.photos) ? nextStore.photos : []
    Object.assign(storeConfig, nextStore)
    experienceTypesText.value = storeConfig.experienceTypes.join('\n')
    timeSlotsText.value = storeConfig.timeSlots.join('\n')
    const storeUrlMap = await resolveImageUrls(storeConfig.photos)
    storeImagePreviews.value = storeConfig.photos.map((image) => storeUrlMap.get(image) || (image.startsWith('http') || image.startsWith('/') ? image : ''))
    initialMemberSnapshot.value = memberSnapshot()
    initialStoreSnapshot.value = storeSnapshot()
  } catch (error) {
    configError.value = error instanceof Error ? error.message : '运营配置加载失败'
  } finally {
    configLoading.value = false
  }
}

function updateBenefits(index: number, event: Event) {
  const input = event.target as HTMLTextAreaElement
  memberConfig.levels[index].benefits = input.value.split('\n').map((item) => item.trim()).filter(Boolean)
}

async function saveMembership() {
  if (adminRole.value !== 'owner') return void (configError.value = '仅店主账号可修改运营配置')
  memberSaving.value = true
  configError.value = ''
  try {
    const result = await callAdmin<{ version: number; revision: number }>('saveMemberConfig', { config: copyConfig(memberConfig), expectedRevision: memberConfig.revision })
    memberConfig.version = result.version
    memberConfig.revision = result.revision
    initialMemberSnapshot.value = memberSnapshot()
    showSuccess('会员配置已保存')
  } catch (error) {
    configError.value = error instanceof Error ? error.message : '会员配置保存失败'
  } finally {
    memberSaving.value = false
  }
}

async function saveStore() {
  if (adminRole.value !== 'owner') return void (configError.value = '仅店主账号可修改运营配置')
  storeSaving.value = true
  configError.value = ''
  try {
    storeConfig.experienceTypes = experienceTypesText.value.split('\n').map((item) => item.trim()).filter(Boolean)
    storeConfig.timeSlots = timeSlotsText.value.split('\n').map((item) => item.trim()).filter(Boolean)
    const result = await callAdmin<{ revision: number }>('saveStoreConfig', { config: copyConfig(storeConfig), expectedRevision: storeConfig.revision })
    storeConfig.revision = result.revision
    releaseAdminUploads([...storeSessionUploads])
    storeSessionUploads.clear()
    initialStoreSnapshot.value = storeSnapshot()
    showSuccess('门店配置已保存')
  } catch (error) {
    configError.value = error instanceof Error ? error.message : '门店配置保存失败'
  } finally {
    storeSaving.value = false
  }
}

function revokeStorePreviews() {
  storeImagePreviews.value.forEach(revokePreview)
  storeImagePreviews.value = []
}

async function cleanupStoreSessionUploads() {
  const fileList = [...storeSessionUploads]
  storeSessionUploads.clear()
  if (fileList.length) {
    await callAdmin('deleteFiles', { fileList }).then(() => releaseAdminUploads(fileList)).catch(() => undefined)
  }
}

async function handleStoreFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).slice(0, Math.max(0, 6 - storeConfig.photos.length))
  input.value = ''
  if (!files.length || storeUploading.value) return
  storeUploading.value = true
  storeUploadProgress.value = 0
  configError.value = ''
  try {
    for (const file of files) {
      validateAdminImage(file)
      const fileId = await uploadStoreImage(file, (progress) => { storeUploadProgress.value = progress })
      storeSessionUploads.add(fileId)
      storeConfig.photos.push(fileId)
      storeImagePreviews.value.push(URL.createObjectURL(file))
      storeUploadProgress.value = 0
    }
  } catch (error) {
    configError.value = error instanceof Error ? error.message : '门店图片上传失败'
  } finally {
    storeUploading.value = false
    storeUploadProgress.value = 0
  }
}

async function removeStoreImage(index: number) {
  if (storeUploading.value) return
  const fileId = storeConfig.photos[index]
  revokePreview(storeImagePreviews.value[index] || '')
  storeConfig.photos.splice(index, 1)
  storeImagePreviews.value.splice(index, 1)
  if (storeSessionUploads.delete(fileId)) {
    await callAdmin('deleteFiles', { fileList: [fileId] }).then(() => releaseAdminUploads([fileId])).catch(() => undefined)
  }
}

function moveStoreImage(index: number, direction: -1 | 1) {
  const target = index + direction
  if (storeUploading.value || target < 0 || target >= storeConfig.photos.length) return
  ;[storeConfig.photos[index], storeConfig.photos[target]] = [storeConfig.photos[target], storeConfig.photos[index]]
  ;[storeImagePreviews.value[index], storeImagePreviews.value[target]] = [storeImagePreviews.value[target], storeImagePreviews.value[index]]
}

function resetForm() {
  revokeObjectPreviews()
  editingId.value = ''
  editingRevision.value = 0
  creatingId.value = `collection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  Object.assign(form, { title: '', category: '精选', description: '', level: '公开', status: 'draft', images: [], items: [], background: '#F7F8FA', sort: 0 })
  imagePreviews.value = []
  patternPreviews.value = {}
  formError.value = ''
  initialFormSnapshot.value = JSON.stringify(form)
}

function openCreate() {
  resetForm()
  initialFormSnapshot.value = JSON.stringify(form)
  editorOpen.value = true
}

async function openEdit(record: CollectionRecord) {
  revokeObjectPreviews()
  editingId.value = record.id
  editingRevision.value = record.revision
  creatingId.value = ''
  Object.assign(form, {
    title: record.title,
    category: record.category,
    description: record.description,
    level: record.level,
    status: record.status === 'archived' ? 'offline' : record.status,
    images: [...record.images],
    items: record.items.map((item) => ({ ...item, materials: editablePatternMaterials(item.materials) })),
    background: record.background,
    sort: record.sort,
  })
  const allImages = [...record.images, ...record.items.map((item) => item.image)].filter(Boolean)
  const urlMap = await resolveImageUrls(allImages)
  imagePreviews.value = record.images.map((image) => urlMap.get(image) || '')
  patternPreviews.value = Object.fromEntries(record.items.map((item) => [item.id, urlMap.get(item.image) || '']))
  formError.value = ''
  initialFormSnapshot.value = JSON.stringify(form)
  editorOpen.value = true
}

async function cleanupSessionUploads() {
  const fileList = [...sessionUploads]
  sessionUploads.clear()
  if (fileList.length) {
    await callAdmin('deleteFiles', { fileList }).then(() => releaseAdminUploads(fileList)).catch(() => undefined)
  }
}

async function closeEditor() {
  if (saving.value || uploading.value) return false
  if (collectionEditorDirty.value && !window.confirm('当前修改尚未保存，确认关闭？')) return false
  await cleanupSessionUploads()
  revokeObjectPreviews()
  editorOpen.value = false
  return true
}

async function handleFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).slice(0, Math.max(0, 4 - form.images.length))
  input.value = ''
  if (!files.length) return
  uploading.value = true
  formError.value = ''
  try {
    for (const file of files) {
      validateAdminImage(file)
      uploadProgress.value = 0
      const fileId = await uploadCollectionImage(file, (progress) => { uploadProgress.value = progress })
      sessionUploads.add(fileId)
      form.images.push(fileId)
      imagePreviews.value.push(URL.createObjectURL(file))
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '图片上传失败'
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

async function removeImage(index: number) {
  const fileId = form.images[index]
  revokePreview(imagePreviews.value[index] || '')
  form.images.splice(index, 1)
  imagePreviews.value.splice(index, 1)
  if (sessionUploads.delete(fileId)) {
    await callAdmin('deleteFiles', { fileList: [fileId] }).then(() => releaseAdminUploads([fileId])).catch(() => undefined)
  }
}

function moveImage(index: number, direction: -1 | 1) {
  const target = index + direction
  if (uploading.value || target < 0 || target >= form.images.length) return
  ;[form.images[index], form.images[target]] = [form.images[target], form.images[index]]
  ;[imagePreviews.value[index], imagePreviews.value[target]] = [imagePreviews.value[target], imagePreviews.value[index]]
}

async function handlePatternFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).slice(0, Math.max(0, 100 - form.items.length))
  input.value = ''
  if (!files.length) return
  uploading.value = true
  formError.value = ''
  try {
    for (const file of files) {
      validateAdminImage(file)
      const id = `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      uploadProgress.value = 0
      const fileId = await uploadCollectionImage(file, (progress) => { uploadProgress.value = progress })
      sessionUploads.add(fileId)
      const name = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 40) || `图纸 ${form.items.length + 1}`
      form.items.push({ id, name, image: fileId, materials: defaultPatternMaterials() })
      patternPreviews.value[id] = URL.createObjectURL(file)
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '图纸上传失败'
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

async function removePattern(index: number) {
  const pattern = form.items[index]
  revokePreview(patternPreviews.value[pattern.id] || '')
  form.items.splice(index, 1)
  delete patternPreviews.value[pattern.id]
  if (sessionUploads.delete(pattern.image)) {
    await callAdmin('deleteFiles', { fileList: [pattern.image] }).then(() => releaseAdminUploads([pattern.image])).catch(() => undefined)
  }
}

function movePattern(index: number, direction: -1 | 1) {
  const target = index + direction
  if (uploading.value || target < 0 || target >= form.items.length) return
  ;[form.items[index], form.items[target]] = [form.items[target], form.items[index]]
}

function addPatternMaterial(patternIndex: number) {
  const materials = form.items[patternIndex]?.materials
  if (!materials || materials.length >= 12) return
  materials.push({
    id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'other',
    name: '',
    description: '',
    amount: '1',
    unit: '件',
  })
}

function removePatternMaterial(patternIndex: number, materialIndex: number) {
  form.items[patternIndex]?.materials.splice(materialIndex, 1)
}

async function saveCollection() {
  formError.value = ''
  if (!form.title.trim()) return void (formError.value = '请输入图集名称')
  if (form.status === 'published' && !form.images.length) return void (formError.value = '发布前请至少上传一张封面图片')
  if (form.status === 'published' && !form.items.length) return void (formError.value = '发布前请至少上传一张图纸')
  if (form.status === 'published' && form.items.some((item) => !item.image)) return void (formError.value = '发布前请为每张图纸上传图片')
  if (form.items.some((item) => !item.materials.length)) return void (formError.value = '请为每张图纸至少配置一项材料')
  if (form.items.some((item) => item.materials.some((material) => !material.name.trim() || !material.amount.trim() || !material.unit.trim()))) return void (formError.value = '请补齐材料名称、用量和单位')
  saving.value = true
  try {
    const result = await callAdmin<{ id: string; revision: number }>('saveCollection', { collectionId: editingId.value || creatingId.value, expectedRevision: editingId.value ? editingRevision.value : 0, collection: { ...form } })
    editingRevision.value = result.revision
    releaseAdminUploads([...sessionUploads])
    sessionUploads.clear()
    initialFormSnapshot.value = JSON.stringify(form)
    revokeObjectPreviews()
    editorOpen.value = false
    await loadCollections()
    showSuccess(editingId.value ? '图集已更新' : '图集已创建')
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function changeStatus(record: CollectionRecord) {
  if (isRecordBusy(record.id)) return
  const nextStatus = record.status === 'published' ? 'offline' : 'published'
  pendingRecordIds.value = [...pendingRecordIds.value, record.id]
  actionError.value = ''
  try {
    await callAdmin('updateStatus', { collectionId: record.id, status: nextStatus, expectedRevision: record.revision })
    await loadCollections()
    showSuccess(nextStatus === 'published' ? '图集已发布' : '图集已下架')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '状态更新失败'
    if (isAdminServiceError(error, 'CONFLICT')) await loadCollections()
  } finally {
    pendingRecordIds.value = pendingRecordIds.value.filter((id) => id !== record.id)
  }
}

async function archiveRecord(record: CollectionRecord) {
  if (isRecordBusy(record.id)) return
  if (!window.confirm(`确认归档“${record.title}”？归档后小程序将不再展示。`)) return
  pendingRecordIds.value = [...pendingRecordIds.value, record.id]
  actionError.value = ''
  try {
    await callAdmin('archiveCollection', { collectionId: record.id, expectedRevision: record.revision })
    await loadCollections()
    showSuccess('图集已归档')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '归档失败'
    if (isAdminServiceError(error, 'CONFLICT')) await loadCollections()
  } finally {
    pendingRecordIds.value = pendingRecordIds.value.filter((id) => id !== record.id)
  }
}

async function restoreRecord(record: CollectionRecord) {
  if (isRecordBusy(record.id) || record.status !== 'archived') return
  pendingRecordIds.value = [...pendingRecordIds.value, record.id]
  actionError.value = ''
  try {
    await callAdmin('updateStatus', { collectionId: record.id, status: 'offline', expectedRevision: record.revision })
    await loadCollections()
    showSuccess('图集已恢复为下架状态')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '图集恢复失败'
    if (isAdminServiceError(error, 'CONFLICT')) await loadCollections()
  } finally {
    pendingRecordIds.value = pendingRecordIds.value.filter((id) => id !== record.id)
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && editorOpen.value) void closeEditor()
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired)
  try {
    if (await hasLoginState()) await verifySession()
    else viewState.value = 'guest'
  } catch {
    await signOutAdmin().catch(() => undefined)
    viewState.value = 'guest'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired)
  window.clearTimeout(successTimer)
  window.clearTimeout(bookingFilterTimer)
  revokeObjectPreviews()
  revokeStorePreviews()
  void cleanupSessionUploads()
  void cleanupStoreSessionUploads()
})
</script>

<template>
  <main v-if="viewState === 'checking'" class="checking" aria-live="polite">
    <LoaderCircle class="spin" :size="24" />
    <span>正在检查登录状态</span>
  </main>

  <main v-else-if="viewState === 'guest'" class="login-page">
    <section class="login-panel" aria-labelledby="login-title">
      <div class="brand-mark">8</div>
      <p class="brand-name">星期八 · 拼豆</p>
      <h1 id="login-title">管理后台</h1>
      <p class="login-copy">登录后管理图集、教程、预约、会员与门店运营。</p>
      <form @submit.prevent="submitLogin" novalidate>
        <label for="username">管理员用户名</label>
        <input id="username" v-model="username" type="text" autocomplete="username" placeholder="请输入用户名" required />
        <label for="password">密码</label>
        <div class="password-field"><input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="请输入密码" required /><button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" :title="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></div>
        <p v-if="loginError" class="form-error" role="alert">{{ loginError }}</p>
        <button class="primary-btn login-btn" type="submit" :disabled="loginBusy || !username || !password">
          <LoaderCircle v-if="loginBusy" class="spin" :size="18" />
          <span>{{ loginBusy ? '正在登录' : '登录' }}</span>
        </button>
      </form>
    </section>
  </main>

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand"><span class="brand-mark small">8</span><strong>星期八</strong></div>
      <nav aria-label="后台导航">
        <button class="nav-item" :class="{ active: currentView === 'overview' }" @click="loadAdminView('overview')"><Gauge :size="19" /><span>运营概览</span></button>
        <button class="nav-item" :class="{ active: currentView === 'collections' }" @click="loadAdminView('collections')"><LayoutGrid :size="19" /><span>图集管理</span></button>
        <button class="nav-item" :class="{ active: currentView === 'bookings' }" @click="loadAdminView('bookings')"><CalendarDays :size="19" /><span>预约管理</span></button>
        <button class="nav-item" :class="{ active: currentView === 'users' }" @click="loadAdminView('users')"><Users :size="19" /><span>用户会员</span></button>
        <button class="nav-item" :class="{ active: currentView === 'works' }" @click="loadAdminView('works')"><Palette :size="19" /><span>用户作品</span></button>
        <button class="nav-item" :class="{ active: currentView === 'tutorials' }" @click="loadAdminView('tutorials')"><BookOpenText :size="19" /><span>教程内容</span></button>
        <button class="nav-item" :class="{ active: currentView === 'settings' }" @click="loadAdminView('settings')"><Settings2 :size="19" /><span>运营配置</span></button>
        <button v-if="adminRole === 'owner'" class="nav-item" :class="{ active: currentView === 'audits' }" @click="loadAdminView('audits')"><ShieldCheck :size="19" /><span>操作日志</span></button>
      </nav>
      <div class="sidebar-user">
        <div><strong>{{ adminName }}</strong><span>{{ adminRole === 'owner' ? '店主' : '内容管理员' }}</span></div>
        <button class="icon-btn" aria-label="退出登录" title="退出登录" @click="logout"><LogOut :size="19" /></button>
      </div>
    </aside>

    <p v-if="successMessage" class="toast" role="status" aria-live="polite">{{ successMessage }}</p>

    <OverviewView v-if="currentView === 'overview'" @navigate="loadAdminView" />

    <main v-else-if="currentView === 'collections'" class="workspace">
      <header class="workspace-head">
        <div><p>内容管理</p><h1>图集</h1></div>
        <button class="primary-btn" @click="openCreate"><Plus :size="18" /><span>新建图集</span></button>
      </header>

      <section class="toolbar" aria-label="图集筛选">
        <div class="search-box"><Search :size="18" /><input v-model="searchText" aria-label="搜索图集" placeholder="搜索图集或分类" /></div>
        <select v-model="levelFilter" aria-label="会员等级筛选"><option value="全部">全部等级</option><option v-for="level in levels" :key="level" :value="level">{{ level }}</option></select>
        <select v-model="statusFilter" aria-label="发布状态筛选"><option value="全部">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="offline">已下架</option><option value="archived">已归档</option></select>
      </section>

      <p v-if="actionError" class="notice error" role="alert">{{ actionError }} <button @click="loadCollections">重试</button></p>
      <section class="table-surface" aria-label="图集列表">
        <div class="table-head"><span>图集</span><span>等级</span><span>状态</span><span>图纸</span><span>排序</span><span>操作</span></div>
        <div v-if="loading" class="empty-state"><LoaderCircle class="spin" :size="22" /><span>正在加载图集</span></div>
        <div v-else-if="!filteredCollections.length" class="empty-state"><ImageIcon :size="28" /><strong>没有符合条件的图集</strong><span>调整筛选条件或新建一个图集。</span></div>
        <article v-for="record in filteredCollections" :key="record.id" class="table-row">
          <div class="collection-cell">
            <div class="thumb"><img v-if="record.previewImages?.[0]" :src="record.previewImages[0]" :alt="`${record.title}封面`" /><ImageIcon v-else :size="22" /></div>
            <div><strong>{{ record.title }}</strong><span>{{ record.category }} · {{ record.description || '暂无说明' }}</span></div>
          </div>
          <span class="level-tag">{{ record.level }}</span>
          <span class="status" :class="record.status"><i></i>{{ statusLabel(record.status) }}</span>
          <span class="number">{{ record.count }}</span>
          <span class="number">{{ record.sort }}</span>
          <div class="row-actions">
            <button v-if="record.status !== 'archived'" class="icon-btn" aria-label="编辑图集" title="编辑" :disabled="isRecordBusy(record.id)" @click="openEdit(record)"><Edit3 :size="18" /></button>
            <button v-if="record.status !== 'archived'" class="icon-btn" :aria-label="record.status === 'published' ? '下架图集' : '发布图集'" :title="record.status === 'published' ? '下架' : '发布'" :disabled="isRecordBusy(record.id)" @click="changeStatus(record)"><LoaderCircle v-if="isRecordBusy(record.id)" class="spin" :size="18" /><EyeOff v-else-if="record.status === 'published'" :size="18" /><Eye v-else :size="18" /></button>
            <button v-if="record.status !== 'archived'" class="icon-btn danger" aria-label="归档图集" title="归档" :disabled="isRecordBusy(record.id)" @click="archiveRecord(record)"><Archive :size="18" /></button>
            <button v-else class="icon-btn" aria-label="恢复图集" title="恢复为已下架" :disabled="isRecordBusy(record.id)" @click="restoreRecord(record)"><LoaderCircle v-if="isRecordBusy(record.id)" class="spin" :size="18" /><ArchiveRestore v-else :size="18" /></button>
          </div>
        </article>
      </section>
      <p class="result-count">共 {{ filteredCollections.length }} 个图集</p>
    </main>

    <main v-else-if="currentView === 'bookings'" class="workspace">
      <header class="workspace-head"><div><p>门店运营</p><h1>预约</h1></div><button class="secondary-btn" :disabled="bookingLoading" @click="loadBookings(true)">刷新列表</button></header>
      <section class="toolbar booking-toolbar" aria-label="预约筛选">
        <div class="search-box"><Search :size="18" /><input v-model="bookingKeyword" aria-label="搜索预约" placeholder="搜索手机号、日期或体验类型" /></div>
        <select v-model="bookingStatusFilter" aria-label="预约状态筛选"><option value="全部">全部状态</option><option value="pending">待确认</option><option value="confirmed">已确认</option><option value="cancelled">已取消</option></select>
      </section>
      <p v-if="bookingError" class="notice error" role="alert">{{ bookingError }} <button @click="loadBookings(true)">重试</button></p>
      <section class="table-surface booking-table" aria-label="预约列表">
        <div class="booking-head"><span>日期与时段</span><span>体验类型</span><span>联系用户</span><span>状态</span><span>操作</span></div>
        <div v-if="bookingLoading" class="empty-state"><LoaderCircle class="spin" :size="22" /><span>正在加载预约</span></div>
        <div v-else-if="!filteredBookings.length" class="empty-state"><CalendarDays :size="28" /><strong>没有符合条件的预约</strong><span>调整筛选条件后再试。</span></div>
        <article v-for="record in filteredBookings" :key="record.id" class="booking-row">
          <div class="booking-time"><strong>{{ record.date }}</strong><span>{{ record.timeSlot }}</span></div>
          <strong>{{ record.experienceType }}</strong>
          <div class="booking-contact"><span>{{ record.phone || record.phoneMasked }}</span><button v-if="record.phone" class="icon-btn" aria-label="复制手机号" title="复制手机号" @click="copyBookingPhone(record.phone || '')"><Copy :size="16" /></button></div>
          <span class="status" :class="record.status"><i></i>{{ bookingStatusLabel(record.status) }}</span>
          <div class="booking-actions">
            <button v-if="record.status !== 'confirmed'" class="text-action confirm" :disabled="isBookingBusy(record.id)" @click="updateBooking(record, 'confirmed')"><CheckCircle2 :size="16" />确认</button>
            <button v-if="record.status !== 'cancelled'" class="text-action danger" :disabled="isBookingBusy(record.id)" @click="updateBooking(record, 'cancelled')">取消</button>
            <button v-if="record.status === 'cancelled'" class="text-action" :disabled="isBookingBusy(record.id)" @click="updateBooking(record, 'pending')">恢复</button>
          </div>
        </article>
      </section>
      <div class="pagination-row">
        <p class="result-count">已加载 {{ bookings.length }} / {{ bookingTotal }} 条，当前筛选 {{ filteredBookings.length }} 条</p>
        <button v-if="bookingHasMore" class="secondary-btn" :disabled="bookingLoadingMore" @click="loadMoreBookings"><LoaderCircle v-if="bookingLoadingMore" class="spin" :size="17" />{{ bookingLoadingMore ? '正在加载' : '加载更多' }}</button>
      </div>
    </main>

    <UsersView v-else-if="currentView === 'users'" :admin-role="adminRole" @dirty-change="activeChildDirty = $event" />

    <WorksView v-else-if="currentView === 'works'" :admin-role="adminRole" />

    <TutorialsView v-else-if="currentView === 'tutorials'" @dirty-change="activeChildDirty = $event" />

    <AuditLogsView v-else-if="currentView === 'audits'" />

    <main v-else class="workspace settings-workspace">
      <header class="workspace-head"><div><p>业务规则</p><h1>运营配置</h1></div><span class="role-badge">{{ adminRole === 'owner' ? '店主可编辑' : '只读' }}</span></header>
      <p v-if="configError" class="notice error" role="alert">{{ configError }} <button @click="loadConfigs">重新加载</button></p>
      <div v-if="configLoading" class="settings-loading"><LoaderCircle class="spin" :size="22" />正在加载配置</div>
      <div v-else class="settings-stack">
        <section class="settings-section" aria-labelledby="member-settings-title">
          <header><div><p>会员体系</p><h2 id="member-settings-title">等级与奖励</h2></div><select v-model="memberConfig.status" :disabled="adminRole !== 'owner'" aria-label="会员配置状态"><option value="draft">内测草稿</option><option value="published">正式发布</option></select></header>
          <div class="tier-config-list">
            <fieldset v-for="(tier, index) in memberConfig.levels" :key="tier.code" class="tier-config"><legend>{{ tier.code }}</legend><div class="field-grid"><div class="field"><label :for="`tier-title-${index}`">等级名称</label><input :id="`tier-title-${index}`" v-model="tier.title" :disabled="adminRole !== 'owner'" maxlength="20" /></div><div class="field"><label :for="`tier-threshold-${index}`">成长值门槛</label><input :id="`tier-threshold-${index}`" v-model.number="tier.threshold" :disabled="adminRole !== 'owner'" type="number" min="0" /></div></div><div class="field"><label :for="`tier-description-${index}`">等级说明</label><input :id="`tier-description-${index}`" v-model="tier.description" :disabled="adminRole !== 'owner'" maxlength="80" /></div><div class="field"><label :for="`tier-benefits-${index}`">权益（每行一条）</label><textarea :id="`tier-benefits-${index}`" :value="tier.benefits.join('\n')" :disabled="adminRole !== 'owner'" rows="3" @input="updateBenefits(index, $event)"></textarea></div></fieldset>
          </div>
          <div class="reward-grid"><div class="field"><label for="bind-points">绑定手机号积分</label><input id="bind-points" v-model.number="memberConfig.rewards.bindPhonePoints" :disabled="adminRole !== 'owner'" type="number" min="0" /></div><div class="field"><label for="bind-growth">绑定成长值</label><input id="bind-growth" v-model.number="memberConfig.rewards.bindPhoneGrowth" :disabled="adminRole !== 'owner'" type="number" min="0" /></div><div class="field"><label for="work-points">新作品积分</label><input id="work-points" v-model.number="memberConfig.rewards.createWorkPoints" :disabled="adminRole !== 'owner'" type="number" min="0" /></div><div class="field"><label for="work-growth">新作品成长值</label><input id="work-growth" v-model.number="memberConfig.rewards.createWorkGrowth" :disabled="adminRole !== 'owner'" type="number" min="0" /></div><div class="field"><label for="work-daily-limit">每日奖励作品数</label><input id="work-daily-limit" v-model.number="memberConfig.rewards.createWorkDailyLimit" :disabled="adminRole !== 'owner'" type="number" min="0" max="100" /><small>超过后仍可保存作品，但不再发放奖励</small></div></div>
          <footer><button class="primary-btn" :disabled="adminRole !== 'owner' || memberSaving || memberSnapshot() === initialMemberSnapshot" @click="saveMembership"><LoaderCircle v-if="memberSaving" class="spin" :size="18" /><Save v-else :size="18" />保存会员配置</button></footer>
        </section>

        <section class="settings-section" aria-labelledby="store-settings-title">
          <header><div><p>线下门店</p><h2 id="store-settings-title">门店与预约</h2></div><select v-model="storeConfig.status" :disabled="adminRole !== 'owner'" aria-label="门店配置状态"><option value="draft">内测草稿</option><option value="published">正式发布</option></select></header>
          <div class="store-gallery-field">
            <div class="store-gallery-head"><div><strong>门店实景图</strong><small>用于小程序门店图册，最多 6 张，支持 JPEG、PNG、WebP，单张不超过 8MB。</small></div><span>{{ storeConfig.photos.length }}/6</span></div>
            <div class="store-image-grid">
              <div v-for="(preview, index) in storeImagePreviews" :key="storeConfig.photos[index]" class="store-image-preview"><img v-if="preview" :src="preview" :alt="`门店实景图 ${index + 1}`" /><ImageIcon v-else :size="24" /><button type="button" class="icon-btn danger store-image-delete" :aria-label="`删除第 ${index + 1} 张门店图片`" title="删除图片" :disabled="adminRole !== 'owner' || storeUploading" @click="removeStoreImage(index)"><X :size="18" /></button><div class="store-image-order"><button type="button" class="icon-btn" :aria-label="`将第 ${index + 1} 张图片前移`" title="前移" :disabled="adminRole !== 'owner' || storeUploading || index === 0" @click="moveStoreImage(index, -1)"><ChevronLeft :size="18" /></button><button type="button" class="icon-btn" :aria-label="`将第 ${index + 1} 张图片后移`" title="后移" :disabled="adminRole !== 'owner' || storeUploading || index === storeConfig.photos.length - 1" @click="moveStoreImage(index, 1)"><ChevronRight :size="18" /></button></div></div>
              <label v-if="storeConfig.photos.length < 6 && adminRole === 'owner'" class="store-image-upload"><UploadCloud :size="24" /><span>{{ storeUploading ? `上传中 ${storeUploadProgress}%` : '上传实景图' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="storeUploading" @change="handleStoreFiles" /></label>
            </div>
          </div>
          <div class="settings-grid"><div class="field"><label for="store-name">门店名称</label><input id="store-name" v-model="storeConfig.name" :disabled="adminRole !== 'owner'" maxlength="40" /></div><div class="field"><label for="store-city">城市</label><input id="store-city" v-model="storeConfig.city" :disabled="adminRole !== 'owner'" maxlength="20" /></div><div class="field wide"><label for="store-address">详细地址</label><input id="store-address" v-model="storeConfig.address" :disabled="adminRole !== 'owner'" maxlength="100" /></div><div class="field"><label for="store-phone">联系电话</label><input id="store-phone" v-model="storeConfig.phone" :disabled="adminRole !== 'owner'" maxlength="20" /></div><div class="field"><label for="store-hours">营业时间</label><input id="store-hours" v-model="storeConfig.businessHours" :disabled="adminRole !== 'owner'" maxlength="60" /></div><div class="field"><label for="store-latitude">纬度</label><input id="store-latitude" v-model.number="storeConfig.latitude" :disabled="adminRole !== 'owner'" type="number" step="0.000001" /></div><div class="field"><label for="store-longitude">经度</label><input id="store-longitude" v-model.number="storeConfig.longitude" :disabled="adminRole !== 'owner'" type="number" step="0.000001" /></div><div class="field"><label for="advance-days">可提前预约天数</label><input id="advance-days" v-model.number="storeConfig.maxAdvanceDays" :disabled="adminRole !== 'owner'" type="number" min="1" max="90" /></div><div class="field"><label for="slot-capacity">每时段容量</label><input id="slot-capacity" v-model.number="storeConfig.capacityPerSlot" :disabled="adminRole !== 'owner'" type="number" min="1" max="50" /></div><div class="field"><label for="experience-types">体验类型（每行一条）</label><textarea id="experience-types" v-model="experienceTypesText" :disabled="adminRole !== 'owner'" rows="4"></textarea></div><div class="field"><label for="time-slots">可预约时段（每行一条）</label><textarea id="time-slots" v-model="timeSlotsText" :disabled="adminRole !== 'owner'" rows="4"></textarea></div></div>
          <label class="toggle-row"><input v-model="storeConfig.bookingEnabled" :disabled="adminRole !== 'owner'" type="checkbox" /><span><strong>开启线上预约</strong><small>关闭后小程序保留门店展示，但无法提交新预约。</small></span></label>
          <footer><button class="primary-btn" :disabled="adminRole !== 'owner' || storeSaving || storeUploading || storeSnapshot() === initialStoreSnapshot" @click="saveStore"><LoaderCircle v-if="storeSaving" class="spin" :size="18" /><Save v-else :size="18" />保存门店配置</button></footer>
        </section>
      </div>
    </main>

    <div v-if="editorOpen" class="drawer-layer" @mousedown.self="closeEditor">
      <section class="editor-drawer" role="dialog" aria-modal="true" :aria-label="editingId ? '编辑图集' : '新建图集'">
        <header><div><p>{{ editingId ? '编辑内容' : '创建内容' }}</p><h2>{{ editingId ? '编辑图集' : '新建图集' }}</h2></div><button class="icon-btn" aria-label="关闭" @click="closeEditor"><X :size="21" /></button></header>
        <div class="editor-body">
          <div class="field"><label for="title">图集名称</label><input id="title" v-model="form.title" maxlength="40" placeholder="例如：武汉漫游" /></div>
          <div class="field-grid">
            <div class="field"><label for="category">分类</label><select id="category" v-model="form.category"><option v-for="category in categories" :key="category" :value="category">{{ category }}</option></select></div>
            <div class="field"><label for="level">访问等级</label><select id="level" v-model="form.level"><option v-for="level in levels" :key="level" :value="level">{{ level }}</option></select></div>
          </div>
          <div class="field"><label for="description">简介</label><textarea id="description" v-model="form.description" maxlength="120" rows="3" placeholder="简单描述这个系列"></textarea><small>{{ form.description.length }}/120</small></div>
          <fieldset class="field upload-field"><legend>封面图片</legend><p>最多 4 张，支持 JPEG、PNG、WebP，单张不超过 8MB。</p><div class="preview-grid"><div v-for="(preview, index) in imagePreviews" :key="form.images[index]" class="preview"><img :src="preview" alt="图集封面预览" /><button type="button" aria-label="移除图片" @click="removeImage(index)"><X :size="12" /></button><div class="preview-order"><button type="button" :aria-label="`将第 ${index + 1} 张封面前移`" :disabled="uploading || index === 0" @click="moveImage(index, -1)"><ChevronLeft :size="12" /></button><button type="button" :aria-label="`将第 ${index + 1} 张封面后移`" :disabled="uploading || index === form.images.length - 1" @click="moveImage(index, 1)"><ChevronRight :size="12" /></button></div></div><label v-if="form.images.length < 4" class="upload-tile"><UploadCloud :size="22" /><span>{{ uploading ? `上传中 ${uploadProgress}%` : '上传图片' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="uploading" @change="handleFiles" /></label></div></fieldset>
          <fieldset class="field pattern-field">
            <legend>系列图纸</legend>
            <p>每张图纸可独立配置名称、图片和材料清单，支持一次选择多张。</p>
            <label class="pattern-upload"><UploadCloud :size="19" /><span>{{ uploading ? `上传中 ${uploadProgress}%` : '上传图纸图片' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="uploading" @change="handlePatternFiles" /></label>
            <div v-if="form.items.length" class="pattern-list">
              <div v-for="(pattern, index) in form.items" :key="pattern.id" class="pattern-card">
                <div class="pattern-row">
                  <div class="pattern-thumb"><img v-if="patternPreviews[pattern.id]" :src="patternPreviews[pattern.id]" alt="图纸预览" /><ImageIcon v-else :size="20" /></div>
                  <input v-model="pattern.name" :aria-label="`第 ${index + 1} 张图纸名称`" maxlength="40" />
                  <span>{{ index + 1 }}</span>
                  <div class="pattern-order"><button type="button" class="icon-btn" :aria-label="`将第 ${index + 1} 张图纸上移`" :disabled="uploading || index === 0" @click="movePattern(index, -1)"><ChevronUp :size="17" /></button><button type="button" class="icon-btn" :aria-label="`将第 ${index + 1} 张图纸下移`" :disabled="uploading || index === form.items.length - 1" @click="movePattern(index, 1)"><ChevronDown :size="17" /></button></div>
                  <button type="button" class="icon-btn danger" aria-label="移除图纸" @click="removePattern(index)"><X :size="18" /></button>
                </div>
                <div class="pattern-material-editor">
                  <div class="material-editor-head"><div><strong>材料清单</strong><small>{{ pattern.materials.length }} 项</small></div><button type="button" :disabled="pattern.materials.length >= 12" @click="addPatternMaterial(index)"><Plus :size="15" />添加材料</button></div>
                  <div v-if="pattern.materials.length" class="material-config-list">
                    <div v-for="(material, materialIndex) in pattern.materials" :key="material.id" class="material-config-row">
                      <select v-model="material.kind" :aria-label="`第 ${index + 1} 张图纸第 ${materialIndex + 1} 项材料类型`"><option value="board">底板</option><option value="beads">拼豆</option><option value="paper">烫纸</option><option value="other">其他</option></select>
                      <input v-model="material.name" :aria-label="`第 ${index + 1} 张图纸第 ${materialIndex + 1} 项材料名称`" maxlength="40" placeholder="材料名称" />
                      <div class="material-amount"><input v-model="material.amount" :aria-label="`第 ${index + 1} 张图纸第 ${materialIndex + 1} 项材料用量`" maxlength="16" placeholder="用量" /><input v-model="material.unit" :aria-label="`第 ${index + 1} 张图纸第 ${materialIndex + 1} 项材料单位`" maxlength="8" placeholder="单位" /></div>
                      <button type="button" class="icon-btn danger" :aria-label="`删除第 ${materialIndex + 1} 项材料`" @click="removePatternMaterial(index, materialIndex)"><X :size="16" /></button>
                      <input v-model="material.description" class="material-description" :aria-label="`第 ${index + 1} 张图纸第 ${materialIndex + 1} 项材料说明`" maxlength="60" placeholder="材料说明（选填）" />
                    </div>
                  </div>
                  <div v-else class="material-config-empty">尚未配置材料，请至少添加一项。</div>
                </div>
              </div>
            </div>
            <div v-else class="pattern-empty">尚未上传图纸。草稿可以暂时为空，发布前必须补齐。</div>
          </fieldset>
          <div class="field-grid">
            <div class="field"><label for="status">状态</label><select id="status" v-model="form.status"><option v-for="status in statuses" :key="status.value" :value="status.value">{{ status.label }}</option></select></div>
            <div class="field"><label for="sort">排序</label><input id="sort" v-model.number="form.sort" type="number" min="0" step="1" /></div>
          </div>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        </div>
        <footer><button class="secondary-btn" :disabled="saving || uploading" @click="closeEditor">取消</button><button class="primary-btn" :disabled="saving || uploading" @click="saveCollection"><LoaderCircle v-if="saving" class="spin" :size="18" /><Save v-else :size="18" /><span>{{ saving ? '保存中' : '保存图集' }}</span></button></footer>
      </section>
    </div>
  </div>
</template>
