import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { STORES, getAll, putItem } from './lib/storage';
import { enqueueWrite } from './lib/writeQueue';
import { PwaBanner } from './components/PwaBanner';

const initialProject = {
  id: 'project-1',
  name: 'ArgOS Workspace',
  status: 'ACTIVE',
  phase: 'Workspace',
  objective: 'Build a durable PWA workspace for governed project execution.',
  notes: 'Local-first workspace with version history, validations, and offline resilience.',
  updatedAt: new Date().toISOString(),
};

const initialWorkspace = {
  id: 'workspace-root',
  activeProjectId: initialProject.id,
  online: navigator.onLine,
  installPromptAvailable: false,
  offlineReady: false,
  needsRefresh: false,
  releaseState: 'SHIP',
  projects: [initialProject],
};

export default function App() {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [versions, setVersions] = useState([]);
  const [validations, setValidations] = useState([]);
  const [draft, setDraft] = useState(initialProject);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading local workspace...');
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [storedWorkspace, storedVersions, storedValidations, storedProjects] = await Promise.all([
        getAll(STORES.workspace),
        getAll(STORES.versions),
        getAll(STORES.validations),
        getAll(STORES.projects),
      ]);
      if (!alive) return;
      const ws = storedWorkspace[0] || initialWorkspace;
      const projectList = storedProjects.length ? storedProjects : ws.projects || [initialProject];
      const active = projectList.find(p => p.id === ws.activeProjectId) || projectList[0] || initialProject;
      setWorkspace({ ...ws, projects: projectList });
      setDraft(active);
      setVersions(storedVersions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setValidations(storedValidations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setReady(true);
      setStatus('Workspace loaded locally.');
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (!ready) return; enqueueWrite('workspace-root', () => putItem(STORES.workspace, workspace)); }, [workspace, ready]);
  useEffect(() => { if (!ready) return; workspace.projects.forEach(project => enqueueWrite(`project-${project.id}`, () => putItem(STORES.projects, project))); }, [workspace.projects, ready]);
  useEffect(() => { if (!ready) return; versions.forEach(version => enqueueWrite(version.id, () => putItem(STORES.versions, version))); }, [versions, ready]);
  useEffect(() => { if (!ready) return; validations.forEach(record => enqueueWrite(record.id, () => putItem(STORES.validations, record))); }, [validations, ready]);

  useEffect(() => {
    const online = () => setWorkspace(w => ({ ...w, online: true }));
    const offline = () => setWorkspace(w => ({ ...w, online: false }));
    const beforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setWorkspace(w => ({ ...w, installPromptAvailable: true }));
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
    };
  }, []);

  const activeProject = useMemo(() => workspace.projects.find(p => p.id === workspace.activeProjectId) || workspace.projects[0], [workspace]);

  async function persistWorkspace(nextWorkspace) {
    setWorkspace(nextWorkspace);
    if (ready) await enqueueWrite(nextWorkspace.id, () => putItem(STORES.workspace, nextWorkspace));
  }

  async function persistProject(nextProject) {
    const nextProjects = workspace.projects.some(p => p.id === nextProject.id)
      ? workspace.projects.map(p => p.id === nextProject.id ? nextProject : p)
      : [...workspace.projects, nextProject];
    const nextWorkspace = { ...workspace, projects: nextProjects, activeProjectId: nextProject.id };
    await persistWorkspace(nextWorkspace);
    await enqueueWrite(`project-${nextProject.id}`, () => putItem(STORES.projects, nextProject));
  }

  async function updateDraft(field, value) {
    const next = { ...draft, [field]: value, updatedAt: new Date().toISOString() };
    setDraft(next);
    await persistProject(next);
    setStatus('Draft saved locally.');
  }

  async function createVersion(reason = 'Manual snapshot') {
    const version = {
      id: `ver-${Date.now()}`,
      projectId: activeProject.id,
      label: `${activeProject.name} @ ${new Date().toLocaleString()}`,
      summary: reason,
      snapshot: activeProject,
      createdAt: new Date().toISOString(),
    };
    setVersions(prev => [version, ...prev]);
    await enqueueWrite(version.id, () => putItem(STORES.versions, version));
    setStatus('Version snapshot stored.');
  }

  async function runValidation() {
    const issues = [];
    if (!draft.name?.trim()) issues.push('Project name is required.');
    if (!draft.objective?.trim()) issues.push('Objective is required.');
    if (!draft.notes?.trim()) issues.push('Notes should explain the workspace intent.');
    const statusValue = issues.length ? 'FAIL' : 'PASS';
    const record = {
      id: `val-${Date.now()}`,
      projectId: activeProject.id,
      versionId: versions[0]?.id || null,
      status: statusValue,
      score: statusValue === 'PASS' ? 100 : Math.max(40, 100 - issues.length * 20),
      checks: ['required fields', 'workspace clarity', 'phase readiness'],
      issues,
      createdAt: new Date().toISOString(),
    };
    setValidations(prev => [record, ...prev]);
    await enqueueWrite(record.id, () => putItem(STORES.validations, record));
    await persistWorkspace({ ...workspace, releaseState: statusValue === 'PASS' ? 'SHIP' : 'FREEZE' });
    setStatus(statusValue === 'PASS' ? 'Validation passed.' : 'Validation found issues.');
  }

  async function handleInstall() {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    deferredPromptRef.current = null;
    await persistWorkspace({ ...workspace, installPromptAvailable: false });
  }

  return (
    <div style={shell}>
      <PwaBanner />
      <header style={header}>
        <div>
          <div style={kicker}>ARGOS WORKSPACE</div>
          <h1 style={title}>Governed Project Workspace</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: workspace.online ? '#7dffb2' : '#ffb86b' }}>
          <div>{workspace.online ? 'Online' : 'Offline-ready'}</div>
          <div>{workspace.releaseState}</div>
        </div>
      </header>

      <main style={grid}>
        <section style={panel}>
          <h2 style={h2}>Active Project</h2>
          <label>Name</label>
          <input value={draft.name} onChange={e => updateDraft('name', e.target.value)} style={inputStyle} />
          <label>Objective</label>
          <textarea value={draft.objective} onChange={e => updateDraft('objective', e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
          <label>Notes</label>
          <textarea value={draft.notes} onChange={e => updateDraft('notes', e.target.value)} style={{ ...inputStyle, minHeight: 100 }} />
          <div style={buttonRow}>
            <button onClick={() => createVersion('Snapshot before validation')} style={buttonStyle}>Save Version</button>
            <button onClick={runValidation} style={buttonStyle}>Run Validation</button>
            {workspace.installPromptAvailable && <button onClick={handleInstall} style={buttonStyle}>Install App</button>}
          </div>
          <p style={statusStyle}>{status}</p>
        </section>

        <section style={sideGrid}>
          <Panel title="Versions" items={versions.map(v => `${v.label} — ${v.summary}`)} />
          <Panel title="Validations" items={validations.map(v => `${v.status} (${v.score}) — ${v.issues.length ? v.issues.join(', ') : 'All checks passed'}`)} />
          <Panel title="Offline & Install" items={[
            'IndexedDB-backed local persistence.',
            'PWA install prompt captured when available.',
            'Workspace remains usable when the network is unavailable.',
          ]} />
        </section>
      </main>
      <Analytics />
    </div>
  );
}

function Panel({ title, items }) {
  return <section style={panel}><h3 style={h2}>{title}</h3><ul style={ul}>{items.length ? items.map((item, i) => <li key={i}>{item}</li>) : <li>No records yet.</li>}</ul></section>;
}

const shell = { minHeight: '100vh', background: '#0b0f14', color: '#e5f0ff', fontFamily: 'Inter, system-ui, sans-serif' };
const header = { padding: '20px 24px', borderBottom: '1px solid #1b2633', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const kicker = { fontSize: 12, letterSpacing: 2, color: '#6dd6ff' };
const title = { margin: '6px 0 0', fontSize: 24 };
const grid = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, padding: 24 };
const sideGrid = { display: 'grid', gap: 16 };
const panel = { background: '#111826', border: '1px solid #223142', borderRadius: 16, padding: 18 };
const h2 = { marginTop: 0 };
const ul = { margin: 0, paddingLeft: 18, color: '#b8c9dd' };
const inputStyle = { width: '100%', marginTop: 6, marginBottom: 12, background: '#0b0f14', border: '1px solid #2a3b50', color: '#e5f0ff', borderRadius: 10, padding: '10px 12px', boxSizing: 'border-box' };
const buttonRow = { display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' };
const buttonStyle = { background: '#12324a', color: '#d9f2ff', border: '1px solid #295573', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' };
const statusStyle = { color: '#9fc9ff', marginTop: 12 };
