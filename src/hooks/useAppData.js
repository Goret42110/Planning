import { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_PERSONNEL, INITIAL_AFFAIRES, INITIAL_PLANNING } from '../data/initial';
import { getItem, setItem, subscribeToKey } from '../lib/supabaseStorage';

const STORAGE_KEY = 'els_planning_data';
const DATA_VERSION = 4;

function genId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function fromRaw(raw) {
  if (!raw) return null;
  const base = { personnel: INITIAL_PERSONNEL, affaires: INITIAL_AFFAIRES, planning: INITIAL_PLANNING, comments: {}, timesheets: {} };
  const merged = { ...base, comments: {}, timesheets: {}, ...raw };
  if (!merged.affaires?.length && INITIAL_AFFAIRES.length > 0) merged.affaires = INITIAL_AFFAIRES;
  if (!merged.personnel?.length && INITIAL_PERSONNEL.length > 0) merged.personnel = INITIAL_PERSONNEL;
  return merged;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._version !== DATA_VERSION) return null;
      return fromRaw(parsed);
    }
  } catch {}
  return null;
}

export function useAppData() {
  const base = { personnel: INITIAL_PERSONNEL, affaires: INITIAL_AFFAIRES, planning: INITIAL_PLANNING, comments: {}, timesheets: {} };

  const [data, setData]       = useState(() => loadLocal() || base);
  const [syncing, setSyncing] = useState(true);

  const syncedRef  = useRef(false);   // vrai après le premier chargement Supabase
  const saveTimer  = useRef(null);    // debounce des sauvegardes

  // ── Chargement initial depuis Supabase (timeout 4s pour ne pas bloquer) ─────
  useEffect(() => {
    let done = false
    const fallback = setTimeout(() => {
      if (!done) { done = true; syncedRef.current = true; setSyncing(false) }
    }, 4000)

    getItem(STORAGE_KEY)
      .then(remote => {
        if (!done) {
          done = true
          clearTimeout(fallback)
          if (remote) {
            const merged = fromRaw(remote)
            if (merged) {
              setData(merged)
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...merged, _version: DATA_VERSION })) } catch {}
            }
          }
          syncedRef.current = true
          setSyncing(false)
        }
      })
      .catch(() => {
        if (!done) { done = true; clearTimeout(fallback); syncedRef.current = true; setSyncing(false) }
      })

    return () => { done = true; clearTimeout(fallback) }
  }, []);

  // ── Sauvegarde locale + Supabase à chaque changement (debounce 800 ms) ──────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _version: DATA_VERSION })); } catch {}
    if (!syncedRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setItem(STORAGE_KEY, { ...data, _version: DATA_VERSION });
    }, 800);
  }, [data]);

  // ── Temps réel : écoute les modifications depuis d'autres onglets/appareils ─
  useEffect(() => {
    const unsub = subscribeToKey(STORAGE_KEY, remote => {
      const merged = fromRaw(remote);
      if (merged) {
        setData(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...merged, _version: DATA_VERSION })); } catch {}
      }
    });
    return unsub;
  }, []);

  // ── Personnel ────────────────────────────────────────────────────────────────
  const addPerson = useCallback((p) => {
    setData(d => ({ ...d, personnel: [...d.personnel, { ...p, id: genId() }] }));
  }, []);

  const updatePerson = useCallback((id, upd) => {
    setData(d => ({ ...d, personnel: d.personnel.map(p => p.id === id ? { ...p, ...upd } : p) }));
  }, []);

  const deletePerson = useCallback((id) => {
    setData(d => {
      const pl = { ...d.planning };
      Object.keys(pl).forEach(k => { if (k.startsWith(`${id}_`)) delete pl[k]; });
      return { ...d, personnel: d.personnel.filter(p => p.id !== id), planning: pl };
    });
  }, []);

  // ── Affaires ──────────────────────────────────────────────────────────────────
  const addAffaire = useCallback((a) => {
    setData(d => ({
      ...d,
      affaires: [...d.affaires, { ...a, id: genId(), colorIndex: d.affaires.length % 10 }],
    }));
  }, []);

  const updateAffaire = useCallback((id, upd) => {
    setData(d => ({ ...d, affaires: d.affaires.map(a => a.id === id ? { ...a, ...upd } : a) }));
  }, []);

  const deleteAffaire = useCallback((id) => {
    setData(d => {
      const pl = { ...d.planning };
      Object.keys(pl).forEach(k => { if (pl[k] === id) delete pl[k]; });
      return { ...d, affaires: d.affaires.filter(a => a.id !== id), planning: pl };
    });
  }, []);

  // ── Planning ──────────────────────────────────────────────────────────────────
  const setPlanningCell = useCallback((key, value) => {
    setData(d => {
      const pl = { ...d.planning };
      if (value == null || value === '') delete pl[key];
      else pl[key] = value;
      return { ...d, planning: pl };
    });
  }, []);

  const setComment = useCallback((key, text) => {
    setData(d => {
      const cmts = { ...d.comments };
      if (!text || !text.trim()) delete cmts[key];
      else cmts[key] = text.trim();
      return { ...d, comments: cmts };
    });
  }, []);

  const setPlanningBatch = useCallback((updates) => {
    setData(d => {
      const pl = { ...d.planning };
      for (const { key, value } of updates) {
        if (value == null || value === '') delete pl[key];
        else pl[key] = value;
      }
      return { ...d, planning: pl };
    });
  }, []);

  const setTimesheetDay = useCallback((personId, dateKey, dayData) => {
    setData(d => {
      const ts = { ...d.timesheets };
      const key = `${personId}_${dateKey}`;
      if (!dayData) delete ts[key];
      else ts[key] = dayData;
      return { ...d, timesheets: ts };
    });
  }, []);

  // ── Import / Export ───────────────────────────────────────────────────────────
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'els_planning_backup.json'; a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importData = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.personnel && parsed.affaires && parsed.planning) setData(parsed);
        else alert('Format invalide.');
      } catch { alert('Erreur de lecture du fichier.'); }
    };
    reader.readAsText(file);
  }, []);

  const resetToInitial = useCallback(() => {
    if (confirm('Réinitialiser toutes les données ?')) {
      setData({ personnel: INITIAL_PERSONNEL, affaires: INITIAL_AFFAIRES, planning: INITIAL_PLANNING });
    }
  }, []);

  return {
    syncing,
    personnel: data.personnel, affaires: data.affaires, planning: data.planning,
    comments: data.comments, timesheets: data.timesheets,
    addPerson, updatePerson, deletePerson,
    addAffaire, updateAffaire, deleteAffaire,
    setPlanningCell, setPlanningBatch, setComment, setTimesheetDay,
    exportData, importData, resetToInitial,
  };
}
