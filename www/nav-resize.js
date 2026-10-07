// -*- mode: js; js-indent-level: 2; -*-

// Make <nav> element horizontally resizable.

const nav = document.querySelector('nav')

nav.addEventListener('pointerdown', e => {
  const r = nav.getBoundingClientRect()
  if (e.clientX < r.right - 8) {
    return
  }
  e.preventDefault()
  document.body.style.userSelect = 'none'
  const startX = e.clientX
  const startW = nav.offsetWidth
  const move = ev => {
    nav.style.width = Math.max(100, Math.min(startW + ev.clientX - startX, window.innerWidth * 0.5)) + 'px'
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
