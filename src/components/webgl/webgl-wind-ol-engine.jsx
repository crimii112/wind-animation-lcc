import WindGL from './wind-gl';

export class WebGLWindOLAnimator {
  constructor({ map, extentLCC, windData }) {
    this.map = map;
    this.extentLCC = extentLCC;

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = 100;

    map.getViewport().appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl', { antialias: false });
    this.wind = new WindGL(gl);

    const particleMultiplier = windData.gridKm === '9' ? 1.3 : 0.9;
    const n = windData.width * windData.height * particleMultiplier;
    this.wind.numParticles = Math.min(n, 65536);

    this.wind.setWind(windData);

    this._running = true;

    this._bind();
  }

  _bind() {
    this._onMoveStart = () => {
      this.canvas.style.display = 'none';
    };

    this._onMoveEnd = () => {
      this.updateCanvas();
      this.canvas.style.display = 'block';
    };

    this.map.on('movestart', this._onMoveStart);
    this.map.on('moveend', this._onMoveEnd);

    this.updateCanvas();
    this._loop();
  }

  _loop = () => {
    if (!this._running) return;

    if (this.wind.windData) this.wind.draw();

    this._rafId = requestAnimationFrame(this._loop);
  };

  updateCanvas() {
    const view = this.map.getView();
    const mapExtent = view.calculateExtent(this.map.getSize());
    const extentLCC = this.extentLCC;

    const minX = Math.max(mapExtent[0], extentLCC[0]);
    const minY = Math.max(mapExtent[1], extentLCC[1]);
    const maxX = Math.min(mapExtent[2], extentLCC[2]);
    const maxY = Math.min(mapExtent[3], extentLCC[3]);

    if (minX >= maxX || minY >= maxY) {
      this.canvas.style.display = 'none';
      return;
    }

    this.canvas.style.display = 'block';

    const bottomLeftPx = this.map.getPixelFromCoordinate([minX, minY]);
    const topRightPx = this.map.getPixelFromCoordinate([maxX, maxY]);

    const width = topRightPx[0] - bottomLeftPx[0];
    const height = bottomLeftPx[1] - topRightPx[1];

    this.canvas.style.left = `${bottomLeftPx[0]}px`;
    this.canvas.style.top = `${topRightPx[1]}px`;
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);

    this.wind.resize();
  }

  destroy() {
    this._running = false;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }

    this.map.un('movestart', this._onMoveStart);
    this.map.un('moveend', this._onMoveEnd);

    this.canvas.remove();
  }
}
