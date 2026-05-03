import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { getById, putItem, STORES } from '../lib/storage';

const UI_KEY = 'ui-pwa-banner';

export function PwaBanner() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const ui = await getById(STORES.ui, UI_KEY);
      if (!alive) return;
      if (ui?.dismissedUntil && Date.now() < ui.dismissedUntil) return;
      if (offlineReady) {
        setVisible(true);
        setMode('offline');
      }
      if (needRefresh) {
        setVisible(true);
        setMode('refresh');
      }
    })();
    return () => {
      alive = false;
    };
  }, [offlineReady, needRefresh]);

  if (!visible) return null;

  async function dismiss() {
    const dismissedUntil = Date.now() + 1000 * 60 * 60 * 24;
    await putItem(STORES.ui, { id: UI_KEY, dismissedUntil });
    setVisible(false);
  }

  return (
    <div style={banner}>
      <div>{mode === 'refresh' ? 'New ArgOS content is available.' : 'ArgOS is ready to work offline.'}</div>
      <div style={actions}>
        {mode === 'refresh' && <button onClick={() => updateServiceWorker(true)} style={buttonStyle}>Reload</button>}
        <button onClick={dismiss} style={buttonStyle}>Dismiss</button>
      </div>
    </div>
  );
}

const banner = { margin: '16px 24px 0', background: '#132033', border: '1px solid #295573', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 };
const actions = { display: 'flex', gap: 12, flexWrap: 'wrap' };
const buttonStyle = { background: '#12324a', color: '#d9f2ff', border: '1px solid #295573', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' };
