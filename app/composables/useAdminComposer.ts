export interface AdminComposerRequest {
  key: number
  mode: 'new' | 'edit'
  topicId: number | null
}

export function useAdminComposer() {
  const request = useState<AdminComposerRequest | null>('admin-composer-request', () => null)
  const collapsed = useState('admin-composer-collapsed', () => false)
  const revision = useState('admin-composer-revision', () => 0)

  function openEdit(topicId: number) {
    request.value = { key: Date.now(), mode: 'edit', topicId }
    collapsed.value = false
  }

  function openNew() {
    request.value = { key: Date.now(), mode: 'new', topicId: null }
    collapsed.value = false
  }

  function close() {
    request.value = null
    collapsed.value = false
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function markSaved() {
    revision.value += 1
  }

  return {
    request,
    collapsed,
    revision,
    openEdit,
    openNew,
    close,
    toggleCollapsed,
    markSaved,
  }
}
