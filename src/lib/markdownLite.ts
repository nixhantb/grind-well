// A tiny, deliberately limited "markdown" renderer — not a general parser.
// Our content only ever uses **bold**, *italic*, and `inline code`.
// Framework-free on purpose: a plain, unit-testable function, not a Vue
// directive or component.
//
// Order matters twice over:
// 1. Escape HTML entities FIRST, then apply the fixed replacements below.
//    Even if some future edit to the source doc introduced a stray `<` or
//    `&`, it's neutralized before this string is handed to `v-html` — the
//    result can only ever grow the span types explicitly added here.
// 2. Bold before italic. Both use `*`, and **bold** is two asterisks
//    around the text — converting it to <strong> first consumes those
//    literal `*` characters, so the italic regex only ever sees genuine
//    single-asterisk spans afterwards, not a bold pair's leftovers.
export function renderInlineMarkdown(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}
