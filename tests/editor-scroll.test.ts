import { describe, expect, it } from 'vitest'
import { createEditorScrollSync } from '../app/utils/editor-scroll'

describe('editor scroll synchronization', () => {
  const pane = (range: number, scrollTop = 0) => ({ clientHeight: 200, scrollHeight: range + 200, scrollTop })

  it('synchronizes both directions using each pane\'s scrollable range', () => {
    const sync = createEditorScrollSync()
    const editor = pane(2000, 1000)
    const preview = pane(800)
    sync(editor, preview)
    expect(preview.scrollTop).toBe(400)
    sync(preview, editor) // Consume the programmatic scroll event.
    preview.scrollTop = 600
    sync(preview, editor)
    expect(editor.scrollTop).toBe(1500)
  })

  it('ignores programmatic events even when the target rounds its position', () => {
    const sync = createEditorScrollSync()
    const editor = pane(10000, 3333)
    let position = 0
    const preview = {
      clientHeight: 200, scrollHeight: 300,
      get scrollTop() { return position },
      set scrollTop(value: number) { position = Math.round(value) },
    }
    sync(editor, preview)
    expect(preview.scrollTop).toBe(33)
    sync(preview, editor)
    expect(editor.scrollTop).toBe(3333)
  })

  it('does not swallow a user scroll arriving before the pending event', () => {
    const sync = createEditorScrollSync()
    const editor = pane(2000, 1000)
    const preview = pane(800)
    sync(editor, preview)
    preview.scrollTop = 200
    sync(preview, editor)
    expect(editor.scrollTop).toBe(500)
  })

  it('leaves hidden or non-scrollable panes alone', () => {
    for (const source of [pane(0), { clientHeight: 0, scrollHeight: 2000, scrollTop: 0 }]) {
      const target = pane(2000, 1000)
      createEditorScrollSync()(source, target)
      expect(target.scrollTop).toBe(1000)
    }
    const hidden = { clientHeight: 0, scrollHeight: 2000, scrollTop: 500 }
    createEditorScrollSync()(pane(1000), hidden)
    expect(hidden.scrollTop).toBe(500)
  })

  it('clamps overscroll to the beginning and end', () => {
    const sync = createEditorScrollSync()
    const target = pane(800, 400)
    sync(pane(2000, -20), target)
    expect(target.scrollTop).toBe(0)
    sync(pane(2000, 2050), target)
    expect(target.scrollTop).toBe(800)
  })
})
