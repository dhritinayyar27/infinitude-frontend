import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from 'react-markdown'
import { markdownOptions } from './markdownOptions.js'

function render(content) {
  return renderToStaticMarkup(createElement(Markdown, markdownOptions, content))
}

test('renders prose, headings, lists, GFM tables and fenced code as semantic HTML', () => {
  const html = render('## Supporting topic\n\nA **definition** with *emphasis* and `code`.\n\n- Concept\n\n1. Step\n\n> Note\n\n```java\nint x = 2;\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |')
  for (const tag of ['<h2>', '<strong>', '<em>', '<ul>', '<ol>', '<blockquote>', '<table>', '<thead>', '<tbody>']) {
    assert.ok(html.includes(tag), tag)
  }
  assert.ok(html.includes('class="language-java"'))
  assert.ok(html.includes('int x = 2;'))
})

test('renders inline and display LaTeX with accessible MathML', () => {
  const html = render('Inline $x^2$.\n\n$$\n\\frac{a}{b} + \\sqrt{x}\n$$')
  assert.ok(html.includes('katex-display'))
  assert.ok(html.includes('katex-mathml'))
  assert.ok(html.includes('<mfrac>'))
  assert.ok(html.includes('<msqrt>'))
  assert.ok(!html.includes('notes-math-warning'))
})

test('invalid math displays an explicit warning instead of silently disappearing', () => {
  const html = render('Invalid $\\notARealCommand{x}$')
  assert.ok(html.includes('notes-math-warning'))
  assert.ok(html.includes('role="alert"'))
  assert.ok(html.includes('notARealCommand'))
})

test('raw HTML and unsafe URLs cannot become active rendered content', () => {
  const html = render('<script>alert(1)</script>\n\n<iframe src="https://invalid.test"></iframe>\n\n[Unsafe](javascript:alert(1))')
  assert.ok(!html.includes('<script'))
  assert.ok(!html.includes('<iframe'))
  assert.ok(!html.includes('href="javascript:'))
})

test('code and escaped currency dollar signs remain text rather than math', () => {
  const html = render('Price: \\$20.\n\n```text\n$HOME\n```\n\n`$literal`')
  assert.ok(html.includes('$20'))
  assert.ok(html.includes('$HOME'))
  assert.ok(html.includes('$literal'))
  assert.ok(!html.includes('katex'))
})
