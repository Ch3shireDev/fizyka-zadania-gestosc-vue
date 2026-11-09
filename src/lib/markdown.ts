import MarkdownIt from 'markdown-it'
import katex from 'katex'

// Markdown z TeX-em: najpierw wycinamy wzory i zamieniamy je na znaczniki,
// markdown-it renderuje resztę, a potem wklejamy z powrotem HTML z KaTeX-a.
// Dzięki temu markdown nie zjada podkreśleń i gwiazdek ze wzorów.
//
//   $$ ... $$  – wzór w osobnej linii
//   $ ... $    – wzór w tekście

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, quotes: '„”‚’' })

const PLACEHOLDER = (i: number) => `@@TEX${i}@@`

export function renderMarkdown(source: string): string {
  const formulas: string[] = []

  const stash = (tex: string, displayMode: boolean) => {
    formulas.push(
      katex.renderToString(tex.trim(), { displayMode, throwOnError: false, strict: 'ignore' }),
    )
    return PLACEHOLDER(formulas.length - 1)
  }

  const withPlaceholders = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => stash(tex, true))
    .replace(/\$([^$\n]+?)\$/g, (_, tex: string) => stash(tex, false))

  return md
    .render(withPlaceholders)
    .replace(/@@TEX(\d+)@@/g, (_, i: string) => formulas[Number(i)] ?? '')
}
