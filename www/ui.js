// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

import "./nav-resize.js"

const $nav  = document.querySelector('nav')
const $view = document.querySelector('#view')

// FIXME: Show an error message in web GUI
function showError(err) {
  $view.textContent = err
}

function dateStr(epochSec, date = new Date(epochSec * 1000)) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "longOffset",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = type => parts.find(p => p.type === type)?.value ?? "";
  // timeZoneName is "GMT+02:00" or "GMT" for UTC
  let offset = get("timeZoneName").replace(/^GMT/, "");
  if (offset === "") offset = "+00:00";

  return (
    get('year') + '-' + get('month') + '-' + get('day') + ' ' +
      get('hour') + ':' + get('minute') + ':' + get('second') +
      ' ' + offset
  );
}

// Returns promise, resolving in JSON.
function getJSON(url) {
  return fetch(url).then(reply => {
    if (!reply.ok) {
      throw Error(`HTTP ${reply.status} ${reply.statusText}`);
    }
    return reply.json();
  })
}

// Returns promise, resolving in JSON.
function getText(url) {
  return fetch(url).then(reply => {
    if (!reply.ok) {
      throw Error(`HTTP ${reply.status} ${reply.statusText}`);
    }
    return reply.text();
  })
}

function insertHTML($parent, html) {
  const $templ = document.createElement('template')
  $templ.innerHTML = html.trim()
  const $el = $templ.content.firstElementChild
  $parent.appendChild($el)
  return $el
}

// Fetch the heading from a Markdown document.
function getHeading(text = '') {
  const [heading] = (text.match(/^\s*(\S.*)/ ?? ['']))
  return heading.trim()
}

// Make sure we have the latest version of each note, and populate the
// left-hand index menu with note data. FIXME: Sync is simplistic, we only
// check if server timestamp is the same as local timestamp, and if it isn't
// local note is overwritten by server note.)
function syncNote(note) {
  // Insert placeholder for note in index menu.
  const $note = insertHTML($nav,
    `<a title="Updated: ${dateStr(note.updated)}" href="api/get?id=${note.id}">`)

  // Get note info from localStorage (if exists and has same timestamp as server).
  const localNote = localStorage.getItem(note.id)
  if (localNote && localNote.updated === note.updated) {
    $note.innerText = getHeading(markdown)     // update note in index menu
    return
  }
  // Get note info from server.
  getText(`./api/get?id=${note.id}`).then(markdown => {
    $note.innerText = getHeading(markdown)     // update note in index menu
    localStorage.setItem(note.id, JSON.stringify({
      updated: note.updated,
      text: markdown,
    }))
  })
}

// On load, fetch note index from server.
getJSON('./api/list')
  .then(list => { for (const item of list.list) { syncNote(item) } })
  .catch(err => { showError(`Failed to list notes: ${err.message}`) })

// When user clicks left-hand index menu.
$nav.addEventListener('click', (e) => {
  const $a = e.target.closest('a[href]')
  if (!$a) { return }

  const url = $a.href

  // let modified / middle clicks behave normally
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return }
  e.preventDefault()

  fetch(url)
    .then(reply => {
      if (!reply.ok) {
        throw new Error(`HTTP ${reply.status}`)
      }
      return reply.text()
    })
    .then(note => { $view.textContent = note })
    .catch(err => { showError(`Failed to load note: ${err.message}`) })
})

//EOF
