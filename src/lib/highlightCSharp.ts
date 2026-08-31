// Wraps Prism (vendored via npm, not a CDN <script>) for one language only.
// Prism.highlight() itself HTML-escapes the source text before wrapping
// pieces of it in <span class="token ...">, so the output is safe to render
// as raw HTML even before our own markdownLite escaping habits apply —
// it's not just "our data is trusted", the library independently protects
// against the source code itself containing `<`/`&`.
import Prism from 'prismjs'
import 'prismjs/components/prism-csharp'

export function highlightCSharp(code: string): string {
  return Prism.highlight(code, Prism.languages.csharp, 'csharp')
}
