import { CLOUD_FUNCTIONS } from '../config/cloud'

const PENDING_WORK_UPLOADS_KEY = 'xingqiba-pending-work-uploads'

interface CloudResult<T> {
  success: boolean
  data?: T
  code?: string
  message?: string
}

export class CloudServiceError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CloudServiceError'
    this.code = code
  }
}

export function isCloudServiceError(error: unknown, code: string): error is CloudServiceError {
  return error instanceof CloudServiceError && error.code === code
}

export async function callUserService<T>(action: string, data: Record<string, unknown> = {}) {
  const response = await wx.cloud.callFunction({
    name: CLOUD_FUNCTIONS.userService,
    data: { action, ...data },
  })
  const result = response.result as CloudResult<T>
  if (!result?.success) throw new CloudServiceError(result?.code || 'UNKNOWN_ERROR', result?.message || '操作失败')
  return result.data as T
}

interface PendingWorkUpload {
  userId: string
  fileId: string
}

function isPendingWorkUpload(value: unknown): value is PendingWorkUpload {
  if (!value || typeof value !== 'object') return false
  const entry = value as PendingWorkUpload
  if (!/^[a-f0-9]{64}$/.test(entry.userId) || typeof entry.fileId !== 'string' || entry.fileId.length > 500 || !entry.fileId.startsWith('cloud://')) return false
  const pathStart = entry.fileId.indexOf('/', 'cloud://'.length)
  const prefix = `/user-works/${entry.userId}/`
  if (pathStart < 0) return false
  const path = entry.fileId.slice(pathStart)
  return path.startsWith(prefix) && path.length > prefix.length && !path.slice(prefix.length).includes('/')
}

function readPendingWorkUploads() {
  try {
    const value = wx.getStorageSync(PENDING_WORK_UPLOADS_KEY) as unknown
    return Array.isArray(value) ? value.filter(isPendingWorkUpload) : []
  } catch {
    return []
  }
}

function writePendingWorkUploads(entries: PendingWorkUpload[]) {
  try {
    const unique = [...new Map(entries.filter(isPendingWorkUpload).map((entry) => [entry.fileId, entry])).values()].slice(-100)
    if (unique.length) wx.setStorageSync(PENDING_WORK_UPLOADS_KEY, unique)
    else wx.removeStorageSync(PENDING_WORK_UPLOADS_KEY)
  } catch {
    // Saving still works when local storage is unavailable; cloud references remain authoritative.
  }
}

export function trackPendingWorkUpload(userId: string, fileId: string) {
  writePendingWorkUploads([...readPendingWorkUploads(), { userId, fileId }])
}

export function releasePendingWorkUploads(fileIds: string[]) {
  const released = new Set(fileIds)
  writePendingWorkUploads(readPendingWorkUploads().filter((entry) => !released.has(entry.fileId)))
}

export async function cleanupPendingWorkUploads(userId: string) {
  const pending = readPendingWorkUploads().filter((entry) => entry.userId === userId).map((entry) => entry.fileId)
  for (let index = 0; index < pending.length; index += 20) {
    const fileIds = pending.slice(index, index + 20)
    await callUserService('deleteWorkUploads', { fileIds })
    releasePendingWorkUploads(fileIds)
  }
}
