// earth-wind-ol-engine.js
// OpenLayers에서 earth.nullschool.net 스타일의 wind particle을 “거의 동일 룩앤필”로 그리기 위한 엔진
// 핵심: OL의 postrender 캔버스는 프레임마다 클리어될 수 있으므로, 트레일은 "오프스크린 캔버스"에 유지한다.

import { toLonLat } from 'ol/proj';

/** earth 룩앤필 상수 (earth.js / products.js 감각) */
const INTENSITY_SCALE_STEP = 10;
const MAX_PARTICLE_AGE = 100;
const PARTICLE_LINE_WIDTH = 0.65;
const PARTICLE_MULTIPLIER = 14;
const FRAME_RATE_MS = 20;

/** earth 느낌의 흰색 그라데이션 */
function windIntensityColorScale(step, maxWind) {
  const result = [];
  for (let j = 85; j <= 255; j += step) {
    result.push(`rgba(${j},${j},${j},1.0)`);
  }
  result.indexFor = m =>
    Math.floor((Math.min(m, maxWind) / maxWind) * (result.length - 1));
  return result;
}

/** product.js 핵심: bilinear 보간 */
function bilinearInterpolateVector(x, y, g00, g10, g01, g11) {
  const rx = 1 - x;
  const ry = 1 - y;
  const a = rx * ry,
    b = x * ry,
    c = rx * y,
    d = x * y;
  const u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
  const v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
  return [u, v, Math.sqrt(u * u + v * v)];
}

/**
 * earth_wind.json(earth 스타일 GRIB JSON) → grid.interpolate(lon,lat)
 * - uRec.header.parameterNumber = 2
 * - vRec.header.parameterNumber = 3
 */
export function buildEarthGrid(uRec, vRec) {
  if (!uRec?.header || !vRec?.header) throw new Error('Invalid u/v record');

  const header = uRec.header;
  const uData = uRec.data;
  const vData = vRec.data;

  const λ0 = header.lo1;
  const φ0 = header.la1;
  const Δλ = header.dx;
  const Δφ = header.dy; // 보통 음수(북→남)
  const ni = header.nx;
  const nj = header.ny;

  // grid[j][i] = [u,v]
  const grid = new Array(nj);
  let p = 0;

  for (let j = 0; j < nj; j++) {
    const row = new Array(ni);
    for (let i = 0; i < ni; i++, p++) {
      const u = uData[p];
      const v = vData[p];
      row[i] = u == null || v == null ? null : [u, v];
    }
    grid[j] = row;
  }

  function interpolate(lon, lat) {
    // earth products.js 흐름: i=(λ-λ0)/Δλ, j=(φ0-φ)/(-Δφ) (Δφ 음수 가정)
    const i = (lon - λ0) / Δλ;

    let j;
    if (Δφ < 0) {
      // la1이 북쪽, dy가 음수(북→남)인 일반 earth 케이스
      j = (φ0 - lat) / -Δφ;
    } else {
      // 반대 케이스도 방어
      j = (lat - φ0) / Δφ;
    }

    const fi = Math.floor(i),
      ci = fi + 1;
    const fj = Math.floor(j),
      cj = fj + 1;

    const row0 = grid[fj];
    const row1 = grid[cj];
    if (!row0 || !row1) return null;

    const g00 = row0[fi];
    const g10 = row0[ci];
    const g01 = row1[fi];
    const g11 = row1[ci];
    if (!g00 || !g10 || !g01 || !g11) return null;

    return bilinearInterpolateVector(i - fi, j - fj, g00, g10, g01, g11);
  }

  return { header, interpolate };
}

/**
 * earth createField/interpolateField를 OL용으로:
 * - 화면 픽셀 격자(2px step)에 대해 lon/lat을 뽑아 grid.interpolate
 * - field(x,y)로 빠르게 조회
 */
function buildFieldForViewport({
  map,
  grid,
  velocityScaleFactor,
  step = 2, // 캐시 해상도 (2px)
  speedScale = 3.0, // 🔥 점→선 체감 핵심
  flipY = true, // canvas y축 보정
}) {
  const size = map.getSize();
  if (!size) return null;

  const width = size[0];
  const height = size[1];

  const bounds = {
    x: 0,
    y: 0,
    xMax: width - 1,
    yMax: height - 1,
    width,
    height,
  };

  const velocityScale = bounds.height * velocityScaleFactor * speedScale;
  const NULL_WIND = [NaN, NaN, null];

  const viewProj = map.getView().getProjection();

  // 캐시 격자 크기(픽셀 step 기준)
  const nx = Math.floor(bounds.width / step) + 1;
  const ny = Math.floor(bounds.height / step) + 1;

  // samples[j][i] = [u,v,m] or NULL_WIND
  const samples = new Array(ny);
  for (let j = 0; j < ny; j++) samples[j] = new Array(nx);

  // 1) 화면 픽셀 → lon/lat → grid.interpolate → (u,v) 저장
  for (let j = 0; j < ny; j++) {
    const y = j * step;
    for (let i = 0; i < nx; i++) {
      const x = i * step;

      const lonlat = toLonLat(map.getCoordinateFromPixel([x, y]), viewProj);
      const lon = lonlat[0];
      const lat = lonlat[1];

      let wind = NULL_WIND;

      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        const w = grid.interpolate(lon, lat); // [u,v,m] (m는 원래속도)
        if (w) {
          let u = w[0] * velocityScale;
          let v = w[1] * velocityScale;

          // canvas의 y축은 아래로 +, 따라서 v는 뒤집어주는 게 일반적으로 맞음
          if (flipY) v = -v;

          // 이 시점의 m은 "그리기용 픽셀속도"를 기준으로 다시 계산
          const m = Math.sqrt(u * u + v * v);
          wind = [u, v, m];
        }
      }

      samples[j][i] = wind;
    }
  }

  // 2) 캐시 격자 내부에서 bilinear(연속 필드)
  function field(x, y) {
    if (x < 0 || x > bounds.xMax || y < 0 || y > bounds.yMax) return NULL_WIND;

    const gx = x / step;
    const gy = y / step;

    const i0 = Math.floor(gx);
    const j0 = Math.floor(gy);
    const i1 = i0 + 1;
    const j1 = j0 + 1;

    const row0 = samples[j0];
    const row1 = samples[j1];
    if (!row0 || !row1) return NULL_WIND;

    const g00 = row0[i0];
    const g10 = row0[i1];
    const g01 = row1[i0];
    const g11 = row1[i1];
    if (!g00 || !g10 || !g01 || !g11) return NULL_WIND;

    // “빈 바람(holes)” 섞이면 NULL 처리 (earth도 holes 많음)
    if (
      g00[2] === null ||
      g10[2] === null ||
      g01[2] === null ||
      g11[2] === null
    ) {
      return NULL_WIND;
    }

    return bilinearInterpolateVector(gx - i0, gy - j0, g00, g10, g01, g11);
  }

  field.isDefined = (x, y) => field(x, y)[2] !== null;

  field.randomize = o => {
    let x, y;
    let safety = 0;
    do {
      x = Math.random() * bounds.xMax;
      y = Math.random() * bounds.yMax;
    } while (!field.isDefined(x, y) && safety++ < 30);
    o.x = x;
    o.y = y;
    return o;
  };

  field._bounds = bounds;
  return field;
}

export class EarthWindOLAnimator {
  constructor({
    map,
    grid,
    maxIntensity = 17,
    velocityScaleFactor = 1 / 30000,
  }) {
    this.map = map;
    this.grid = grid;
    this.maxIntensity = maxIntensity;
    this.velocityScaleFactor = velocityScaleFactor;

    this._colorStyles = windIntensityColorScale(
      INTENSITY_SCALE_STEP,
      maxIntensity,
    );
    this._buckets = this._colorStyles.map(() => []);
    this._particles = [];
    this._field = null;

    this._running = false;
    this._lastTick = 0;

    // earth 기본 fade 느낌
    this._fadeFillStyle = 'rgba(0, 0, 0, 0.88)';

    // ✅ 트레일 유지용 오프스크린
    this._trailCanvas = document.createElement('canvas');
    this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
  }

  _ensureCanvasSize() {
    const size = this.map.getSize();
    if (!size) return false;

    const [w, h] = size;
    if (this._trailCanvas.width !== w || this._trailCanvas.height !== h) {
      this._trailCanvas.width = w;
      this._trailCanvas.height = h;
      // 리사이즈 시 트레일 초기화
      this._trailCtx.clearRect(0, 0, w, h);
      return true;
    }
    return false;
  }

  rebuildField() {
    this._ensureCanvasSize();

    this._field = buildFieldForViewport({
      map: this.map,
      grid: this.grid,
      velocityScaleFactor: this.velocityScaleFactor,

      step: 2, // 1로 하면 더 부드럽지만 무거움
      speedScale: 3.0, // 점이면 4.0까지 올려도 됨
      flipY: true, // 방향 이상하면 false/true 반대로 한번만 바꿔 확인
    });

    if (!this._field) return;

    const bounds = this._field._bounds;
    const particleCount = Math.round(bounds.width * PARTICLE_MULTIPLIER);

    this._particles = new Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      this._particles[i] = this._field.randomize({
        age: Math.floor(Math.random() * MAX_PARTICLE_AGE),
      });
    }
  }

  start() {
    if (this._running) return;
    this._running = true;

    this.rebuildField();

    // 지도 이동/줌/리사이즈 시 필드 재빌드 (안 맞는 문제 해결 핵심)
    this._onMoveEnd = () => this.rebuildField();
    this._onChangeSize = () => this.rebuildField();

    this.map.on('moveend', this._onMoveEnd);
    this.map.on('change:size', this._onChangeSize);

    const loop = t => {
      if (!this._running) return;
      if (t - this._lastTick >= FRAME_RATE_MS) {
        this._lastTick = t;
        this.map.render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._onMoveEnd) this.map.un('moveend', this._onMoveEnd);
    if (this._onChangeSize) this.map.un('change:size', this._onChangeSize);
  }

  /**
   * OL layer postrender에서 호출:
   * - 오프스크린(trailCanvas)에 earth 방식으로 fade/evolve/draw
   * - 마지막에 현재 프레임 ctx에 drawImage로 덮어씀
   */
  drawFrame(targetCtx) {
    if (!this._running || !this._field) return;

    // 혹시라도 사이즈 바뀌면 보정
    this._ensureCanvasSize();

    const field = this._field;
    const bounds = field._bounds;
    const g = this._trailCtx;

    // fade (trailCanvas에 누적된 트레일을 유지)
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = this._fadeFillStyle;
    g.fillRect(0, 0, bounds.width, bounds.height);
    g.globalCompositeOperation = 'source-over';

    // evolve (버킷 초기화)
    this._buckets.forEach(b => (b.length = 0));

    for (const p of this._particles) {
      if (p.age > MAX_PARTICLE_AGE) {
        field.randomize(p);
        p.age = 0;
      }

      const x = p.x;
      const y = p.y;
      const v = field(x, y);
      const m = v[2];

      if (m === null) {
        p.age = MAX_PARTICLE_AGE;
      } else {
        const xt = x + v[0];
        const yt = y + v[1];

        if (field.isDefined(xt, yt)) {
          p.xt = xt;
          p.yt = yt;
          const idx = this._colorStyles.indexFor(m);
          this._buckets[idx].push(p);
        } else {
          p.x = xt;
          p.y = yt;
        }
      }

      p.age += 0.6;
    }

    // draw
    g.lineWidth = PARTICLE_LINE_WIDTH;

    for (let i = 0; i < this._buckets.length; i++) {
      const bucket = this._buckets[i];
      if (bucket.length === 0) continue;

      g.beginPath();
      g.strokeStyle = this._colorStyles[i];

      for (const p of bucket) {
        g.moveTo(p.x, p.y);
        g.lineTo(p.xt, p.yt);
        p.x = p.xt;
        p.y = p.yt;
      }
      g.stroke();
    }

    // ✅ 최종 출력: OL이 준 ctx는 “그 프레임용”이므로, 여기에 트레일 캔버스를 찍는다.
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.drawImage(this._trailCanvas, 0, 0);
    targetCtx.restore();
  }
}
