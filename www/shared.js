// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

export const $nav = document.querySelector('nav')
export const $view = document.querySelector('#view')
export const $aside = document.querySelector('aside')

export function html(x) {
  const t = document.createElement('template')
  t.innerHTML = x.trim()
  return t.content.children
}

// FIXME: Show an error message in web GUI
export function showError(err) {
  $view.textContent = err
}

//EOF
