import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { MultiPoint, MultiPolygon, Point } from 'ol/geom';
import { Feature } from 'ol';
import { transform } from 'ol/proj';
import ImageLayer from 'ol/layer/Image';
import ImageCanvasSource from 'ol/source/ImageCanvas';

export function createLccLayers() {
  // 시도 경계(shp)
  const sourceSidoShp = new VectorSource({ wrapX: false });
  const layerSidoShp = new VectorLayer({
    source: sourceSidoShp,
    id: 'sidoshp',
    opacity: 0.5,
  });

  // 모델링 농도장(polygon)
  const sourceCoords = new VectorSource({ wrapX: false });
  const layerCoords = new VectorLayer({
    source: sourceCoords,
    id: 'coords',
    opacity: 0.3,
  });

  // 바람장 화살표(Point)
  const sourceArrows = new VectorSource({ wrapX: false });
  const layerArrows = new VectorLayer({
    source: sourceArrows,
    id: 'arrows',
  });

  // 바람장 애니메이션
  const layerWindCanvas = new VectorLayer({
    id: 'windCanvas',
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

  // 바람장 webGL
  const layerWebGLWindCanvas = new ImageLayer({
    id: 'webglWindCanvas',
    source: new ImageCanvasSource({
      projection: 'LCC',
      canvasFunction: (extent, resolution, pixelRatio, size) => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(size[0] * pixelRatio);
        canvas.height = Math.floor(size[1] * pixelRatio);
        canvas.style.width = `${size[0]}px`;
        canvas.style.height = `${size[1]}px`;
        return canvas;
      },
    }),
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
    sourceCoords,
    layerCoords,
    sourceArrows,
    layerArrows,
    layerWindCanvas,
    layerEarthWindCanvas,
    layerEarthScalarCanvas,
    layerWebGLWindCanvas,
    sourceGrid,
    layerGrid,
  };
}

/* 모델링 농도 히트맵 feature 생성 - data 전체 polygon 생성 (미사용) */
// bgPoll 변경 시 기존 스타일 캐시 초기화
// useEffect(() => {
//   polygonStyleCache.current = {};
// }, [settings.bgPoll]);

// const polygonStyleCache = useRef({});
// const getPolygonStyle = value => {
//   const key = `${settings.bgPoll}-${value}`;
//   if (polygonStyleCache.current[key]) {
//     return polygonStyleCache.current[key];
//   }

//   const color = rgbs[settings.bgPoll].find(
//     s => value >= s.min && value < s.max
//   )?.color;

//   if (!color) return null;

//   const style = new Style({
//     fill: new Fill({
//       color: color.replace(
//         /rgba\(([^,]+), ([^,]+), ([^,]+), ([^)]+)\)/,
//         (_, r, g, b) => `rgba(${r}, ${g}, ${b}, 1)`
//       ),
//     }),
//   });

//   polygonStyleCache.current[key] = style;
//   return style;
// };

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

/** 모델링 농도 히트맵 feature 생성 - legend 기준 multipolygon 생성 */
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
export function createGridFeatures(data) {
  const points = data.map(item =>
    // transform([item.lon, item.lat], 'LCC', 'EPSG:4326'),
    [item.lon, item.lat],
  );

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
