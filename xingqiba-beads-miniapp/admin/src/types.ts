export type MemberLevel = '公开' | 'V1' | 'V2' | 'V3' | 'V4'
export type CollectionStatus = 'draft' | 'published' | 'offline' | 'archived'

export type PatternMaterialKind = 'board' | 'beads' | 'paper' | 'other'

export interface PatternMaterialInput {
  id: string
  kind: PatternMaterialKind
  name: string
  description: string
  amount: string
  unit: string
}

export interface PatternInput {
  id: string
  name: string
  image: string
  materials: PatternMaterialInput[]
}

export interface CollectionRecord {
  id: string
  revision: number
  title: string
  category: string
  description: string
  level: MemberLevel
  status: CollectionStatus
  images: string[]
  previewImages?: string[]
  items: PatternInput[]
  count: number
  background: string
  sort: number
}

export interface CollectionInput {
  title: string
  category: string
  description: string
  level: MemberLevel
  status: Exclude<CollectionStatus, 'archived'>
  images: string[]
  items: PatternInput[]
  background: string
  sort: number
}

export interface AdminResult<T = unknown> {
  success: boolean
  data?: T
  code?: string
  message?: string
}

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string
  hasMore: boolean
  total: number
}

export interface AdminAuditRecord {
  id: string
  action: string
  targetId: string
  operatorId: string
  operatorName: string
  before: Record<string, string | number | boolean | null> | null
  after: Record<string, string | number | boolean | null> | null
  createdAt: number
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export interface BookingRecord {
  id: string
  userId: string
  phone?: string
  phoneMasked: string
  date: string
  experienceType: string
  timeSlot: string
  status: BookingStatus
  createdAt: number
}

export interface MemberTierConfig {
  code: 'V1' | 'V2' | 'V3' | 'V4'
  title: string
  threshold: number
  description: string
  benefits: string[]
}

export interface MemberConfig {
  status: 'draft' | 'published'
  version: number
  revision: number
  levels: MemberTierConfig[]
  rewards: {
    bindPhonePoints: number
    bindPhoneGrowth: number
    createWorkPoints: number
    createWorkGrowth: number
    createWorkDailyLimit: number
  }
}

export interface StoreConfig {
  status: 'draft' | 'published'
  revision: number
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
  capacityPerSlot: number
  experienceTypes: string[]
  timeSlots: string[]
}

export interface OperationsConfig {
  membership: MemberConfig | null
  store: StoreConfig | null
}

export interface DashboardData {
  totals: {
    collections: number
    users: number
    members: number
    works: number
    bookings: number
    todayBookings: number
    pendingBookings: number
  }
  levelCounts: Record<'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4', number>
  upcomingBookings: Array<Pick<BookingRecord, 'id' | 'date' | 'timeSlot' | 'experienceType' | 'status' | 'phoneMasked'>>
}

export interface AdminUserRecord {
  id: string
  phoneMasked: string
  phoneBound: boolean
  status: 'active' | 'suspended'
  level: 'PUBLIC' | 'V1' | 'V2' | 'V3' | 'V4'
  growth: number
  points: number
  favorites: number
  works: number
  bookings: number
  createdAt: number
}

export interface AdminWorkRecord {
  id: string
  version: number
  title: string
  previewFileId: string
  previewUrl?: string
  phoneMasked: string
  userId: string
  sourceCollectionId: string
  sourcePatternId: string
  gridSize: number
  colorCount: number
  previewMode: 'beads' | 'grid'
  updatedAt: number
}

export interface TutorialSection {
  id: string
  title: string
  duration: string
  image: string
  imagePreview?: string
  steps: string[]
}

export interface TutorialConfig {
  status: 'draft' | 'published'
  revision: number
  title: string
  subtitle: string
  safetyNote: string
  sections: TutorialSection[]
}
