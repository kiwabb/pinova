import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, CloudUpload, Image as ImageIcon, LogOut, Plus, Search, X } from 'lucide-react'
import type { BeadColor, PatternProject } from '../domain/types'
import { renderPatternBlob, renderPatternSheet } from '../engine/export'
import {
  callAdmin,
  cleanupPendingUploads,
  deleteUploadedPattern,
  hasLoginState,
  isAdminServiceError,
  readLastTargetCollection,
  releaseUploads,
  resolveImageUrls,
  signInAdmin,
  signOutAdmin,
  uploadPatternImage,
  verifyAdminSession,
  writeLastTargetCollection,
} from '../cloud/admin'
import type { AdminSession, CollectionLevel, CollectionStatus, CollectionSummary, ImportPatternResult } from '../cloud/admin'

type Phase = 'checking' | 'auth' | 'select' | 'submitting' | 'done'
type SubmitStep = 'render' | 'upload' | 'write'

interface ImportDialogProps {
  project: PatternProject
  palette: BeadColor[]
  onClose: (importedMessage?: string) => void
}

const CATEGORY_OPTIONS = ['武汉', '情侣', '亲子', '学生', '精选', '节日', '其他']
const LEVEL_OPTIONS: CollectionLevel[] = ['公开', 'V1', 'V2', 'V3', 'V4']
const MAX_ITEMS = 100
const MAX_COVERS = 4

const STATUS_LABELS: Record<CollectionStatus, string> = { draft: '草稿', published: '已发布', offline: '已下架', archived: '已归档' }

export function ImportDialog({ project, palette, onClose }: ImportDialogProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState('')
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [targetId, setTargetId] = useState('')
  const [search, setSearch] = useState('')
  const [patternName, setPatternName] = useState(project.name || '未命名图纸')
  const [newTitle, setNewTitle] = useState(project.name || '')
  const [newCategory, setNewCategory] = useState('精选')
  const [newLevel, setNewLevel] = useState<CollectionLevel>('公开')
  const [setAsCover, setSetAsCover] = useState(true)
  const [annotated, setAnnotated] = useState(false)
  const [step, setStep] = useState<SubmitStep>('render')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState<(ImportPatternResult & { title: string; patternName: string }) | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const busyRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const target = useMemo(() => collections.find((item) => item.id === targetId) || null, [collections, targetId])
  const coverFull = Boolean(target && target.images.length >= MAX_COVERS)

  const filteredCollections = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return collections
    return collections.filter((item) => item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword))
  }, [collections, search])

  useEffect(() => {
    try {
      setPreviewUrl(renderPatternSheet(project, palette, { annotated: false }).toDataURL('image/png'))
    } catch {
      setPreviewUrl('')
    }
  }, [project, palette])

  const loadCollections = useCallback(async (preferredId?: string) => {
    setCollectionsLoading(true)
    setCollectionsError('')
    try {
      const records = await callAdmin<CollectionSummary[]>('listCollections')
      const usable = records.filter((item) => item.status !== 'archived')
      setCollections(usable)
      setTargetId((current) => {
        if (preferredId && usable.some((item) => item.id === preferredId)) return preferredId
        if (current === '' && hasLoadedRef.current) return ''
        if (current && usable.some((item) => item.id === current)) return current
        const remembered = readLastTargetCollection()
        if (remembered && usable.some((item) => item.id === remembered)) return remembered
        return usable[0]?.id || ''
      })
      hasLoadedRef.current = true
      const coverIds = usable.map((item) => item.images[0]).filter(Boolean)
      if (coverIds.length) {
        const urlMap = await resolveImageUrls(coverIds)
        setCovers(Object.fromEntries(usable.filter((item) => item.images[0]).map((item) => [item.id, urlMap.get(item.images[0]) || ''])))
      } else {
        setCovers({})
      }
    } catch (error) {
      setCollectionsError(error instanceof Error ? error.message : '图集加载失败')
    } finally {
      setCollectionsLoading(false)
    }
  }, [])

  const enterSelect = useCallback(async (preferredId?: string) => {
    setPhase('select')
    void cleanupPendingUploads().catch(() => undefined)
    await loadCollections(preferredId)
  }, [loadCollections])

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      try {
        if (await hasLoginState()) {
          const profile = await verifyAdminSession()
          if (cancelled) return
          setSession(profile)
          await enterSelect()
          return
        }
      } catch {
        await signOutAdmin().catch(() => undefined)
      }
      if (!cancelled) setPhase('auth')
    }
    void bootstrap()
    return () => { cancelled = true }
  }, [enterSelect])

  useEffect(() => {
    setSetAsCover(target ? target.images.length === 0 : true)
  }, [targetId, target])

  const close = useCallback((message?: string) => {
    if (busyRef.current) return
    onClose(message)
  }, [onClose])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(result ? `已导入图集「${result.title}」` : undefined)
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [close, result])

  const submitLogin = async () => {
    if (loginBusy || !loginName.trim() || !loginPassword) return
    setLoginBusy(true)
    setLoginError('')
    try {
      await signInAdmin(loginName.trim(), loginPassword)
      const profile = await verifyAdminSession()
      setSession(profile)
      setLoginPassword('')
      await enterSelect()
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败，请检查账号和密码')
      await signOutAdmin().catch(() => undefined)
    } finally {
      setLoginBusy(false)
    }
  }

  const logout = async () => {
    if (busyRef.current) return
    await signOutAdmin().catch(() => undefined)
    setSession(null)
    setCollections([])
    setCovers({})
    setPhase('auth')
  }

  const submitImport = async () => {
    if (busyRef.current) return
    const name = patternName.trim() || project.name || '未命名图纸'
    if (!targetId && !newTitle.trim()) {
      setSubmitError('请填写新图集名称')
      return
    }
    if (target && target.count >= MAX_ITEMS) {
      setSubmitError('该图集图纸已达上限，请选择其他图集')
      return
    }
    busyRef.current = true
    setSubmitError('')
    setPhase('submitting')
    setStep('render')
    setUploadProgress(0)
    let fileId = ''
    try {
      const blob = await renderPatternBlob(project, palette, { annotated })
      setStep('upload')
      fileId = await uploadPatternImage(blob, setUploadProgress)
      setStep('write')
      const payload = targetId
        ? { collectionId: targetId, pattern: { name, image: fileId }, setAsCover: setAsCover && !coverFull }
        : { pattern: { name, image: fileId }, setAsCover, newCollection: { title: newTitle.trim(), category: newCategory, level: newLevel } }
      const data = await callAdmin<ImportPatternResult>('importPattern', payload)
      releaseUploads([fileId])
      writeLastTargetCollection(data.collectionId)
      setResult({ ...data, title: targetId ? (target?.title || '图集') : newTitle.trim(), patternName: name })
      setPhase('done')
    } catch (error) {
      if (fileId) void deleteUploadedPattern(fileId)
      const message = error instanceof Error ? error.message : '导入失败，请重试'
      if (isAdminServiceError(error, 'UNAUTHORIZED') || isAdminServiceError(error, 'FORBIDDEN')) {
        setSession(null)
        setLoginError(message)
        setPhase('auth')
      } else {
        setPhase('select')
        setSubmitError(message)
        if (isAdminServiceError(error, 'NOT_FOUND') || isAdminServiceError(error, 'ITEMS_FULL') || isAdminServiceError(error, 'CONFLICT')) void loadCollections()
      }
    } finally {
      busyRef.current = false
    }
  }

  const continueImport = async () => {
    const lastCollectionId = result?.collectionId
    setResult(null)
    setPatternName(project.name || '未命名图纸')
    await enterSelect(lastCollectionId)
  }

  const statusHint = result && result.status !== 'published'
    ? (result.status === 'draft' ? '该图集当前为草稿，在管理后台发布后小程序才会展示。' : '该图集当前已下架，在管理后台重新发布后小程序才会展示。')
    : ''

  return (
    <div className="import-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(result ? `已导入图集「${result.title}」` : undefined) }}>
      <section className="import-dialog" role="dialog" aria-modal="true" aria-label="导入图集">
        <header className="import-header">
          <div>
            <p>云端图集</p>
            <h2>导入图集</h2>
          </div>
          <div className="import-header-actions">
            {session && phase !== 'submitting' && (
              <button className="import-logout" onClick={logout} title="退出登录">
                <LogOut size={15} />{session.name}
              </button>
            )}
            <button className="import-close" aria-label="关闭" disabled={phase === 'submitting'} onClick={() => close(result ? `已导入图集「${result.title}」` : undefined)}>
              <X size={20} />
            </button>
          </div>
        </header>

        {phase === 'checking' && (
          <div className="import-loading"><span className="spinner dark" />正在检查登录状态</div>
        )}

        {phase === 'auth' && (
          <form className="import-auth" onSubmit={(event) => { event.preventDefault(); void submitLogin() }}>
            <p className="import-note">使用管理后台账号登录后，可直接把当前图纸导入云端图集。仅上传生成的图纸图片，原始照片不会上传。</p>
            <label>
              <span>管理员用户名</span>
              <input value={loginName} autoComplete="username" autoFocus onChange={(event) => setLoginName(event.target.value)} placeholder="请输入用户名" />
            </label>
            <label>
              <span>密码</span>
              <input value={loginPassword} type="password" autoComplete="current-password" onChange={(event) => setLoginPassword(event.target.value)} placeholder="请输入密码" />
            </label>
            {loginError && <p className="import-error" role="alert">{loginError}</p>}
            <button className="button primary import-submit" type="submit" disabled={loginBusy || !loginName.trim() || !loginPassword}>
              {loginBusy ? <span className="spinner" /> : <CloudUpload size={18} />}
              {loginBusy ? '正在登录' : '登录并继续'}
            </button>
          </form>
        )}

        {phase === 'select' && (
          <div className="import-body">
            <div className="import-preview">
              <div className="import-preview-frame">
                {previewUrl ? <img src={previewUrl} alt="待导入的图纸预览" /> : <ImageIcon size={26} />}
              </div>
              <span>{project.width} × {project.height} 图纸</span>
            </div>
            <div className="import-form">
              <label className="import-field">
                <span>图纸名称</span>
                <input value={patternName} maxLength={40} onChange={(event) => setPatternName(event.target.value)} placeholder="例如：宠物头像" />
              </label>

              <div className="import-field">
                <span>导入到</span>
                <div className="import-search">
                  <Search size={15} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索图集或分类" aria-label="搜索图集" />
                </div>
                <div className="collection-list" role="radiogroup" aria-label="选择目标图集">
                  {collectionsLoading && <div className="import-loading compact"><span className="spinner dark" />正在加载图集</div>}
                  {!collectionsLoading && collectionsError && (
                    <p className="import-error" role="alert">{collectionsError} <button type="button" onClick={() => void loadCollections()}>重试</button></p>
                  )}
                  {!collectionsLoading && !collectionsError && filteredCollections.map((item) => {
                    const full = item.count >= MAX_ITEMS
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={targetId === item.id}
                        className={targetId === item.id ? 'collection-option active' : 'collection-option'}
                        disabled={full}
                        onClick={() => setTargetId(item.id)}
                      >
                        <span className="collection-thumb">{covers[item.id] ? <img src={covers[item.id]} alt="" /> : <ImageIcon size={17} />}</span>
                        <span className="collection-meta">
                          <strong>{item.title}</strong>
                          <small>{item.category} · {STATUS_LABELS[item.status]} · {item.count}/{MAX_ITEMS} 张 · {item.level}{full ? ' · 已满' : ''}</small>
                        </span>
                      </button>
                    )
                  })}
                  {!collectionsLoading && !collectionsError && !filteredCollections.length && collections.length > 0 && (
                    <p className="collection-empty">没有匹配的图集，试试其他关键词。</p>
                  )}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetId === ''}
                    className={targetId === '' ? 'collection-option create active' : 'collection-option create'}
                    onClick={() => setTargetId('')}
                  >
                    <span className="collection-thumb"><Plus size={17} /></span>
                    <span className="collection-meta"><strong>新建图集</strong><small>以草稿创建，可稍后在管理后台发布</small></span>
                  </button>
                </div>
              </div>

              {targetId === '' && (
                <div className="import-new-grid">
                  <label className="import-field">
                    <span>图集名称</span>
                    <input value={newTitle} maxLength={40} onChange={(event) => setNewTitle(event.target.value)} placeholder="例如：武汉漫游" />
                  </label>
                  <label className="import-field">
                    <span>分类</span>
                    <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                      {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="import-field">
                    <span>访问等级</span>
                    <select value={newLevel} onChange={(event) => setNewLevel(event.target.value as CollectionLevel)}>
                      {LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </label>
                </div>
              )}

              <label className={coverFull ? 'import-switch disabled' : 'import-switch'}>
                <input type="checkbox" checked={setAsCover && !coverFull} disabled={coverFull} onChange={(event) => setSetAsCover(event.target.checked)} />
                <span>同时设为图集封面{coverFull ? '（封面已满 4 张）' : ''}</span>
              </label>
              <label className="import-switch">
                <input type="checkbox" checked={annotated} onChange={(event) => setAnnotated(event.target.checked)} />
                <span>图片包含名称与用量图例</span>
              </label>

              {submitError && <p className="import-error" role="alert">{submitError}</p>}
              <button className="button primary import-submit" type="button" disabled={collectionsLoading} onClick={() => void submitImport()}>
                <CloudUpload size={18} />一键导入
              </button>
            </div>
          </div>
        )}

        {phase === 'submitting' && (
          <div className="import-progress" aria-live="polite">
            {(['render', 'upload', 'write'] as SubmitStep[]).map((item, index) => {
              const order: SubmitStep[] = ['render', 'upload', 'write']
              const currentIndex = order.indexOf(step)
              const stepState = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'todo'
              const labels: Record<SubmitStep, string> = {
                render: '生成图纸图片',
                upload: step === 'upload' ? `上传到云存储 ${uploadProgress}%` : '上传到云存储',
                write: '写入图集',
              }
              return (
                <div key={item} className={`import-step ${stepState}`}>
                  {stepState === 'done' ? <CheckCircle2 size={18} /> : stepState === 'active' ? <span className="spinner dark" /> : <i />}
                  <span>{labels[item]}</span>
                </div>
              )
            })}
          </div>
        )}

        {phase === 'done' && result && (
          <div className="import-done">
            <CheckCircle2 size={40} />
            <h3>导入成功</h3>
            <p>「{result.patternName}」已导入图集「{result.title}」，现有 {result.count} 张图纸。{result.coverAdded ? '已同时设为封面。' : ''}</p>
            {statusHint && <p className="import-hint">{statusHint}</p>}
            <div className="import-done-actions">
              <button className="button" type="button" onClick={() => void continueImport()}>继续导入</button>
              <button className="button primary" type="button" onClick={() => close(`已导入图集「${result.title}」`)}>完成</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default ImportDialog
