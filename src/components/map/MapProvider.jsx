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

  proj4.defs('EPSG:32652', '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs');
  proj4.defs(
    'LCC',
    '+proj=lcc +lat_1=30 +lat_2=60 +lat_0=38 +lon_0=126 +x_0=0 +y_0=0 +a=6370000 +b=6370000 +units=m +no_defs'
  );
  register(proj4);

  /* 지도 모드(일반/위성) 버튼 추가 */
  const addChangeModeBtn = useCallback(map => {
    const baseLayerBtn = new Button({
      html: '일반',
      title: 'Base',
      handleClick: e => handleMapMode(e, map),
    });
    const satelliteLayerBtn = new Button({
      html: '위성',
      title: 'Satellite',
      handleClick: e => handleMapMode(e, map),
    });

    // map.addControl(baseLayerBtn);
    // map.addControl(satelliteLayerBtn);
  }, []);

  /* 지도 모드(일반/위성) 변경 */
  const handleMapMode = (e, map) => {
    map
      .getLayers()
      .getArray()
      .forEach(ly => {
        if (ly instanceof Tile) {
          ly.setVisible(ly.get('name') === e.target.title);
        }
      });
  };

  useEffect(() => {
    // const center = [14139592, 4498435];
    // const center = [14139274, 4477885];
    // const center = [14407986, 4306703]; // utm.jsx에서 사용
    const center = [131338, -219484]; //lcc.jsx에서 사용

    const map = new OlMap({
      controls: defaultControls({ zoom: false, rotate: false }),
      interactions: defaultInteractions().extend([new DblClickDragZoom()]),
      layers: [
        new Tile({
          name: 'OSM',
          source: new OSM({
            tilePixelRatio: 5,
          }),
        }),
        // new Tile({
        //   name: 'Base',
        //   visible: false,
        //   source: new XYZ({
        //     projection: 'EPSG:3857',
        //     url: `http://api.vworld.kr/req/wmts/1.0.0/${
        //       import.meta.env.VITE_APP_VWORLD_API_KEY
        //     }/Base/{z}/{y}/{x}.png`,
        //   }),
        // }),
        // new Tile({
        //   name: 'Satellite',
        //   visible: false,
        //   source: new XYZ({
        //     projection: 'EPSG:3857',
        //     url: `http://api.vworld.kr/req/wmts/1.0.0/${
        //       import.meta.env.VITE_APP_VWORLD_API_KEY
        //     }/Satellite/{z}/{y}/{x}.jpeg`,
        //   }),
        // }),
      ],
      view: new View({
        // projection: 'EPSG:3857',
        // center: center,
        // zoom: 11,
        projection: 'LCC',
        // center: transform(center, 'EPSG:3857', 'LCC'),
        center: center,
        zoom: 7.5,
        maxZoom: 13,
        minZoom: 2,
        units: 'm',
      }),
      target: id,
    });

    /* 기본 Map 모드 설정 */
    // map
    //   .getLayers()
    //   .getArray()
    //   .forEach(ly => ly.setVisible(ly.get('name') === defaultMode));

    addChangeModeBtn(map);
    setMapObj(map);

    return () => map.setTarget(undefined);
  }, [id, defaultMode, addChangeModeBtn]);

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
