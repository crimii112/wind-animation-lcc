import { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import html2canvas from 'html2canvas';
import { Map as OlMap, View } from 'ol';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { Control, defaults as defaultControls, Zoom } from 'ol/control';
import {
  DblClickDragZoom,
  defaults as defaultInteractions,
} from 'ol/interaction';
import { Tile } from 'ol/layer';
import { OSM, XYZ } from 'ol/source';

import MapContext from './MapContext';
import { LccContext } from '@/components/lcc/LccContext';
import { map } from 'lodash';

proj4.defs(
  'LCC',
  '+proj=lcc +lat_1=30 +lat_2=60 +lat_0=38 +lon_0=126 +x_0=0 +y_0=0 +a=6370000 +b=6370000 +units=m +no_defs',
);
register(proj4);

const VWORLD_LAYER_CONFIGS = [
  { key: 'Base', path: 'Base', format: 'png', label: '일반지도' },
  { key: 'Satellite', path: 'Satellite', format: 'jpeg', label: '위성지도' },
  { key: 'Hybrid', path: 'Hybrid', format: 'png', label: '하이브리드지도' },
  { key: 'White', path: 'white', format: 'png', label: '백지도' },
  { key: 'Midnight', path: 'midnight', format: 'png', label: 'Midnight지도' },
];

const API_KEY = import.meta.env.VITE_APP_VWORLD_API_KEY;

const MapProvider = ({ id, children }) => {
  const [mapObj, setMapObj] = useState({});

  const { settings } = useContext(LccContext);

  const currentTypeRef = useRef('Base');
  const toggleBtnRef = useRef(null);

  useEffect(() => {
    if (mapObj?.ol_uid) return;

    const center = [34980, -215509];
    const VWORLD_MIN_ZOOM = 7.8;

    const osmLayer = new Tile({
      name: 'OSM',
      source: new OSM(),
    });

    const vworldLayers = {};
    VWORLD_LAYER_CONFIGS.forEach(({ key, path, format }) => {
      vworldLayers[key] = new Tile({
        name: key,
        visible: false,
        source: new XYZ({
          url: `https://api.vworld.kr/req/wmts/1.0.0/${API_KEY}/${path}/{z}/{y}/{x}.${format}`,
          crossOrigin: 'anonymous',
        }),
      });
    });

    const view = new View({
      projection: 'LCC',
      center: center,
      zoom: 7.8,
      maxZoom: 13,
      minZoom: 5,
    });

    const map = new OlMap({
      controls: defaultControls({ zoom: false, rotate: false }).extend([
        new Zoom({
          className: 'custom-zoom-control',
          delta: 0.5,
        }),
      ]),
      interactions: defaultInteractions().extend([new DblClickDragZoom()]),
      layers: [osmLayer, ...Object.values(vworldLayers)],
      view,
      target: id,
    });

    const updateVWorldVisibility = () => {
      const z = view.getZoom();
      const zoomOk = typeof z === 'number' && z >= VWORLD_MIN_ZOOM;
      const currentType = currentTypeRef.current;

      let vworldVisible = false;

      Object.entries(vworldLayers).forEach(([key, layer]) => {
        const visible = zoomOk && key === currentType;
        layer.setVisible(visible);
        if (visible) vworldVisible = true;
      });

      osmLayer.setVisible(!vworldVisible);
    };

    updateVWorldVisibility();
    view.on('change:resolution', updateVWorldVisibility);

    // 외부에서 지도 타입 변경 가능하도록 메서드 추가
    map.setMapType = type => {
      currentTypeRef.current = type;
      updateVWorldVisibility();
    };

    /** 지도 선택 버튼 Control */
    const container = document.createElement('div');
    container.className = 'custom-maptype-wrapper';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'maptype-toggle-btn';
    toggleBtn.innerHTML = '지도<br/>선택';

    toggleBtnRef.current = toggleBtn;

    const dropdown = document.createElement('div');
    dropdown.className = 'maptype-dropdown';
    dropdown.style.display = 'none';

    toggleBtn.onclick = e => {
      e.stopPropagation();
      dropdown.style.display =
        dropdown.style.display === 'none' ? 'block' : 'none';
    };

    // 외부 클릭 시 dropdown 닫기
    const handleDocumentClick = () => {
      dropdown.style.display = 'none';
    };
    document.addEventListener('click', handleDocumentClick);

    // 레이어 선택 목록 생성
    VWORLD_LAYER_CONFIGS.forEach(type => {
      const item = document.createElement('div');
      item.className = 'maptype-item';
      item.innerText = type.label;

      item.onclick = () => {
        map.setMapType(type.key);
        dropdown.style.display = 'none';

        Array.from(dropdown.children).forEach(el =>
          el.classList.remove('active'),
        );
        item.classList.add('active');
      };

      if (type.key === currentTypeRef.current) {
        item.classList.add('active');
      }

      dropdown.appendChild(item);
    });

    container.appendChild(toggleBtn);
    container.appendChild(dropdown);

    const mapTypeControl = new Control({
      element: container,
    });

    map.addControl(mapTypeControl);

    /** 지도 png 다운로드 control */
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'map-download-btn';
    downloadBtn.innerHTML = '다운<br/>로드';

    downloadBtn.onclick = async () => {
      const captureTarget = document.getElementById('map-capture-area');
      if (!captureTarget) return;

      // 패널 숨기기
      const panel = captureTarget.querySelector('.panel-exclude');
      if (panel) panel.style.display = 'none';

      // control 숨기기
      const controls = captureTarget.querySelectorAll(
        '.ol-control, .custom-maptype-wrapper, .map-download-btn, .map-fullscreen-btn',
      );
      controls.forEach(el => (el.style.display = 'none'));

      const canvas = await html2canvas(captureTarget, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
      });

      if (panel) panel.style.display = 'block';
      controls.forEach(el => (el.style.display = ''));

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `map_${Date.now()}.png`;
      link.click();
    };

    const downloadControl = new Control({
      element: downloadBtn,
    });
    map.addControl(downloadControl);

    /** 전체화면 control */
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'map-fullscreen-btn';
    fullscreenBtn.innerHTML = '전체<br/>화면';

    fullscreenBtn.onclick = () => {
      const wrapper = document.getElementById('fullscreen-area');
      if (!wrapper) return;

      if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
      } else {
        document.exitFullscreen();
      }

      setTimeout(() => {
        map.updateSize();
      }, 100);
    };

    const fullscreenControl = new Control({
      element: fullscreenBtn,
    });
    map.addControl(fullscreenControl);

    setMapObj(map);

    return () => {
      view.un('change:resolution', updateVWorldVisibility);
      map.setTarget(undefined);
    };
  }, [id]);

  useEffect(() => {
    if (!mapObj) return;

    const handleResize = () => {
      mapObj.updateSize();
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, [mapObj]);

  useEffect(() => {
    if (!toggleBtnRef.current) return;

    if (settings.gridKm === 27) {
      toggleBtnRef.current.disabled = true;
      toggleBtnRef.current.style.opacity = 0.5;
      toggleBtnRef.current.style.cursor = 'not-allowed';
    } else {
      toggleBtnRef.current.disabled = false;
      toggleBtnRef.current.style.opacity = 1;
      toggleBtnRef.current.style.cursor = 'pointer';
    }
  }, [settings.gridKm]);

  useEffect(() => {
    if (!mapObj || !mapObj?.ol_uid) return;

    const view = mapObj.getView();

    view.animate({
      zoom: settings.zoom,
      duration: 500,
    });
  }, [settings.zoom, mapObj]);

  return (
    <MapContext.Provider value={mapObj}>
      <MapDiv>{children}</MapDiv>
    </MapContext.Provider>
  );
};

export default MapProvider;

const MapDiv = styled.div`
  .ol-overlaycontainer-stopevent {
    padding: 5px;
  }

  .ol-attribution {
    position: absolute;
    right: 5px;
    bottom: 5px;
    left: auto;
    top: auto;
    font-size: 10px;
  }

  .custom-maptype-wrapper {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 1000;
  }

  .maptype-toggle-btn {
    width: 36px;
    height: 36px;

    border: none;
    border-radius: 8px;
    background: #ffffff;

    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;

    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    cursor: pointer;
    transition: all 0.2s ease;

    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .maptype-toggle-btn:hover {
    background: #f3f3f3;
  }

  .maptype-dropdown {
    position: absolute;
    top: 0px;
    right: calc(100% + 8px);

    width: auto;
    min-width: max-content;
    padding: 6px;

    background: #2f3136;
    border-radius: 8px;

    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);

    white-space: nowrap;
  }

  .maptype-item {
    padding: 10px 14px;
    font-size: 13px;
    color: #dcdcdc;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .maptype-item:hover {
    background: #3a3d42;
  }

  .maptype-item.active {
    color: #4dabf7;
    font-weight: 600;
  }

  .custom-zoom-control {
    position: absolute;
    top: 60px;
    right: 12px;

    width: 36px;

    display: flex;
    flex-direction: column;

    border-radius: 8px;
    overflow: hidden;

    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .custom-zoom-control button {
    width: 100%;
    height: 34px;

    border: none;
    background: #ffffff;

    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
  }

  .custom-zoom-control button:hover {
    background: #f2f2f2;
  }

  .map-download-btn {
    position: absolute;
    top: 140px; /* zoom 아래 */
    right: 12px;

    width: 36px;
    height: 36px;

    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;

    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    border: none;
    border-radius: 8px;
    background: #ffffff;

    cursor: pointer;

    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .map-download-btn:hover {
    background: #f3f3f3;
  }

  .map-fullscreen-btn {
    position: absolute;
    top: 190px; /* 다운로드 버튼 아래 */
    right: 12px;

    width: 36px;
    height: 36px;

    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;

    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    border: none;
    border-radius: 8px;
    background: #ffffff;

    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .map-fullscreen-btn:hover {
    background: #f3f3f3;
  }
`;
