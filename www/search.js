// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.
//
// Insert search form into <nav>. On search, hide non-matching notes by adding
// 'hidden' attribute.

import { $nav, html } from './shared.js'

function searchLocalStorage(regex) {
  const matches = new Set()
  for (let i = 0; i < localStorage.length; i++) {
    const id = localStorage.key(i)
    const value = localStorage.getItem(id)
    if (value !== null && regex.test(value)) {
      matches.add(id)
    }
  }
  return matches
}

const [$form] = html(`<form><input type=search name=q autocomplete=off placeholder=" ">`)

$nav.prepend($form)

$form.addEventListener('submit', e => {
  e.preventDefault();
  const query = $form.elements.q.value.trim()
  const matching = searchLocalStorage(RegExp(query, 'i'))
  for (const t of $nav.children) {
    t.hidden = t.id && !matching.has(t.id)
  }
})

const searchIcon = new URL('search.svg', import.meta.url).href
document.body.append(...html(
`<style>
  nav > form { padding: 0; display: flex }
  input {
    flex: 1; border: 0;
    padding-left: calc(24px + 1rem); width: 100%;
    background: url('${searchIcon}') no-repeat .5rem center / 24px 24px;
    font: inherit;
    &:not(:placeholder-shown) { background-color: #8883 }
  }
</style>`))

//EOF
