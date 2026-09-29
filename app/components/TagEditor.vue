<script setup lang="ts">
import { ArrowLeft, Save, Hash } from '@lucide/vue'
import type { ForumTag } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

const props = defineProps<{ tag?: ForumTag | null }>()

const form = reactive({ name: props.tag?.name || '' })
const busy = ref(false)
const errorMessage = ref('')

async function save() {
  busy.value = true
  errorMessage.value = ''
  try {
    const endpoint = props.tag ? `/api/studio/tags/${props.tag.id}` : '/api/studio/tags'
    await $fetch(endpoint, {
      method: props.tag ? 'PUT' : 'POST',
      body: form,
    })
    await navigateTo('/admin/tags')
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '保存失败，请检查输入后重试')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="category-editor-page">
    <StudioPageHeader :title="tag ? '编辑标签' : '新建标签'" :description="tag ? '修改后，已关联帖子会自动显示新名称。' : '创建一个关键词，连接不同板块中的相关内容。'" eyebrow="TAG SETTINGS">
      <NuxtLink to="/admin/tags" class="button button-quiet"><ArrowLeft :size="16" />返回标签管理</NuxtLink>
    </StudioPageHeader>

    <div class="editor-grid category-editor-grid">
      <form class="editor-fields" @submit.prevent="save">
        <p v-if="errorMessage" class="form-alert" role="alert">{{ errorMessage }}</p>

        <label class="field">
          <span>标签名称 <small>例如 Prompt、图片处理</small></span>
          <input
            v-model="form.name"
            required
            maxlength="60"
            autocomplete="off"
            autofocus
          >
        </label>

        <div class="category-form-actions">
          <button class="button button-primary" type="submit" :disabled="busy">
            <Save :size="16" />
            {{ busy ? '正在保存…' : tag ? '保存修改' : '创建标签' }}
          </button>
          <NuxtLink to="/admin/tags" class="button button-quiet">取消</NuxtLink>
        </div>
      </form>

      <aside class="category-editor-help">
        <div class="admin-form-preview"><p>标签预览</p><div class="admin-category-name"><span class="admin-tag-icon"><Hash :size="20" /></span><div><strong>{{ form.name || '新的关键词' }}</strong><small>{{ tag?.topicCount || 0 }} 篇关联帖子</small></div></div></div>
        <h2>标签如何工作？</h2>
        <dl>
          <div><dt>创建</dt><dd>创建后即使还没有帖子使用，也会出现在编辑器的标签选项中。</dd></div>
          <div><dt>改名</dt><dd>保留与帖子的关联，所有相关帖子会一起显示新名称。</dd></div>
          <div><dt>删除</dt><dd>只会从帖子中移除该标签，不会删除帖子本身。</dd></div>
          <div v-if="tag"><dt>当前使用量</dt><dd>{{ tag.topicCount }} 篇帖子正在使用这个标签。</dd></div>
        </dl>
      </aside>
    </div>
  </section>
</template>
