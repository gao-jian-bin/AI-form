import { describe, expect, it } from 'vitest'
import { serializeJsonLd } from '../app/utils/json-ld'

describe('serializeJsonLd', () => {
  it('keeps valid JSON while preventing a title from closing the script element', () => {
    const serialized = serializeJsonLd({ headline: '</script><img src=x onerror=alert(1)>' })

    expect(serialized).not.toContain('</script>')
    expect(serialized).not.toContain('<img')
    expect(JSON.parse(serialized)).toEqual({ headline: '</script><img src=x onerror=alert(1)>' })
  })
})
