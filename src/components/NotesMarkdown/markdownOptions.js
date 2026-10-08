import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function reportMathErrors() {
  return (tree, file) => {
    if (!file.messages.some(message => message.source === 'rehype-katex')) return
    tree.children.unshift({
      type: 'element',
      tagName: 'p',
      properties: { role: 'alert', className: ['notes-math-warning'] },
      children: [{
        type: 'text',
        value: 'Some equations could not be rendered correctly. Their source is shown in red; review the notation or regenerate this note.',
      }],
    })
  }
}

export const markdownOptions = {
  remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: true }]],
  rehypePlugins: [[rehypeKatex, { strict: 'warn', trust: false, throwOnError: false }], reportMathErrors],
  skipHtml: true,
}
