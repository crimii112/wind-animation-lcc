import { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
import {
  buildScalarGrid,
  EarthScalarOLAnimator,
} from '@/components/earth/earth-scalar-ol-engine';
import {
  EARTH_SEGMENTS_MAP,
  RGBA_RANGES,
  EARTH_SCALE_META,
} from '@/components/earth/earth-colors';
import { WebGLWindOLAnimator } from '@/components/webgl/webgl-wind-ol-engine';
import { Overlay } from 'ol';

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
  const [polygonData, setPolygonData] = useState(null);
  const [windData, setWindData] = useState([]);
  const [earthData, setEarthData] = useState([]);
  const [webGLData, setWebGLData] = useState(null);

  const layersRef = useRef(createLccLayers());
  const settingsRef = useRef(settings);
  const layerVisibleRef = useRef(layerVisible);
  const polygonOverlayRef = useRef(null);
  const polygonOverlayElRef = useRef(null);
  const windOverlayRef = useRef([]);
  const windParticlesRef = useRef([]);
  const earthWindAnimatorRef = useRef(null);
  const earthScalarAnimatorRef = useRef(null);
  const webglWindAnimatorRef = useRef(null);

  const halfCell = (settings.gridKm * 1000) / 2;

  // 지도 초기화
  useEffect(() => {
    if (!map.ol_uid) return;
    if (SetMap) SetMap(map);

    const {
      layerSidoShp,
      layerConcPolygon,
      layerWindArrows,
      layerWindAnimation,
      layerEarthScalarCanvas,
      layerEarthWindCanvas,
      layerGrid,
    } = layersRef.current;

    map.addLayer(layerSidoShp);
    map.addLayer(layerConcPolygon);
    map.addLayer(layerEarthScalarCanvas);
    map.addLayer(layerWindArrows);
    map.addLayer(layerWindAnimation);
    map.addLayer(layerEarthWindCanvas);
    map.addLayer(layerGrid);

    map.on('singleclick', handleSingleClick);
    map.on('pointermove', handlePointerMove);
    map.getViewport().addEventListener('mouseleave', handleMapLeave);

    const el = document.createElement('div');
    el.className = 'ol-tooltip';

    el.style.padding = '6px 8px';
    el.style.background = 'rgba(0,0,0,0.75)';
    el.style.color = '#fff';
    el.style.borderRadius = '6px';
    el.style.fontSize = '12px';
    el.style.fontWeight = '600';
    el.style.whiteSpace = 'pre-line';
    el.style.pointerEvents = 'none';
    el.style.position = 'relative';

    polygonOverlayElRef.current = el;
    const overlay = new Overlay({
      element: el,
      offset: [0, -10],
      positioning: 'bottom-center',
      stopEvent: true,
    });

    polygonOverlayRef.current = overlay;
    map.addOverlay(overlay);

    return () => {
      map.removeLayer(layerSidoShp);
      map.removeLayer(layerConcPolygon);
      map.removeLayer(layerEarthScalarCanvas);
      map.removeLayer(layerWindArrows);
      map.removeLayer(layerWindAnimation);
      map.removeLayer(layerEarthWindCanvas);
      map.removeLayer(layerGrid);
      map.un('singleclick', handleSingleClick);
      map.un('pointermove', handlePointerMove);
      map.getViewport().removeEventListener('mouseleave', handleMapLeave);
      map.removeOverlay(overlay);
      polygonOverlayRef.current = null;
      polygonOverlayElRef.current = null;
    };
  }, [map, map.ol_uid]);

  const handleSingleClick = e => {
    // console.log(e.coordinate);
    // console.log(transform(e.coordinate, 'EPSG:3857', 'LCC'));
  };

  const handlePointerMove = e => {
    const overlay = polygonOverlayRef.current;
    const el = polygonOverlayElRef.current;
    if (!overlay || !el) return;

    const { polygonMode } = settingsRef.current;
    const { concPolygon } = layerVisibleRef.current;

    if (polygonMode !== 'single' || !concPolygon) {
      overlay.setPosition(undefined);
      return;
    }

    const pixel = map.getEventPixel(e.originalEvent);

    const feature = map.forEachFeatureAtPixel(pixel, f => f, {
      hitTolerance: 2,
      layerFilter: layer => layer === layersRef.current.layerConcPolygon,
    });

    if (!feature) {
      overlay.setPosition(undefined);
      return;
    }

    const overlayTxt = feature.get('overlay');

    if (overlayTxt != null && overlayTxt !== '') {
      el.innerText = overlayTxt;
      overlay.setPosition(e.coordinate);
    } else {
      overlay.setPosition(undefined);
    }
  };

  const handleMapLeave = () => {
    const overlay = polygonOverlayRef.current;
    if (overlay) overlay.setPosition(undefined);
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
    getWebGLData();
  }, [
    map?.ol_uid,
    settings.gridKm,
    settings.layer,
    settings.tstep,
    settings.bgPoll,
  ]);

  useEffect(() => {
    settingsRef.current = settings;
    layerVisibleRef.current = layerVisible;
  }, [settings, layerVisible]);

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
    l.layerConcPolygon.setVisible(layerVisible.concPolygon);
    l.layerWindArrows.setVisible(layerVisible.windArrows);
    l.layerWindAnimation.setVisible(layerVisible.windAnimation);
    l.layerEarthWindCanvas.setVisible(layerVisible.earthWind);
    l.layerEarthScalarCanvas.setVisible(layerVisible.earthScalar);
    l.layerGrid.setVisible(layerVisible.grid);
  }, [layerVisible]);

  useEffect(() => {
    layersRef.current.layerConcPolygon.setOpacity(style.concPolygonOpacity);
  }, [style.concPolygonOpacity]);

  useEffect(() => {
    layersRef.current.layerWindArrows.setOpacity(style.windArrowsOpacity);
  }, [style.windArrowsOpacity]);

  useEffect(() => {
    layersRef.current.layerSidoShp.setOpacity(style.sidoshpOpacity);
  }, [style.sidoshpOpacity]);

  /** 바람 화살표 스타일 업데이트(색상, 바람 간격 바뀔 때마다) */
  useEffect(() => {
    const layer = layersRef.current.layerWindArrows;

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

  useEffect(() => {
    const layer = layersRef.current.layerSidoShp;

    layer.setStyle(
      new Style({
        stroke: new Stroke({
          color: style.sidoshpColor,
          width: 1.5,
        }),
      }),
    );
  }, [style.sidoshpColor]);

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
    const { sourceConcPolygon, sourceWindArrows, sourceGrid } =
      layersRef.current;

    sourceConcPolygon.clear();
    sourceWindArrows.clear();
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
        setPolygonData(data.polygonData);
        sourceGrid.addFeatures(createGridFeatures(data.polygonData));
      }

      // 바람 애니메이션 데이터 설정
      // 화살표 생성
      if (data.arrowData) {
        setWindData(data.arrowData);

        sourceWindArrows.addFeatures(createArrowFeatures(data.arrowData));
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
          bgPoll: settings.bgPoll,
        },
      );

      if (data.earthData) setEarthData(data.earthData);
    } catch (e) {
      console.error('Error fetching data:', e);
      alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
    }
  };

  /* webgl 데이터 요청 */
  const getWebGLData = async () => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_WIND_API_URL}/api/marker/webgl`,
        {
          gridKm: settings.gridKm,
          layer: settings.layer,
          tstep: settings.tstep,
          poll: settings.bgPoll,
        },
      );

      if (data) setWebGLData(data);
    } catch (e) {
      console.error('Error fetching data:', e);
      alert(
        'WebGL 데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.',
      );
    }
  };

  const redrawPolygons = useCallback(() => {
    const { sourceConcPolygon } = layersRef.current;
    sourceConcPolygon.clear();

    if (!polygonData || !settings.bgPoll) return;

    sourceConcPolygon.addFeatures(
      createPolygonFeatures(polygonData, settings, halfCell, RGBA_RANGES),
    );
  }, [polygonData, settings.bgPoll, settings.polygonMode, halfCell]);

  useEffect(() => {
    if (!map?.ol_uid) return;
    if (!polygonData) return;
    redrawPolygons();
  }, [map?.ol_uid, polygonData, redrawPolygons]);

  /* wind overlay(바람 애니메이션) 추가 */
  useEffect(() => {
    windParticlesRef.current = windData.map(
      item => new WindParticle(item, style.windColor),
    );
  }, [windData, style.windColor]);

  useEffect(() => {
    if (!map?.ol_uid) return;
    if (!layerVisible.windAnimation) return;

    const windAnimationLayer = layersRef.current.layerWindAnimation;
    let rafId;

    // 애니메이션 루프
    const animate = () => {
      windAnimationLayer.changed();
      rafId = requestAnimationFrame(animate);
    };

    const handlePostRender = e => {
      if (windParticlesRef.current.length === 0) return;

      const ctx = e.context;
      const pixelRatio = e.frameState.pixelRatio;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);
      // ctx.globalCompositeOperation = 'source-over';

      windParticlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx, map);
      });

      ctx.restore();
    };

    windAnimationLayer.on('postrender', handlePostRender);
    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      windAnimationLayer.un('postrender', handlePostRender);
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

  /* earth 바람장 추가 */
  const isMovingRef = useRef(false);
  useEffect(() => {
    if (!map?.ol_uid) return;
    if (!earthData || earthData.length === 0) return;

    const layer = layersRef.current.layerEarthWindCanvas;

    // 토글 OFF면 정지/정리
    if (!layerVisible.earthWind) {
      earthWindAnimatorRef.current?.stop?.();
      earthWindAnimatorRef.current = null;
      layer.changed();
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
      layer,
      grid,
      maxIntensity: 17,
      color: style.earthWindColor,
    });

    const onPostRender = e => {
      if (isMovingRef.current) return;
      animator.drawFrame(e.context);
    };

    const onMoveStart = () => {
      isMovingRef.current = true;
      animator.clearTrails();
      layer.changed();
    };

    const onMoveEnd = () => {
      isMovingRef.current = false;
      animator.rebuildField();
      layer.changed();
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
      animator.stop();
      earthWindAnimatorRef.current = null;
    };
  }, [map?.ol_uid, layerVisible.earthWind, earthData, style.earthWindColor]);

  /** earth 농도장 */
  useEffect(() => {
    if (!map?.ol_uid) return;

    const layer = layersRef.current.layerEarthScalarCanvas;
    layer.setVisible(layerVisible.earthScalar);

    // 토글 OFF
    if (!layerVisible.earthScalar) {
      earthScalarAnimatorRef.current = null;
      layer.changed();
      return;
    }

    if (!earthData || earthData.length === 0) return;

    const scalarRec = earthData.find(
      r => r.header?.parameterCategory === 0 && r.header?.parameterNumber === 0,
    );
    if (!scalarRec) {
      console.error('scalar record not found');
      return;
    }

    const grid = buildScalarGrid(scalarRec);
    const earthSegments = EARTH_SEGMENTS_MAP[settings.bgPoll];

    const animator = new EarthScalarOLAnimator({
      map,
      grid,
      segments: earthSegments,
      alpha: style.earthScalarOpacity,
    });

    const onPostRender = e => {
      animator.drawFrame(e.context);
    };

    layer.on('postrender', onPostRender);
    earthScalarAnimatorRef.current = animator;

    layer.changed();

    return () => {
      layer.un('postrender', onPostRender);
      earthScalarAnimatorRef.current = null;
      layer.changed();
    };
  }, [
    map?.ol_uid,
    earthData,
    layerVisible.earthScalar,
    style.earthScalarOpacity,
  ]);

  /** WebGL 바람장 */
  useEffect(() => {
    if (!map?.ol_uid) return;
    if (!layerVisible.webglWind) return;
    if (!webGLData) return;

    let cancelled = false;

    const init = async () => {
      webglWindAnimatorRef.current?.destroy();
      webglWindAnimatorRef.current = null;

      // wind texture
      const windImg = new Image();
      windImg.src = `data:image/png;base64,${webGLData.wind.png}`;
      await new Promise(res => (windImg.onload = res));
      if (cancelled) return;

      // conc texture
      let concImg = null;
      if (webGLData.conc) {
        concImg = new Image();
        concImg.src = `data:image/png;base64,${webGLData.conc.png}`;
        await new Promise(res => (concImg.onload = res));
        if (cancelled) return;
      }

      webglWindAnimatorRef.current = new WebGLWindOLAnimator({
        map,
        extentLCC: webGLData.wind.meta.extentLCC,
        windData: { ...webGLData.wind.meta, image: windImg },
        scalarData: concImg
          ? { image: concImg, min: webGLData.conc.min, max: webGLData.conc.max }
          : null,
        poll: webGLData.poll,
      });
    };

    init();

    return () => {
      cancelled = true;
      webglWindAnimatorRef.current?.destroy();
      webglWindAnimatorRef.current = null;
    };
  }, [map?.ol_uid, webGLData, layerVisible.webglWind]);

  return (
    <MapDiv id={mapId}>
      <LccMapControlPanel
        datetime={datetimeTxt}
        segments={EARTH_SEGMENTS_MAP[settings.bgPoll]}
        scaleMeta={EARTH_SCALE_META[settings.bgPoll]}
      />
      {settings.bgPoll && (
        <LccLegend
          title={POLL_META[settings.bgPoll].title}
          rgbs={RGBA_RANGES[settings.bgPoll]}
          unit={POLL_META[settings.bgPoll].unit}
          wsLegendOn={layerVisible.windArrows}
        />
      )}
    </MapDiv>
  );
}

const POLL_META = {
  O3: { title: 'O3', unit: 'ppm' },
  SO2: { title: 'SO2', unit: 'ppm' },
  NO2: { title: 'NO2', unit: 'ppm' },
  CO: { title: 'CO', unit: 'ppm' },
  PM10: { title: 'PM10', unit: 'µg/m³' },
  'PM2.5': { title: 'PM2.5', unit: 'µg/m³' },
  TEMP: { title: '온도', unit: '℃' },
  WIND: { title: '풍속', unit: 'm/s' },
  CAI: { title: 'CAI', unit: '' },
};

export default Lcc;

const MapDiv = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;

  .ol-tooltip::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -6px;
    transform: translateX(-50%);

    width: 0;
    height: 0;

    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(0, 0, 0, 0.75);
  }
`;
