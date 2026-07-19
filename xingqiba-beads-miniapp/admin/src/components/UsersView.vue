<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Edit3, LoaderCircle, RefreshCw, Search, UserRound, X } from 'lucide-vue-next'
import { callAdmin } from '../cloud'
import type { AdminUserRecord, PaginatedResult } from '../types'

const props = defineProps<{ adminRole: string }>()
const users = ref<AdminUserRecord[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const cursor = ref('')
const hasMore = ref(false)
const total = ref(0)
const keyword = ref('')
const level = ref('全部')
const status = ref('全部')
const editorOpen = ref(false)
const saving = ref(false)
const success = ref('')
let requestSerial = 0
let filterTimer: number | undefined
const form = reactive({ id: '', phoneMasked: '', phoneBound: false, status: 'active' as 'active' | 'suspended', level: 'PUBLIC', growth: 0, points: 0 })
const initialSnapshot = ref('')
const emit = defineEmits<{ 'dirty-change': [dirty: boolean] }>()
const dirty = computed(() => editorOpen.value && Boolean(initialSnapshot.value) && JSON.stringify(form) !== initialSnapshot.value)
watch(dirty, (value) => emit('dirty-change', value), { immediate: true })
watch([keyword, level, status], () => {
  window.clearTimeout(filterTimer)
  filterTimer = window.setTimeout(() => { void load(true) }, 280)
})

const filtered = computed(() => users.value.filter((user) => {
  const search = keyword.value.trim().toLowerCase()
  return (!search || user.phoneMasked.toLowerCase().includes(search) || user.id.toLowerCase().includes(search))
    && (level.value === '全部' || user.level === level.value)
    && (status.value === '全部' || user.status === status.value)
}))

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
    const page = await callAdmin<PaginatedResult<AdminUserRecord>>('listUsers', { paginated: true, cursor: reset ? '' : cursor.value, pageSize: 50, keyword: keyword.value.trim(), level: level.value === '全部' ? '' : level.value, status: status.value === '全部' ? '' : status.value })
    if (currentRequest !== requestSerial) return
    users.value = reset ? page.items : [...users.value, ...page.items.filter((item) => !users.value.some((existing) => existing.id === item.id))]
    cursor.value = page.nextCursor
    hasMore.value = page.hasMore
    total.value = page.total
  }
  catch (reason) { if (currentRequest === requestSerial) error.value = reason instanceof Error ? reason.message : '用户加载失败' }
  finally { if (currentRequest === requestSerial) { loading.value = false; loadingMore.value = false } }
}

function loadMore() { void load(false) }

function edit(user: AdminUserRecord) {
  Object.assign(form, { id: user.id, phoneMasked: user.phoneMasked, phoneBound: user.phoneBound, status: user.status, level: user.level, growth: user.growth, points: user.points })
  initialSnapshot.value = JSON.stringify(form)
  editorOpen.value = true
}

function closeEditor() {
  if (saving.value) return
  if (dirty.value && !window.confirm('会员资料尚未保存，确认关闭？')) return
  editorOpen.value = false
}

async function save() {
  if (props.adminRole !== 'owner') return
  saving.value = true
  error.value = ''
  try {
    const initial = JSON.parse(initialSnapshot.value) as typeof form
    const result = await callAdmin<{ level: string }>('saveUser', { userId: form.id, status: form.status, growth: form.growth, points: form.points, expected: { status: initial.status, growth: initial.growth, points: initial.points } })
    form.level = result.level
    initialSnapshot.value = JSON.stringify(form)
    editorOpen.value = false
    success.value = '会员资料已保存，等级已按成长值重新计算'
    window.setTimeout(() => { success.value = '' }, 3200)
    await load(true)
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '会员资料保存失败' }
  finally { saving.value = false }
}

const dateText = (value: number) => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value)) : '未知'
const shortUserId = (id: string) => id.length > 12 ? `${id.slice(0, 12)}…` : id
const userLabel = (user: Pick<AdminUserRecord, 'id' | 'phoneBound' | 'phoneMasked'>) => user.phoneBound ? user.phoneMasked : `访客 ${shortUserId(user.id)}`
onMounted(() => load(true))
onBeforeUnmount(() => { window.clearTimeout(filterTimer); emit('dirty-change', false) })
</script>

<template>
  <main class="workspace users-workspace">
    <header class="workspace-head"><div><p>用户运营</p><h1>用户与会员</h1></div><button class="secondary-btn" :disabled="loading" @click="load(true)"><RefreshCw :class="{ spin: loading }" :size="17" />刷新</button></header>
    <section class="toolbar users-toolbar" aria-label="用户筛选"><div class="search-box"><Search :size="18" /><input v-model="keyword" aria-label="搜索用户" placeholder="搜索手机号或用户 ID" /></div><select v-model="level" aria-label="等级筛选"><option>全部</option><option>PUBLIC</option><option>V1</option><option>V2</option><option>V3</option><option>V4</option></select><select v-model="status" aria-label="状态筛选"><option>全部</option><option value="active">正常</option><option value="suspended">已停用</option></select></section>
    <p v-if="error" class="notice error" role="alert">{{ error }} <button @click="load(true)">重试</button></p><p v-if="success" class="local-success" role="status">{{ success }}</p>
    <section class="table-surface user-table" aria-label="用户列表">
      <div class="user-head"><span>用户</span><span>等级</span><span>成长值 / 积分</span><span>业务记录</span><span>状态</span><span>操作</span></div>
      <div v-if="loading" class="empty-state"><LoaderCircle class="spin" :size="22" /><span>正在加载用户</span></div>
      <div v-else-if="!filtered.length" class="empty-state"><UserRound :size="28" /><strong>没有符合条件的用户</strong><span>调整搜索或筛选条件。</span></div>
      <article v-for="user in filtered" :key="user.id" class="user-row">
        <div class="user-identity"><span class="user-avatar">{{ user.phoneBound ? user.phoneMasked.slice(-2) : '访' }}</span><div><strong>{{ userLabel(user) }}</strong><small>ID {{ shortUserId(user.id) }} · {{ dateText(user.createdAt) }} 加入</small></div></div>
        <span class="level-tag">{{ user.level === 'PUBLIC' ? '未绑定' : user.level }}</span>
        <div class="metrics"><strong>{{ user.growth }}</strong><small>{{ user.points }} 积分</small></div>
        <div class="record-counts"><span>{{ user.works }} 作品</span><span>{{ user.favorites }} 收藏</span><span>{{ user.bookings }} 预约</span></div>
        <span class="status" :class="user.status"><i></i>{{ user.status === 'active' ? '正常' : '已停用' }}</span>
        <button class="icon-btn" aria-label="编辑会员" title="编辑会员" :disabled="adminRole !== 'owner'" @click="edit(user)"><Edit3 :size="18" /></button>
      </article>
    </section><div class="pagination-row"><p class="result-count">已加载 {{ users.length }} / {{ total }} 位，当前筛选 {{ filtered.length }} 位</p><button v-if="hasMore" class="secondary-btn" :disabled="loadingMore" @click="loadMore"><LoaderCircle v-if="loadingMore" class="spin" :size="17" />{{ loadingMore ? '正在加载' : '加载更多' }}</button></div>

    <div v-if="editorOpen" class="drawer-layer" @mousedown.self="closeEditor"><section class="member-drawer" role="dialog" aria-modal="true" aria-label="编辑会员"><header><div><p>会员资料</p><h2>{{ form.phoneBound ? form.phoneMasked : `访客 ${shortUserId(form.id)}` }}</h2></div><button class="icon-btn" aria-label="关闭" @click="closeEditor"><X :size="20" /></button></header><div class="member-body"><div class="readonly-level"><span>当前等级</span><strong>{{ form.level }}</strong><small>保存后按会员配置中的成长值门槛自动计算</small></div><div class="field"><label for="member-growth">成长值</label><input id="member-growth" v-model.number="form.growth" type="number" min="0" max="10000000" /></div><div class="field"><label for="member-points">积分余额</label><input id="member-points" v-model.number="form.points" type="number" min="0" max="10000000" /></div><div class="field"><label for="member-status">账号状态</label><select id="member-status" v-model="form.status"><option value="active">正常使用</option><option value="suspended">暂停使用</option></select><small>暂停后该用户无法调用小程序业务云函数。</small></div></div><footer><button class="secondary-btn" :disabled="saving" @click="closeEditor">取消</button><button class="primary-btn" :disabled="saving || !dirty" @click="save"><LoaderCircle v-if="saving" class="spin" :size="18" />{{ saving ? '保存中' : '保存会员资料' }}</button></footer></section></div>
  </main>
</template>

<style scoped>
.users-toolbar { grid-template-columns: minmax(260px,1fr) 150px 150px; }.local-success { margin: 16px 0 0; padding: 12px 14px; border-radius: 10px; background: #eef8f4; color: #246b45; font-size: 14px; }
.user-head,.user-row { display:grid; grid-template-columns:minmax(220px,1.4fr) 90px 130px minmax(190px,1fr) 90px 44px; align-items:center; gap:16px; }.user-head { min-height:48px; padding:0 20px; border-bottom:1px solid var(--line); background:#fafbfc; color:var(--weak); font-size:12px; font-weight:600; }.user-row { min-height:82px; padding:11px 20px; border-bottom:1px solid var(--line); }.user-row:last-child{border-bottom:0}.user-row:hover{background:#fcfcfd}
.user-identity { min-width:0; display:flex; align-items:center; gap:12px; }.user-avatar { width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);font-size:13px;font-weight:700 }.user-identity div,.metrics{min-width:0;display:flex;flex-direction:column;gap:4px}.user-identity strong{font-size:14px}.user-identity small,.metrics small{color:var(--weak);font-size:11px}.metrics strong{font-size:14px;font-variant-numeric:tabular-nums}.record-counts{display:flex;flex-wrap:wrap;gap:5px 12px;color:var(--muted);font-size:12px}.status.active i{background:#2b8a5a}.status.suspended i{background:#b42318}
.member-drawer{width:min(440px,100%);height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#fff}.member-drawer header,.member-drawer footer{padding:22px 26px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px}.member-drawer header p{margin:0 0 4px;color:var(--primary);font-size:12px;font-weight:700}.member-drawer h2{margin:0;font-size:20px}.member-drawer footer{border-top:1px solid var(--line);border-bottom:0;justify-content:flex-end}.member-body{padding:26px;overflow-y:auto}.readonly-level{margin-bottom:24px;padding:18px;border:1px solid var(--line);border-radius:12px;display:grid;gap:5px;background:#fafbfc}.readonly-level span{color:var(--muted);font-size:12px}.readonly-level strong{font-size:24px;color:var(--primary)}.readonly-level small{color:var(--weak);font-size:11px;line-height:1.5}
@media(max-width:1100px){.user-table{overflow-x:auto}.user-head,.user-row{min-width:900px}}@media(max-width:680px){.users-toolbar{grid-template-columns:1fr 1fr}.users-toolbar .search-box{grid-column:1/-1}}
</style>
