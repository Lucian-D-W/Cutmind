// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

describe('RichTextEditor composition input', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('waits until composition ends before emitting a change', async () => {
    const changes: string[] = []

    function Harness() {
      const [value, setValue] = React.useState('')
      return React.createElement(RichTextEditor, {
        value,
        onChange: (next: string) => {
          changes.push(next)
          setValue(next)
        },
      })
    }

    await act(async () => {
      root.render(React.createElement(Harness))
    })

    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement | null
    expect(editor).toBeTruthy()

    await act(async () => {
      editor!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      editor!.innerHTML = '<p>阿</p>'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true, data: '阿', inputType: 'insertCompositionText' }))
    })

    expect(changes).toEqual([])

    await act(async () => {
      editor!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '阿' }))
    })

    expect(changes).toEqual(['<p>阿</p>'])
  })
})
