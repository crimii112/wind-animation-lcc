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
      const { polygonMode } = settingsRef.current;
      const { concPolygon } = layerVisibleRef.current;

      if (polygonMode !== 'single' || !concPolygon) {
        overlay.setPosition(undefined);
        return;
      }

      const coord = e.coordinate;

      const source = layersRef.current.layerConcPolygon.getSource();
      const features = source.getFeatures();

      let feature = null;

      for (const f of features) {
        const geom = f.getGeometry();
        if (geom && geom.intersectsCoordinate(coord)) {
          feature = f;
          break;
        }
      }

      if (!feature) {
        overlay.setPosition(undefined);
        return;
      }

      const overlayTxt = feature.get('overlay');

      if (overlayTxt) {
        el.innerText = overlayTxt;

        const pixel = map.getPixelFromCoordinate(coord);
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

        overlay.setPosition(coord);
      } else {
        overlay.setPosition(undefined);
      }
    };

    const handleMouseLeave = () => {
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
