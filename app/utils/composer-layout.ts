const MIN_COMPOSER_HEIGHT = 320
const VIEWPORT_GAP = 16

export function clampComposerHeight(proposedHeight: number, viewportHeight: number) {
  const maximumHeight = Math.max(MIN_COMPOSER_HEIGHT, viewportHeight - VIEWPORT_GAP)
  return Math.min(Math.max(proposedHeight, MIN_COMPOSER_HEIGHT), maximumHeight)
}
