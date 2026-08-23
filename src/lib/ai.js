export const DEFAULT_MODELS = [
  { id: 'openai', name: 'OpenAI', model: 'Configured provider', role: 'General reasoning', accent: '#6dd6ff', endpoint: '/api/ai' },
  { id: 'anthropic', name: 'Anthropic', model: 'Configured provider', role: 'Analysis / coding', accent: '#d9a7ff', endpoint: '/api/ai' },
  { id: 'gemini', name: 'Gemini', model: 'Configured provider', role: 'Multimodal / research', accent: '#7dffb2', endpoint: '/api/ai' },
  { id: 'deepseek', name: 'DeepSeek', model: 'Configured provider', role: 'Reasoning / coding', accent: '#ffcc80', endpoint: '/api/ai' },
];

export async function invokeModel(model, request, signal) {
  const response = await fetch(model.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId: model.id, modelId: model.model, ...request }),
    signal,
  });
  if (!response.ok) throw new Error(`${model.name} returned HTTP ${response.status}`);
  return response.json();
}

export function localFallback(model, request) {
  return {
    providerId: model.id,
    modelId: model.model,
    output: `[LOCAL DEMO] ${model.name} received: ${request.prompt}\n\nNo provider endpoint is configured yet. ArgOS preserved the task, participant selection, and message locally.`,
    evidence: [],
    usage: { calls: 0, tokens: 0, estimatedCost: 0 },
    local: true,
  };
}
