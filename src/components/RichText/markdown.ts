import DOMPurify from 'dompurify'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

export function markdownToHtml(value: string): string {
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

export function renderMarkdownHtml(value: string): string {
  if (!value) return ''
  return DOMPurify.sanitize(markdownToHtml(value).trim())
}
