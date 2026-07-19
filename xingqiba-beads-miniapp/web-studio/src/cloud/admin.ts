import cloudbase from '@cloudbase/js-sdk'

export const CLOUD_ENV_ID = 'cloud1-d6gtwjvgqe576cbf0'

const PENDING_UPLOADS_KEY = 'xingqiba-studio-pending-uploads'
const LAST_TARGET_KEY = 'xingqiba-studio-last-collection'
const COLLECTION_UPLOAD_PATH = '/admin/collections/'

export const cloudApp = cloudbase.init({ env: CLOUD_ENV_ID })
export const cloudAuth = cloudApp.auth({ persistence: 'local' })

export type CollectionLevel = '公开' | 'V1' | 'V2' | 'V3' | 'V4'
export type CollectionStatus = 'draft' | 'published' | 'offline' | 'archived'

export interface AdminSession {
  name: string
  role: string
}

export interface CollectionSummary {
  id: string
  revision: number
  title: string
  category: string
  description: string
  level: CollectionLevel
  status: CollectionStatus
  images: string[]
  count: number
}

export interface ImportPatternResult {
  collectionId: string
  patternId: string
  revision: number
  count: number
  coverAdded: boolean
  created: boolean
  status: CollectionStatus
}

interface AdminResult<T> {
  success: boolean
  data?: T
  code?: string
  message?: string
}

export class AdminServiceError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AdminServiceError'
    this.code = code
  }
}

export function isAdminServiceError(error: unknown, code: string): error is AdminServiceError {
  return error instanceof AdminServiceError && error.code === code
}

export async function signInAdmin(username: string, password: string) {
  const response = await cloudAuth.signInWithPassword({ username, password })
  if (response.error) throw new Error(response.error.message || '登录失败')
  return response.data
}

export async function signOutAdmin() {
  await cloudAuth.signOut()
}

export async function hasLoginState() {
  return Boolean(await cloudAuth.getLoginState())
}

export async function callAdmin<T>(action: string, data: Record<string, unknown> = {}) {
  const response = await cloudApp.callFunction({
    name: 'adminService',
    data: { action, ...data },
    parse: true,
  })
  const result = response.result as AdminResult<T>
  if (!result?.success) throw new AdminServiceError(result?.code || 'UNKNOWN_ERROR', result?.message || '操作失败')
  return result.data as T
}

export async function verifyAdminSession() {
  return callAdmin<AdminSession>('session')
}

function isCollectionUpload(fileId: unknown): fileId is string {
  return typeof fileId === 'string' && fileId.length <= 500 && fileId.includes(COLLECTION_UPLOAD_PATH)
}

function readPendingUploads() {
  try {
    const value = JSON.parse(window.localStorage.getItem(PENDING_UPLOADS_KEY) || '[]')
    return Array.isArray(value) ? [...new Set(value.filter(isCollectionUpload))] : []
  } catch {
    return []
  }
}

function writePendingUploads(fileIds: string[]) {
  try {
    const uniqueIds = [...new Set(fileIds.filter(isCollectionUpload))]
    if (uniqueIds.length) window.localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uniqueIds))
    else window.localStorage.removeItem(PENDING_UPLOADS_KEY)
  } catch {
    // 存储不可用时上传仍可继续，服务端引用检查会兜底清理。
  }
}

function trackUpload(fileId: string) {
  writePendingUploads([...readPendingUploads(), fileId])
}

export function releaseUploads(fileIds: string[]) {
  const released = new Set(fileIds.filter(isCollectionUpload))
  if (!released.size) return
  writePendingUploads(readPendingUploads().filter((fileId) => !released.has(fileId)))
}

export async function cleanupPendingUploads() {
  const pending = readPendingUploads()
  for (let index = 0; index < pending.length; index += 20) {
    const fileList = pending.slice(index, index + 20)
    await callAdmin('deleteFiles', { fileList })
    releaseUploads(fileList)
  }
}

export async function deleteUploadedPattern(fileId: string) {
  try {
    await callAdmin('deleteFiles', { fileList: [fileId] })
    releaseUploads([fileId])
  } catch {
    // 删除失败时保留待清理记录，下次进入导入流程会重试。
  }
}

export async function uploadPatternImage(blob: Blob, onProgress: (progress: number) => void) {
  if (blob.size > 8 * 1024 * 1024) throw new Error('图纸图片超过 8MB，请缩小图纸宽度后重试')
  const extension = blob.type === 'image/webp' ? 'webp' : 'png'
  const cloudPath = `admin/collections/studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const result = await cloudApp.uploadFile({
    cloudPath,
    filePath: blob as unknown as string,
    onUploadProgress: (event: { loaded: number; total?: number }) => {
      const total = event.total || 1
      onProgress(Math.round((event.loaded / total) * 100))
    },
  })
  trackUpload(result.fileID)
  return result.fileID
}

export async function resolveImageUrls(fileIds: string[]) {
  const cloudIds = [...new Set(fileIds.filter((item) => item.startsWith('cloud://')))]
  const urlMap = new Map<string, string>()
  for (let index = 0; index < cloudIds.length; index += 50) {
    const result = await cloudApp.getTempFileURL({ fileList: cloudIds.slice(index, index + 50) })
    ;(result.fileList || []).forEach((item) => {
      if (item.tempFileURL) urlMap.set(item.fileID, item.tempFileURL)
    })
  }
  return urlMap
}

export function readLastTargetCollection() {
  try {
    const value = window.localStorage.getItem(LAST_TARGET_KEY) || ''
    return value.length <= 80 ? value : ''
  } catch {
    return ''
  }
}

export function writeLastTargetCollection(collectionId: string) {
  try {
    if (collectionId) window.localStorage.setItem(LAST_TARGET_KEY, collectionId)
  } catch {
    // 无法记忆上次目标时不影响导入流程。
  }
}
