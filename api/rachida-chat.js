// ═══════════════════════════════════════════════════════
// /api/rachida-chat — Vercel Serverless Function
// Proxy sécurisé vers Groq : la clé ne quitte jamais le serveur
// La variable GROQ_API_KEY est définie dans Vercel Dashboard
// → Project Settings → Environment Variables
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY non définie dans les variables d\'environnement Vercel');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  try {
    const { messages, max_tokens, temperature } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages manquants ou invalides' });
    }

    const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    if (totalChars > 20000) {
      return res.status(400).json({ error: 'Conversation trop longue' });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: Math.min(max_tokens || 1000, 1500),
        temperature: temperature ?? 0.7,
        messages
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return res.status(502).json({ error: 'Erreur du service IA, réessayez' });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ reply });
  } catch (e) {
    console.error('rachida-chat error:', e);
    return res.status(500).json({ error: 'Erreur serveur interne' });
  }
}
