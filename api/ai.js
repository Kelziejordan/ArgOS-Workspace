const configs = {
  openai: () => ({ key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-5.6' }),
  deepseek: () => ({ key: process.env.DEEPSEEK_API_KEY, model: process.env.DEEPSEEK_MODEL || 'deepseek-chat' }),
  anthropic: () => ({ key: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5' }),
  gemini: () => ({ key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  const { providerId, prompt, context = {}, constraints = [] } = req.body || {};
  const configFactory = configs[providerId];
  if (!configFactory) return res.status(400).json({ error: `Unsupported provider: ${providerId}` });
  const config = configFactory();
  if (!config.key) return res.status(503).json({ error: `${providerId} is not configured on this deployment` });

  const system = `You are an intelligence participant inside ArgOS. You are not the sole authority. Produce useful reasoning, identify uncertainty, cite evidence when available, and do not claim actions you did not perform. Context: ${JSON.stringify(context)}. Constraints: ${constraints.join('; ')}`;
  try {
    let output;
    if (providerId === 'anthropic') output = await anthropic(config, system, prompt);
    else if (providerId === 'gemini') output = await gemini(config, system, prompt);
    else output = await openaiCompatible(config, system, prompt, providerId === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions');
    return res.status(200).json({ providerId, modelId: config.model, output, evidence: [], usage: { calls: 1, tokens: 0, estimatedCost: 0 } });
  } catch (error) {
    return res.status(502).json({ error: `${providerId} invocation failed`, detail: error.message });
  }
}

async function openaiCompatible(config, system, prompt, url) {
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  return data.choices?.[0]?.message?.content ?? '';
}

async function anthropic(config, system, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': config.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: config.model, max_tokens: 4096, system, messages: [{ role: 'user', content: prompt }] }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  return data.content?.map(x => x.text || '').join('') || '';
}

async function gemini(config, system, prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }] }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  return data.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('') || '';
}
