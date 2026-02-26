import { Overlay } from 'ol';
import { useEffect, useRef } from 'react';

export function usePolygonOverlay({
  map,
  layersRef,
  settingsRef,
  layerVisibleRef,
}) {
  const overlayRef = useRef(null);
  const overlayElRef = useRef(null);

  const lastRunRef = useRef(0);
  const lastFeatureRef = useRef(null);

  useEffect(() => {
    if (!map?.ol_uid) return;

    const el = document.createElement('div');
    el.className = 'ol-tooltip';

    el.style.padding = '6px 8px';
    el.style.background = 'rgba(255,255,255,0.95)';
    el.style.color = '#000';
    el.style.borderRadius = '6px';
    el.style.fontSize = '13px';
    el.style.fontWeight = '600';
    el.style.whiteSpace = 'pre-line';
    el.style.pointerEvents = 'none';
    el.style.position = 'relative';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
    el.style.border = '1px solid #ccc';

    const overlay = new Overlay({
      element: el,
      offset: [0, -10],
      positioning: 'bottom-center',
      stopEvent: true,
    });

    overlayRef.current = overlay;
    overlayElRef.current = el;

    map.addOverlay(overlay);

    const handlePointerMove = e => {
      const now = performance.now();

      if (now - lastRunRef.current < 50) return;
      lastRunRef.current = now;

      const { polygonMode } = settingsRef.current;
      const { concPolygon } = layerVisibleRef.current;

      if (polygonMode !== 'single' || !concPolygon) {
        lastFeatureRef.current = null;
        overlay.setPosition(undefined);
        return;
      }

      const pixel = map.getEventPixel(e.originalEvent);

      const targetLayer = layersRef.current.layerConcPolygon;

      const feature = map.forEachFeatureAtPixel(pixel, (f, layer) => f, {
        layerFilter: layer => layer === targetLayer,
        hitTolerance: 0,
      });

      if (!feature) {
        lastFeatureRef.current = null;
        overlay.setPosition(undefined);
        return;
      }

      if (lastFeatureRef.current !== feature) {
        lastFeatureRef.current = feature;
        const overlayTxt = feature.get('overlay');
        el.innerText = overlayTxt || '';
      }

      const mapSize = map.getSize();
      if (pixel && mapSize) {
        const [, y] = pixel;
        const [, h] = mapSize;

        if (y < 200) {
          overlay.setPositioning('top-center');
          overlay.setOffset([0, 10]);
        } else {
          overlay.setPositioning('bottom-center');
          overlay.setOffset([0, -10]);
        }
      }

      overlay.setPosition(e.coordinate);
    };

    const handleMouseLeave = () => {
      lastFeatureRef.current = null;
      overlay.setPosition(undefined);
    };

    map.on('pointermove', handlePointerMove);
    map.getViewport().addEventListener('mouseleave', handleMouseLeave);

    return () => {
      map.un('pointermove', handlePointerMove);
      map.getViewport().removeEventListener('mouseleave', handleMouseLeave);
      map.removeOverlay(overlay);
      overlayRef.current = null;
      overlayElRef.current = null;
    };
  }, [map, map?.ol_uid]);
}
