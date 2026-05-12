import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem, subscribeToKey } from '../lib/supabaseStorage'

const STORAGE_KEY = 'els_suivi_notes'

function loadLocal() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : {} } catch { return {} }
}

function genId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function useNotes() {
  const [notes, setNotes] = useState(loadLocal)

  useEffect(() => {
    getItem(STORAGE_KEY).then(remote => {
      if (remote) {
        setNotes(remote)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)) } catch {}
      }
    })
  }, [])

  useEffect(() => {
    return subscribeToKey(STORAGE_KEY, remote => {
      if (remote) {
        setNotes(remote)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)) } catch {}
      }
    })
  }, [])

  function save(next) {
    setNotes(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    setItem(STORAGE_KEY, next)
  }

  // Récupérer les notes d'une affaire
  const getNotesAffaire = useCallback((affaireId) => {
    return (notes[affaireId] || []).sort((a, b) => b.date.localeCompare(a.date))
  }, [notes])

  // Ajouter une note
  const addNote = useCallback((affaireId, noteData) => {
    const newNote = { id: genId(), ...noteData, createdAt: new Date().toISOString() }
    const next = {
      ...notes,
      [affaireId]: [...(notes[affaireId] || []), newNote],
    }
    save(next)
    return newNote
  }, [notes])

  // Modifier une note
  const updateNote = useCallback((affaireId, noteId, patch) => {
    const next = {
      ...notes,
      [affaireId]: (notes[affaireId] || []).map(n => n.id === noteId ? { ...n, ...patch } : n),
    }
    save(next)
  }, [notes])

  // Supprimer une note
  const deleteNote = useCallback((affaireId, noteId) => {
    const next = {
      ...notes,
      [affaireId]: (notes[affaireId] || []).filter(n => n.id !== noteId),
    }
    save(next)
  }, [notes])

  return { notes, getNotesAffaire, addNote, updateNote, deleteNote }
}
