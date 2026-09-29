<script setup lang="ts">
import { ArrowLeft, Save, FolderOpen } from '@lucide/vue'
import type { StudioCategory } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

const props = defineProps<{ category?: StudioCategory | null }>()

const form = reactive({
  name: props.category?.name || '',
  slug: props.category?.slug || '',
  description: props.category?.description || '',
  color: props.category?.color || '#0f9f7f',
  position: props.category?.position ?? 0,
})
const busy = ref(false)
const errorMessage = ref('')

async function save() {
  busy.value = true
  errorMessage.value = ''
  try {
    const endpoint = props.category
      ? `/api/studio/categories/${props.category.id}`
      : '/api/studio/categories'
    await $fetch(endpoint, {
      method: props.category ? 'PUT' : 'POST',
      body: form,
    })
    await navigateTo('/admin/categories')
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '保存失败，请检查输入后重试')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="category-editor-page">
    <StudioPageHeader :title="category ? '编辑板块' : '新建板块'" :description="category ? '更新板块信息，让内容结构保持清晰。原有网址保持不变。' : '为新的知识方向建立一个专属内容分区。'" eyebrow="CATEGORY SETTINGS">
      <NuxtLink to="/admin/categories" class="button button-quiet"><ArrowLeft :size="16" />返回板块管理</NuxtLink>
    </StudioPageHeader>

    <div class="editor-grid category-editor-grid">
      <form class="editor-fields" @submit.prevent="save">
        <p v-if="errorMessage" class="form-alert" role="alert">{{ errorMessage }}</p>

        <label class="field">
          <span>板块名称 <small>显示给访客，例如 AI 绘画</small></span>
          <input v-model="form.name" required maxlength="60" autocomplete="off">
        </label>

        <label class="field">
          <span>网址标识 <small>创建后不能修改，例如 ai-image</small></span>
          <input
            v-model="form.slug"
            required
            maxlength="80"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="ai-image"
            autocomplete="off"
            :readonly="Boolean(category)"
          >
        </label>

        <label class="field">
          <span>板块说明 <small>告诉访客这里收录什么</small></span>
          <textarea v-model="form.description" maxlength="300" rows="4" />
        </label>

        <div class="field-row category-field-row">
          <label class="field">
            <span>板块颜色</span>
            <span class="color-field">
              <input v-model="form.color" type="color">
              <code>{{ form.color }}</code>
            </span>
          </label>
          <label class="field">
            <span>显示顺序 <small>数字越小越靠前</small></span>
            <input v-model.number="form.position" type="number" required min="0" max="9999">
          </label>
        </div>

        <div class="category-form-actions">
          <button class="button button-primary" type="submit" :disabled="busy">
            <Save :size="16" />
            {{ busy ? '正在保存…' : category ? '保存修改' : '创建板块' }}
          </button>
          <NuxtLink to="/admin/categories" class="button button-quiet">取消</NuxtLink>
        </div>
      </form>

      <aside class="category-editor-help">
        <div class="admin-form-preview">
          <p>板块预览</p>
          <div class="admin-category-name"><span class="admin-category-icon" :style="{ '--category-color': form.color }"><FolderOpen :size="20" /></span><div><strong>{{ form.name || '新的内容板块' }}</strong><small>{{ form.description || '用一句话介绍这里的内容。' }}</small></div></div>
          <small>/c/{{ form.slug || 'your-category' }}</small>
        </div>
        <h2>这些字段有什么用？</h2>
        <dl>
          <div><dt>名称</dt><dd>显示在左侧分类导航和帖子列表中，可以随时修改。</dd></div>
          <div><dt>网址标识</dt><dd>组成板块地址，例如 <code>/c/ai-image</code>。创建后锁定，旧链接不会失效。</dd></div>
          <div><dt>颜色</dt><dd>显示在板块名称旁边，方便访客快速区分内容。</dd></div>
          <div><dt>顺序</dt><dd>控制左侧分类导航的排列，数字较小的板块排在前面。</dd></div>
        </dl>
      </aside>
    </div>
  </section>
</template>
