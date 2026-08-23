import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_MODELS, invokeModel, localFallback } from './lib/ai';
import { getAll, putItem, STORES } from './lib/storage';
import { PwaBanner } from './components/PwaBanner';

const newSession = () => ({
  id: `session-${Date.now()}`,
  title: 'New ArgOS session',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  selected: DEFAULT_MODELS.map(m => m.id),
  messages: [],
  responses: Object.fromEntries(DEFAULT_MODELS.map(m => [m.id, []])),
});

export default function App() {
  const [models] = useState(DEFAULT_MODELS);
  const [session, setSession] = useState(newSession);
  const [sessions, setSessions] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready.');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    (async () => {
      const stored = await getAll(STORES.sessions);
      if (stored.length) {
        const ordered = stored.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setSessions(ordered);
        setSession(ordered[0]);
      }
    })();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!session) return;
    putItem(STORES.sessions, session);
    setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)].slice(0, 20));
  }, [session]);

  const selectedModels = useMemo(() => models.filter(m => session.selected.includes(m.id)), [models, session.selected]);

  function toggleModel(id) {
    setSession(s => ({ ...s, selected: s.selected.includes(id) ? s.selected.filter(x => x !== id) : [...s.selected, id], updatedAt: new Date().toISOString() }));
  }

  function selectAll() {
    setSession(s => ({ ...s, selected: models.map(m => m.id), updatedAt: new Date().toISOString() }));
  }

  function clearAll() {
    setSession(s => ({ ...s, selected: [], updatedAt: new Date().toISOString() }));
  }

  function startNewSession() {
    const next = newSession();
    setSession(next);
    setPrompt('');
    setStatus('New session created.');
  }

  async function send() {
    const text = prompt.trim();
    if (!text || selectedModels.length === 0 || busy) return;
    const userMessage = { id: `msg-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString(), participants: selectedModels.map(m => m.id) };
    setSession(s => ({ ...s, title: s.messages.length ? s.title : text.slice(0, 48), messages: [...s.messages, userMessage], updatedAt: new Date().toISOString() }));
    setPrompt('');
    setBusy(true);
    setStatus(`ArgOS routing to ${selectedModels.length} intelligence participant${selectedModels.length === 1 ? '' : 's'}...`);

    await Promise.all(selectedModels.map(async model => {
      const started = Date.now();
      try {
        let result;
        try {
          result = await invokeModel(model, { sessionId: session.id, prompt: text, selectedParticipants: selectedModels.map(m => m.id) });
        } catch (error) {
          if (!online) result = localFallback(model, { prompt: text });
          else throw error;
        }
        const response = {
          id: `resp-${model.id}-${Date.now()}`,
          modelId: model.id,
          content: result.output ?? result.content ?? JSON.stringify(result),
          evidence: result.evidence ?? [],
          usage: result.usage ?? { calls: 1, tokens: 0, estimatedCost: 0 },
          local: Boolean(result.local),
          latencyMs: Date.now() - started,
          createdAt: new Date().toISOString(),
        };
        setSession(s => ({ ...s, responses: { ...s.responses, [model.id]: [...(s.responses[model.id] || []), response] }, updatedAt: new Date().toISOString() }));
      } catch (error) {
        const response = { id: `err-${model.id}-${Date.now()}`, modelId: model.id, content: `Provider unavailable: ${error.message}. ArgOS preserved the request without treating the failure as a valid answer.`, error: true, createdAt: new Date().toISOString() };
        setSession(s => ({ ...s, responses: { ...s.responses, [model.id]: [...(s.responses[model.id] || []), response] }, updatedAt: new Date().toISOString() }));
      }
    }));
    setBusy(false);
    setStatus('Responses recorded. No provider response is treated as authoritative by the workspace.');
  }

  return (
    <div className="app-shell">
      <PwaBanner />
      <header className="topbar">
        <div>
          <div className="eyebrow">ARGOS</div>
          <h1>Intelligence Workspace</h1>
          <span className="sub">ArgCore-governed multi-model collaboration</span>
        </div>
        <div className="top-actions">
          <span className={online ? 'status online' : 'status'}>{online ? 'ONLINE' : 'OFFLINE'}</span>
          <button onClick={startNewSession}>New session</button>
        </div>
      </header>

      <section className="participant-bar">
        <div className="participant-copy">
          <strong>Participants</strong>
          <span>Select exactly who receives the next message.</span>
        </div>
        <div className="participant-actions">
          <button onClick={selectAll}>Select all</button>
          <button onClick={clearAll}>Clear</button>
          <span>{selectedModels.length}/{models.length} active</span>
        </div>
      </section>

      <main className="workspace">
        <section className="ai-grid" style={{ '--columns': models.length }}>
          {models.map(model => <AIColumn key={model.id} model={model} responses={session.responses[model.id] || []} active={session.selected.includes(model.id)} onToggle={() => toggleModel(model.id)} />)}
        </section>

        <section className="composer-area">
          <div className="composer-meta">
            <span>{selectedModels.length ? `Sending to: ${selectedModels.map(m => m.name).join(', ')}` : 'Select at least one AI participant'}</span>
            <span>{status}</span>
          </div>
          <div className="composer">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask one AI, several AIs, or all of them..." disabled={busy} />
            <button className="send" onClick={send} disabled={!prompt.trim() || !selectedModels.length || busy}>{busy ? 'Working...' : 'Send'}</button>
          </div>
          <div className="composer-foot">Shift+Enter for a new line. ArgOS records participant selection and preserves session state locally.</div>
        </section>

        <aside className="session-strip">
          <div><strong>Session</strong><span>{session.title}</span></div>
          <div><strong>Messages</strong><span>{session.messages.length}</span></div>
          <div><strong>Responses</strong><span>{Object.values(session.responses).reduce((n, list) => n + list.length, 0)}</span></div>
          <div><strong>Saved</strong><span>IndexedDB</span></div>
        </aside>
      </main>
    </div>
  );
}

function AIColumn({ model, responses, active, onToggle }) {
  return <article className={`ai-column ${active ? 'active' : ''}`}>
    <header className="ai-header">
      <div className="model-dot" style={{ background: model.accent }} />
      <div className="model-title"><strong>{model.name}</strong><span>{model.role}</span></div>
      <span className="model-state">{active ? 'LISTENING' : 'IDLE'}</span>
    </header>
    <div className="ai-transcript">
      {responses.length === 0 ? <div className="empty">No response yet.<br />Turn this participant on and send a message.</div> : responses.map(response => <div key={response.id} className={response.error ? 'response error' : 'response'}><div className="response-meta">{response.local ? 'LOCAL FALLBACK' : 'RESPONSE'} {response.latencyMs ? `· ${response.latencyMs}ms` : ''}</div><div>{response.content}</div>{response.evidence?.length > 0 && <details><summary>Evidence ({response.evidence.length})</summary><pre>{JSON.stringify(response.evidence, null, 2)}</pre></details>}</div>)}
    </div>
    <button className={`participant-toggle ${active ? 'selected' : ''}`} onClick={onToggle}>{active ? 'ACTIVE — receiving chat' : 'INACTIVE — tap to include'}</button>
  </article>;
}
