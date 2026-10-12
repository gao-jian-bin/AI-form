interface ScrollPane {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

// Scroll events from programmatic synchronization must not bounce back.
export function createEditorScrollSync() {
  const pending = new WeakMap<ScrollPane, number>()
  return (source: ScrollPane, target: ScrollPane) => {
    const expected = pending.get(source)
    if (expected !== undefined) {
      pending.delete(source)
      if (Math.abs(source.scrollTop - expected) < 1) return
    }
    // On mobile only one pane is visible. Do not let a hidden pane reset it.
    if (source.clientHeight <= 0 || target.clientHeight <= 0) return
    const sourceRange = source.scrollHeight - source.clientHeight
    const targetRange = target.scrollHeight - target.clientHeight
    if (sourceRange <= 0 || targetRange <= 0) return
    const ratio = Math.max(0, Math.min(1, source.scrollTop / sourceRange))
    const position = ratio * targetRange
    if (Math.abs(target.scrollTop - position) < 1) return
    target.scrollTop = position
    // Read back the actual (potentially rounded/clamped) browser position.
    pending.set(target, target.scrollTop)
  }
}
