export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  const { prompt, responses = [] } = req.body || {};
  const provider = process.env.ARGOS_RECONCILER_PROVIDER || 'openai';
  const model = process.env.ARGOS_RECONCILER_MODEL || process.env.OPENAI_MODEL;
  const key = provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : provider === 'gemini' ? process.env.GEMINI_API_KEY : provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY;
  if (!key || !model) return res.status(503).json({ error: 'ArgOS reconciler is not configured' });

  const evidence = responses.map(r => `### ${r.providerId}\n${r.content}`).join('\n\n');
  const instruction = `You are ArgOS's reconciliation layer. You are not an authority. Compare the independent intelligence responses below. Identify agreement, factual or logical conflicts, evidence quality, uncertainty, and what additional verification would reduce uncertainty. Do not silently choose a winner. Return a structured synthesis with: consensus, disagreements, evidence, uncertainty, recommended next verification, and provisional conclusion.\n\nUSER REQUEST:\n${prompt}\n\nRESPONSES:\n${evidence}`;

  try {
    const output = await invoke(provider, key, model, instruction);
    return res.status(200).json({ providerId: provider, modelId: model, output, createdAt: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}

async function invoke(provider, key, model, prompt) {
  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }) });
    const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`); return d.content?.map(x => x.text || '').join('') || '';
  }
  if (provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }) });
    const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`); return d.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('') || '';
  }
  const url = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }) });
  const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`); return d.choices?.[0]?.message?.content || '';
}
