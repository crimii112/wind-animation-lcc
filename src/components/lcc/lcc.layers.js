import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import { Feature } from 'ol';

export function createLccLayers() {
  // 시도 경계(shp)
  const sourceSidoShp = new VectorSource({ wrapX: false });
  const layerSidoShp = new VectorLayer({
    source: sourceSidoShp,
    id: 'sidoshp',
    opacity: 0.5,
  });

  // 모델링 농도장(polygon)
  const sourceConcPolygon = new VectorSource({ wrapX: false });
  const layerConcPolygon = new VectorLayer({
    source: sourceConcPolygon,
    id: 'concPolygon',
    opacity: 0.3,
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
  });

  return {
    sourceSidoShp,
    layerSidoShp,
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

      f.setStyle(
        new Style({
          fill: new Fill({ color }),
        }),
      );

      return f;
    })
    .filter(Boolean);
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
