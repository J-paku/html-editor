// 書き込みの許可を確かめることと、許可されていないときにもう一度求めること
import { describe, expect, it, vi } from 'vitest'
import { fakeFile } from './fake-file-system.test-helper'
import { ensureWritePermission, queryWritePermission } from './request-permission'

// 許可のメソッドを持つハンドル。requestedはもう一度求めたときの答え(undefinedならそのメソッドが無い)
const handleWith = (current: PermissionState, requested?: PermissionState) => {
  const queryPermission = vi.fn(() => Promise.resolve(current))
  const requestPermission = vi.fn(() => Promise.resolve(requested))
  const handle = {
    ...fakeFile('a.html'),
    queryPermission,
    ...(requested === undefined ? {} : { requestPermission }),
  }
  return { handle, queryPermission, requestPermission }
}

describe('queryWritePermission', () => {
  it.each(['granted', 'prompt', 'denied'] as const)(
    'reports %s, asking about write access',
    async state => {
      const { handle, queryPermission } = handleWith(state)

      expect(await queryWritePermission(handle)).toBe(state)
      expect(queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
    }
  )

  it('a handle without the permission methods can always write → granted', async () => {
    expect(await queryWritePermission(fakeFile('a.html'))).toBe('granted')
  })
})

describe('ensureWritePermission', () => {
  it('already granted → true without asking', async () => {
    const { handle, requestPermission } = handleWith('granted', 'denied')

    expect(await ensureWritePermission(handle)).toBe(true)
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it.each(['prompt', 'denied'] as const)(
    'not granted (%s) → asks for write access, and the answer decides',
    async state => {
      const granting = handleWith(state, 'granted')
      expect(await ensureWritePermission(granting.handle)).toBe(true)
      expect(granting.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' })

      const refusing = handleWith(state, 'denied')
      expect(await ensureWritePermission(refusing.handle)).toBe(false)
    }
  )

  it('not granted and no way to ask → false', async () => {
    expect(await ensureWritePermission(handleWith('prompt').handle)).toBe(false)
  })

  it('a handle without the permission methods → true', async () => {
    expect(await ensureWritePermission(fakeFile('a.html'))).toBe(true)
  })
})
