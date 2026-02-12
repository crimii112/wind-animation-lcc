import { useCallback, useEffect, useState } from 'react';
import { Map as OlMap, View } from 'ol';
import { fromLonLat, get, transform } from 'ol/proj';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { defaults as defaultControls } from 'ol/control';
import {
  DblClickDragZoom,
  defaults as defaultInteractions,
} from 'ol/interaction';
import { Tile } from 'ol/layer';
import { OSM, XYZ } from 'ol/source';
import Button from 'ol-ext/control/Button';
import styled from 'styled-components';
import MapContext from './MapContext';

const MapProvider = ({ id, defaultMode = 'Base', children }) => {
  const [mapObj, setMapObj] = useState({});

  proj4.defs(
    'LCC',
    '+proj=lcc +lat_1=30 +lat_2=60 +lat_0=38 +lon_0=126 +x_0=0 +y_0=0 +a=6370000 +b=6370000 +units=m +no_defs',
  );
  register(proj4);

  useEffect(() => {
    const center = [131338, -219484]; //lcc.jsx에서 사용
    const VWORLD_MIN_ZOOM = 7.5;

    const osmLayer = new Tile({
      name: 'OSM',
      source: new OSM({
        tilePixelRatio: 5,
      }),
    });

    const vworldBaseLayer = new Tile({
      name: 'Base',
      visible: false,
      source: new XYZ({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${
          import.meta.env.VITE_APP_VWORLD_API_KEY
        }/Base/{z}/{y}/{x}.png`,
      }),
    });

    const view = new View({
      projection: 'LCC',
      center: center,
      // projection: 'EPSG:4326',
      // center: transform(center, 'LCC', 'EPSG:4326'),
      zoom: 7.5,
      maxZoom: 13,
      minZoom: 2,
      units: 'm',
    });

    const map = new OlMap({
      controls: defaultControls({ zoom: false, rotate: false }),
      interactions: defaultInteractions().extend([new DblClickDragZoom()]),
      layers: [osmLayer, vworldBaseLayer],
      view,
      target: id,
    });

    const updateVWorldVisibility = () => {
      const z = view.getZoom();
      const shouldShow = typeof z === 'number' && z >= VWORLD_MIN_ZOOM;
      vworldBaseLayer.setVisible(shouldShow);
    };

    updateVWorldVisibility();
    const key = view.on('change:resolution', updateVWorldVisibility);

    setMapObj(map);

    return () => {
      view.un('change:resolution', updateVWorldVisibility);
      map.setTarget(undefined);
    };
  }, [id]);

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

  /* change map mode */
  .ol-button button {
    width: 60px;
    height: 30px;
    border: 1px solid lightgrey;
    background-color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    font-size: small;
  }
  .ol-button.ol-control {
    width: fit-content;
  }

  .ol-attribution {
    position: absolute;
    right: 5px;
    bottom: 5px;
    left: auto;
    top: auto;
    font-size: 10px;
  }
`;
