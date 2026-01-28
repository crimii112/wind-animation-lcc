import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { MultiPoint, MultiPolygon, Point } from 'ol/geom';
import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { transform } from 'ol/proj';

export function createLccLayers() {
  // 시도 shp
  const sourceSidoShp = new VectorSource({ wrapX: false });
  const layerSidoShp = new VectorLayer({
    source: sourceSidoShp,
    id: 'sidoshp',
    opacity: 0.5,
  });

  // 모델링 농도 히트맵(polygon)
  const sourceCoords = new VectorSource({ wrapX: false });
  const layerCoords = new VectorLayer({
    source: sourceCoords,
    id: 'coords',
    opacity: 0.3,
  });

  // 바람 화살표(Point)
  const sourceArrows = new VectorSource({ wrapX: false });
  const layerArrows = new VectorLayer({
    source: sourceArrows,
    id: 'arrows',
  });

  // 바람 애니메이션
  const layerWindCanvas = new VectorLayer({
    id: 'windCanvas',
    source: new VectorSource(),
    style: null,
    updateWhileAnimating: true,
  });

  // earth 애니메이션
  const layerEarthWindCanvas = new VectorLayer({
    id: 'earthWindCanvas',
    source: new VectorSource(),
    style: null,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  });

  // 그리드
  const sourceGrid = new VectorSource({ wrapX: false });
  const layerGrid = new VectorLayer({
    id: 'grid',
    source: sourceGrid,
  });

  return {
    sourceSidoShp,
    layerSidoShp,
    sourceCoords,
    layerCoords,
    sourceArrows,
    layerArrows,
    layerWindCanvas,
    layerEarthWindCanvas,
    sourceGrid,
    layerGrid,
  };
}

/** 모델링 농도 히트맵 feature 생성 */
export function createPolygonFeatures(data, settings, halfCell, rgbs) {
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

    const transformedCoords = coordsLcc[0].map(c =>
      transform(c, 'LCC', 'EPSG:4326'),
    );
    groupedCoordinates[colorIndex].push(coordsLcc); // lcc 기준
    // groupedCoordinates[colorIndex].push([transformedCoords]);
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

/** 바람 화살표 Feature 생성 */
export function createArrowFeatures(data) {
  return data.map(
    item =>
      new Feature({
        geometry: new Point(
          [item.lon, item.lat], // lcc 기준
          // transform([item.lon, item.lat], 'LCC', 'EPSG:4326'),
        ),
        wd: item.wd,
        ws: item.ws,
      }),
  );
}

/** 그리드 Feature 생성 */
export function createGridFeatures(data, gridStyle) {
  const points = data.map(item =>
    // transform([item.lon, item.lat], 'LCC', 'EPSG:4326'),
    [item.lon, item.lat],
  );

  const feature = new Feature({
    geometry: new MultiPoint(points),
  });

  feature.setStyle(gridStyle);
  return [feature];
}
