import { useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { MultiPolygon, Point, Polygon } from 'ol/geom';
import { Feature } from 'ol';
import { transform } from 'ol/proj';

import MapContext from '@/components/map/MapContext';
import { createLccWindOverlay } from '@/components/wind/lcc-wind-overlay';
import LccMapControlPanel from '@/components/ui/lcc-map-control-panel';
import LccLegend from '@/components/ui/lcc-legend';
import WindParticle from '@/components/wind/wind-particle';

const GRID_KM_MAP_CONFIG = {
  9: { center: [131338, -219484], zoom: 7.5 },
  27: { center: [-121523, -46962], zoom: 5 },
};

function Lcc({ mapId, SetMap }) {
  const map = useContext(MapContext);

  const [datetimeTxt, setDatetimeTxt] = useState('');
  // api 요청 파라미터
  const [gridKm, setGridKm] = useState(9);
  const [layer, setLayer] = useState(0);
  const [tstep, setTstep] = useState(0);
  const [bgPoll, setBgPoll] = useState('O3');
  const [arrowGap, setArrowGap] = useState(3);
  const halfCell = (gridKm * 1000) / 2;

  // 바람 애니메이션 관련
  const windOverlayRef = useRef([]);
  const [windData, setWindData] = useState([]);
  const windParticlesRef = useRef([]);

  // 레이어 on/off 상태 관리
  const [layerVisible, setLayerVisible] = useState({
    coords: true,
    arrows: true,
    windAnimation: true,
  });

  // 모델링 농도 히트맵(polygon)
  const sourceCoordsRef = useRef(new VectorSource({ wrapX: false }));
  const sourceCoords = sourceCoordsRef.current;
  const layerCoordsRef = useRef(
    new VectorLayer({
      source: sourceCoords,
      id: 'coords',
      opacity: 0.5,
    })
  );

  // 바람 화살표(Point)
  const sourceArrowsRef = useRef(new VectorSource({ wrapX: false }));
  const sourceArrows = sourceArrowsRef.current;
  const layerArrowsRef = useRef(
    new VectorLayer({
      source: sourceArrows,
      id: 'arrows',
    })
  );

  // 바람 애니메이션
  const layerWindCanvasRef = useRef(
    new VectorLayer({
      id: 'windCanvas',
      source: new VectorSource(),
      style: null,
      updateWhileAnimating: true,
    })
  );

  // 화살표 스타일 객체
  const shaft = new RegularShape({
    points: 2,
    radius: 5,
    stroke: new Stroke({
      width: 2,
      color: 'yellow',
    }),
    rotateWithView: true,
  });
  const head = new RegularShape({
    points: 3,
    radius: 5,
    fill: new Fill({
      color: 'yellow',
    }),
    rotateWithView: true,
  });
  const styles = [new Style({ image: shaft }), new Style({ image: head })];

  // 지도 초기화
  useEffect(() => {
    if (!map.ol_uid) return;
    if (SetMap) SetMap(map);

    map.addLayer(layerCoordsRef.current);
    map.addLayer(layerArrowsRef.current);
    map.addLayer(layerWindCanvasRef.current);

    map.on('singleclick', handleSingleClick);

    return () => {
      map.removeLayer(layerCoordsRef.current);
      map.removeLayer(layerArrowsRef.current);
      map.removeLayer(layerWindCanvasRef.current);
      map.un('singleclick', handleSingleClick);
    };
  }, [map, map.ol_uid]);

  const handleSingleClick = e => {
    console.log(e.coordinate);
    console.log(transform(e.coordinate, 'EPSG:3857', 'LCC'));
  };

  // 데이터 로딩 트리거(초기 + 옵션 변경)
  useEffect(() => {
    if (!map?.ol_uid) return;
    getLccData();
  }, [map?.ol_uid, gridKm, layer, tstep, bgPoll, arrowGap]);

  // gridKm 변경 시 지도 뷰 재설정
  useEffect(() => {
    if (!map?.ol_uid) return;

    const cfg = GRID_KM_MAP_CONFIG[gridKm];
    if (!cfg) return;

    map.getView().animate({
      center: cfg.center,
      zoom: cfg.zoom,
      duration: 500,
    });
  }, [gridKm]);

  // bgPoll 변경 시 기존 스타일 캐시 초기화
  useEffect(() => {
    polygonStyleCache.current = {};
  }, [bgPoll]);

  useEffect(() => {
    layerCoordsRef.current?.setVisible(layerVisible.coords);
    layerArrowsRef.current?.setVisible(layerVisible.arrows);
  }, [layerVisible]);

  // 화살표 스타일 함수
  // 화살표는 feature마다 방향/크기가 다르므로 layer.setStyle() 방식 사용
  useEffect(() => {
    if (!layerArrowsRef.current) return;

    layerArrowsRef.current.setStyle(f => {
      const wd = f.get('wd');
      const ws = f.get('ws');
      if (wd == null || ws == null) return null;

      const angle = ((wd - 180) * Math.PI) / 180;
      const scale = ws / 10;

      shaft.setScale([1, scale]);
      shaft.setRotation(angle);

      head.setDisplacement([
        0,
        head.getRadius() / 2 + shaft.getRadius() * scale,
      ]);
      head.setRotation(angle);

      return styles;
    });
  }, []);

  const polygonStyleCache = useRef({});
  const getPolygonStyle = value => {
    const key = `${bgPoll}-${value}`;
    if (polygonStyleCache.current[key]) {
      return polygonStyleCache.current[key];
    }

    const color = rgbs[bgPoll].find(
      s => value >= s.min && value < s.max
    )?.color;

    if (!color) return null;

    const style = new Style({
      fill: new Fill({
        color: color.replace(
          /rgba\(([^,]+), ([^,]+), ([^,]+), ([^)]+)\)/,
          (_, r, g, b) => `rgba(${r}, ${g}, ${b}, 1)`
        ),
      }),
    });

    polygonStyleCache.current[key] = style;
    return style;
  };

  // API 데이터 요청
  const getLccData = async () => {
    sourceArrows.clear();
    sourceCoords.clear();
    windParticlesRef.current = [];
    setWindData([]);
    document.body.style.cursor = 'progress';

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_WIND_API_URL}/api/marker/lcc`,
        { gridKm, layer, tstep, bgPoll, arrowGap }
      );

      if (data.datetime) setDatetimeTxt(data.datetime);

      if (!data?.polygonData) return;

      // 히트맵 Polygon 생성
      sourceCoords.addFeatures(createPolygonFeatures(data.polygonData));

      // 바람 애니메이션 데이터 설정
      // 화살표 생성
      if (data.arrowData) {
        setWindData(data.arrowData);
        sourceArrows.addFeatures(createArrowFeatures(data.arrowData));
      }
    } catch (e) {
      console.error('Error fetching data:', e);
      alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
    } finally {
      document.body.style.cursor = 'default';
    }
  };

  // 히트맵 Polygon Feature 생성
  // const createPolygonFeatures = data =>
  //   data.map(item => {
  //     const f = new Feature({
  //       geometry: new Polygon([
  //         [
  //           [item.lon - halfCell, item.lat + halfCell],
  //           [item.lon - halfCell, item.lat - halfCell],
  //           [item.lon + halfCell, item.lat - halfCell],
  //           [item.lon + halfCell, item.lat + halfCell],
  //           [item.lon - halfCell, item.lat + halfCell],
  //         ],
  //       ]),
  //       value: item.value,
  //     });

  //     f.setStyle(getPolygonStyle(item.value));
  //     return f;
  //   });

  const createPolygonFeatures = data => {
    const colorRange = rgbs[bgPoll];

    const groupedCoordinates = {};

    data.forEach(item => {
      const colorIndex = colorRange.findIndex(
        s => item.value >= s.min && item.value < s.max
      );

      if (colorIndex !== -1) {
        if (!groupedCoordinates[colorIndex]) {
          groupedCoordinates[colorIndex] = [];
        }

        const coords = [
          [
            [item.lon - halfCell, item.lat + halfCell],
            [item.lon - halfCell, item.lat - halfCell],
            [item.lon + halfCell, item.lat - halfCell],
            [item.lon + halfCell, item.lat + halfCell],
            [item.lon - halfCell, item.lat + halfCell],
          ],
        ];
        groupedCoordinates[colorIndex].push(coords);
      }
    });

    console.log(groupedCoordinates);

    const features = Object.keys(groupedCoordinates).map(index => {
      const range = colorRange[index];

      const multiPolygonGeometry = new MultiPolygon(groupedCoordinates[index]);

      const feature = new Feature({
        geometry: multiPolygonGeometry,
      });

      feature.setStyle(
        new Style({
          fill: new Fill({
            color: range.color,
          }),
        })
      );

      return feature;
    });

    return features;
  };

  // 바람 화살표 Feature 생성
  const createArrowFeatures = data =>
    data.map(
      item =>
        new Feature({
          geometry: new Point([item.lon, item.lat]),
          wd: item.wd,
          ws: item.ws,
        })
    );

  /* wind overlay(바람 애니메이션) 추가 */
  useEffect(() => {
    if (windData && windData.length > 0) {
      windParticlesRef.current = windData.map(item => new WindParticle(item));
    } else {
      windParticlesRef.current = [];
    }
  }, [windData]);

  useEffect(() => {
    if (!map?.ol_uid || !layerWindCanvasRef.current) return;

    let animationFrameId;

    // 애니메이션 루프
    const animate = () => {
      if (layerVisible.windAnimation && windParticlesRef.current.length > 0) {
        map.render();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handlePostRender = e => {
      if (!layerVisible.windAnimation || windParticlesRef.current.length === 0)
        return;

      const ctx = e.context;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      windParticlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx, map);
      });

      ctx.restore();
    };

    const windCanvasLayer = layerWindCanvasRef.current;

    windCanvasLayer.setVisible(layerVisible.windAnimation);
    windCanvasLayer.on('postrender', handlePostRender);

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      windCanvasLayer.un('postrender', handlePostRender);
    };
  }, [map, layerVisible.windAnimation]);

  /* overlay 방식 바람 애니메이션 (미사용) */
  // useEffect(() => {
  //   if (!map?.ol_uid) return;

  //   windOverlayRef.current.forEach(o => map.removeOverlay(o));
  //   windOverlayRef.current = [];

  //   if (!layerVisible.windAnimation || windData.length === 0) return;

  //   windData.forEach(item => {
  //     windOverlayRef.current.push(createLccWindOverlay(map, item));
  //   });
  // }, [map, windData, layerVisible.windAnimation]);

  return (
    <MapDiv id={mapId}>
      <LccMapControlPanel
        datetime={datetimeTxt}
        gridKm={gridKm}
        setGridKm={setGridKm}
        layer={layer}
        setLayer={setLayer}
        tstep={tstep}
        setTstep={setTstep}
        bgPoll={bgPoll}
        setBgPoll={setBgPoll}
        arrowGap={arrowGap}
        setArrowGap={setArrowGap}
        layerVisible={layerVisible}
        setLayerVisible={setLayerVisible}
      />
      {bgPoll && (
        <LccLegend title={bgPoll} rgbs={rgbs[bgPoll]} unit={unitMap[bgPoll]} />
      )}
    </MapDiv>
  );
}

const unitMap = {
  O3: 'ppm',
  PM10: 'µg/m³',
  'PM2.5': 'µg/m³',
};

export default Lcc;

const rgbs = {
  O3: [
    {
      min: 0.0,
      max: 0.01,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 0.01,
      max: 0.02,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 0.02,
      max: 0.03,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 0.03,
      max: 0.04,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 0.04,
      max: 0.05,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 0.05,
      max: 0.06,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 0.06,
      max: 0.07,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 0.07,
      max: 0.08,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 0.08,
      max: 0.09,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 0.09,
      max: 0.1,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 0.1,
      max: 0.11,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 0.11,
      max: 0.12,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 0.12,
      max: 0.13,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 0.13,
      max: 0.14,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 0.14,
      max: 0.15,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 0.15,
      max: 0.16,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 0.16,
      max: 0.17,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 0.17,
      max: 0.18,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 0.18,
      max: 0.19,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 0.19,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  PM10: [
    {
      min: 0,
      max: 6,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 6,
      max: 18,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 18,
      max: 31,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 31,
      max: 40,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 40,
      max: 48,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 48,
      max: 56,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 56,
      max: 64,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 64,
      max: 72,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 72,
      max: 81,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 81,
      max: 93,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 93,
      max: 105,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 105,
      max: 117,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 117,
      max: 130,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 130,
      max: 142,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 142,
      max: 151,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 151,
      max: 191,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 191,
      max: 231,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 231,
      max: 271,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 271,
      max: 320,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 320,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  'PM2.5': [
    {
      min: 0,
      max: 5,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 5,
      max: 10,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 10,
      max: 16,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 16,
      max: 19,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 19,
      max: 22,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 22,
      max: 26,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 26,
      max: 30,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 30,
      max: 33,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 33,
      max: 36,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 36,
      max: 42,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 42,
      max: 48,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 48,
      max: 55,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 55,
      max: 62,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 62,
      max: 69,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 69,
      max: 76,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 76,
      max: 107,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 107,
      max: 138,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 138,
      max: 169,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 169,
      max: 200,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 200,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
};

const MapDiv = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;
`;
