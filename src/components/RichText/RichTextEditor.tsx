import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import type { CSSProperties, MouseEvent } from 'react'

type StyleCommand = 'bold' | 'italic'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  style?: CSSProperties
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void
}

export interface RichTextEditorHandle {
  focus: () => void
  getSelectedText: () => string
  applyFontFamily: (fontFamily: string) => void
  applyFontSize: (fontSize: number) => void
  applyTextColor: (color: string) => void
  toggleStyle: (style: StyleCommand) => void
}

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'I', 'LI', 'OL', 'P', 'SPAN', 'STRONG', 'UL',
])
const ALLOWED_STYLES = new Set(['color', 'font-family', 'font-size', 'font-style', 'font-weight'])

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(value: string): string {
  if (!value) return ''
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
  return null
}

function applyInlineMarkdown(value: string): string {
  const placeholders: string[] = []
  const stash = (html: string) => {
    const key = `__MD_${placeholders.length}__`
    placeholders.push(html)
    return key
  }

  let next = escapeHtml(value)

  next = next.replace(/`([^`]+)`/g, (_, code: string) => stash(`<code>${escapeHtml(code)}</code>`))

  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return escapeHtml(label)
    return stash(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(label)}</a>`)
  })

  next = next.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  next = next.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  next = next.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
  next = next.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')

  return next.replace(/__MD_(\d+)__/g, (_, index: string) => placeholders[Number(index)] ?? '')
}

function markdownToHtml(value: string): string {
  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let paragraphLines: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let quoteLines: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push(`<p>${paragraphLines.map(applyInlineMarkdown).join('<br>')}</p>`)
    paragraphLines = []
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) return
    blocks.push(`<${listType}>${listItems.map(item => `<li>${applyInlineMarkdown(item)}</li>`).join('')}</${listType}>`)
    listType = null
    listItems = []
  }

  const flushQuote = () => {
    if (quoteLines.length === 0) return
    blocks.push(`<blockquote>${quoteLines.map(applyInlineMarkdown).join('<br>')}</blockquote>`)
    quoteLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      flushQuote()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      flushQuote()
      const level = headingMatch[1].length
      blocks.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      quoteLines.push(quoteMatch[1])
      continue
    }

    const unorderedItem = trimmed.match(/^[-*]\s+(.*)$/)
    if (unorderedItem) {
      flushParagraph()
      flushQuote()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(unorderedItem[1])
      continue
    }

    const orderedItem = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedItem) {
      flushParagraph()
      flushQuote()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(orderedItem[1])
      continue
    }

    flushList()
    flushQuote()
    paragraphLines.push(trimmed)
  }

  flushParagraph()
  flushList()
  flushQuote()

  return blocks.join('')
}

function looksLikeRichHtml(value: string): boolean {
  if (!/<[a-z][\s\S]*>/i.test(value)) return false

  const container = document.createElement('div')
  container.innerHTML = value

  for (const element of Array.from(container.querySelectorAll('*'))) {
    const tag = element.tagName.toUpperCase()
    if (!['DIV', 'BR'].includes(tag)) return true
    if (element.getAttribute('style')) return true
    for (const attr of Array.from(element.attributes)) {
      if (attr.name !== 'style') return true
    }
  }

  return false
}

function sanitizeNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) return
  if (!(node instanceof HTMLElement)) return

  for (const child of Array.from(node.childNodes)) {
    sanitizeNode(child)
  }

  const tag = node.tagName.toUpperCase()
  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment()
    while (node.firstChild) {
      fragment.appendChild(node.firstChild)
    }
    node.replaceWith(fragment)
    return
  }

  for (const attr of Array.from(node.attributes)) {
    const allowHref = tag === 'A' && (attr.name === 'href' || attr.name === 'target' || attr.name === 'rel')
    if (attr.name !== 'style' && !allowHref) {
      node.removeAttribute(attr.name)
    }
  }

  if (tag === 'A') {
    const href = node.getAttribute('href')
    const safeHref = href ? sanitizeUrl(href) : null
    if (!safeHref) {
      const fragment = document.createDocumentFragment()
      while (node.firstChild) {
        fragment.appendChild(node.firstChild)
      }
      node.replaceWith(fragment)
      return
    }
    node.setAttribute('href', safeHref)
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noreferrer noopener')
  }

  const styles = node.getAttribute('style')
  if (!styles) return

  const nextStyles: string[] = []
  for (const part of styles.split(';')) {
    const [rawName, rawValue] = part.split(':')
    if (!rawName || !rawValue) continue
    const name = rawName.trim().toLowerCase()
    const value = rawValue.trim()
    if (!ALLOWED_STYLES.has(name) || !value) continue
    nextStyles.push(`${name}: ${value}`)
  }

  if (nextStyles.length === 0) {
    node.removeAttribute('style')
  } else {
    node.setAttribute('style', nextStyles.join('; '))
  }
}

export function normalizeRichText(value: string): string {
  if (!value) return ''

  const source = looksLikeRichHtml(value) ? value : markdownToHtml(value)
  const container = document.createElement('div')
  container.innerHTML = source

  for (const child of Array.from(container.childNodes)) {
    sanitizeNode(child)
  }

  const html = container.innerHTML
    .replace(/&nbsp;/g, ' ')
    .replace(/<div><br><\/div>/gi, '<br>')
    .trim()

  return html
}

export function richTextToPlainText(value: string): string {
  if (!value) return ''
  const container = document.createElement('div')
  container.innerHTML = normalizeRichText(value)
  return container.textContent ?? ''
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder, className, style, onContextMenu }, ref) {
    const editorRef = useRef<HTMLDivElement>(null)
    const savedRangeRef = useRef<Range | null>(null)
    const lastValueRef = useRef('')
    const isComposingRef = useRef(false)
    const normalizedValue = useMemo(() => normalizeRichText(value), [value])

    const emitChange = () => {
      const editor = editorRef.current
      if (!editor) return
      if (isComposingRef.current) return
      const rawHtml = editor.innerHTML
      const next = looksLikeRichHtml(rawHtml)
        ? normalizeRichText(rawHtml)
        : normalizeRichText(editor.innerText)
      if (next !== lastValueRef.current) {
        lastValueRef.current = next
        onChange(next)
      }
      editor.dataset.empty = next ? 'false' : 'true'
    }

    const saveRange = () => {
      const editor = editorRef.current
      const selection = window.getSelection()
      if (!editor || !selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (!editor.contains(range.commonAncestorContainer)) return
      savedRangeRef.current = range.cloneRange()
    }

    const restoreRange = () => {
      const selection = window.getSelection()
      if (!selection || !savedRangeRef.current) return false
      selection.removeAllRanges()
      selection.addRange(savedRangeRef.current)
      return true
    }

    const runCommand = (callback: () => void) => {
      const editor = editorRef.current
      if (!editor) return
      editor.focus()
      restoreRange()
      document.execCommand('styleWithCSS', false, 'true')
      callback()
      saveRange()
      emitChange()
    }

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault()
      const text = event.clipboardData.getData('text/plain')
      runCommand(() => {
        document.execCommand('insertHTML', false, textToHtml(text))
      })
    }

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getSelectedText: () => {
        const selection = window.getSelection()
        return selection?.toString() ?? ''
      },
      applyFontFamily: (fontFamily: string) => {
        runCommand(() => {
          document.execCommand('fontName', false, fontFamily)
        })
      },
      applyFontSize: (fontSize: number) => {
        runCommand(() => {
          document.execCommand('fontSize', false, '7')
          const editor = editorRef.current
          if (!editor) return
          for (const font of Array.from(editor.querySelectorAll('font[size="7"]'))) {
            const span = document.createElement('span')
            span.style.fontSize = `${fontSize}px`
            span.innerHTML = font.innerHTML
            font.replaceWith(span)
          }
        })
      },
      applyTextColor: (color: string) => {
        runCommand(() => {
          document.execCommand('foreColor', false, color)
        })
      },
      toggleStyle: (command: StyleCommand) => {
        runCommand(() => {
          document.execCommand(command, false)
        })
      },
    }))

    useEffect(() => {
      const editor = editorRef.current
      if (!editor) return
      if (isComposingRef.current) return
      if (normalizedValue !== editor.innerHTML) {
        editor.innerHTML = normalizedValue
        editor.dataset.empty = normalizedValue ? 'false' : 'true'
        lastValueRef.current = normalizedValue
      }
    }, [normalizedValue])

    useEffect(() => {
      const handleSelectionChange = () => saveRange()
      document.addEventListener('selectionchange', handleSelectionChange)
      return () => document.removeEventListener('selectionchange', handleSelectionChange)
    }, [])

    return (
      <div
        ref={editorRef}
        data-no-drag
        data-placeholder={placeholder ?? ''}
        data-empty={normalizedValue ? 'false' : 'true'}
        contentEditable
        suppressContentEditableWarning
        className={className}
        style={style}
        onInput={emitChange}
        onBlur={() => {
          saveRange()
          emitChange()
        }}
        onKeyUp={saveRange}
        onMouseUp={saveRange}
        onPaste={handlePaste}
        onContextMenu={onContextMenu}
        onCompositionStart={() => {
          isComposingRef.current = true
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false
          saveRange()
          emitChange()
        }}
      />
    )
  }
)
