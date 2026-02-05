const INTENSITY_SCALE_STEP = 2;
const MAX_PARTICLE_AGE = 100;
const PARTICLE_LINE_WIDTH = 1.5;
const FRAME_RATE_MS = 20;

/** 그라데이션 */
function windIntensityColorScale(step, maxWind, baseColor) {
  const result = [];

  const r0 = parseInt(baseColor.slice(1, 3), 16);
  const g0 = parseInt(baseColor.slice(3, 5), 16);
  const b0 = parseInt(baseColor.slice(5, 7), 16);

  // 기존 earth: 235 ~ 255
  const minB = 235 / 255;
  const maxB = 1.0;

  const bucketCount = Math.ceil((255 - 235) / step);

  for (let i = 0; i < bucketCount; i++) {
    const t = i / (bucketCount - 1); // 0 → 1
    const brightness = minB + t * (maxB - minB);

    const r = Math.round(r0 * brightness);
    const g = Math.round(g0 * brightness);
    const b = Math.round(b0 * brightness);

    result.push(`rgba(${r}, ${g}, ${b}, 1)`);
  }

  result.indexFor = m =>
    Math.floor((Math.min(m, maxWind) / maxWind) * (result.length - 1));

  return result;
}

/** bilinear 보간 */
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

/** grid 생성 */
export function buildGrid(uRec, vRec) {
  if (!uRec?.header || !vRec?.header) throw new Error('Invalid u/v record');

  const header = uRec.header;
  const uData = uRec.data;
  const vData = vRec.data;

  const λ0 = header.lo1; // 시작 경도
  const φ0 = header.la1; // 시작 위도
  const Δλ = header.dx; // 경도 간격
  const Δφ = header.dy; // 위도 간격(보통 음수)
  const ni = header.nx; // 격자 크기(가로)
  const nj = header.ny; // 격자 크기(세로)

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
    const i = (lon - λ0) / Δλ;

    let j;
    if (Δφ < 0) {
      // la1이 북쪽, dy가 음수(북→남)
      j = (φ0 - lat) / -Δφ;
    } else {
      // 반대 케이스
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
 * 화면 픽셀 위치를 주면 그 픽셀에서 점이 얼마나 움직여야 하는지 알려주는 함수
 * earth의 interpolateField + createField
 */
function buildFieldForViewport({
  map,
  grid,
  velocityScaleFactor,
  step = 2,
  speedScale = 10.0,
  flipY = true,
}) {
  // 현재 화면 크기와 bounds 계산
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

  // 픽셀 이동량 스케일 정의
  const velocityScale = bounds.height * velocityScaleFactor * speedScale; // 이 값이 너무 작으면 점처럼 보임
  const NULL_WIND = Object.freeze([NaN, NaN, null]);

  // ol 뷰 좌표계
  const viewProj = map.getView().getProjection();

  /** earth식 columns[x][y] */
  const columns = [];

  let x = bounds.x;

  function interpolateColumn(x) {
    const column = [];

    for (let y = bounds.y; y <= bounds.yMax; y += step) {
      let wind = NULL_WIND;

      const coord = map.getCoordinateFromPixel([x, y]);
      if (!coord) return;

      if (Number.isFinite(coord[0]) && Number.isFinite(coord[1])) {
        const w = grid.interpolate(coord[0], coord[1]);
        if (w) {
          let u = w[0] * velocityScale;
          let v = w[1] * velocityScale;

          if (flipY) v = -v;

          const m = Math.sqrt(u * u + v * v);
          wind = [u, v, m];
        }
      }

      column[y] = wind;
      column[y + 1] = wind;
    }

    columns[x] = column;
    columns[x + 1] = column;
  }

  // 전체 화면 계산
  while (x <= bounds.xMax) {
    interpolateColumn(x);
    x += step;
  }

  function field(x, y) {
    const column = columns[Math.round(x)];
    return (column && column[Math.round(y)]) || NULL_WIND;
  }

  field.isInsideBoundary = (x, y) => field(x, y) !== NULL_WIND;
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

  field.release = () => {
    columns.length = 0;
  };

  field._bounds = bounds;
  return field;
}

export class EarthWindOLAnimator {
  constructor({
    map,
    layer,
    grid,
    maxIntensity = 17, // 색상 버킷 스케일 상한
    color = '#ffffff',
  }) {
    this.map = map;
    this.layer = layer;
    this.grid = grid;
    this.maxIntensity = maxIntensity;
    this.color = color;

    this._pixelRatio = 1;

    const dx = grid.header.dx;
    this.velocityScaleFactor = dx === 27000 ? 1 / 60000 : 1 / 30000;
    this.particleMultiplier = dx === 27000 ? 0.005 : 0.003;

    // 바람 세기에 따라 어떤 색을 쓸지 배열 생성
    this._colorStyles = windIntensityColorScale(
      INTENSITY_SCALE_STEP,
      maxIntensity,
      this.color,
    );
    this._buckets = this._colorStyles.map(() => []);
    this._particles = [];
    this._field = null;

    this._running = false;
    this._lastTick = 0;

    // 잔상 페이드 강도
    // alpha가 1에 가까울수록 빨리 지워지고, 낮을수록 오래 남음
    this._fadeFillStyle = 'rgba(0, 0, 0, 0.97)';

    // 매 프레임 화면 ctx에 직접 그리지 않고, trailCanvas에 먼저 그리고 나중에 한 번에 화면에 붙임
    this._trailCanvas = document.createElement('canvas');
    this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
  }

  // 지도 크기랑 캔버스 크기 맞추기
  _ensureCanvasSize() {
    const size = this.map.getSize();
    if (!size) return false;

    const [w, h] = size;

    const ratio =
      (typeof this.map.getPixelRatio === 'function' &&
        this.map.getPixelRatio()) ||
      window.devicePixelRatio ||
      1;

    const canvas = this._trailCanvas;
    const ctx = this._trailCtx;

    const targetW = Math.round(w * ratio);
    const targetH = Math.round(h * ratio);

    const needResize =
      canvas.width !== targetW ||
      canvas.height !== targetH ||
      this._pixelRatio !== ratio;

    if (!needResize) return false;

    this._pixelRatio = ratio;

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, w, h);

    return true;
  }

  // 바람 필드랑 점 새로 만들기
  rebuildField() {
    this._ensureCanvasSize();

    // 전체 픽셀 바람 방향 미리 계산
    this._field = buildFieldForViewport({
      map: this.map,
      grid: this.grid,
      velocityScaleFactor: this.velocityScaleFactor,

      step: 2,
      speedScale: 10.0,
      flipY: true,
    });

    if (!this._field) return;

    // 화면 가로 폭에 맞춰 파티클 개수 정하기
    const bounds = this._field._bounds;

    const particleCount = Math.round(
      bounds.width * bounds.height * this.particleMultiplier,
    );

    this._particles = new Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      this._particles[i] = this._field.randomize({
        age: Math.floor(Math.random() * MAX_PARTICLE_AGE),
      });
    }
  }

  // 애니메이션 시작
  start() {
    if (this._running) return;
    this._running = true;

    this.rebuildField();

    this._onMoveEnd = () => this.rebuildField();
    this._onChangeSize = () => this.rebuildField();

    this.map.on('moveend', this._onMoveEnd);
    this.map.on('change:size', this._onChangeSize);

    const loop = t => {
      if (!this._running) return;

      // 너무 자주 그리면 느려지기 때문에 FRAME_RATE_MS마다 한 번만 그리도록 조절
      if (t - this._lastTick >= FRAME_RATE_MS) {
        this._lastTick = t;
        // this.map.render();
        this.layer.changed();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // 애니메이션 정지
  stop() {
    this._running = false;
    if (this._onMoveEnd) this.map.un('moveend', this._onMoveEnd);
    if (this._onChangeSize) this.map.un('change:size', this._onChangeSize);
  }

  /**
   * 오프스크린(trailCanvas)에 earth 방식으로 fade/evolve/draw
   * 마지막에 현재 프레임 ctx에 drawImage로 덮어씀
   */
  drawFrame(targetCtx) {
    if (!this._running || !this._field) return;

    // 혹시라도 사이즈 바뀌면 보정
    const resized = this._ensureCanvasSize();
    if (resized) this._ensureCanvasSize();

    const field = this._field;
    const bounds = field._bounds;
    const g = this._trailCtx;

    // fade (trailCanvas에 누적된 트레일을 유지)
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = this._fadeFillStyle;
    g.fillRect(0, 0, bounds.width, bounds.height);
    g.globalCompositeOperation = 'source-over';

    // 버킷 초기화
    this._buckets.forEach(b => (b.length = 0));

    // 점들 움직이기
    for (const p of this._particles) {
      // 수명끝나면 새로 그림
      if (p.age > MAX_PARTICLE_AGE) {
        field.randomize(p);
        p.age = 0;
      }

      const x = p.x;
      const y = p.y;
      const v = field(x, y); // [dx, dy, m]
      const m = v[2];

      // 바람없을때
      if (m === null) {
        if (field.isInsideBoundary(x, y)) {
          p.x = x + (Number.isFinite(v[0]) ? v[0] : 0);
          p.y = y + (Number.isFinite(v[1]) ? v[1] : 0);
        } else {
          p.age = MAX_PARTICLE_AGE;
        }
      } else {
        // 바람있을때 -> 다음 위치 계산
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

      p.age += 0.6; // 점의 나이 늘리기
    }

    // 점 -> 선으로 그리기
    g.lineWidth = PARTICLE_LINE_WIDTH;

    for (let i = 0; i < this._buckets.length; i++) {
      const bucket = this._buckets[i];
      if (bucket.length === 0) continue;

      g.beginPath();
      g.strokeStyle = this._colorStyles[i];

      // 점 하나마다 선(현재 위치 -> 다음 위치)을 그리고, 점 위치 업데이트
      for (const p of bucket) {
        g.moveTo(p.x, p.y);
        g.lineTo(p.xt, p.yt);
        p.x = p.xt;
        p.y = p.yt;
      }
      g.stroke();
    }

    // trailCanvas를 실제 화면 targetCtx에 그대로 복사
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.drawImage(this._trailCanvas, 0, 0);
    targetCtx.restore();
  }

  // trailCanvas 완전히 지움
  clearTrails() {
    if (!this._trailCtx) return;
    this._trailCtx.clearRect(
      0,
      0,
      this._trailCanvas.width,
      this._trailCanvas.height,
    );
  }
}
