<script setup lang="ts">
import type { TopicSummary } from '~/types/forum'

defineProps<{ hotTopics: TopicSummary[] }>()
</script>

<template>
  <aside class="forum-aside">
    <section class="about-panel">
      <p class="rail-label">关于这里</p>
      <h2>少一点噪声，<br>多一点可复用。</h2>
      <p>收录 ChatGPT 实践、学习框架和经过筛选的在线工具。</p>
      <div class="about-status"><span /> 由站长持续更新</div>
    </section>

    <section v-if="hotTopics.length" class="hot-panel">
      <div class="aside-heading">
        <p class="rail-label">热门主题</p>
        <span>按浏览</span>
      </div>
      <ol>
        <li v-for="(topic, index) in hotTopics.slice(0, 4)" :key="topic.id">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <NuxtLink :to="`/t/${topic.slug}/${topic.id}`">{{ topic.title }}</NuxtLink>
        </li>
      </ol>
    </section>
  </aside>
</template>
