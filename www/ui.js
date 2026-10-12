// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

import { html, showError, $nav, $view } from './shared.js'
import './resize-menu.js'
import './search.js'
import './view-switcher.js'

function dateStr(epochSec, date = new Date(epochSec * 1000)) {
  const x = new Intl.DateTimeFormat('en-US', {
    hour12: false, timeZoneName: 'longOffset',
    year: 'numeric',  month: '2-digit',    day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
    .reduce((a, { type, value }) => (a[type] = value, a), {})

  // timeZoneName is 'GMT+02:00' or 'GMT' for UTC.
  return `${x.year}-${x.month}-${x.day} `
    + `${x.hour}:${x.minute}:${x.second} `
    + x.timeZoneName.replace(/^GMT(.*)$/, (_, x) => x || '+00:00')
}

// Returns promise, resolving in JSON.
function getJSON(url) {
  return fetch(url).then(reply => {
    if (!reply.ok) {
      throw Error(`HTTP ${reply.status} ${reply.statusText}`)
    }
    return reply.json()
  })
}

// Returns promise, resolving in JSON.
function getText(url) {
  return fetch(url).then(reply => {
    if (!reply.ok) {
      throw Error(`HTTP ${reply.status} ${reply.statusText}`)
    }
    return reply.text()
  })
}

// Fetch the heading from a Markdown document.
function getNoteHeading(noteText = '') {
  const [noteHeading] = (noteText.match(/^\s*(\S.*)/ ?? ['']))
  return noteHeading.trim().replace(/^#+ */, '')
}

// Make sure we have the latest version of each note, and populate the
// left-hand index menu with note data. FIXME: Sync is simplistic, we only
// check if server timestamp is the same as local timestamp, and if it isn't
// local note is overwritten by server note.)
function syncNote(noteInfo) {
  // Insert placeholder for note in index menu.
  const [$menuItem] = html(
    `<a id="${noteInfo.id}" title="Updated: ${dateStr(noteInfo.updated)}" href="api/get?id=${noteInfo.id}">`)
  $nav.append($menuItem)

  // Get note info from localStorage (if exists and has same timestamp as server).
  const localNote = localStorage.getItem(noteInfo.id)
  if (localNote && localNote.updated === noteInfo.updated) {
    $menuItem.innerText = getNoteHeading(noteText) // update note in index menu
    return
  }
  // Get note info from server.
  getText(`./api/get?id=${noteInfo.id}`).then(noteText => {
    $menuItem.innerText = getNoteHeading(noteText) // update note in index menu
    localStorage.setItem(noteInfo.id, JSON.stringify({
      updated: noteInfo.updated,
      text: noteText,
    }))
  })
}

// On load, fetch note index from server.
getJSON('./api/list')
  .then(reply => {
    for (const noteInfo of reply.list) {
      syncNote(noteInfo)
    }
  })
  .catch(err => { showError(`Failed to list notes: ${err.message}`) })

// When user clicks left-hand index menu.
$nav.addEventListener('click', (e) => {
  const $a = e.target.closest('a[href]')
  if (!$a) { return }

  const url = $a.href
  const id  = $a.id

  // let modified / middle clicks behave normally
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return }
  e.preventDefault()

  fetch(url)
    .then(reply => {
      if (!reply.ok) { throw Error(`HTTP ${reply.status}`) }
      return reply.text()
    })
    .then(note => {
      $view.textContent = note
      $view.dataset.id = id
    })
    .catch(err => { showError(`Failed to load note: ${err.message}`) })
})

//EOF
