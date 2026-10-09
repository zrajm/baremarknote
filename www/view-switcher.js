// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

import { $view } from './shared.js'
import htmlifyMarkdown from './htmlify-markdown.js'

function getCursorPosition(clientX, clientY) {
  if (document.caretRangeFromPoint) {          // Chrome/Safari
    return document.caretRangeFromPoint(clientX, clientY)
  }
  if (document.caretPositionFromPoint) {       // Firefox
    const pos = document.caretPositionFromPoint(clientX, clientY)
    if (!pos) { return }
    let range = document.createRange()
    range.setStart(pos.offsetNode, pos.offset)
    range.collapse(true)
    return range
  }
}

$view.addEventListener('dblclick', e => {
  // Get place where mouse clicked on text, and insert a backspace character
  // there. With this, scroll to the same position after htmlifying the text,
  // by replacing the '\b' with an HTML element with an ID and scrolling that
  // into view.
  const range = getCursorPosition(e.clientX, e.clientY)
  const node = range?.startContainer
  const scrollToMouse = node?.nodeType === Node.TEXT_NODE
  if (scrollToMouse) {
    const offset = range.startOffset
    node.insertData(offset, '\b')          // insert backspace character
  }

  // Go into 'fancy' mode, i.e. display rendered HTML.
  // (HTMLifies the current Markdown.)
  if ($view.classList.toggle('fancy')) {
    htmlifyMarkdown($view, $view.textContent)
    // Jump to the position user clicked on in Markdown.
    if (scrollToMouse) {
      const $anchor = document.getElementById('_cursor')
      const anchorBox = $anchor.getBoundingClientRect()
      $view.scrollTo({
        top:  $view.scrollTop  + anchorBox.top  - e.clientY,
        left: $view.scrollLeft + anchorBox.left - e.clientX,
      })
    }
    return
  }

  // Go into non-'fancy' mode, i.e. display Markdown source.
  // (Loads the current note from localStorage and displays it.)
  const noteId = $view.dataset.id
  const note = JSON.parse(localStorage.getItem(noteId))
  // FIXME: Can we jump to the position the user clicked on here too?
  $view.textContent = note.text
})

//EOF
