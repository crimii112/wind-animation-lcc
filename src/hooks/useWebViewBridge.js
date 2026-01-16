import { useEffect } from 'react';

export function useWebViewBridge({ setDateTime, setLayerVisible }) {
  useEffect(() => {
    if (!window.chrome?.webview) return;

    const handler = e => {
      const msg = e.data;
      console.log(e.data);

      if (msg.type === 'SET_DATETIME') {
        const [y, m, d] = msg.date.split('-');

        setDateTime(prev => {
          const n = new Date(prev);
          n.setFullYear(y, m - 1, d);
          n.setHours(msg.hour, 0, 0, 0);
          return n;
        });
      }

      if (msg.type === 'TOGGLE_LAYER') {
        setLayerVisible(v => ({
          ...v,
          [msg.layer]: msg.visible,
        }));
      }
    };

    window.chrome.webview.addEventListener('message', handler);

    return () => {
      window.chrome.webview.removeEventListener('message', handler);
    };
  }, []);
}
