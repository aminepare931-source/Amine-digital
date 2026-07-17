// ═══════════════════════════════════════════════════════
// /api/onesignal-notify — Vercel Serverless Function
// Proxy sécurisé vers OneSignal REST API
// Variable ONESIGNAL_REST_KEY définie dans Vercel Dashboard
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const OS_REST_KEY = process.env.ONESIGNAL_REST_KEY;
  const OS_APP_ID = process.env.ONESIGNAL_APP_ID || 'f8b73fe5-9778-4235-9db5-e25302527416';

  if (!OS_REST_KEY) {
    return res.status(500).json({ error: 'Configuration OneSignal manquante côté serveur' });
  }

  try {
    if (req.method === 'GET') {
      // Récupérer stats app ou historique notifs selon ?action=
      const action = req.query.action;

      if (action === 'stats') {
        const r = await fetch('https://onesignal.com/api/v1/apps/' + OS_APP_ID, {
          headers: { 'Authorization': 'Basic ' + OS_REST_KEY }
        });
        const d = await r.json();
        return res.status(200).json({ subscribers: d.players || 0 });
      }

      if (action === 'history') {
        const r = await fetch('https://onesignal.com/api/v1/notifications?app_id=' + OS_APP_ID + '&limit=5', {
          headers: { 'Authorization': 'Basic ' + OS_REST_KEY }
        });
        const d = await r.json();
        return res.status(200).json({ notifications: d.notifications || [] });
      }

      return res.status(400).json({ error: 'Action inconnue' });
    }

    if (req.method === 'POST') {
      const { title, message, url } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Titre et message requis' });
      }

      const r = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + OS_REST_KEY
        },
        body: JSON.stringify({
          app_id: OS_APP_ID,
          included_segments: ['All'],
          headings: { fr: title, en: title },
          contents: { fr: message, en: message },
          url: url || 'https://aminedigitalapp.netlify.app'
        })
      });

      const d = await r.json();
      if (d.id) {
        return res.status(200).json({ success: true, recipients: d.recipients || 0 });
      }
      return res.status(400).json({ error: d.errors || 'Erreur OneSignal' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error('onesignal-notify error:', e);
    return res.status(500).json({ error: 'Erreur serveur interne' });
  }
}
