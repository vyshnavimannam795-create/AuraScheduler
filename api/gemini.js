export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.body?.type === 'email') return res.status(200).json({ success: true });

  const { messages = [], systemPrompt = '' } = req.body || {};
  if (!messages.length) return res.status(400).json({ error: 'No messages' });

  const GEMINI_KEY = 'AQ.Ab8RN6JRbDf0MTqiMdH6Q1jLWogSif-4HT6ANLDSWzchzZqB_g';
  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: 'Instructions:\n' + systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }
  messages.forEach(m => contents.push({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }]
  }));

  for (const model of ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 800, temperature: 0.7 } }) }
      );
      const d = await r.json();
      if (d.error) { console.log(model, d.error.message); continue; }
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ response: text, model });
    } catch(e) { continue; }
  }
  return res.status(200).json({ response: 'AI is busy. Please use the dashboard directly.', model: 'fallback' });
}
