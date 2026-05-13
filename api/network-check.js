/**
 * Vercel Serverless Function — Vérification IP réseau entreprise
 *
 * Variable d'environnement à configurer dans Vercel :
 *   ALLOWED_IPS = "81.xxx.xxx.xxx,82.xxx.xxx.xxx"  (IPs publiques entreprise, séparées par virgule)
 *
 * Si ALLOWED_IPS n'est pas défini → accès autorisé (mode dev/setup)
 */
export default function handler(req, res) {
  // CORS pour les requêtes fetch côté client
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const allowedRaw = process.env.ALLOWED_IPS || ''
  const allowedIPs = allowedRaw.split(',').map(s => s.trim()).filter(Boolean)

  // Pas encore configuré → laisser passer (setup initial)
  if (!allowedIPs.length) {
    return res.status(200).json({ allowed: true, reason: 'not_configured' })
  }

  // Récupérer l'IP réelle du client (Vercel passe via x-forwarded-for)
  const forwarded = req.headers['x-forwarded-for'] || ''
  const clientIP  = forwarded.split(',')[0].trim()
              || req.headers['x-real-ip']
              || req.socket?.remoteAddress
              || ''

  const allowed = allowedIPs.some(ip => {
    // Support préfixe : "81.64." autorise toute la plage 81.64.x.x
    return clientIP === ip || clientIP.startsWith(ip)
  })

  if (allowed) {
    return res.status(200).json({ allowed: true })
  }

  // IP non autorisée → 403
  return res.status(403).json({ allowed: false })
}
