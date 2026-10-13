// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.
//
// This is only responsible for HTMLifying Markdown, and inserting it into the
// DOM. After insertion we traverse the tree and curlify any straight quotes as
// well (this is easier to do in the DOM, since we then don't have to avoid
// trampling on any HTML attributes etc).

// Baremark + addons.
import './baremark/baremark.js'
import './baremark/addon/table.js'
import './baremark/addon/sup.js'
import './baremark/addon/autolink.js'
import './baremark/addon/id.js'
import './baremark/addon/meta.js'
import './baremark/addon/toc.js'
import { quotecurl } from './quotecurl/quotecurl.mjs'

// Process all text nodes in the DOM.
function modifyTextNodes(func, node = document.body) {
  switch (node.nodeType) {
    case Node.TEXT_NODE: func(node); return
    case Node.ELEMENT_NODE: switch (node.tagName) {
      // These tags shouldn't be processed.
      case 'PRE': case 'SCRIPT': case 'STYLE': case 'SVG': case 'TT': return
    }
  }
  for (const child of node.childNodes) { modifyTextNodes(func, child) }
}

// HTMLifies Markdown and inserts it into the specified element.
export default function htmlifyMarkdown($el, markdown) {
  const html = baremark(markdown).replace(/[\b]/, '<span caret></span>')
  $el.innerHTML = html
  // Traverse the resulting elements and curlifiy quotes.
  modifyTextNodes(node => node.data = quotecurl(node.data), $el)
}

//EOF
