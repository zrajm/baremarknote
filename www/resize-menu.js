// -*- mode: js; js-indent-level: 2; -*-

// Make <aside> element horizontally resizable.

import { $aside } from './shared.js'

$aside.addEventListener('pointerdown', e => {
  const r = $aside.getBoundingClientRect()
  if (e.clientX < r.right - 8) {
    return
  }
  e.preventDefault()
  document.body.style.userSelect = 'none'
  const startX = e.clientX
  const startW = $aside.offsetWidth
  const move = ev => {
    $aside.style.width = Math.max(100, Math.min(startW + ev.clientX - startX, window.innerWidth * 0.5)) + 'px'
  }
  const up = () => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', up)
    document.body.style.userSelect = ''
  }
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', up)
})

//EOF
