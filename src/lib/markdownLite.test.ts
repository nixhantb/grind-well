import { describe, it, expect } from 'vitest'
import { renderInlineMarkdown } from './markdownLite'

describe('renderInlineMarkdown', () => {
  it('renders bold', () => {
    expect(renderInlineMarkdown('**Bold.** rest')).toBe('<strong>Bold.</strong> rest')
  })

  it('renders italic', () => {
    expect(renderInlineMarkdown('the *expected output* by hand')).toBe('the <em>expected output</em> by hand')
  })

  it('renders inline code', () => {
    expect(renderInlineMarkdown('use `TryGetValue` here')).toBe('use <code>TryGetValue</code> here')
  })

  it('renders all three in one string without cross-contamination', () => {
    const input = '**Bold** and *italic* and `code`.'
    expect(renderInlineMarkdown(input)).toBe('<strong>Bold</strong> and <em>italic</em> and <code>code</code>.')
  })

  it('does not let bold asterisks get mistaken for italic', () => {
    // this was the actual bug: naively adding italic support before bold
    // would eat one `*` from each side of a **bold** pair.
    expect(renderInlineMarkdown('**A** and **B**')).toBe('<strong>A</strong> and <strong>B</strong>')
  })

  it('escapes HTML-looking characters before adding any real markup', () => {
    expect(renderInlineMarkdown('a < b && b > c')).toBe('a &lt; b &amp;&amp; b &gt; c')
  })

  it('escapes first even inside a bold/code span', () => {
    expect(renderInlineMarkdown('**a < b**')).toBe('<strong>a &lt; b</strong>')
  })

  it('passes plain text through unchanged', () => {
    expect(renderInlineMarkdown('nothing special here')).toBe('nothing special here')
  })
})
