<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <NuxtLoadingIndicator
    :height="3"
    :throttle="300"
    :hide-delay="0"
    color="var(--tertiary)"
    error-color="var(--danger)"
  />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AdminComposerHost />
</template>
