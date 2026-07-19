<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ExternalLink, Image as ImageIcon, LoaderCircle, RefreshCw, Search, Trash2 } from 'lucide-vue-next'
import { callAdmin, resolveImageUrls } from '../cloud'
import type { AdminWorkRecord, PaginatedResult } from '../types'

const props = defineProps<{ adminRole: string }>()
const works = ref<AdminWorkRecord[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const cursor = ref('')
const hasMore = ref(false)
const total = ref(0)
const success = ref('')
const keyword = ref('')
const deletingIds = ref<string[]>([])
let requestSerial = 0
let filterTimer: number | undefined
const filtered = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return works.value.filter((work) => !value || work.title.toLowerCase().includes(value) || work.phoneMasked.toLowerCase().includes(value) || work.id.toLowerCase().includes(value))
})
watch(keyword, () => {
  window.clearTimeout(filterTimer)
  filterTimer = window.setTimeout(() => { void load(true) }, 280)
})

async function load(reset = true) {
  if (!reset && (!hasMore.value || loadingMore.value)) return
  const currentRequest = ++requestSerial
  if (reset) {
    loading.value = true
    cursor.value = ''
    hasMore.value = false
  } else loadingMore.value = true
  error.value = ''
  try {
    const page = await callAdmin<PaginatedResult<AdminWorkRecord>>('listWorks', { paginated: true, cursor: reset ? '' : cursor.value, pageSize: 50, keyword: keyword.value.trim() })
    if (currentRequest !== requestSerial) return
    const urlMap = await resolveImageUrls(page.items.map((item) => item.previewFileId).filter(Boolean))
    const records = page.items.map((item) => ({ ...item, previewUrl: urlMap.get(item.previewFileId) || '' }))
    works.value = reset ? records : [...works.value, ...records.filter((item) => !works.value.some((existing) => existing.id === item.id))]
    cursor.value = page.nextCursor
    hasMore.value = page.hasMore
    total.value = page.total
  } catch (reason) { if (currentRequest === requestSerial) error.value = reason instanceof Error ? reason.message : '作品加载失败' }
  finally { if (currentRequest === requestSerial) { loading.value = false; loadingMore.value = false } }
}

function loadMore() { void load(false) }

function preview(work: AdminWorkRecord) {
  if (work.previewUrl) window.open(work.previewUrl, '_blank', 'noopener,noreferrer')
}

async function remove(work: AdminWorkRecord) {
  if (props.adminRole !== 'owner' || deletingIds.value.includes(work.id)) return
  if (!window.confirm(`确认永久删除“${work.title}”？用户将无法恢复该作品。`)) return
  deletingIds.value = [...deletingIds.value, work.id]
  error.value = ''
  try {
    await callAdmin('deleteWork', { workId: work.id, expectedVersion: work.version })
    await load(true)
    success.value = '作品与预览文件已删除'
    window.setTimeout(() => { success.value = '' }, 3200)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '作品删除失败'
    if (reason instanceof Error && 'code' in reason && reason.code === 'CONFLICT') await load(true)
  }
  finally { deletingIds.value = deletingIds.value.filter((id) => id !== work.id) }
}

const dateText = (value: number) => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '未知'
onMounted(() => load(true))
onBeforeUnmount(() => window.clearTimeout(filterTimer))
</script>

<template>
  <main class="workspace works-workspace">
    <header class="workspace-head"><div><p>内容安全</p><h1>用户作品</h1></div><button class="secondary-btn" :disabled="loading" @click="load(true)"><RefreshCw :class="{ spin: loading }" :size="17" />刷新</button></header>
    <section class="toolbar works-toolbar" aria-label="作品筛选"><div class="search-box"><Search :size="18" /><input v-model="keyword" aria-label="搜索作品" placeholder="搜索作品名、手机号或作品 ID" /></div></section>
    <p v-if="error" class="notice error" role="alert">{{ error }} <button @click="load(true)">重试</button></p><p v-if="success" class="local-success" role="status">{{ success }}</p>
    <section class="table-surface works-table" aria-label="作品列表">
      <div class="work-head"><span>作品</span><span>用户</span><span>来源</span><span>更新时间</span><span>操作</span></div>
      <div v-if="loading" class="empty-state"><LoaderCircle class="spin" :size="22" /><span>正在加载作品</span></div>
      <div v-else-if="!filtered.length" class="empty-state"><ImageIcon :size="28" /><strong>没有符合条件的作品</strong><span>用户保存作品后会显示在这里。</span></div>
      <article v-for="work in filtered" :key="work.id" class="work-row">
        <div class="work-identity"><button class="work-thumb" :disabled="!work.previewUrl" :aria-label="`预览${work.title}`" @click="preview(work)"><img v-if="work.previewUrl" :src="work.previewUrl" :alt="`${work.title}预览`" /><ImageIcon v-else :size="21" /></button><div><strong>{{ work.title }}</strong><small>{{ work.id }}</small></div></div>
        <span>{{ work.phoneMasked }}</span>
        <span class="source-text">{{ work.sourceCollectionId ? '图集创作' : '照片 / 空白创作' }}<small>{{ work.gridSize }}×{{ work.gridSize }}{{ work.colorCount ? ` · ${work.colorCount} 色` : '' }}</small></span>
        <span class="date-text">{{ dateText(work.updatedAt) }}</span>
        <div class="work-actions"><button class="icon-btn" aria-label="在新窗口预览" title="预览" :disabled="!work.previewUrl" @click="preview(work)"><ExternalLink :size="18" /></button><button class="icon-btn danger" aria-label="删除作品" title="永久删除" :disabled="adminRole !== 'owner' || deletingIds.includes(work.id)" @click="remove(work)"><LoaderCircle v-if="deletingIds.includes(work.id)" class="spin" :size="18" /><Trash2 v-else :size="18" /></button></div>
      </article>
    </section><div class="pagination-row"><p class="result-count">已加载 {{ works.length }} / {{ total }} 个，当前筛选 {{ filtered.length }} 个；仅店主可永久删除</p><button v-if="hasMore" class="secondary-btn" :disabled="loadingMore" @click="loadMore"><LoaderCircle v-if="loadingMore" class="spin" :size="17" />{{ loadingMore ? '正在加载' : '加载更多' }}</button></div>
  </main>
</template>

<style scoped>
.works-toolbar{grid-template-columns:minmax(260px,520px)}.local-success{margin:16px 0 0;padding:12px 14px;border-radius:10px;background:#eef8f4;color:#246b45;font-size:14px}.work-head,.work-row{display:grid;grid-template-columns:minmax(280px,1.6fr) 120px 150px 180px 90px;align-items:center;gap:18px}.work-head{min-height:48px;padding:0 20px;border-bottom:1px solid var(--line);background:#fafbfc;color:var(--weak);font-size:12px;font-weight:600}.work-row{min-height:82px;padding:10px 20px;border-bottom:1px solid var(--line);color:var(--muted);font-size:13px}.work-row:last-child{border-bottom:0}.work-row:hover{background:#fcfcfd}.work-identity{min-width:0;display:flex;align-items:center;gap:13px}.work-thumb{width:58px;height:58px;padding:0;flex:none;border:0;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:#f0f1f3;color:var(--weak)}.work-thumb img{width:100%;height:100%;object-fit:cover}.work-identity>div{min-width:0;display:flex;flex-direction:column;gap:5px}.work-identity strong{overflow:hidden;color:var(--text);font-size:14px;text-overflow:ellipsis;white-space:nowrap}.work-identity small{overflow:hidden;max-width:260px;color:var(--weak);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.source-text,.date-text{font-size:12px}.source-text{display:flex;flex-direction:column;gap:4px}.source-text small{color:var(--weak);font-size:10px}.work-actions{display:flex;gap:4px}@media(max-width:980px){.works-table{overflow-x:auto}.work-head,.work-row{min-width:880px}}
</style>
