import { Overlay } from 'ol';
import { useEffect, useRef } from 'react';

export function usePolygonOverlay({
  map,
  layersRef,
  settingsRef,
  layerVisibleRef,
  overlayMode,
  polygonMode,
  concPolygonVisible,
}) {
  const overlayRef = useRef(null);
  const overlayElRef = useRef(null);

  const lastRunRef = useRef(0);
  const lastFeatureRef = useRef(null);

  useEffect(() => {
    if (!map?.ol_uid) return;

    const el = document.createElement('div');
    el.className = 'ol-tooltip';

    el.style.position = 'relative';
    el.style.padding = '10px 12px';
    el.style.background = 'rgba(255,255,255,0.95)';
    el.style.color = '#000';
    el.style.borderRadius = '10px';
    el.style.fontSize = '13px';
    el.style.fontWeight = '600';
    el.style.whiteSpace = 'pre-line';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
    el.style.border = '1px solid #ccc';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerText = 'x';
    closeBtn.setAttribute('aria-label', '닫기');

    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '6px';
    closeBtn.style.right = '6px';
    closeBtn.style.width = '20px';
    closeBtn.style.height = '20px';
    closeBtn.style.padding = '0';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#666';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.fontWeight = '700';
    closeBtn.style.lineHeight = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.display = 'none';
    closeBtn.style.pointerEvents = 'auto';

    const contentEl = document.createElement('div');
    contentEl.style.pointerEvents = 'none';

    closeBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      lastFeatureRef.current = null;
      overlay.setPosition(undefined);
    });

    el.appendChild(closeBtn);
    el.appendChild(contentEl);

    const overlay = new Overlay({
      element: el,
      offset: [0, -10],
      positioning: 'bottom-center',
      stopEvent: true,
    });

    overlayRef.current = overlay;
    overlayElRef.current = el;

    map.addOverlay(overlay);

    const hideOverlay = () => {
      lastFeatureRef.current = null;
      overlay.setPosition(undefined);
    };

    const isOverlayEnabled = () => {
      const { polygonMode, overlayMode } = settingsRef.current;
      const { concPolygon } = layerVisibleRef.current;

      if (!concPolygon) return false;
      if (overlayMode === 'none') return false;

      return polygonMode === 'single' || polygonMode === 'fixedSingle';
    };

    const getFeatureAtEvent = evt => {
      const pixel = map.getEventPixel(evt.originalEvent);
      const targetLayer = layersRef.current.layerConcPolygon;

      const feature = map.forEachFeatureAtPixel(pixel, f => f, {
        layerFilter: layer => layer === targetLayer,
        hitTolerance: 2,
      });

      return { feature, pixel };
    };

    const updateOverlayPositionStyle = pixel => {
      const mapSize = map.getSize();
      if (!pixel || !mapSize) return;

      const [, y] = pixel;

      if (y < 200) {
        overlay.setPositioning('top-center');
        overlay.setOffset([0, 10]);
      } else {
        overlay.setPositioning('bottom-center');
        overlay.setOffset([0, -10]);
      }
    };

    const updateCloseButtonVisibility = () => {
      const { overlayMode } = settingsRef.current;
      closeBtn.style.display = overlayMode === 'click' ? 'block' : 'none';
      contentEl.style.paddingRight = overlayMode === 'click' ? '18px' : '0';
    };

    const showOverlay = (feature, pixel, coordinate) => {
      if (!feature) {
        hideOverlay();
        return;
      }

      if (lastFeatureRef.current !== feature) {
        lastFeatureRef.current = feature;
        const overlayTxt = feature.get('overlay');
        contentEl.innerText = overlayTxt || '';
      }

      updateCloseButtonVisibility();
      updateOverlayPositionStyle(pixel);

      const geom = feature.getGeometry();
      const coord =
        geom?.getClosestPoint(map.getCoordinateFromPixel(pixel)) ?? coordinate;

      overlay.setPosition(coord);
    };

    const handlePointerMove = e => {
      const { overlayMode } = settingsRef.current;
      if (overlayMode !== 'hover') return;

      const now = performance.now();
      if (now - lastRunRef.current < 50) return;
      lastRunRef.current = now;

      if (!isOverlayEnabled()) {
        hideOverlay();
        return;
      }

      const { feature, pixel } = getFeatureAtEvent(e);
      showOverlay(feature, pixel, e.coordinate);
    };

    const handleSingleClick = e => {
      const { overlayMode } = settingsRef.current;
      if (overlayMode !== 'click') return;

      if (!isOverlayEnabled()) {
        hideOverlay();
        return;
      }

      const { feature, pixel } = getFeatureAtEvent(e);

      if (!feature) {
        hideOverlay();
        return;
      }

      showOverlay(feature, pixel, e.coordinate);
    };

    const handleMouseLeave = () => {
      const { overlayMode } = settingsRef.current;
      if (overlayMode === 'hover') {
        hideOverlay();
      }
    };

    map.on('pointermove', handlePointerMove);
    map.on('singleclick', handleSingleClick);
    map.getViewport().addEventListener('mouseleave', handleMouseLeave);

    return () => {
      map.un('pointermove', handlePointerMove);
      map.un('singleclick', handleSingleClick);
      map.getViewport().removeEventListener('mouseleave', handleMouseLeave);
      map.removeOverlay(overlay);
      overlayRef.current = null;
      overlayElRef.current = null;
    };
  }, [map, map?.ol_uid]);

  useEffect(() => {
    if (!overlayRef.current) return;

    const overlayEnabled =
      concPolygonVisible &&
      overlayMode !== 'none' &&
      (polygonMode === 'single' || polygonMode === 'fixedSingle');

    if (!overlayEnabled) {
      lastFeatureRef.current = null;
      overlayRef.current.setPosition(undefined);
      return;
    }

    const el = overlayElRef.current;
    if (!el) return;

    const closeBtn = el.querySelector('button');
    const contentEl = el.querySelector('div');

    if (closeBtn) {
      closeBtn.style.display = overlayMode === 'click' ? 'block' : 'none';
    }

    if (contentEl) {
      contentEl.style.paddingRight = overlayMode === 'click' ? '24px' : '0';
    }
  }, [overlayMode, polygonMode, concPolygonVisible]);
}
