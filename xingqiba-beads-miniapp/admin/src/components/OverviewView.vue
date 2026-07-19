<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CalendarClock, CalendarDays, ChevronRight, Images, LoaderCircle, Palette, RefreshCw, Users } from 'lucide-vue-next'
import { callAdmin } from '../cloud'
import type { DashboardData } from '../types'

const emit = defineEmits<{ navigate: [view: 'collections' | 'bookings' | 'users' | 'works'] }>()
const loading = ref(true)
const error = ref('')
const dashboard = ref<DashboardData | null>(null)
const memberLevels: Array<keyof DashboardData['levelCounts']> = ['PUBLIC', 'V1', 'V2', 'V3', 'V4']

const stats = computed(() => dashboard.value ? [
  { label: '图集', value: dashboard.value.totals.collections, note: '全部内容系列', icon: Images, view: 'collections' as const },
  { label: '用户', value: dashboard.value.totals.users, note: `${dashboard.value.totals.members} 位已绑定会员`, icon: Users, view: 'users' as const },
  { label: '作品', value: dashboard.value.totals.works, note: '用户云端作品', icon: Palette, view: 'works' as const },
  { label: '累计预约', value: dashboard.value.totals.bookings, note: `今天 ${dashboard.value.totals.todayBookings} 条`, icon: CalendarDays, view: 'bookings' as const },
] : [])

async function load() {
  loading.value = true
  error.value = ''
  try {
    dashboard.value = await callAdmin<DashboardData>('getDashboard')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '概览加载失败'
  } finally {
    loading.value = false
  }
}

const statusLabel = (status: string) => ({ pending: '待确认', confirmed: '已确认', cancelled: '已取消' }[status] || status)

onMounted(load)
</script>

<template>
  <main class="workspace overview-workspace">
    <header class="workspace-head">
      <div><p>星期八 · 拼豆</p><h1>运营概览</h1></div>
      <button class="secondary-btn" :disabled="loading" @click="load"><RefreshCw :class="{ spin: loading }" :size="17" />刷新</button>
    </header>
    <p v-if="error" class="notice error" role="alert">{{ error }} <button @click="load">重试</button></p>
    <div v-if="loading" class="overview-loading"><LoaderCircle class="spin" :size="22" />正在汇总运营数据</div>
    <template v-else-if="dashboard">
      <section class="stat-grid" aria-label="核心数据">
        <button v-for="stat in stats" :key="stat.label" class="stat-card" @click="emit('navigate', stat.view)">
          <span class="stat-icon"><component :is="stat.icon" :size="20" /></span>
          <strong>{{ stat.value }}</strong><span>{{ stat.label }}</span><small>{{ stat.note }}</small>
          <ChevronRight class="stat-arrow" :size="17" />
        </button>
      </section>
      <div class="overview-grid">
        <section class="overview-panel">
          <header><div><p>会员结构</p><h2>等级分布</h2></div><button class="text-link" @click="emit('navigate', 'users')">查看用户<ChevronRight :size="15" /></button></header>
          <div class="level-list">
            <div v-for="level in memberLevels" :key="level" class="level-row">
              <span>{{ level === 'PUBLIC' ? '未绑定' : level }}</span>
              <div><i :style="{ width: `${dashboard.totals.users ? Math.max(3, dashboard.levelCounts[level] / dashboard.totals.users * 100) : 0}%` }"></i></div>
              <strong>{{ dashboard.levelCounts[level] }}</strong>
            </div>
          </div>
        </section>
        <section class="overview-panel">
          <header><div><p>门店安排</p><h2>近期预约</h2></div><span class="pending-note"><CalendarClock :size="15" />{{ dashboard.totals.pendingBookings }} 条待确认</span></header>
          <div v-if="dashboard.upcomingBookings.length" class="upcoming-list">
            <button v-for="booking in dashboard.upcomingBookings" :key="booking.id" @click="emit('navigate', 'bookings')">
              <span class="date-tile"><strong>{{ booking.date.slice(8) }}</strong><small>{{ booking.date.slice(5, 7) }}月</small></span>
              <span class="booking-copy"><strong>{{ booking.experienceType }}</strong><small>{{ booking.timeSlot }} · {{ booking.phoneMasked }}</small></span>
              <span class="mini-status" :class="booking.status">{{ statusLabel(booking.status) }}</span>
            </button>
          </div>
          <div v-else class="panel-empty">近期没有待到店的预约</div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.overview-loading { min-height: 360px; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--muted); }
.stat-grid { margin-top: 28px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.stat-card { position: relative; min-width: 0; min-height: 172px; padding: 20px; border: 1px solid var(--line); border-radius: 14px; display: flex; flex-direction: column; align-items: flex-start; background: #fff; color: var(--text); text-align: left; box-shadow: 0 8px 30px rgba(0,0,0,.035); transition: transform 180ms ease, border-color 180ms ease; }
.stat-card:hover { border-color: #dedfe3; transform: translateY(-2px); }.stat-card:active { transform: scale(.985); }
.stat-icon { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
.stat-card > strong { margin-top: 17px; font-size: 30px; font-variant-numeric: tabular-nums; }.stat-card > span:not(.stat-icon) { margin-top: 2px; font-size: 14px; font-weight: 650; }.stat-card small { margin-top: 5px; color: var(--weak); font-size: 12px; }.stat-arrow { position: absolute; top: 22px; right: 18px; color: var(--weak); }
.overview-grid { margin-top: 20px; display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 20px; }
.overview-panel { min-width: 0; border: 1px solid var(--line); border-radius: 14px; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.035); }
.overview-panel > header { min-height: 82px; padding: 18px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 14px; }.overview-panel header p { margin: 0 0 4px; color: var(--primary); font-size: 12px; font-weight: 700; }.overview-panel h2 { margin: 0; font-size: 18px; }
.text-link { min-height: 40px; padding: 0 6px; border: 0; display: inline-flex; align-items: center; gap: 3px; background: transparent; color: var(--primary); font-size: 13px; font-weight: 650; }.pending-note { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; }
.level-list { padding: 17px 20px; display: grid; gap: 17px; }.level-row { display: grid; grid-template-columns: 54px minmax(0,1fr) 32px; align-items: center; gap: 12px; font-size: 13px; }.level-row > span { color: var(--muted); }.level-row > div { height: 7px; border-radius: 999px; overflow: hidden; background: #f0f1f3; }.level-row i { height: 100%; border-radius: inherit; display: block; background: var(--primary); }.level-row strong { text-align: right; font-variant-numeric: tabular-nums; }
.upcoming-list { display: grid; }.upcoming-list button { width: 100%; min-height: 72px; padding: 10px 20px; border: 0; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 12px; background: transparent; color: var(--text); text-align: left; }.upcoming-list button:last-child { border-bottom: 0; }.upcoming-list button:hover { background: #fafbfc; }
.date-tile { width: 42px; height: 46px; border-radius: 9px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--primary-soft); color: var(--primary); }.date-tile strong { font-size: 16px; line-height: 1; }.date-tile small { margin-top: 4px; font-size: 10px; }.booking-copy { min-width: 0; display: flex; flex-direction: column; gap: 5px; }.booking-copy strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.booking-copy small { color: var(--muted); font-size: 11px; }.mini-status { padding: 5px 8px; border-radius: 999px; background: #fff7e7; color: #9a5c18; font-size: 11px; font-weight: 650; }.mini-status.confirmed { background: #eef8f4; color: #246b45; }.panel-empty { min-height: 250px; display: grid; place-items: center; color: var(--weak); font-size: 13px; }
@media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }.overview-grid { grid-template-columns: 1fr; } }
@media (max-width: 580px) { .stat-grid { grid-template-columns: 1fr 1fr; gap: 10px; }.stat-card { min-height: 152px; padding: 16px; }.stat-card > strong { font-size: 26px; }.overview-panel > header { align-items: flex-start; }.pending-note { margin-top: 4px; } }
</style>
