<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ForumTag } from '~/types/forum'

const props = withDefaults(defineProps<{
  modelValue: string[]
  options: ForumTag[]
  max?: number
  loadError?: boolean
}>(), { max: 8, loadError: false })
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const triggerButton = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const query = ref('')
const normalizedSelected = computed(() => props.modelValue.map(tag => tag.toLocaleLowerCase()))
const filteredOptions = computed(() => props.options.filter(tag =>
  !normalizedSelected.value.includes(tag.name.toLocaleLowerCase())
  && tag.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
))
const createCandidate = computed(() => query.value.trim())
const canCreate = computed(() => Boolean(createCandidate.value)
  && !props.options.some(tag => tag.name.toLocaleLowerCase() === createCandidate.value.toLocaleLowerCase())
  && !normalizedSelected.value.includes(createCandidate.value.toLocaleLowerCase())
  && props.modelValue.length < props.max)
const activeIndex = ref(-1)

watch(query, () => {
  activeIndex.value = filteredOptions.value.length ? 0 : -1
})

function add(name: string) {
  if (props.modelValue.length >= props.max) return
  if (normalizedSelected.value.includes(name.toLocaleLowerCase())) return
  emit('update:modelValue', [...props.modelValue, name.trim()])
  query.value = ''
  open.value = false
  void nextTick(() => triggerButton.value?.focus())
}

function remove(name: string) {
  emit('update:modelValue', props.modelValue.filter(tag => tag !== name))
}

function handleKeydown(event: KeyboardEvent) {
  const choices = filteredOptions.value
  if (event.key === 'Escape') {
    open.value = false
    void nextTick(() => triggerButton.value?.focus())
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(choices.length - 1, 0))
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = activeIndex.value < 0
      ? Math.max(choices.length - 1, 0)
      : Math.max(activeIndex.value - 1, 0)
    return
  }
  if (event.key !== 'Enter') return
  event.preventDefault()
  const activeOption = choices[activeIndex.value]
  if (activeOption) add(activeOption.name)
  else if (canCreate.value) add(createCandidate.value)
}
</script>

<template>
  <div class="tag-chooser">
    <div class="tag-chooser__selected">
      <span v-for="tag in modelValue" :key="tag" class="tag-chooser__chip">
        {{ tag }}
        <button type="button" :aria-label="`移除标签：${tag}`" @click="remove(tag)">×</button>
      </span>
      <button
        ref="triggerButton"
        type="button"
        aria-label="选择标签"
        :aria-expanded="open"
        :aria-disabled="modelValue.length >= max ? 'true' : 'false'"
        @click="open = !open"
      >
        {{ modelValue.length ? '添加标签' : '选择标签' }}
      </button>
    </div>

    <div v-if="open" class="tag-chooser__menu">
      <input
        v-model="query"
        type="search"
        aria-label="搜索或创建标签"
        placeholder="搜索或创建标签"
        @keydown="handleKeydown"
      >
      <p v-if="loadError" class="tag-chooser__message" role="alert">
        已有标签暂时无法加载，仍可输入新标签。
      </p>
      <button
        v-for="tag in filteredOptions"
        :key="tag.id"
        type="button"
        :class="{ 'is-active': filteredOptions.indexOf(tag) === activeIndex }"
        :data-tag-option="tag.name"
        @click="add(tag.name)"
      >
        <span>{{ tag.name }}</span>
        <small>{{ tag.topicCount }} 篇帖子</small>
      </button>
      <button v-if="canCreate" type="button" data-create-tag @click="add(createCandidate)">
        创建“{{ createCandidate }}”
      </button>
    </div>
  </div>
</template>

<style scoped>
.tag-chooser {
  position: relative;
  min-width: 0;
  flex: 1;
}

.tag-chooser__selected {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 5px 8px;
  border-right: 1px solid var(--primary-low);
}

.tag-chooser__chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 3px;
  background: var(--primary-very-low);
  font-size: 12px;
  white-space: nowrap;
}

.tag-chooser__chip button,
.tag-chooser__selected > button,
.tag-chooser__menu button {
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.tag-chooser__selected > button {
  color: var(--primary-medium);
  white-space: nowrap;
}

.tag-chooser__menu {
  position: absolute;
  z-index: 4;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--primary-low);
  background: var(--secondary);
  box-shadow: 0 8px 18px rgb(0 0 0 / 0.16);
}

.tag-chooser__menu input {
  width: 100%;
  margin-bottom: 4px;
}

.tag-chooser__menu button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 8px;
  text-align: left;
}

.tag-chooser__menu button:hover,
.tag-chooser__menu button:focus-visible,
.tag-chooser__menu button.is-active {
  background: var(--hover);
}

.tag-chooser__message {
  margin: 6px 8px;
  color: var(--primary-medium);
  font-size: 12px;
}
</style>
