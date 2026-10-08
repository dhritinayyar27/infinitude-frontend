import { memo } from 'react'
import Markdown from 'react-markdown'
import { markdownOptions } from './markdownOptions'
import 'katex/dist/katex.min.css'

const components = {
  table: ({ children }) => <div className="notes-table-scroll"><table>{children}</table></div>,
  img: () => null,
}

function NotesMarkdown({ content }) {
  return (
    <div className="notes-markdown">
      <Markdown {...markdownOptions} components={components}>{content}</Markdown>
    </div>
  )
}

export default memo(NotesMarkdown)
