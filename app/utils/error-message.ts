type ErrorRecord = Record<string, unknown>

function asRecord(value: unknown): ErrorRecord | undefined {
  return value !== null && typeof value === 'object' ? value as ErrorRecord : undefined
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const root = asRecord(error)
  const data = asRecord(root?.data)
  const candidates = [data?.message, data?.statusMessage, root?.statusMessage, root?.message]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  return fallback
}

export function pageErrorDetails(
  error: unknown,
  notFoundMessage: string,
): { statusCode: number; message: string } {
  const root = asRecord(error)
  const data = asRecord(root?.data)
  const rawStatus = root?.statusCode ?? root?.status ?? data?.statusCode ?? data?.status
  const statusCode = typeof rawStatus === 'number'
    && Number.isInteger(rawStatus)
    && rawStatus >= 400
    && rawStatus <= 599
    ? rawStatus
    : 500

  return {
    statusCode,
    message: statusCode === 404
      ? notFoundMessage
      : getErrorMessage(error, '页面数据加载失败'),
  }
}
