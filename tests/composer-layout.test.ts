import { describe, expect, it } from 'vitest'
import { clampComposerHeight } from '../app/utils/composer-layout'

describe('clampComposerHeight', () => {
  it('keeps the composer usable and inside the viewport', () => {
    expect(clampComposerHeight(200, 900)).toBe(320)
    expect(clampComposerHeight(540, 900)).toBe(540)
    expect(clampComposerHeight(1000, 900)).toBe(884)
  })
})
