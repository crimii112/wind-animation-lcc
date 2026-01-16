import { Overlay } from 'ol';
import { transform } from 'ol/proj';

const createUtmWindOverlay = (map, item) => {
  const { lon, lat, wd, ws } = item;

  // 풍속 → 애니메이션 속도
  const baseSpeed = ws < 5 ? 4 : ws < 10 ? 3 : ws < 15 ? 2 : 1;
  const speed = baseSpeed + Math.random() * 0.8;
  // 풍속 → 두께
  const thickness = ws < 3 ? 1 : ws < 6 ? 2 : 3;

  const el = document.createElement('div');
  el.innerHTML = `
        <div class="wind" style="transform: rotate(${(wd + 180) % 360}deg)">
            <span style="animation-duration: ${speed}s; width: ${thickness}px;"></span>
        </div>
    `;

  const windEl = el.querySelector('.wind');
  const windSpan = el.querySelector('.wind span');

  const overlay = new Overlay({
    element: el,
    position: transform([lon, lat], 'EPSG:32652', 'EPSG:3857'),
    positioning: 'center-center',
    stopEvent: false,
  });

  overlay._windEl = windEl;
  overlay._windSpan = windSpan;

  map.addOverlay(overlay);
  return overlay;
};

export { createUtmWindOverlay };
