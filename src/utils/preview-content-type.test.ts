// preview-content-type.ts のテスト
import { describe, expect, it } from 'vitest'
import {
  CSS_CONTENT_TYPE,
  FALLBACK_CONTENT_TYPE,
  HTML_CONTENT_TYPE,
  contentTypeOf,
} from './preview-content-type'

describe('contentTypeOf', () => {
  it.each([
    ['index.html', 'text/html;charset=utf-8'],
    ['index.htm', 'text/html;charset=utf-8'],
    ['style.css', 'text/css;charset=utf-8'],
    ['app.js', 'text/javascript;charset=utf-8'],
    ['app.mjs', 'text/javascript;charset=utf-8'],
    ['data.json', 'application/json;charset=utf-8'],
    ['notes.txt', 'text/plain;charset=utf-8'],
    ['captions.vtt', 'text/vtt;charset=utf-8'],
    ['icon.svg', 'image/svg+xml'],
    ['photo.png', 'image/png'],
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['anim.gif', 'image/gif'],
    ['photo.webp', 'image/webp'],
    ['photo.avif', 'image/avif'],
    ['favicon.ico', 'image/x-icon'],
    ['font.woff', 'font/woff'],
    ['font.woff2', 'font/woff2'],
    ['font.ttf', 'font/ttf'],
    ['font.otf', 'font/otf'],
    ['clip.mp4', 'video/mp4'],
    ['clip.webm', 'video/webm'],
    ['sound.mp3', 'audio/mpeg'],
    ['sound.wav', 'audio/wav'],
    ['sound.ogg', 'audio/ogg'],
  ])('%s → %s', (path, type) => {
    expect(contentTypeOf(path)).toBe(type)
  })

  it('looks at the extension of the file inside folders', () => {
    expect(contentTypeOf('assets/css/style.css')).toBe('text/css;charset=utf-8')
  })

  it('reads the extension without regard to case', () => {
    expect(contentTypeOf('PHOTO.PNG')).toBe('image/png')
  })

  it('uses the fallback for an extension it does not know', () => {
    expect(contentTypeOf('archive.zip')).toBe('application/octet-stream')
  })

  it('uses the fallback for a name without a dot, even if the name looks like an extension', () => {
    expect(contentTypeOf('css')).toBe('application/octet-stream')
  })

  it('does not take a dot in a folder name as the extension', () => {
    expect(contentTypeOf('v1.css/readme')).toBe('application/octet-stream')
  })

  it('exports the types that the preview compares against', () => {
    expect(HTML_CONTENT_TYPE).toBe('text/html;charset=utf-8')
    expect(CSS_CONTENT_TYPE).toBe('text/css;charset=utf-8')
    expect(FALLBACK_CONTENT_TYPE).toBe('application/octet-stream')
  })
})
