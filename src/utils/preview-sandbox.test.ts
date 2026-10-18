// preview-sandbox.ts のテスト
import { describe, expect, it } from 'vitest'
import { PREVIEW_SANDBOX } from './preview-sandbox'

describe('PREVIEW_SANDBOX', () => {
  it('lets scripts run and grants nothing else', () => {
    expect(PREVIEW_SANDBOX).toBe('allow-scripts')
  })

  it('never contains allow-same-origin (with allow-scripts, the HTML could remove its own sandbox)', () => {
    expect(PREVIEW_SANDBOX.split(/\s+/)).not.toContain('allow-same-origin')
  })
})
