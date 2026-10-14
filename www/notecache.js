// -*- mode: js; js-indent-level: 2; -*-
// Copyright (c) 2026 by zrajm. License: GPLv2.

// Local cache of notes. Currently uses localStorage.

// Returned always contain attributes:
// id      -- note ID (11 char random URL-safe base64)
// text    -- note text (markdown)
// updated -- mtime (epoch seconds)
export default class noteCache {
  static get(id) {
    const item = localStorage.getItem(id)
    if (item == null) { return null }
    const { text, updated } = JSON.parse(item)
    return { id, text, updated }
  }

  static set({ id, text, updated }) {
    try {
      localStorage.setItem( id, JSON.stringify({ updated, text }))
    } catch(e) {
      console.error(e)
      return null
    }
    return { id, text, updated }
  }

  // Return set of matching noteId:s.
  static search(regex) {
    let ids = new Set();
    for (const id of Object.keys(localStorage)) {
      const note = noteCache.get(id)
      if (regex.test(note.text)) {
        ids.add(id)
      }
    }
    return ids
  }
}

//EOF
