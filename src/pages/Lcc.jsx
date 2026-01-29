import { useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

import MapContext from '@/components/map/MapContext';
import { createLccWindOverlay } from '@/components/wind/lcc-wind-overlay';
import LccMapControlPanel from '@/components/ui/lcc-map-control-panel';
import LccLegend from '@/components/ui/lcc-legend';
import WindParticle from '@/components/wind/wind-particle';
import { LccContext } from '@/components/lcc/LccContext';
import {
  buildGrid,
  EarthWindOLAnimator,
} from '@/components/earth/earth-wind-ol-engine';
import {
  createLccLayers,
  createPolygonFeatures,
  createArrowFeatures,
  createGridFeatures,
} from '@/components/lcc/lcc.layers';

/**
 * METCRO2D, ACONC 파일 데이터로 가져옴 => layer 하나
 */
function Lcc({ mapId, SetMap }) {
  const GRID_KM_MAP_CONFIG = {
    9: { center: [131338, -219484], zoom: 7.5 },
    27: { center: [-121523, -46962], zoom: 5 },
    // 9: { center: transform([131338, -219484], 'LCC', 'EPSG:4326'), zoom: 7.5 },
    // 27: { center: transform([-121523, -46962], 'LCC', 'EPSG:4326'), zoom: 5 },
  };

  const map = useContext(MapContext);
  const { settings, style, layerVisible } = useContext(LccContext);

  const [datetimeTxt, setDatetimeTxt] = useState('');
  const [windData, setWindData] = useState([]);
  const [earthData, setEarthData] = useState([]);

  const layersRef = useRef(createLccLayers());
  const windOverlayRef = useRef([]);
  const windParticlesRef = useRef([]);
  const earthWindAnimatorRef = useRef(null);

  const halfCell = (settings.gridKm * 1000) / 2;

  // 지도 초기화
  useEffect(() => {
    if (!map.ol_uid) return;
    if (SetMap) SetMap(map);

    const {
      layerSidoShp,
      layerCoords,
      layerArrows,
      layerEarthWindCanvas,
      layerWindCanvas,
      layerGrid,
    } = layersRef.current;

    map.addLayer(layerSidoShp);
    map.addLayer(layerCoords);
    map.addLayer(layerArrows);
    map.addLayer(layerEarthWindCanvas);
    map.addLayer(layerWindCanvas);
    map.addLayer(layerGrid);

    map.on('singleclick', handleSingleClick);

    return () => {
      map.removeLayer(layerSidoShp);
      map.removeLayer(layerCoords);
      map.removeLayer(layerArrows);
      map.removeLayer(layerEarthWindCanvas);
      map.removeLayer(layerWindCanvas);
      map.removeLayer(layerGrid);
      map.un('singleclick', handleSingleClick);
    };
  }, [map, map.ol_uid]);

  const handleSingleClick = e => {
    // console.log(e.coordinate);
    // console.log(transform(e.coordinate, 'EPSG:3857', 'LCC'));
  };

  useEffect(() => {
    if (!map?.ol_uid) return;
    getSidoShp();
  }, [map?.ol_uid]);

  useEffect(() => {
    if (!map?.ol_uid) return;
    getLccData();
  }, [
    map?.ol_uid,
    settings.gridKm,
    settings.layer,
    settings.tstep,
    settings.bgPoll,
    settings.arrowGap,
  ]);

  useEffect(() => {
    if (!map?.ol_uid) return;
    getEarthData();
  }, [map?.ol_uid, settings.gridKm, settings.layer, settings.tstep]);

  // gridKm 변경 시 지도 뷰 재설정
  useEffect(() => {
    if (!map?.ol_uid) return;

    const cfg = GRID_KM_MAP_CONFIG[settings.gridKm];
    if (cfg) {
      map.getView().animate({
        center: cfg.center,
        zoom: cfg.zoom,
        duration: 500,
      });
    }
  }, [settings.gridKm]);

  useEffect(() => {
    const l = layersRef.current;
    l.layerSidoShp.setVisible(layerVisible.sidoshp);
    l.layerCoords.setVisible(layerVisible.coords);
    l.layerArrows.setVisible(layerVisible.arrows);
    l.layerWindCanvas.setVisible(layerVisible.windAnimation);
    l.layerEarthWindCanvas.setVisible(layerVisible.earth);
    l.layerGrid.setVisible(layerVisible.grid);
  }, [layerVisible]);

  useEffect(() => {
    layersRef.current.layerCoords.setOpacity(style.coordsOpacity);
  }, [style.coordsOpacity]);

  useEffect(() => {
    layersRef.current.layerArrows.setOpacity(style.arrowsOpacity);
  }, [style.arrowsOpacity]);

  /** 바람 화살표 스타일 업데이트(색상, 바람 간격 바뀔 때마다) */
  useEffect(() => {
    const layer = layersRef.current.layerArrows;

    layer.setStyle(f => {
      const wd = f.get('wd');
      const ws = f.get('ws');
      if (wd == null || ws == null) return null;

      const angle = ((wd - 180) * Math.PI) / 180;
      const scale = ws / 10;

      return [
        new Style({
          image: new RegularShape({
            points: 2,
            radius: 5,
            stroke: new Stroke({ width: 2, color: style.arrowColor }),
            scale: [1, scale],
            rotation: angle,
            rotateWithView: true,
          }),
        }),
        new Style({
          image: new RegularShape({
            points: 3,
            radius: 5,
            fill: new Fill({ color: style.arrowColor }),
            displacement: [0, 5 / 2 + 5 * scale],
            rotation: angle,
            rotateWithView: true,
          }),
        }),
      ];
    });
  }, [style.arrowColor, settings.arrowGap]);

  /* 시도 shp 데이터 요청 */
  const getSidoShp = async () => {
    const { sourceSidoShp, layerSidoShp } = layersRef.current;
    sourceSidoShp.clear();

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_WIND_API_URL}/api/marker/sidoshp`,
      );

      if (!data.sidoshp) return;

      const features = new GeoJSON().readFeatures(data.sidoshp, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'LCC',
      });

      sourceSidoShp.addFeatures(features);

      const style = new Style({
        stroke: new Stroke({
          color: 'black',
          width: 1.5,
        }),
      });
      layerSidoShp.setStyle(style);
    } catch (e) {
      console.error('Error fetching sido shp data:', e);
      alert(
        '시도 shp 데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.',
      );
    }
  };

  /* lcc 데이터 요청 */
  const getLccData = async () => {
    const { sourceCoords, sourceArrows, sourceGrid } = layersRef.current;

    sourceCoords.clear();
    sourceArrows.clear();
    sourceGrid.clear();

    windParticlesRef.current = [];
    setWindData([]);

    document.body.style.cursor = 'progress';

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_WIND_API_URL}/api/marker/lcc`,
        {
          gridKm: settings.gridKm,
          layer: settings.layer,
          tstep: settings.tstep,
          bgPoll: settings.bgPoll,
          arrowGap: settings.arrowGap,
        },
      );

      if (data.datetime) setDatetimeTxt(data.datetime);

      // 모델링 농도 Polygon 생성
      if (data.polygonData) {
        sourceCoords.addFeatures(
          createPolygonFeatures(data.polygonData, settings, halfCell, rgbs),
        );
        sourceGrid.addFeatures(createGridFeatures(data.polygonData));
      }

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

  /* earth 데이터 요청 */
  const getEarthData = async () => {
    setEarthData([]);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_WIND_API_URL}/api/marker/earth`,
        {
          gridKm: settings.gridKm,
          layer: settings.layer,
          tstep: settings.tstep,
        },
      );

      if (data.earthData) setEarthData(data.earthData);
    } catch (e) {
      console.error('Error fetching data:', e);
      alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
    }
  };

  /* wind overlay(바람 애니메이션) 추가 */
  useEffect(() => {
    windParticlesRef.current = windData.map(
      item => new WindParticle(item, style.windColor),
    );
  }, [windData, style.windColor]);

  useEffect(() => {
    if (!map?.ol_uid) return;
    let animationFrameId;

    // 애니메이션 루프
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
    };

    const handlePostRender = e => {
      if (!layerVisible.windAnimation) return;
      if (windParticlesRef.current.length === 0) return;

      const ctx = e.context;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      windParticlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx, map);
      });

      ctx.restore();
    };

    const windCanvasLayer = layersRef.current.layerWindCanvas;

    windCanvasLayer.setVisible(layerVisible.windAnimation);
    windCanvasLayer.on('postrender', handlePostRender);

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      windCanvasLayer.un('postrender', handlePostRender);
    };
  }, [map?.ol_uid, layerVisible.windAnimation]);

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

  /* earth animation 추가 */
  useEffect(() => {
    if (!map?.ol_uid) return;
    if (!earthData || earthData.length === 0) return;

    const layer = layersRef.current.layerEarthWindCanvas;
    layer.setVisible(layerVisible.earth);

    // 토글 OFF면 정지/정리
    if (!layerVisible.earth) {
      earthWindAnimatorRef.current?.stop?.();
      earthWindAnimatorRef.current = null;
      map.render();
      return;
    }

    // u/v 선택
    const uRec = earthData.find(r => r.header?.parameterNumber === 2);
    const vRec = earthData.find(r => r.header?.parameterNumber === 3);
    if (!uRec || !vRec) {
      console.error('u/v record not found');
      return;
    }

    const grid = buildGrid(uRec, vRec);
    const animator = new EarthWindOLAnimator({
      map,
      grid,
      maxIntensity: 17,
      color: style.earthWindColor,
    });

    const onPostRender = e => {
      animator.drawFrame(e.context);
    };

    const onMoveStart = () => {
      animator.stop();
      animator.clearTrails();
      layer.setVisible(false); // ← 잠시 사라지게
      map.render();
    };

    const onMoveEnd = () => {
      layer.setVisible(true);
      animator.start(); // 내부에서 rebuildField 호출
      map.render();
    };

    layer.on('postrender', onPostRender);
    map.on('movestart', onMoveStart);
    map.on('moveend', onMoveEnd);

    earthWindAnimatorRef.current = animator;
    animator.start();

    return () => {
      layer.un('postrender', onPostRender);
      map.un('movestart', onMoveStart);
      map.un('moveend', onMoveEnd);

      earthWindAnimatorRef.current = null;
      animator.stop();
    };
  }, [map?.ol_uid, layerVisible.earth, earthData, style.earthWindColor]);

  /* map render 관리 */
  useEffect(() => {
    if (!map?.ol_uid) return;
    if (!layerVisible.windAnimation && !layerVisible.earth) return;

    let rafId;

    const renderLoop = () => {
      map.render();
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [map, layerVisible.windAnimation, layerVisible.earth]);

  return (
    <MapDiv id={mapId}>
      <LccMapControlPanel datetime={datetimeTxt} />
      {settings.bgPoll && (
        <LccLegend
          title={settings.bgPoll}
          rgbs={rgbs[settings.bgPoll]}
          unit={unitMap[settings.bgPoll]}
        />
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
