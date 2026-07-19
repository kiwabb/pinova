<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Image as ImageIcon, LoaderCircle, Plus, RefreshCw, Save, Trash2, UploadCloud } from 'lucide-vue-next'
import { callAdmin, releaseAdminUploads, resolveImageUrls, uploadAdminImage, validateAdminImage } from '../cloud'
import type { TutorialConfig, TutorialSection } from '../types'

const loading = ref(true)
const saving = ref(false)
const uploadingId = ref('')
const uploadProgress = ref(0)
const error = ref('')
const success = ref('')
const sessionUploads = new Set<string>()
const emit = defineEmits<{ 'dirty-change': [dirty: boolean] }>()
const emptyConfig = (): TutorialConfig => ({ status: 'draft', revision: 0, title: '第一件拼豆作品', subtitle: '从摆放到定型', safetyNote: '熨烫和剪切必须由成人操作；儿童制作时需全程陪同。', sections: [] })
const form = reactive<TutorialConfig>(emptyConfig())
const initialSnapshot = ref('')

function formSnapshot() {
  return JSON.stringify({ ...form, sections: form.sections.map(({ imagePreview: _preview, ...section }) => section) })
}

const dirty = computed(() => !loading.value && Boolean(initialSnapshot.value) && formSnapshot() !== initialSnapshot.value)
watch(dirty, (value) => emit('dirty-change', value), { immediate: true })

function revokePreview(url = '') {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

function revokePreviews() {
  form.sections.forEach((section) => revokePreview(section.imagePreview))
}

async function cleanupSessionUploads() {
  const fileList = [...sessionUploads]
  sessionUploads.clear()
  if (fileList.length) {
    await callAdmin('deleteFiles', { fileList }).then(() => releaseAdminUploads(fileList)).catch(() => undefined)
  }
}

function replaceConfig(config: TutorialConfig) {
  Object.assign(form, JSON.parse(JSON.stringify(config)))
}

async function load() {
  await cleanupSessionUploads()
  revokePreviews()
  loading.value = true
  error.value = ''
  try {
    const config = await callAdmin<TutorialConfig | null>('getTutorialConfig')
    replaceConfig(config || emptyConfig())
    const urlMap = await resolveImageUrls(form.sections.map((item) => item.image).filter(Boolean))
    form.sections.forEach((item) => { item.imagePreview = urlMap.get(item.image) || (item.image.startsWith('http') ? item.image : '') })
    initialSnapshot.value = formSnapshot()
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '教程加载失败' }
  finally { loading.value = false }
}

function addSection() {
  if (form.sections.length >= 12) return
  form.sections.push({ id: `section-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, title: '', duration: '', image: '', imagePreview: '', steps: [] })
}

function moveSection(index: number, direction: -1 | 1) {
  const target = index + direction
  if (uploadingId.value || target < 0 || target >= form.sections.length) return
  ;[form.sections[index], form.sections[target]] = [form.sections[target], form.sections[index]]
}

async function removeSection(index: number) {
  const [section] = form.sections.splice(index, 1)
  revokePreview(section?.imagePreview)
  if (section && sessionUploads.delete(section.image)) {
    await callAdmin('deleteFiles', { fileList: [section.image] }).then(() => releaseAdminUploads([section.image])).catch(() => undefined)
  }
}

function updateSteps(section: TutorialSection, event: Event) {
  section.steps = (event.target as HTMLTextAreaElement).value.split('\n').map((item) => item.trim()).filter(Boolean)
}

async function upload(section: TutorialSection, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try { validateAdminImage(file) } catch (reason) { return void (error.value = reason instanceof Error ? reason.message : '图片格式不支持') }
  uploadingId.value = section.id
  uploadProgress.value = 0
  error.value = ''
  try {
    const previous = section.image
    const fileId = await uploadAdminImage(file, 'tutorials', (progress) => { uploadProgress.value = progress })
    sessionUploads.add(fileId)
    revokePreview(section.imagePreview)
    section.image = fileId
    section.imagePreview = URL.createObjectURL(file)
    if (sessionUploads.delete(previous)) {
      await callAdmin('deleteFiles', { fileList: [previous] }).then(() => releaseAdminUploads([previous])).catch(() => undefined)
    }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '图片上传失败' }
  finally { uploadingId.value = ''; uploadProgress.value = 0 }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form, sections: form.sections.map(({ imagePreview: _preview, ...section }) => section) }
    const result = await callAdmin<{ revision: number }>('saveTutorialConfig', { config: payload, expectedRevision: form.revision })
    form.revision = result.revision
    releaseAdminUploads([...sessionUploads])
    sessionUploads.clear()
    initialSnapshot.value = formSnapshot()
    success.value = form.status === 'published' ? '教程已发布，小程序将读取最新内容' : '教程草稿已保存'
    window.setTimeout(() => { success.value = '' }, 3600)
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '教程保存失败' }
  finally { saving.value = false }
}

async function requestReload() {
  if (dirty.value && !window.confirm('当前教程修改尚未保存，确认重新加载？')) return
  await load()
}

onMounted(load)
onBeforeUnmount(() => {
  emit('dirty-change', false)
  revokePreviews()
  void cleanupSessionUploads()
})
</script>

<template>
  <main class="workspace tutorials-workspace">
    <header class="workspace-head"><div><p>内容管理</p><h1>新手教程</h1></div><button class="secondary-btn" :disabled="loading" @click="requestReload"><RefreshCw :class="{ spin: loading }" :size="17" />重新加载</button></header>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p><p v-if="success" class="local-success" role="status">{{ success }}</p>
    <div v-if="loading" class="tutorial-loading"><LoaderCircle class="spin" :size="22" />正在加载教程</div>
    <template v-else>
      <section class="tutorial-settings">
        <header><div><p>页面信息</p><h2>标题与发布状态</h2></div><select v-model="form.status" aria-label="教程状态"><option value="draft">内测草稿</option><option value="published">正式发布</option></select></header>
        <div class="tutorial-fields"><div class="field"><label for="tutorial-title">标题</label><input id="tutorial-title" v-model="form.title" maxlength="40" /></div><div class="field"><label for="tutorial-subtitle">副标题</label><input id="tutorial-subtitle" v-model="form.subtitle" maxlength="60" /></div><div class="field wide"><label for="tutorial-safety">安全提醒</label><textarea id="tutorial-safety" v-model="form.safetyNote" maxlength="180" rows="3"></textarea></div></div>
      </section>
      <div class="section-heading"><div><p>教程章节</p><h2>按小程序展示顺序排列</h2></div><button class="secondary-btn" :disabled="form.sections.length >= 12" @click="addSection"><Plus :size="17" />添加章节</button></div>
      <section class="tutorial-list">
        <article v-for="(section,index) in form.sections" :key="section.id" class="tutorial-section">
          <div class="tutorial-media"><img v-if="section.imagePreview" :src="section.imagePreview" :alt="`${section.title || '教程'}图片预览`" /><ImageIcon v-else :size="28" /><label><UploadCloud :size="17" /><span>{{ uploadingId === section.id ? `${uploadProgress}%` : section.image ? '更换图片' : '上传图片' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" :disabled="Boolean(uploadingId)" @change="upload(section,$event)" /></label></div>
          <div class="tutorial-content"><div class="section-number">{{ String(index + 1).padStart(2,'0') }}</div><div class="field-grid"><div class="field"><label :for="`section-title-${index}`">章节标题</label><input :id="`section-title-${index}`" v-model="section.title" maxlength="40" /></div><div class="field"><label :for="`section-duration-${index}`">预计时长</label><input :id="`section-duration-${index}`" v-model="section.duration" maxlength="20" placeholder="例如：3–5 分钟" /></div></div><div class="field steps-field"><label :for="`section-steps-${index}`">操作步骤（每行一条）</label><textarea :id="`section-steps-${index}`" :value="section.steps.join('\n')" rows="4" @input="updateSteps(section,$event)"></textarea></div></div>
          <div class="section-actions"><button class="icon-btn" :aria-label="`将第 ${index + 1} 章上移`" title="上移" :disabled="Boolean(uploadingId) || index === 0" @click="moveSection(index,-1)"><ChevronUp :size="18" /></button><button class="icon-btn" :aria-label="`将第 ${index + 1} 章下移`" title="下移" :disabled="Boolean(uploadingId) || index === form.sections.length - 1" @click="moveSection(index,1)"><ChevronDown :size="18" /></button><button class="icon-btn danger" aria-label="删除章节" title="删除章节" :disabled="Boolean(uploadingId)" @click="removeSection(index)"><Trash2 :size="18" /></button></div>
        </article>
        <div v-if="!form.sections.length" class="tutorial-empty"><ImageIcon :size="30" /><strong>尚未添加教程章节</strong><span>草稿可以为空，正式发布前需要完整章节。</span></div>
      </section>
      <footer class="sticky-save"><span>{{ dirty ? '有未保存修改' : '最多 12 个章节，每章最多 8 个步骤。' }}</span><button class="primary-btn" :disabled="saving || Boolean(uploadingId) || !dirty" @click="save"><LoaderCircle v-if="saving" class="spin" :size="18" /><Save v-else :size="18" />{{ saving ? '保存中' : '保存教程' }}</button></footer>
    </template>
  </main>
</template>

<style scoped>
.local-success{margin:16px 0 0;padding:12px 14px;border-radius:10px;background:#eef8f4;color:#246b45;font-size:14px}.tutorial-loading{min-height:360px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted)}.tutorial-settings{margin-top:24px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.035)}.tutorial-settings>header{padding:20px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px}.tutorial-settings header p,.section-heading p{margin:0 0 4px;color:var(--primary);font-size:12px;font-weight:700}.tutorial-settings h2,.section-heading h2{margin:0;font-size:18px}.tutorial-settings select{width:160px}.tutorial-fields{padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.tutorial-fields .wide{grid-column:1/-1}.section-heading{margin:30px 0 14px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.tutorial-list{display:grid;gap:14px}.tutorial-section{position:relative;min-width:0;padding:16px;border:1px solid var(--line);border-radius:14px;display:grid;grid-template-columns:190px minmax(0,1fr);gap:20px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.025)}.tutorial-media{position:relative;min-height:190px;border-radius:11px;overflow:hidden;display:grid;place-items:center;background:#f0f1f3;color:var(--weak)}.tutorial-media img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.tutorial-media label{position:absolute;right:10px;bottom:10px;min-height:44px;padding:0 11px;border:1px solid rgba(255,255,255,.5);border-radius:9px;display:flex;align-items:center;gap:6px;background:rgba(34,34,34,.78);color:#fff;cursor:pointer;font-size:11px;font-weight:650}.tutorial-media input{position:absolute;width:1px;height:1px;opacity:0}.tutorial-content{min-width:0;padding:2px 38px 0 0}.section-number{margin-bottom:12px;color:var(--primary);font-size:13px;font-weight:800}.steps-field{margin-bottom:0}.section-delete{position:absolute;right:16px;top:16px}.tutorial-empty{min-height:240px;border:1px dashed #d9dbe0;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--weak)}.tutorial-empty strong{color:var(--text);font-size:14px}.tutorial-empty span{font-size:12px}.sticky-save{position:sticky;bottom:0;margin-top:20px;padding:14px 0 0;display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--background)}.sticky-save>span{padding-top:12px;color:var(--weak);font-size:12px}.sticky-save .primary-btn{margin-top:12px}@media(max-width:820px){.tutorial-section{grid-template-columns:1fr}.tutorial-media{min-height:240px}.tutorial-content{padding-right:0}.tutorial-fields{grid-template-columns:1fr}.tutorial-fields .wide{grid-column:auto}}@media(max-width:580px){.tutorial-settings>header,.section-heading{align-items:flex-start;flex-direction:column}.tutorial-settings select{width:100%}.sticky-save{align-items:stretch;flex-direction:column}.sticky-save .primary-btn{width:100%;margin-top:0}}
.tutorial-content{padding-right:142px}.section-actions{position:absolute;right:16px;top:16px;display:flex;gap:4px}@media(max-width:820px){.tutorial-content{padding-right:0}.section-actions{position:static;grid-column:1/-1;justify-content:flex-end}}
</style>
