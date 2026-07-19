import cloudbase from '@cloudbase/js-sdk'
import type { AdminResult } from './types'

export const CLOUD_ENV_ID = 'cloud1-d6gtwjvgqe576cbf0'
export const ADMIN_AUTH_EXPIRED_EVENT = 'xingqiba-admin-auth-expired'

export const cloudApp = cloudbase.init({ env: CLOUD_ENV_ID })
export const cloudAuth = cloudApp.auth({ persistence: 'local' })
const IMAGE_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const PENDING_UPLOADS_KEY = 'xingqiba-pending-admin-uploads'
const ADMIN_UPLOAD_PATHS = ['/admin/collections/', '/admin/tutorials/', '/admin/store/']

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

export function validateAdminImage(file: File) {
  if (!IMAGE_EXTENSIONS[file.type]) throw new Error('仅支持 JPEG、PNG 或 WebP 图片')
  if (file.size > 8 * 1024 * 1024) throw new Error('单张图片不能超过 8MB')
}

async function optimizeAdminImage(file: File) {
  if (typeof createImageBitmap !== 'function') return file
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const maxDimension = 2000
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    if (scale === 1 && file.type === 'image/webp' && file.size <= 2 * 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
    if (!blob || blob.size >= file.size && scale === 1) return file
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`
    return new File([blob], name, { type: 'image/webp', lastModified: file.lastModified })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
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
  if (!result?.success) {
    const code = result?.code || 'UNKNOWN_ERROR'
    const message = result?.message || '操作失败'
    if (code === 'UNAUTHORIZED' || (code === 'FORBIDDEN' && message === '该账号没有管理权限')) {
      window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT))
    }
    throw new AdminServiceError(code, message)
  }
  return result.data as T
}

function isAdminUpload(fileId: unknown): fileId is string {
  return typeof fileId === 'string' && fileId.length <= 500 && ADMIN_UPLOAD_PATHS.some((path) => fileId.includes(path))
}

function readPendingAdminUploads() {
  try {
    const value = JSON.parse(window.localStorage.getItem(PENDING_UPLOADS_KEY) || '[]')
    return Array.isArray(value) ? [...new Set(value.filter(isAdminUpload))] : []
  } catch {
    return []
  }
}

function writePendingAdminUploads(fileIds: string[]) {
  try {
    const uniqueIds = [...new Set(fileIds.filter(isAdminUpload))]
    if (uniqueIds.length) window.localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uniqueIds))
    else window.localStorage.removeItem(PENDING_UPLOADS_KEY)
  } catch {
    // Uploads still work when storage is unavailable; server-side reference checks remain authoritative.
  }
}

function trackAdminUpload(fileId: string) {
  writePendingAdminUploads([...readPendingAdminUploads(), fileId])
}

export function releaseAdminUploads(fileIds: string[]) {
  const released = new Set(fileIds.filter(isAdminUpload))
  if (!released.size) return
  writePendingAdminUploads(readPendingAdminUploads().filter((fileId) => !released.has(fileId)))
}

export async function cleanupPendingAdminUploads() {
  const pending = readPendingAdminUploads()
  for (let index = 0; index < pending.length; index += 20) {
    const fileList = pending.slice(index, index + 20)
    await callAdmin('deleteFiles', { fileList })
    releaseAdminUploads(fileList)
  }
}

export async function uploadAdminImage(file: File, folder: 'collections' | 'tutorials' | 'store', onProgress: (progress: number) => void) {
  validateAdminImage(file)
  const uploadFile = await optimizeAdminImage(file)
  validateAdminImage(uploadFile)
  const extension = IMAGE_EXTENSIONS[uploadFile.type]
  const cloudPath = `admin/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const result = await cloudApp.uploadFile({
    cloudPath,
    filePath: uploadFile as unknown as string,
    onUploadProgress: (event: { loaded: number; total?: number }) => {
      const total = event.total || 1
      onProgress(Math.round((event.loaded / total) * 100))
    },
  })
  trackAdminUpload(result.fileID)
  return result.fileID
}

export function uploadCollectionImage(file: File, onProgress: (progress: number) => void) {
  return uploadAdminImage(file, 'collections', onProgress)
}

export function uploadStoreImage(file: File, onProgress: (progress: number) => void) {
  return uploadAdminImage(file, 'store', onProgress)
}

export async function resolveImageUrls(fileIds: string[]) {
  const cloudIds = [...new Set(fileIds.filter((item) => item.startsWith('cloud://')))]
  if (!cloudIds.length) return new Map<string, string>()
  const urlMap = new Map<string, string>()
  for (let index = 0; index < cloudIds.length; index += 50) {
    const result = await cloudApp.getTempFileURL({ fileList: cloudIds.slice(index, index + 50) })
    ;(result.fileList || []).forEach((item) => {
      if (item.tempFileURL) urlMap.set(item.fileID, item.tempFileURL)
    })
  }
  return urlMap
}
