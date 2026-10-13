// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

import { $view } from './shared.js'
import htmlifyMarkdown from './htmlify-markdown.js'

export function updateView(noteId, noteText) {
  if ($view.classList.contains('fancy')) {
    htmlifyMarkdown($view, noteText)
  } else {
    showSource(noteText)
  }
  $view.dataset.id = noteId
}

function showSource(text) {
  const $textarea = document.createElement('textarea')
  $textarea.value = text
  $view.replaceChildren($textarea)
}

// On mousedown, 2nd click, store text cursor position (before word is hilited).
let caret
$view.addEventListener('mousedown', e => {
  caret = e.detail === 2                       // on mousedown 2nd click
    ? e.target.selectionStart
    : null
})
$view.addEventListener('dblclick', ({ target, clientX, clientY }) => {
  // Go into 'fancy' mode, i.e. display rendered HTML.
  // (HTMLifies the current Markdown.)
  if ($view.classList.toggle('fancy')) {
    // Insert backspace character at cursor position. (This survives Markdown
    // conversion, and we late insert an element to scroll to here.)
    const scrollToMouse = caret != null        // non-nullish
    const noteText = scrollToMouse
      ? (x => x.slice(0, caret) + '\b' + x.slice(caret))(target.value)
      : target.value
    htmlifyMarkdown($view, noteText)

    // Jump to the position user clicked on in Markdown.
    if (scrollToMouse) {
      const $anchor = $view.querySelector('[caret]')
      const anchorBox = $anchor.getBoundingClientRect()
      $view.scrollTo({
        top:  $view.scrollTop  + anchorBox.top  - clientY,
        left: $view.scrollLeft + anchorBox.left - clientX,
      })
    }
    return
  }

  // Go into non-'fancy' mode, i.e. display Markdown source.
  // (Loads the current note from localStorage and displays it.)
  const noteId = $view.dataset.id
  const note = JSON.parse(localStorage.getItem(noteId))
  // FIXME: Can we jump to the position the user clicked on here too?
  showSource(note.text)
})

//EOF
