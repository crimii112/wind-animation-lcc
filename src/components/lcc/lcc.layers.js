import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import { Feature } from 'ol';
import TileGrid from 'ol/tilegrid/TileGrid';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { get } from 'ol/proj';

const LCC_EXTENT = [
  -4112662.3746867785, -3518704.607206602, 4341221.533903961, 2511411.832380196,
];

const RESOLUTIONS = [
  33022.98401793258, 16511.49200896629, 8255.746004483144, 4127.873002241572,
  2063.936501120786, 1031.968250560393, 515.9841252801965, 257.99206264009825,
  128.99603132004913, 64.49801566002456, 32.24900783001228, 16.12450391500614,
  8.06225195750307,
];

const LCC_PROJ = get('LCC');
export function createLccLayers() {
  // 아시아 경계(shp)
  const tileGrid = new TileGrid({
    extent: LCC_EXTENT,
    tileSize: 256,
    resolutions: RESOLUTIONS,
  });
  const layerAsiaShp = new VectorTileLayer({
    id: 'asiashp',
    opacity: 0.5,
    source: new VectorTileSource({
      format: new MVT(),
      projection: LCC_PROJ,
      tileGrid: tileGrid,
      url: `${import.meta.env.VITE_WIND_API_URL}/api/asiashp/tiles/{z}/{x}/{y}.pbf`,
      cacheSize: 512,
    }),
    style: new Style({
      stroke: new Stroke({
        color: 'black',
        width: 1.5,
      }),
    }),
  });
  // const sourceAsiaShp = new VectorSource({ wrapX: false });
  // const layerAsiaShp = new VectorLayer({
  //   source: sourceAsiaShp,
  //   id: 'asiashp',
  //   opacity: 0.5,
  //   renderMode: 'image',
  //   updateWhileAnimating: false,
  //   updateWhileInteracting: false,
  // });

  // 모델링 농도장(polygon)
  const sourceConcPolygon = new VectorSource({ wrapX: false });
  const layerConcPolygon = new VectorLayer({
    source: sourceConcPolygon,
    id: 'concPolygon',
    opacity: 0.3,
    renderMode: 'image',
    updateWhileAnimating: false,
    updateWhileInteracting: false,
  });

  // 바람장 화살표(Point)
  const sourceWindArrows = new VectorSource({ wrapX: false });
  const layerWindArrows = new VectorLayer({
    source: sourceWindArrows,
    id: 'windArrows',
  });

  // 바람장 애니메이션
  const layerWindAnimation = new VectorLayer({
    id: 'windAnimation',
    source: new VectorSource(),
    style: null,
    updateWhileAnimating: true,
  });

  // 바람장 earth
  const layerEarthWindCanvas = new VectorLayer({
    id: 'earthWindCanvas',
    source: new VectorSource(),
    style: null,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  });

  // 농도장 earth
  const layerEarthScalarCanvas = new VectorLayer({
    id: 'earthScalarCanvas',
    source: new VectorSource(),
    style: null,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  });

  // 격자
  const sourceGrid = new VectorSource({ wrapX: false });
  const layerGrid = new VectorLayer({
    id: 'grid',
    source: sourceGrid,
    updateWhileAnimating: false,
    updateWhileInteracting: false,
  });

  return {
    // sourceAsiaShp,
    layerAsiaShp,
    sourceConcPolygon,
    layerConcPolygon,
    sourceWindArrows,
    layerWindArrows,
    layerWindAnimation,
    layerEarthWindCanvas,
    layerEarthScalarCanvas,
    sourceGrid,
    layerGrid,
  };
}

/* 모델링 농도 히트맵 feature 생성 - data 전체 polygon 생성 */
export function createPolygonFeaturesSingle(data, settings, halfCell, rgbs) {
  const colorRange = rgbs[settings.bgPoll];

  const styleCache = new Map();
  const getStyle = color => {
    let s = styleCache.get(color);
    if (!s) {
      s = new Style({ fill: new Fill({ color }) });
      styleCache.set(color, s);
    }
    return s;
  };

  return data
    .map(item => {
      const color = colorRange.find(
        s => item.value >= s.min && item.value < s.max,
      )?.color;

      if (!color) return null;

      const f = new Feature({
        geometry: new Polygon([
          [
            [item.lon - halfCell, item.lat + halfCell],
            [item.lon - halfCell, item.lat - halfCell],
            [item.lon + halfCell, item.lat - halfCell],
            [item.lon + halfCell, item.lat + halfCell],
            [item.lon - halfCell, item.lat + halfCell],
          ],
        ]),
      });

      f.set('overlay', item.overlay);
      f.setStyle(getStyle(color));

      return f;
    })
    .filter(Boolean);
}

export function createPolygonFeaturesFixedSingle(data, halfCell) {
  return data.map((item, idx) => {
    const f = new Feature({
      geometry: new Polygon([
        [
          [item.lon - halfCell, item.lat + halfCell],
          [item.lon - halfCell, item.lat - halfCell],
          [item.lon + halfCell, item.lat - halfCell],
          [item.lon + halfCell, item.lat + halfCell],
          [item.lon - halfCell, item.lat + halfCell],
        ],
      ]),
    });

    f.set('idx', idx);

    f.set('value', item.value);
    f.set('overlay', item.overlay);

    return f;
  });
}

/** 모델링 농도 히트맵 feature 생성 - legend 기준 multipolygon 생성 */
export function createPolygonFeaturesMulti(data, settings, halfCell, rgbs) {
  const colorRange = rgbs[settings.bgPoll];
  const groupedCoordinates = {};

  data.forEach(item => {
    const colorIndex = colorRange.findIndex(
      s => item.value >= s.min && item.value < s.max,
    );
    if (colorIndex === -1) return;

    if (!groupedCoordinates[colorIndex]) groupedCoordinates[colorIndex] = [];

    const coordsLcc = [
      [
        [item.lon - halfCell, item.lat + halfCell],
        [item.lon - halfCell, item.lat - halfCell],
        [item.lon + halfCell, item.lat - halfCell],
        [item.lon + halfCell, item.lat + halfCell],
        [item.lon - halfCell, item.lat + halfCell],
      ],
    ];

    groupedCoordinates[colorIndex].push(coordsLcc);
  });

  return Object.keys(groupedCoordinates).map(index => {
    const f = new Feature({
      geometry: new MultiPolygon(groupedCoordinates[index]),
    });

    f.setStyle(
      new Style({
        fill: new Fill({
          color: colorRange[index].color,
        }),
      }),
    );

    return f;
  });
}

export function createPolygonFeatures(data, settings, halfCell, rgbs) {
  if (settings.polygonMode === 'fixedSingle')
    return createPolygonFeaturesFixedSingle(data, halfCell);

  if (settings.polygonMode === 'single')
    return createPolygonFeaturesSingle(data, settings, halfCell, rgbs);

  return createPolygonFeaturesMulti(data, settings, halfCell, rgbs);
}

/** 바람 화살표 Feature 생성 */
export function createArrowFeatures(data) {
  return data.map(
    item =>
      new Feature({
        geometry: new Point([item.lon, item.lat]),
        wd: item.wd,
        ws: item.ws,
      }),
  );
}

/** 그리드 Feature 생성 */
export function createGridFeatures(data) {
  const points = data.map(item => [item.lon, item.lat]);

  const feature = new Feature({
    geometry: new MultiPoint(points),
  });

  feature.setStyle(
    new Style({
      image: new RegularShape({
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({
          color: 'rgba(255, 255, 255, 1)',
          width: 1,
        }),
        points: 4,
        radius: 1,
        angle: 0,
      }),
    }),
  );
  return [feature];
}
