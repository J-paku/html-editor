// tie-opening.tsのテスト
import { describe, expect, it } from 'vitest'
import { sessionOf, textFile } from './session.test-helper'
import { dropKept, forOpening, valueForOpening } from './tie-opening'

const session = sessionOf([textFile('index.html')])

describe('forOpening', () => {
  it('keeps the value with the openId of the session', () => {
    expect(forOpening(session, 'index.html')).toStrictEqual({
      openId: session.openId,
      value: 'index.html',
    })
  })
})

describe('valueForOpening', () => {
  it('gives the value while its opening is open, also after the session changed within it', () => {
    expect(valueForOpening(forOpening(session, 'kept'), { ...session, activePath: 'x' })).toBe(
      'kept'
    )
  })

  it.each([
    ['nothing is kept', null, session],
    ['nothing is open (the project was closed)', forOpening(session, 'kept'), null],
    [
      'another opening is open (also of the same project)',
      forOpening(session, 'kept'),
      sessionOf([textFile('index.html')]),
    ],
  ])('is null when %s', (_, kept, current) => {
    expect(valueForOpening(kept, current)).toBeNull()
  })
})

describe('dropKept', () => {
  it('keeps nothing when the value the step set is still kept', () => {
    const mine = forOpening(session, true)
    expect(dropKept(mine, mine)).toBeNull()
  })

  it('keeps what another step set meanwhile, also an equal value', () => {
    const mine = forOpening(session, true)
    const theirs = forOpening(session, true)
    expect(dropKept(theirs, mine)).toBe(theirs)
  })

  it('keeps nothing when nothing is kept', () => {
    expect(dropKept(null, forOpening(session, true))).toBeNull()
  })
})
