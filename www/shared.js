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

const $dialog = document.querySelector('dialog')
const $msg    = $dialog.querySelector('#msg')
export function showError(errMsg) {
  $msg.textContent = errMsg
  $dialog.showModal()
}

$dialog.onclick = e => {
  if (e.target === $dialog || e.target.closest('button')) {
    $dialog.close()
  }
}

//EOF
