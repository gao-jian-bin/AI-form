export function useStudioTheme() {
  const isDark = useState('studio-dark', () => false)
  const ready = ref(false)

  function applyTheme(dark: boolean) {
    isDark.value = dark
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('ai-forum-theme', dark ? 'dark' : 'light') } catch { /* Storage may be disabled. */ }
  }

  onMounted(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem('ai-forum-theme') } catch { /* Use the system preference. */ }
    applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
    ready.value = true
  })

  return { isDark, ready, toggleTheme: () => applyTheme(!isDark.value) }
}
