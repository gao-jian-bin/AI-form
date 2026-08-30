import { describe, expect, it } from 'vitest'
import { getErrorMessage, pageErrorDetails } from '../app/utils/error-message'

describe('getErrorMessage', () => {
  it('prefers the response message returned by current H3 versions', () => {
    expect(getErrorMessage({ data: { message: '当前错误文案' } }, '默认文案')).toBe('当前错误文案')
  })

  it('keeps compatibility with legacy statusMessage responses', () => {
    expect(getErrorMessage({ data: { statusMessage: '旧错误文案' } }, '默认文案')).toBe('旧错误文案')
  })

  it('falls back safely for malformed or empty errors', () => {
    expect(getErrorMessage({ data: { message: '' } }, '默认文案')).toBe('默认文案')
    expect(getErrorMessage(null, '默认文案')).toBe('默认文案')
  })
})

describe('pageErrorDetails', () => {
  it('uses the friendly resource message only for an actual 404', () => {
    expect(pageErrorDetails({ statusCode: 404, data: { message: 'API 细节' } }, '主题不存在'))
      .toEqual({ statusCode: 404, message: '主题不存在' })
  })

  it('preserves upstream failures instead of disguising them as missing content', () => {
    expect(pageErrorDetails({ statusCode: 503, data: { message: '数据库暂时不可用' } }, '主题不存在'))
      .toEqual({ statusCode: 503, message: '数据库暂时不可用' })
    expect(pageErrorDetails({}, '主题不存在'))
      .toEqual({ statusCode: 500, message: '页面数据加载失败' })
  })
})
