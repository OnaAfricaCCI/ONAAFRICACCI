import type { ReactNode } from 'react'
import BlogFigure from './BlogFigures'

/**
 * Renders a post body.
 *
 * The blog stored plain text and turned every blank-line-separated block into a
 * paragraph. That is fine for a short note and wrong for an essay: headings,
 * lists and pulled-out figures all flattened into one undifferentiated column,
 * and a reader lost every signpost the writer put in.
 *
 * This understands a deliberately small set of marks, chosen to cover what Ona
 * actually writes rather than to reimplement Markdown:
 *
 *   ## Heading            a section
 *   ### Heading           a sub-section
 *   > Something           a pulled-out line, in the brand's pull-quote style
 *   - item                a list
 *   1. item               a numbered list
 *   **bold**              emphasis, inline
 *   ::: capital-stack     a designed figure, from the registry in BlogFigures
 *
 * Anything else is a paragraph. Nothing here interprets HTML, so a post can
 * never inject markup into the page.
 */

/** Split a line into plain and bold runs. Bold is the only inline mark. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-bold text-[var(--ink)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function Prose({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)

  return (
    <div className="mt-10 flex flex-col gap-6 text-[17px] leading-relaxed text-[var(--ink-2)]">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)

        // A figure on its own line. Prose does not know what any of them look
        // like; it only knows to hand the name over.
        if (block.startsWith('::: ')) {
          return <BlogFigure key={i} name={block.slice(4).trim()} />
        }

        if (block.startsWith('### ')) {
          return (
            <h3
              key={i}
              className="mt-2 font-[family-name:var(--font-display)] text-[22px] leading-[1.25] text-[var(--ink)]"
            >
              {block.slice(4)}
            </h3>
          )
        }

        if (block.startsWith('## ')) {
          return (
            <h2
              key={i}
              className="mt-6 font-[family-name:var(--font-display)] text-[28px] leading-[1.15] text-[var(--ink)] sm:text-[32px]"
            >
              {block.slice(3)}
            </h2>
          )
        }

        // A pulled-out line. Used for the sentence a section turns on, and for
        // figures that deserve to stand away from the prose.
        if (block.startsWith('> ')) {
          return (
            <p key={i} className="pull-quote text-[var(--ink)]">
              {inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}
            </p>
          )
        }

        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={i} className="flex list-decimal flex-col gap-2.5 pl-6 marker:font-bold marker:text-[var(--accent-deep)]">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ''))}</li>
              ))}
            </ol>
          )
        }

        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-2.5 pl-6 marker:text-[var(--accent-deep)]">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          )
        }

        return <p key={i}>{inline(block)}</p>
      })}
    </div>
  )
}
