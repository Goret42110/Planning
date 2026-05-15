/**
 * ELS Planning — Serveur local NAS
 * ─────────────────────────────────
 * Déposer ce fichier dans H:\ELS\
 * Lancer : node server.js
 * Port   : 3001 (localhost uniquement)
 *
 * Aucune dépendance npm — Node.js standard uniquement.
 * Données stockées dans H:\ELS\data\ (fichiers JSON par clé).
 */

const http = require('http')
const fs   = require('fs')
const path = require('path')

const PORT         = 3001
const DATA_DIR     = path.join(__dirname, 'data')
const ALLOWED_ORIGIN = 'https://planning-lemon-psi.vercel.app'

// Créer le dossier data si absent
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  console.log('[ELS] Dossier data créé :', DATA_DIR)
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function keyToFile(key) {
  // Sécuriser le nom de fichier (retirer les caractères dangereux)
  const safe = key.replace(/[^a-zA-Z0-9_\-]/g, '_')
  return path.join(DATA_DIR, safe + '.json')
}

const server = http.createServer((req, res) => {
  setCORS(res)

  // Pré-vol CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ── GET /ping — vérification de présence réseau ──────────────────────────
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, server: 'ELS-NAS', ts: Date.now() }))
    return
  }

  // ── GET /api/:key — lire une valeur ──────────────────────────────────────
  if (req.method === 'GET' && req.url.startsWith('/api/')) {
    const key  = decodeURIComponent(req.url.slice(5))
    const file = keyToFile(key)
    if (fs.existsSync(file)) {
      try {
        const raw  = fs.readFileSync(file, 'utf8')
        const data = JSON.parse(raw)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ value: data }))
        return
      } catch (e) {
        console.error('[ELS] Lecture erreur', key, e.message)
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ value: null }))
    return
  }

  // ── POST /api/:key — écrire une valeur ───────────────────────────────────
  if (req.method === 'POST' && req.url.startsWith('/api/')) {
    const key  = decodeURIComponent(req.url.slice(5))
    const file = keyToFile(key)
    let body   = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { value } = JSON.parse(body)
        // Sauvegarde atomique : écrire dans un fichier temp puis renommer
        const tmp = file + '.tmp'
        fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
        fs.renameSync(tmp, file)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        console.log('[ELS] Sauvegarde :', key)
      } catch (e) {
        console.error('[ELS] Écriture erreur', key, e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

// Écouter uniquement sur localhost (inaccessible depuis internet)
server.listen(PORT, '127.0.0.1', () => {
  const line = '─'.repeat(50)
  console.log(line)
  console.log('  ELS Planning — Serveur local démarré')
  console.log(`  Port     : ${PORT}`)
  console.log(`  Données  : ${DATA_DIR}`)
  console.log(`  Origine  : ${ALLOWED_ORIGIN}`)
  console.log(line)
  console.log('  Laisser cette fenêtre ouverte.')
  console.log(line)
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[ELS] Port ${PORT} déjà utilisé — le serveur tourne peut-être déjà.`)
  } else {
    console.error('[ELS] Erreur serveur :', e.message)
  }
})
