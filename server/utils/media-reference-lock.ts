let mediaReferenceBarrier: Promise<void> = Promise.resolve()

export async function withMediaReferenceLock<T>(
  operation: () => T | Promise<T>,
): Promise<T> {
  const previous = mediaReferenceBarrier
  let release!: () => void
  mediaReferenceBarrier = new Promise(resolveRelease => { release = resolveRelease })
  await previous
  try {
    return await operation()
  }
  finally {
    release()
  }
}
