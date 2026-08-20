<template>
  <div class="studio-shell">
    <header class="studio-header">
      <NuxtLink to="/studio" class="studio-brand">
        <span class="brand-mark brand-mark-small" aria-hidden="true">AI</span>
        <span>内容工作台</span>
      </NuxtLink>
      <NuxtLink to="/" class="button button-quiet">查看网站 ↗</NuxtLink>
    </header>
    <main class="studio-main">
      <slot />
    </main>
  </div>
</template>
