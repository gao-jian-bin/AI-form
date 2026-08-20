<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { StudioTopic } from '~/types/forum'

const props = defineProps<{ topic?: StudioTopic | null }>()

const form = reactive({
  title: props.topic?.title || '',
  slug: props.topic?.slug || '',
  excerpt: props.topic?.excerpt || '',
  categorySlug: props.topic?.category.slug || 'chatgpt',
  tags: props.topic?.tags.join(', ') || '',
  contentMarkdown: props.topic?.contentMarkdown || '',
  externalUrl: props.topic?.externalUrl || '',
  isPinned: props.topic?.isPinned || false,
})
const busy = ref(false)
const errorMessage = ref('')
const previewHtml = ref('')
let previewTimer: ReturnType<typeof setTimeout> | undefined

async function updatePreview() {
  try {
    const result = await $fetch<{ html: string }>('/api/studio/preview', {
      method: 'POST',
      body: { markdown: form.contentMarkdown },
    })
    previewHtml.value = result.html
  } catch {
    previewHtml.value = '<p>预览暂时不可用。</p>'
  }
}

function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(updatePreview, 220)
}

async function save(status: 'draft' | 'published') {
  busy.value = true
  errorMessage.value = ''
  try {
    const endpoint = props.topic ? `/api/studio/topics/${props.topic.id}` : '/api/studio/topics'
    await $fetch(endpoint, {
      method: props.topic ? 'PUT' : 'POST',
      body: {
        ...form,
        status,
        externalUrl: form.categorySlug === 'toolbox' ? form.externalUrl : '',
      },
    })
    await navigateTo('/studio')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.statusMessage || '保存失败，请检查输入后重试'
  } finally {
    busy.value = false
  }
}

onMounted(updatePreview)
</script>

<template>
  <form class="editor-shell" @submit.prevent="save('published')">
    <header class="editor-heading">
      <div>
        <p class="stream-eyebrow">{{ topic ? 'EDIT TOPIC' : 'NEW TOPIC' }}</p>
        <h1>{{ topic ? '编辑主题' : '创建主题' }}</h1>
        <p>内容保存后会立即出现在公共主题流中，草稿除外。</p>
      </div>
      <div class="editor-actions">
        <NuxtLink to="/studio" class="button button-quiet">取消</NuxtLink>
        <button class="button button-secondary" type="button" :disabled="busy" @click="save('draft')">保存草稿</button>
        <button class="button button-primary" type="submit" :disabled="busy">{{ busy ? '正在保存…' : '发布主题' }}</button>
      </div>
    </header>

    <div v-if="errorMessage" class="form-alert" role="alert">{{ errorMessage }}</div>

    <div class="editor-grid">
      <section class="editor-fields">
        <label class="field field-wide">
          <span>标题</span>
          <input v-model="form.title" required maxlength="140" placeholder="一句话说清楚这个主题">
        </label>

        <div class="field-row">
          <label class="field">
            <span>板块</span>
            <select v-model="form.categorySlug">
              <option value="chatgpt">ChatGPT</option>
              <option value="toolbox">工具箱</option>
            </select>
          </label>
          <label class="field">
            <span>标签</span>
            <input v-model="form.tags" placeholder="Prompt, 工作流">
          </label>
        </div>

        <label class="field field-wide">
          <span>Slug <small>仅创建时生效</small></span>
          <input v-model="form.slug" maxlength="160" placeholder="留空则根据标题自动生成">
        </label>

        <label class="field field-wide">
          <span>摘要 <small>留空则从正文提取</small></span>
          <textarea v-model="form.excerpt" rows="3" maxlength="280" placeholder="主题列表里显示的简短说明" />
        </label>

        <label v-if="form.categorySlug === 'toolbox'" class="field field-wide">
          <span>工具链接</span>
          <input v-model="form.externalUrl" type="url" placeholder="https://example.com/tool">
        </label>

        <label class="check-field">
          <input v-model="form.isPinned" type="checkbox">
          <span><strong>置顶主题</strong><small>在主题流顶部优先显示</small></span>
        </label>

        <label class="field field-wide markdown-field">
          <span>正文 · Markdown</span>
          <textarea
            v-model="form.contentMarkdown"
            required
            rows="22"
            placeholder="# 小标题&#10;&#10;写下真正有用的内容…"
            @input="schedulePreview"
          />
        </label>
      </section>

      <section class="editor-preview">
        <div class="preview-heading"><span>实时预览</span><small>已安全过滤 HTML</small></div>
        <div v-if="previewHtml" class="markdown-body" v-html="previewHtml" />
        <div v-else class="preview-empty">开始输入正文后，这里会显示排版效果。</div>
      </section>
    </div>
  </form>
</template>
