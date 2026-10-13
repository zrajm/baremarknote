// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

import { html, showError, $nav, $view } from './shared.js'
import './resize-menu.js'
import './search.js'
import { updateView } from './view-switcher.js'

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

class HTTPError   extends Error {}
class SourceError extends Error {}
function handleErrors(e) {
  if      (e instanceof HTTPError)   { showError(`Server error: ${e.message}` ) }
  else if (e instanceof SourceError) { showError(`Misconfigured server: ${e.message}`) }
  else if (e instanceof SyntaxError) { showError('Server sent invalid JSON'   ) }
  else                               { showError(`Network error: ${e.message}`) }
}

// Returns promise, resolving in text.
function fetchText(url) {
  return fetch(url).then(reply => {
    if (!reply.ok) {
      return Promise.reject(new HTTPError(`HTTP ${reply.status} ${reply.statusText}`))
    }
    return reply.text()
  })
}

// Returns promise, resolving in JSON.
function fetchJSON(url) {
  return fetchText(url).then(reply => {
    if (reply.startsWith('#!')) {
      return Promise.reject(new SourceError('API call returned source code'))
    }
    return JSON.parse(reply)
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
function syncNote(noteInfo, func) {
  // Insert placeholder for note in index menu.
  const [$menuItem] = html(`<a id="${noteInfo.id}" ` +
                           `title="Updated: ${dateStr(noteInfo.updated)}" ` +
                           `href="api/get?id=${noteInfo.id}">`)
  $nav.append($menuItem)

  // Get note info from localStorage (if exists and has same timestamp as server).
  const localNote = localStorage.getItem(noteInfo.id)
  if (localNote && localNote.updated === noteInfo.updated) {
    updateMenuItem(noteInfo.id, noteText, $menuItem, func)
    return
  }
  // Get note info from server.
  fetchText(`./api/get?id=${noteInfo.id}`)
    .then(noteText => {
      updateMenuItem(noteInfo.id, noteText, $menuItem, func)
      localStorage.setItem(noteInfo.id, JSON.stringify({
        updated: noteInfo.updated,
        text: noteText,
      }))
    })
}

function updateMenuItem(noteId, noteText, $menuItem, func) {
  $menuItem.innerText = getNoteHeading(noteText) // update note in index menu
  if (func) { func(noteId, noteText) }
}

// On load, fetch note index from server.
fetchJSON('./api/list').then(reply => {
  reply.list.forEach((noteInfo, i) => {
    syncNote(noteInfo, i === 0 ? updateView : null)
  })
}).catch(handleErrors)

// When user clicks left-hand index menu.
$nav.addEventListener('click', (e) => {
  const $a = e.target.closest('a[href]')
  if (!$a) { return }

  const url = $a.href
  const id  = $a.id

  // let modified / middle clicks behave normally
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return }
  e.preventDefault()

  fetchText(url)
    .then(noteText => { updateView(id, noteText) })
    .catch(err => { showError(`Failed to load note: ${err.message}`) })
})

//EOF
