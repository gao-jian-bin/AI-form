<script setup lang="ts">
const props = defineProps<{
  html: string
}>()

const root = ref<HTMLElement | null>(null)

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard copy failed')
}

async function handleClick(event: MouseEvent) {
  const target = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>('[data-copy-code]')
    : null
  if (!target || !root.value?.contains(target)) return

  const code = target.closest('.code-block-wrapper')?.querySelector('pre code')
  if (!code) return

  const originalLabel = target.getAttribute('aria-label') || '复制预格式化文本'
  try {
    await writeClipboard(code.textContent || '')
    target.textContent = '已复制'
    target.setAttribute('aria-label', '已复制预格式化文本')
  }
  catch {
    target.textContent = '复制失败'
    target.setAttribute('aria-label', '复制失败，请手动选择文本')
  }

  window.setTimeout(() => {
    if (!target.isConnected) return
    target.textContent = '复制'
    target.setAttribute('aria-label', originalLabel)
  }, 1600)
}
</script>

<template>
  <div ref="root" class="markdown-body" @click="handleClick" v-html="props.html" />
</template>
