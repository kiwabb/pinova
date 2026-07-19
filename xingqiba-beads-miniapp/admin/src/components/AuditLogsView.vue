<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { History, LoaderCircle, RefreshCw, Search } from 'lucide-vue-next'
import { callAdmin } from '../cloud'
import type { AdminAuditRecord, PaginatedResult } from '../types'

const records = ref<AdminAuditRecord[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const cursor = ref('')
const hasMore = ref(false)
const total = ref(0)
const keyword = ref('')
const retentionDays = ref(365)

const actionLabels: Record<string, string> = {
  createCollection: '新建图集',
  updateCollection: '更新图集',
  updateCollectionStatus: '切换图集状态',
  archiveCollection: '归档图集',
  updateBookingStatus: '更新预约状态',
  saveUser: '更新会员资料',
  deleteWork: '删除用户作品',
  saveTutorialConfig: '保存教程配置',
  saveMemberConfig: '保存会员配置',
  saveStoreConfig: '保存门店配置',
}

const filtered = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return records.value.filter((record) => !value
    || (actionLabels[record.action] || record.action).toLowerCase().includes(value)
    || record.operatorName.toLowerCase().includes(value)
    || record.targetId.toLowerCase().includes(value))
})

async function load(reset = true) {
  if ((!reset && (!hasMore.value || loadingMore.value)) || (reset && loading.value && records.value.length)) return
  if (reset) { loading.value = true; cursor.value = ''; hasMore.value = false } else loadingMore.value = true
  error.value = ''
  try {
    const page = await callAdmin<PaginatedResult<AdminAuditRecord> & { retentionDays: number }>('listAuditLogs', { paginated: true, cursor: reset ? '' : cursor.value, pageSize: 50 })
    records.value = reset ? page.items : [...records.value, ...page.items.filter((item) => !records.value.some((current) => current.id === item.id))]
    cursor.value = page.nextCursor
    hasMore.value = page.hasMore
    total.value = page.total
    retentionDays.value = page.retentionDays || 365
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '操作日志加载失败' }
  finally { loading.value = false; loadingMore.value = false }
}

function detail(record: AdminAuditRecord) {
  const source = record.after || record.before
  if (!source) return '无附加字段'
  return Object.entries(source).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

const dateText = (value: number) => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value)) : '未知时间'
onMounted(() => load(true))
</script>

<template>
  <main class="workspace audit-workspace">
    <header class="workspace-head"><div><p>安全审计</p><h1>操作日志</h1></div><button class="secondary-btn" :disabled="loading" @click="load(true)"><RefreshCw :class="{ spin: loading }" :size="17" />刷新</button></header>
    <section class="toolbar audit-toolbar" aria-label="日志筛选"><div class="search-box"><Search :size="18" /><input v-model="keyword" aria-label="搜索操作日志" placeholder="搜索操作、管理员或目标 ID" /></div></section>
    <p v-if="error" class="notice error" role="alert">{{ error }} <button @click="load(true)">重试</button></p>
    <section class="table-surface audit-table" aria-label="操作日志列表">
      <div class="audit-head"><span>时间</span><span>操作</span><span>管理员</span><span>目标与变更</span></div>
      <div v-if="loading" class="empty-state"><LoaderCircle class="spin" :size="22" /><span>正在加载操作日志</span></div>
      <div v-else-if="!filtered.length" class="empty-state"><History :size="28" /><strong>没有符合条件的日志</strong><span>后台关键操作会自动记录在这里。</span></div>
      <article v-for="record in filtered" :key="record.id" class="audit-row">
        <span class="audit-date">{{ dateText(record.createdAt) }}</span>
        <strong>{{ actionLabels[record.action] || record.action }}</strong>
        <span>{{ record.operatorName }}</span>
        <div><code>{{ record.targetId || '-' }}</code><small>{{ detail(record) }}</small></div>
      </article>
    </section>
    <div class="pagination-row"><p class="result-count">已加载 {{ records.length }} / {{ total }} 条，当前筛选 {{ filtered.length }} 条 · 日志保留 {{ retentionDays }} 天</p><button v-if="hasMore" class="secondary-btn" :disabled="loadingMore" @click="load(false)"><LoaderCircle v-if="loadingMore" class="spin" :size="17" />{{ loadingMore ? '正在加载' : '加载更多' }}</button></div>
  </main>
</template>

<style scoped>
.audit-toolbar{grid-template-columns:minmax(260px,560px)}.audit-head,.audit-row{display:grid;grid-template-columns:190px 150px 120px minmax(300px,1fr);align-items:center;gap:18px}.audit-head{min-height:48px;padding:0 20px;border-bottom:1px solid var(--line);background:#fafbfc;color:var(--weak);font-size:12px;font-weight:600}.audit-row{min-height:78px;padding:12px 20px;border-bottom:1px solid var(--line);color:var(--muted);font-size:13px}.audit-row:last-child{border-bottom:0}.audit-row:hover{background:#fcfcfd}.audit-row>strong{color:var(--text);font-size:13px}.audit-row>div{min-width:0;display:flex;flex-direction:column;gap:6px}.audit-row code{overflow:hidden;color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.audit-row small{overflow:hidden;color:var(--weak);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.audit-date{font-variant-numeric:tabular-nums}@media(max-width:980px){.audit-table{overflow-x:auto}.audit-head,.audit-row{min-width:880px}}
</style>
