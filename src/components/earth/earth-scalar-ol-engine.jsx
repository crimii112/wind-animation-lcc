/** color 보간 */
function colorInterpolator(start, end) {
  var r = start[0],
    g = start[1],
    b = start[2];
  var Δr = end[0] - r,
    Δg = end[1] - g,
    Δb = end[2] - b;

  return function (i, a) {
    return [
      Math.floor(r + i * Δr),
      Math.floor(g + i * Δg),
      Math.floor(b + i * Δb),
      a,
    ];
  };
}

function clamp(x, low, high) {
  return Math.max(low, Math.min(x, high));
}

/** 구간 내 비율 */
function proportion(x, low, high) {
  return (clamp(x, low, high) - low) / (high - low);
}

/** segmented color scale */
function segmentedColorScale(segments) {
  const points = [];
  const interpolators = [];
  const ranges = [];

  for (let i = 0; i < segments.length - 1; i++) {
    points.push(segments[i + 1][0]);
    interpolators.push(colorInterpolator(segments[i][1], segments[i + 1][1]));
    ranges.push([segments[i][0], segments[i + 1][0]]);
  }

  return function (value, alpha = 1) {
    let i = 0;
    for (; i < points.length - 1; i++) {
      if (value <= points[i]) break;
    }
    const range = ranges[i];
    const t = proportion(value, range[0], range[1]);
    return interpolators[i](t, alpha);
  };
}

/** bilinear 보간 */
function bilinearInterpolateScalar(x, y, g00, g10, g01, g11) {
  const rx = 1 - x;
  const ry = 1 - y;
  return g00 * rx * ry + g10 * x * ry + g01 * rx * y + g11 * x * y;
}

/* =========================
 * grid (scalar)
 * ========================= */

export function buildScalarGrid(rec) {
  if (!rec?.header) throw new Error('Invalid scalar record');

  const { header, data } = rec;

  const λ0 = header.lo1;
  const φ0 = header.la1;
  const Δλ = header.dx;
  const Δφ = header.dy;
  const ni = header.nx;
  const nj = header.ny;

  const grid = new Array(nj);
  let p = 0;

  for (let j = 0; j < nj; j++) {
    const row = new Array(ni);
    for (let i = 0; i < ni; i++, p++) {
      row[i] = data[p];
    }
    grid[j] = row;
  }

  function interpolate(x, y) {
    const i = (x - λ0) / Δλ;

    let j;
    if (Δφ < 0) {
      j = (φ0 - y) / -Δφ;
    } else {
      j = (y - φ0) / Δφ;
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

    if (g00 == null || g10 == null || g01 == null || g11 == null) return null;

    return bilinearInterpolateScalar(i - fi, j - fj, g00, g10, g01, g11);
  }

  return { header, interpolate };
}

/* =========================
 * scalar animator
 * ========================= */

export class EarthScalarOLAnimator {
  constructor({ map, grid, segments, alpha = 0.8, step = 4 }) {
    this.map = map;
    this.grid = grid;
    this.alpha = alpha;
    this.step = step;

    // earth scalar color scale
    this._colorScale = segmentedColorScale(segments);

    this._pixelRatio = 1;

    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
  }

  _ensureCanvasSize() {
    const size = this.map.getSize();
    if (!size) return false;

    const [w, h] = size;

    const ratio =
      (typeof this.map.getPixelRatio === 'function' &&
        this.map.getPixelRatio()) ||
      window.devicePixelRatio ||
      1;

    const targetW = Math.round(w * ratio);
    const targetH = Math.round(h * ratio);

    const needResize =
      this._canvas.width !== targetW ||
      this._canvas.height !== targetH ||
      this._pixelRatio !== ratio;

    if (!needResize) return false;

    this._pixelRatio = ratio;

    this._canvas.width = targetW;
    this._canvas.height = targetH;

    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    this._ctx.clearRect(0, 0, w, h);

    return true;
  }

  drawFrame(targetCtx) {
    this._ensureCanvasSize();

    const ctx = this._ctx;
    const size = this.map.getSize();
    if (!size) return;

    const [width, height] = size;

    ctx.clearRect(0, 0, width, height);

    for (let y = 0; y < height; y += this.step) {
      for (let x = 0; x < width; x += this.step) {
        const coord = this.map.getCoordinateFromPixel([x, y]);
        if (!coord) continue;

        const v = this.grid.interpolate(coord[0], coord[1]);
        if (v == null) continue;

        const [r, g, b, a] = this._colorScale(v, this.alpha);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(x, y, this.step, this.step);
      }
    }

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';

    targetCtx.drawImage(this._canvas, 0, 0);
    targetCtx.restore();
  }
}
